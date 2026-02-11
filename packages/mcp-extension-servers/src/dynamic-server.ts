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
      const result = await runner.execute(tool, args)

      if (!result.success) {
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

      return {
        content: [{ type: 'text' as const, text: formatResultForLLM(result) }],
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

/**
 * Format a RunnerResult into a structured text response for the LLM.
 * Produces human-readable output with per-lane summaries when applicable.
 * Includes source hostname when extraction data is present.
 */
function formatResultForLLM(result: RunnerResult): string {
  const hasData = Object.keys(result.data).length > 0

  // Single-lane execution (no laneSummaries)
  if (!result.laneSummaries) {
    if (!hasData) return 'Action completed successfully.'
    const hostname = tryHostname(result.sourceUrl)
    const json = JSON.stringify(result.data, null, 2)
    return hostname ? `Data extracted from ${hostname}:\n${json}` : json
  }

  // Multi-lane execution
  const lanes = result.laneSummaries
  const anyData = lanes.some(l => Object.keys(l.data).length > 0)

  // All lanes completed, none have extraction data
  if (!anyData) {
    const lines = [`All lanes completed successfully.`]
    for (const lane of lanes) {
      const status = lane.success ? 'completed' : `failed: ${lane.error}`
      lines.push(`- "${lane.name}": ${status} (${lane.stepCount} steps)`)
    }
    return lines.join('\n')
  }

  // Multi-lane with extraction data (possibly mixed)
  const lines = [`Results from ${lanes.length} parallel lanes:`]
  for (const lane of lanes) {
    lines.push('')
    const hostname = tryHostname(lane.sourceUrl)
    const header = hostname ? `## ${lane.name} (${hostname})` : `## ${lane.name}`
    lines.push(header)
    const laneHasData = Object.keys(lane.data).length > 0
    if (!lane.success) {
      lines.push(`Error: ${lane.error}`)
    } else if (laneHasData) {
      lines.push(JSON.stringify(lane.data, null, 2))
    } else {
      lines.push(`Action completed (${lane.stepCount} steps).`)
    }
  }
  return lines.join('\n')
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

  const hasTools = loadedTools.size > 0
  const server = new McpServer(
    { name: DYNAMIC_SERVER_NAME, version: '0.1.0' },
    hasTools ? { capabilities: { tools: {} } } : {},
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

  console.log(`[izan-ext] Dynamic server started with ${loadedTools.size} tool(s)`)
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
