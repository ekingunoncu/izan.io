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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a string (camelCase, PascalCase, kebab-case, etc.) to snake_case */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')  // camelCase → camel_Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // HTMLParser → HTML_Parser
    .replace(/[-\s]+/g, '_')                    // kebab-case / spaces → _
    .toLowerCase()
}

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

export interface ExtractionField {
  key: string
  selector: string
  type: 'text' | 'html' | 'attribute' | 'value' | 'regex' | 'nested' | 'nested_list'
  attribute?: string
  /** Regex pattern - capture group 1 is returned, else full match (type='regex') */
  pattern?: string
  /** Fallback value when extraction fails */
  default?: string | number | null
  /** Post-extraction transform */
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'number'
  /** Sub-fields for nested / nested_list extraction */
  fields?: ExtractionField[]
}

export const extractionFieldSchema: z.ZodType<ExtractionField, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    /** Key name for the extracted value */
    key: z.string(),
    /** CSS or XPath selector relative to the container */
    selector: z.string(),
    /** What to extract from the element */
    type: z.enum(['text', 'html', 'attribute', 'value', 'regex', 'nested', 'nested_list']).default('text'),
    /** Attribute name (required when type is 'attribute') */
    attribute: z.string().optional(),
    /** Regex pattern - capture group 1 is returned, else full match (type='regex') */
    pattern: z.string().optional(),
    /** Fallback value when extraction fails */
    default: z.union([z.string(), z.number(), z.null()]).optional(),
    /** Post-extraction transform */
    transform: z.enum(['trim', 'lowercase', 'uppercase', 'number']).optional(),
    /** Sub-fields for nested / nested_list extraction */
    fields: z.array(extractionFieldSchema).optional(),
  }),
)

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
  /** CSS or XPath selector for each item (list mode) or the container (single mode).
   *  Not required for snapshot/role extraction methods. */
  containerSelector: z.string().default(''),
  /** Fields to extract from each matched element.
   *  Can be empty for snapshot extraction (returns full AX tree). */
  fields: z.array(extractionFieldSchema).default([]),
  /** Number of items detected at recording time (informational, list mode only) */
  itemCount: z.number().optional(),
  /** Extraction method: 'css' (default) uses containerSelector, 'role' uses accessibility tree, 'snapshot' returns full AX tree */
  extractionMethod: z.enum(['css', 'role', 'snapshot']).optional(),
  /** ARIA roles to query (when extractionMethod='role') */
  roles: z.array(z.string()).optional(),
  /** Accessible name filter (when extractionMethod='role') */
  roleName: z.string().optional(),
  /** Whether to include children content in role extraction (default true) */
  roleIncludeChildren: z.boolean().optional(),
})

/** Union of simple (non-recursive) step types - used inside forEachItem.detailSteps */
export const simpleActionStepSchema = z.discriminatedUnion('action', [
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

export type SimpleActionStep = z.infer<typeof simpleActionStepSchema>

/** Filter for forEachItem: skip items that don't match all conditions */
export const forEachFilterSchema = z.object({
  field: z.string(),
  op: z.enum(['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'regex']),
  value: z.string().default(''),
})
export type ForEachFilter = z.infer<typeof forEachFilterSchema>

export const forEachItemStepSchema = baseStepSchema.extend({
  action: z.literal('forEachItem'),
  /** Name of the source extract step whose data is iterated */
  sourceExtract: z.string(),
  /** How to open each item's detail page */
  openMethod: z.enum(['url', 'click']),
  /** Field key containing the URL (openMethod='url') */
  urlField: z.string().optional(),
  /** CSS selector or XPath for clickable element within item (openMethod='click') */
  clickSelector: z.string().optional(),
  /** Container selector from the source extract (openMethod='click', used to locate items) */
  containerSelector: z.string().optional(),
  /** Steps to execute on each item's detail page */
  detailSteps: z.array(simpleActionStepSchema).min(1),
  /** Number of parallel tabs (1=sequential, 2-5=parallel) */
  concurrency: z.number().min(1).default(3),
  /** Max items to process (0=all) */
  maxItems: z.number().min(0).default(0),
  /** Wait strategy after navigating to detail page */
  waitUntil: waitUntilSchema.default('load').optional(),
  /** Item filters - all must pass (AND logic), items that fail are skipped */
  filters: z.array(forEachFilterSchema).default([]).optional(),
})

export type ForEachItemStep = z.infer<typeof forEachItemStepSchema>

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
  forEachItemStepSchema,
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
  description: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? 'No description' : v), z.string().min(1)),
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
  /** Viewport dimensions captured at recording time - used to emulate the same resolution during replay */
  viewport: z.object({ width: z.number(), height: z.number() }).optional(),
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
 * Also handles URL-encoded placeholders (%7B%7B...%7D%7D) for backward compatibility
 * with tools saved before the URL-encoding fix.
 */
export function resolveTemplate(template: string, args: Record<string, unknown>): string {
  // First, decode any URL-encoded placeholders so they become {{...}}
  const decoded = template.replace(/%7B%7B([^%]+(?:%20[^%]+)*)%7D%7D/gi, (_match, inner: string) => {
    const key = toSnakeCase(decodeURIComponent(inner))
    const value = args[key]
    return value !== undefined ? String(value) : ''
  })
  // Then resolve normal {{...}} placeholders
  return decoded.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = args[key]
    return value !== undefined ? String(value) : ''
  })
}
