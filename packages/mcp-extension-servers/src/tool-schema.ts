/**
 * JSON Tool Definition Schema
 *
 * Defines the format for no-code MCP tools that are stored as JSON
 * and executed by the AutomationRunner via BrowserWindow/CDP.
 *
 * Tools consist of:
 *   - metadata (name, description)
 *   - parameters (inputs the LLM fills in)
 *   - steps (ordered action sequence)
 */

import { z } from 'zod'

// ─── Parameter Schema ────────────────────────────────────────────────────────

/** Where the parameter value is injected during execution */
export const parameterSourceSchema = z.enum([
  'urlParam',      // Injected into a URL query parameter
  'input',         // Used as a {{placeholder}} in step fields
  'pathSegment',   // Injected into a URL path segment
])

export const toolParameterSchema = z.object({
  /** Parameter name used in {{placeholder}} interpolation */
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case'),
  /** JSON Schema type */
  type: z.enum(['string', 'number', 'boolean']),
  /** Human-readable description for LLM */
  description: z.string(),
  /** Whether the LLM must provide this parameter */
  required: z.boolean().default(true),
  /** Fixed set of allowed values (optional) */
  enum: z.array(z.string()).optional(),
  /** Default value when not provided */
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  /** Where this parameter originated from during recording */
  source: parameterSourceSchema.optional(),
  /** Original key (e.g. URL query param name) */
  sourceKey: z.string().optional(),
})

export type ToolParameter = z.infer<typeof toolParameterSchema>

// ─── Extraction Field Schema ─────────────────────────────────────────────────

export const extractionFieldSchema = z.object({
  /** Key name for the extracted value */
  key: z.string(),
  /** CSS or XPath selector relative to the container */
  selector: z.string(),
  /** What to extract from the element */
  type: z.enum(['text', 'html', 'attribute', 'value']).default('text'),
  /** Attribute name (required when type is 'attribute') */
  attribute: z.string().optional(),
})

export type ExtractionField = z.infer<typeof extractionFieldSchema>

// ─── Action Step Schemas ─────────────────────────────────────────────────────

const baseStepSchema = z.object({
  /** Optional human label for the step */
  label: z.string().optional(),
  /** If true, execution continues even if this step fails */
  continueOnError: z.boolean().optional(),
})

/** Wait strategy after navigation */
export const waitUntilSchema = z.enum(['load', 'domcontentloaded', 'networkidle'])

export type WaitUntil = z.infer<typeof waitUntilSchema>

export const navigateStepSchema = baseStepSchema.extend({
  action: z.literal('navigate'),
  /** Base URL to navigate to */
  url: z.string(),
  /** Query parameters (values may contain {{param}} placeholders) */
  urlParams: z.record(z.string()).optional(),
  /** When to consider navigation complete (default: 'load' - safest) */
  waitUntil: waitUntilSchema.default('load').optional(),
})

export const clickStepSchema = baseStepSchema.extend({
  action: z.literal('click'),
  /** CSS selector or XPath */
  selector: z.string(),
})

export const typeStepSchema = baseStepSchema.extend({
  action: z.literal('type'),
  /** CSS selector or XPath */
  selector: z.string(),
  /** Text to type (may contain {{param}} placeholders) */
  text: z.string(),
  /** Whether to clear the field before typing */
  clear: z.boolean().default(true),
})

export const scrollStepSchema = baseStepSchema.extend({
  action: z.literal('scroll'),
  /** CSS selector or XPath; omit to scroll the page */
  selector: z.string().optional(),
  /** Scroll direction */
  direction: z.enum(['up', 'down', 'left', 'right']).default('down'),
  /** Pixels to scroll */
  amount: z.number().default(500),
})

export const selectStepSchema = baseStepSchema.extend({
  action: z.literal('select'),
  /** CSS selector or XPath for the <select> element */
  selector: z.string(),
  /** Option value to select (may contain {{param}} placeholders) */
  value: z.string(),
})

export const waitStepSchema = baseStepSchema.extend({
  action: z.literal('wait'),
  /** Milliseconds to wait */
  ms: z.number().min(0).max(30_000).default(1000),
})

export const waitForSelectorStepSchema = baseStepSchema.extend({
  action: z.literal('waitForSelector'),
  /** CSS selector or XPath to wait for */
  selector: z.string(),
  /** Timeout in milliseconds */
  timeout: z.number().default(10_000),
})

export const waitForUrlStepSchema = baseStepSchema.extend({
  action: z.literal('waitForUrl'),
  /** URL substring to wait for */
  pattern: z.string(),
  /** Timeout in milliseconds */
  timeout: z.number().default(10_000),
})

