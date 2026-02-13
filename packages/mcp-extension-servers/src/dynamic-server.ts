/**
 * Dynamic MCP Server
 *
 * A single MCP server instance that registers tools at runtime
 * from JSON tool definitions. This server doesn't bundle any tool logic - it loads ToolDefinition
 * JSON objects and executes them via AutomationRunner.
 *
 * Tool definitions can come from:
 *   1. The web app (user-created tools stored in IndexedDB)
 *   2. Remote S3/CloudFront (built-in tools fetched on demand)
 *
 * Communication:
 *   - The web app sends tool definitions via custom events
 *   - The server registers/unregisters tools dynamically
 *   - Tool execution flows through AutomationRunner → BrowserWindow → CDP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import { z } from 'zod'
import { EXTENSION_CHANNEL_PREFIX } from './protocol.js'
import { AutomationRunner, type RunnerResult } from './automation-runner.js'
import { BrowserWindow } from './browser-window.js'
import {
  type ToolDefinition,
  type ToolParameter,
  toolDefinitionSchema,
} from './tool-schema.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const DYNAMIC_SERVER_NAME = 'izan-ext-dynamic'
const DYNAMIC_CHANNEL_ID = `${EXTENSION_CHANNEL_PREFIX}dynamic`

// ─── State ───────────────────────────────────────────────────────────────────

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null
const runner = new AutomationRunner()

/** Currently loaded tool definitions keyed by tool name */
const loadedTools = new Map<string, ToolDefinition>()

// ─── Tool Registration ──────────────────────────────────────────────────────

/**
 * Convert a ToolParameter[] to a Zod shape for MCP registerTool().
 */
function buildZodShape(params: ToolParameter[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const param of params) {
    let field: z.ZodTypeAny

    // Base type
    if (param.type === 'number') {
      field = z.number()
    } else if (param.type === 'boolean') {
      field = z.boolean()
    } else {
      field = param.enum ? z.enum(param.enum as [string, ...string[]]) : z.string()
    }

    // Description
    if (param.description) {
      field = field.describe(param.description)
    }

    // Optional + default
    if (!param.required) {
      field = field.optional()
      if (param.default !== undefined) {
        field = (field as z.ZodOptional<z.ZodTypeAny>).default(param.default as never)
      }
    }

    shape[param.name] = field
  }

  return shape
}

/**
 * Register a single tool definition on the running server.
 */
function registerTool(server: McpServer, tool: ToolDefinition): void {
  const inputSchema = buildZodShape(tool.parameters)

  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema,
    },
    async (args: Record<string, unknown>) => {
      console.log(`[izan-ext] MCP tool call: "${tool.name}" args=${JSON.stringify(args).slice(0, 200)}`)
      console.log(`[izan-ext] MCP tool "${tool.name}": ${tool.steps.length} steps, extractionMethods=[${tool.steps.filter(s => s.action === 'extract').map(s => (s as Record<string, unknown>).extractionMethod ?? 'css').join(',')}]`)
      const t0 = Date.now()
      const result = await runner.execute(tool, args)
      const dt = Date.now() - t0

      if (!result.success) {
        console.error(`[izan-ext] MCP tool "${tool.name}": FAILED in ${dt}ms - ${result.error}`)
        console.error(`[izan-ext] MCP tool "${tool.name}": log=${JSON.stringify(result.log).slice(0, 500)}`)
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              log: result.log,
            }, null, 2),
          }],
          isError: true,
        }
      }

      const dataKeys = Object.keys(result.data)
      console.log(`[izan-ext] MCP tool "${tool.name}": OK in ${dt}ms, data keys=[${dataKeys.join(',')}]`)
      for (const k of dataKeys) {
        const v = result.data[k]
        const preview = Array.isArray(v) ? `array(${v.length})` : typeof v === 'object' && v ? `object(${Object.keys(v).length})` : String(v).slice(0, 100)
        console.log(`[izan-ext] MCP tool "${tool.name}": data["${k}"] = ${preview}`)
      }

      const formatted = formatResultForLLM(result)
      console.log(`[izan-ext] MCP tool "${tool.name}": formatted response length=${formatted.length}`)

      return {
        content: [{ type: 'text' as const, text: formatted }],
      }
    },
  )

  loadedTools.set(tool.name, tool)
}

// ─── Response Formatting ─────────────────────────────────────────────────────

