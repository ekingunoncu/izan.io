/**
 * Dynamic MCP Server
 *
 * A single MCP server instance that registers tools at runtime
 * from JSON tool definitions. Unlike the static servers in servers/,
 * this server doesn't bundle any tool logic — it loads ToolDefinition
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
import { AutomationRunner } from './automation-runner.js'
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

      // Merge all extraction data into a single response
      const hasData = Object.keys(result.data).length > 0
      const text = hasData
        ? JSON.stringify(result.data, null, 2)
        : 'Action completed successfully (no data extracted).'

      return {
        content: [{ type: 'text' as const, text }],
      }
    },
  )

  loadedTools.set(tool.name, tool)
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load tool definitions into the dynamic server.
 * Stores all definitions in `loadedTools`. If the server is already
 * connected and new (not previously known) tools are added, returns `true`
 * so the caller can restart the server + re-announce.
 *
 * MCP SDK doesn't allow registerTool() after transport connection,
 * so callers must stop → start the server when this returns `true`.
 */
export function loadToolDefinitions(tools: ToolDefinition[]): boolean {
  let hasNewTools = false

  for (const raw of tools) {
    const tool = toolDefinitionSchema.parse(raw)

    const isNew = !loadedTools.has(tool.name)
    loadedTools.set(tool.name, tool)

    if (isNew && serverInstance) {
      hasNewTools = true
    }
  }

  return hasNewTools
}

/**
 * Remove a tool definition by name.
 * Note: McpServer SDK doesn't support unregisterTool at runtime,
 * so the tool handler will return an error if called after removal.
 */
export function removeToolDefinition(toolName: string): void {
  loadedTools.delete(toolName)
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