export const waitForLoadStepSchema = baseStepSchema.extend({
  action: z.literal('waitForLoad'),
  /** Timeout in milliseconds */
  timeout: z.number().default(15_000),
})

export const extractStepSchema = baseStepSchema.extend({
  action: z.literal('extract'),
  /** Name for this extraction result (used as key in merged output) */
  name: z.string(),
  /** Whether to extract a single element or a list of elements */
  mode: z.enum(['single', 'list']),
  /** CSS or XPath selector for each item (list mode) or the container (single mode) */
  containerSelector: z.string(),
  /** Fields to extract from each matched element */
  fields: z.array(extractionFieldSchema).min(1),
  /** Number of items detected at recording time (informational, list mode only) */
  itemCount: z.number().optional(),
})

/** Union of all step types */
export const actionStepSchema = z.discriminatedUnion('action', [
  navigateStepSchema,
  clickStepSchema,
  typeStepSchema,
  scrollStepSchema,
  selectStepSchema,
  waitStepSchema,
  waitForSelectorStepSchema,
  waitForUrlStepSchema,
  waitForLoadStepSchema,
  extractStepSchema,
])

export type ActionStep = z.infer<typeof actionStepSchema>

// ─── Lane Schema ─────────────────────────────────────────────────────────────

export const laneSchema = z.object({
  /** Human-readable lane name */
  name: z.string().min(1),
  /** Ordered sequence of actions for this lane */
  steps: z.array(actionStepSchema).min(1),
})

export type Lane = z.infer<typeof laneSchema>

// ─── Tool Definition Schema ──────────────────────────────────────────────────

export const toolDefinitionSchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string(),
  /** Tool function name (snake_case, used by LLM) */
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case'),
  /** Human-readable description of what the tool does */
  description: z.string().min(1),
  /** Schema version for forward compatibility */
  version: z.string().default('1.0.0'),
  /** Input parameters the LLM provides */
  parameters: z.array(toolParameterSchema).default([]),
  /** Ordered sequence of actions to execute */
  steps: z.array(actionStepSchema).min(1),
  /** Named parallel lanes - each lane has a name and independent step sequence executed concurrently.
   *  When present with length > 1, all lanes run in parallel (each in its own tab within a shared window).
   *  When absent or length <= 1, falls back to `steps` for backward compatibility.
   *  Legacy format (ActionStep[][]) is auto-wrapped on load. */
  lanes: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val
      // Auto-wrap legacy ActionStep[][] into named lane format
      return val.map((item, i) =>
        Array.isArray(item) ? { name: `Lane ${i + 1}`, steps: item } : item,
      )
    },
    z.array(laneSchema).optional(),
  ),
})

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>

// ─── MCP Server Definition (group of tools) ──────────────────────────────────

export const serverDefinitionSchema = z.object({
  /** Server identifier (e.g. ext-user-my-scraper) */
  id: z.string(),
  /** Human-readable server name */
  name: z.string(),
  /** Description of the server */
  description: z.string(),
  /** Category for grouping */
  category: z.string().default('custom'),
  /** Tool definitions within this server */
  tools: z.array(toolDefinitionSchema).min(1),
})

export type ServerDefinition = z.infer<typeof serverDefinitionSchema>

// ─── Remote Manifest Schema ──────────────────────────────────────────────────

export const remoteToolManifestSchema = z.object({
  /** Manifest version */
  version: z.string(),
  /** Available servers */
  servers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    /** Tool file names (without .json extension) */
    tools: z.array(z.string()),
  })),
})

export type RemoteToolManifest = z.infer<typeof remoteToolManifestSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate a tool definition JSON object.
 * Returns the parsed result or throws on validation error.
 */
export function parseToolDefinition(data: unknown): ToolDefinition {
  return toolDefinitionSchema.parse(data)
}

/**
 * Validate a server definition JSON object.
 */
export function parseServerDefinition(data: unknown): ServerDefinition {
  return serverDefinitionSchema.parse(data)
}

/**
 * Convert ToolParameter[] to a JSON Schema object suitable for MCP tool registration.
 */
export function parametersToJsonSchema(params: ToolParameter[]): {
  type: 'object'
  properties: Record<string, unknown>
  required: string[]
} {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const param of params) {
    const prop: Record<string, unknown> = {
      type: param.type,
      description: param.description,
    }
    if (param.enum) prop.enum = param.enum
    if (param.default !== undefined) prop.default = param.default

    properties[param.name] = prop
    if (param.required) required.push(param.name)
  }

  return { type: 'object', properties, required }
}

/**
 * Resolve {{placeholder}} values in a string using provided arguments.
 */
export function resolveTemplate(template: string, args: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = args[key]
    return value !== undefined ? String(value) : ''
  })
}