/** Extract hostname from a URL string, returning undefined on failure */
function tryHostname(url?: string): string | undefined {
  if (!url) return undefined
  try { return new URL(url).hostname } catch { return undefined }
}

/** Escape pipe chars in cell values for markdown table */
function escapeCell(v: unknown): string {
  if (v == null || v === '') return ''
  const s = String(v).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim()
  // Truncate very long values to keep table readable
  return s.length > 200 ? s.slice(0, 197) + '...' : s
}

/**
 * Format a flat array of objects as a markdown table.
 * Most token-efficient format for tabular data - LLMs parse it natively.
 */
function toMarkdownTable(items: Record<string, unknown>[]): string {
  if (items.length === 0) return ''
  // Collect all keys across items
  const keys: string[] = []
  const keySet = new Set<string>()
  for (const item of items) {
    for (const k of Object.keys(item)) {
      if (!keySet.has(k)) { keySet.add(k); keys.push(k) }
    }
  }
  const header = '| ' + keys.join(' | ') + ' |'
  const sep = '|' + keys.map(() => '---|').join('')
  const rows = items.map(item =>
    '| ' + keys.map(k => escapeCell(item[k])).join(' | ') + ' |',
  )
  return [header, sep, ...rows].join('\n')
}

/**
 * Format a single object as key: value lines.
 */
function toKeyValue(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`
      return `${k}: ${v}`
    })
    .join('\n')
}

/** Recursively clean object: remove null/empty, flatten nested objects, truncate long strings. */
function cleanObj(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '') continue
    if (typeof v === 'string') {
      // Truncate very long text values (e.g. full app descriptions)
      result[prefix + k] = v.length > 500 ? v.slice(0, 497) + '...' : v
    } else if (Array.isArray(v)) {
      // Keep arrays but clean each item
      const cleaned = v.filter(item => item != null && item !== '')
      if (cleaned.length > 0) result[prefix + k] = cleaned
    } else if (typeof v === 'object') {
      // Flatten nested objects into parent with prefix
      const nested = cleanObj(v as Record<string, unknown>)
      for (const [nk, nv] of Object.entries(nested)) {
        result[prefix + k + '.' + nk] = nv
      }
    } else {
      result[prefix + k] = v
    }
  }
  return result
}

/** Clean extraction data: remove null/empty values, flatten nested objects, filter empty items from arrays. */
function cleanData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      const filtered = (value as Record<string, unknown>[])
        .map(item => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return cleanObj(item)
          }
          return item
        })
        .filter((item): item is Record<string, unknown> => item != null && (typeof item !== 'object' || Object.keys(item).length > 0))
      if (filtered.length > 0) cleaned[key] = filtered
    } else if (value != null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(cleaned, cleanObj(value as Record<string, unknown>, key + '.'))
      } else {
        cleaned[key] = value
      }
    }
  }
  return cleaned
}

/** Max items to include in a table before truncating */
const MAX_TABLE_ITEMS = 200
/** Max total characters for the formatted LLM response */
const MAX_RESULT_CHARS = 50_000

/** Format a single extraction result (could be array or object) */
function formatExtraction(value: unknown): string {
  if (Array.isArray(value)) {
    // Flat array of objects → markdown table
    const items = value as Record<string, unknown>[]
    if (items.length === 0) return ''
    // Check if items are flat objects (all values are primitives)
    const isFlat = items.every(item =>
      typeof item === 'object' && item !== null &&
      Object.values(item).every(v => v == null || typeof v !== 'object'),
    )
    if (isFlat) {
      if (items.length > MAX_TABLE_ITEMS) {
        const table = toMarkdownTable(items.slice(0, MAX_TABLE_ITEMS))
        return `${table}\n\n*Showing ${MAX_TABLE_ITEMS} of ${items.length} items.*`
      }
      return toMarkdownTable(items)
    }
    // Nested objects fallback to JSON - truncate if massive
    const json = JSON.stringify(value, null, 2)
    if (json.length > MAX_RESULT_CHARS) {
      const truncItems = items.slice(0, Math.max(10, Math.floor(items.length / 2)))
      return JSON.stringify(truncItems, null, 2) + `\n\n/* Showing ${truncItems.length} of ${items.length} items */`
    }
    return json
  }
  if (typeof value === 'object' && value !== null) {
    return toKeyValue(value as Record<string, unknown>)
  }
  return String(value)
}

/**
 * Format a RunnerResult into a structured response for the LLM.
 * Uses markdown tables for list data (most token-efficient).
 * Uses key: value pairs for single extractions.
 */
/** Apply final character cap to any formatted output */
function capOutput(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) return text
  return text.slice(0, MAX_RESULT_CHARS) + '\n\n---\n*Output truncated - exceeded maximum response size.*'
}

/** Format cleaned extraction data into markdown sections */
function formatCleanedData(data: Record<string, unknown>, parts: string[]): void {
  const cleaned = cleanData(data)
  const keys = Object.entries(cleaned)
  for (const [key, value] of keys) {
    if (keys.length > 1) parts.push(`### ${key}`)
    parts.push(formatExtraction(value))
  }
}

function formatResultForLLM(result: RunnerResult): string {
  const hasData = Object.keys(result.data).length > 0
  console.log(`[izan-ext] formatResultForLLM: hasData=${hasData} dataKeys=[${Object.keys(result.data).join(',')}] hasLaneSummaries=${!!result.laneSummaries}`)

  // Single-lane execution (no laneSummaries)
  if (!result.laneSummaries) {
    if (!hasData) {
      console.log('[izan-ext] formatResultForLLM: no data keys → "Action completed successfully."')
      return 'Action completed successfully.'
    }
    const cleaned = cleanData(result.data)
    console.log(`[izan-ext] formatResultForLLM: after cleanData → ${Object.keys(cleaned).length} keys: [${Object.keys(cleaned).join(',')}]`)
    for (const [k, v] of Object.entries(result.data)) {
      const raw = Array.isArray(v) ? `array(${v.length})` : typeof v === 'object' && v ? `object(${Object.keys(v).length})` : String(v).slice(0, 80)
      const cleanedVal = cleaned[k]
      const cleanedStr = cleanedVal === undefined ? 'REMOVED' : Array.isArray(cleanedVal) ? `array(${cleanedVal.length})` : typeof cleanedVal
      console.log(`[izan-ext] formatResultForLLM: data["${k}"] raw=${raw} → cleaned=${cleanedStr}`)
    }
    if (Object.keys(cleaned).length === 0) {
      console.warn('[izan-ext] formatResultForLLM: all data cleaned away → "no meaningful data"')
      return 'Action completed but no meaningful data was extracted.'
    }
    const parts: string[] = []
    const hostname = tryHostname(result.sourceUrl)
    if (hostname) parts.push(`Source: ${hostname}`)
    formatCleanedData(result.data, parts)
    return capOutput(parts.join('\n\n'))
  }

  // Multi-lane execution
  const lanes = result.laneSummaries
  const anyData = lanes.some(l => Object.keys(l.data).length > 0)

  // All lanes completed, none have extraction data
  if (!anyData) {
    const lines = ['All lanes completed successfully.']
    for (const lane of lanes) {
      const status = lane.success ? 'completed' : `failed: ${lane.error}`
      lines.push(`- "${lane.name}": ${status} (${lane.stepCount} steps)`)
    }
    return lines.join('\n')
  }

  // Multi-lane with extraction data
  const parts: string[] = []
  for (const lane of lanes) {
    const hostname = tryHostname(lane.sourceUrl)
    parts.push(hostname ? `## ${lane.name} (${hostname})` : `## ${lane.name}`)
    if (!lane.success) {
      parts.push(`Error: ${lane.error}`)
    } else if (Object.keys(lane.data).length > 0) {
      formatCleanedData(lane.data, parts)
    } else {
      parts.push(`Completed (${lane.stepCount} steps).`)
    }
  }
  return capOutput(parts.join('\n\n'))
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load tool definitions into the dynamic server.
 * Replaces the full set of loaded tools. If the server is already
 * connected and the tool set changed (added or removed), returns `true`
 * so the caller can restart the server + re-announce.
 *
 * MCP SDK doesn't allow registerTool()/unregisterTool() after transport
 * connection, so callers must stop → start the server when this returns `true`.
 */
export function loadToolDefinitions(tools: ToolDefinition[]): boolean {
  let changed = false

  const incomingNames = new Set<string>()

  for (const raw of tools) {
    const tool = toolDefinitionSchema.parse(raw)
    incomingNames.add(tool.name)

    const existing = loadedTools.get(tool.name)

    if (!existing) {
      // Brand new tool
      loadedTools.set(tool.name, tool)
      if (serverInstance) changed = true
    } else if (JSON.stringify(existing) !== JSON.stringify(tool)) {
      // Existing tool with changed content - handler closure has stale ref, need restart
      loadedTools.set(tool.name, tool)
      if (serverInstance) changed = true
    }
  }

  // Remove tools that are no longer in the incoming set
  for (const name of loadedTools.keys()) {
    if (!incomingNames.has(name)) {
      loadedTools.delete(name)
      changed = true
    }
  }

  return changed
}

/**
 * Add or update a single tool definition without affecting other loaded tools.
 * Returns `true` if the server needs to be restarted (new tool or content changed).
 */
export function addToolDefinition(tool: ToolDefinition): boolean {
  const parsed = toolDefinitionSchema.parse(tool)
  const existing = loadedTools.get(parsed.name)

  if (!existing) {
    loadedTools.set(parsed.name, parsed)
    return serverInstance !== null
  }

  if (JSON.stringify(existing) !== JSON.stringify(parsed)) {
    loadedTools.set(parsed.name, parsed)
    return serverInstance !== null
  }

  return false
}

/**
 * Remove a tool definition by name.
 * Returns true if the tool existed and was removed.
 * Note: McpServer SDK doesn't support unregisterTool at runtime,
 * so callers should restart the server after removal.
 */
export function removeToolDefinition(toolName: string): boolean {
  return loadedTools.delete(toolName)
}

/**
 * Get all currently loaded tool definitions.
 */
export function getLoadedTools(): ToolDefinition[] {
  return Array.from(loadedTools.values())
}

/**
 * Get the number of loaded tools.
 */
export function getLoadedToolCount(): number {
  return loadedTools.size
}

/**
 * Start the dynamic MCP server.
 * When there are 0 tools, starts without `tools` capability so the
 * MCP client doesn't call tools/list (avoids -32601 "Method not found").
 * When tools arrive later, the server is restarted with the capability.
 */
export async function startDynamicServer(): Promise<boolean> {
  if (serverInstance) return false

  // Always has at least accessibility_snapshot built-in tool
  const server = new McpServer(
    { name: DYNAMIC_SERVER_NAME, version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  // Register built-in accessibility_snapshot tool
  server.registerTool(
    'accessibility_snapshot',
    {
      description: 'Get the accessibility tree of the current page or a specific element. Returns a compact text representation with roles, names, and properties. Use to understand page structure. Pass a CSS selector or XPath to scope to a specific element subtree.',
      inputSchema: {
        selector: z.string().optional().describe('Optional CSS selector or XPath to scope the snapshot to a specific element subtree'),
      },
    },
    async (args: { selector?: string }) => {
      const bw = BrowserWindow.getInstance()
      if (!bw.isOpen()) {
        return {
          content: [{ type: 'text' as const, text: 'No automation browser is open. Run a macro with navigate step first.' }],
          isError: true,
        }
      }
      const tree = await bw.accessibilitySnapshot(args.selector)
      return { content: [{ type: 'text' as const, text: tree as string }] }
    },
  )

  // Register all queued/pre-loaded tools
  for (const tool of loadedTools.values()) {
    registerTool(server, tool)
  }

  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId: DYNAMIC_CHANNEL_ID,
  })

  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  console.log(`[izan-ext] Dynamic server started with ${loadedTools.size} tool(s) + accessibility_snapshot`)
  return true
}

/**
 * Stop the dynamic MCP server.
 */
export async function stopDynamicServer(): Promise<void> {
  if (serverInstance) {
    try { await serverInstance.close() } catch { /* ignore */ }
    serverInstance = null
  }
  if (transportInstance) {
    try { await transportInstance.close() } catch { /* ignore */ }
    transportInstance = null
  }
}

/**
 * Check whether the dynamic server is currently running.
 */
export function isDynamicServerRunning(): boolean {
  return serverInstance !== null
}

/**
 * Get metadata for the dynamic server (for announcement).
 */
export function getDynamicServerMeta() {
  return {
    id: 'ext-dynamic',
    name: 'Dynamic Automation Tools',
    description: 'User-created and remotely-loaded automation tools',
    category: 'automation',
    channelId: DYNAMIC_CHANNEL_ID,
  }
}
