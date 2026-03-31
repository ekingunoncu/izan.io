/**
 * Dynamic MCP Server
 *
 * A single MCP server instance that registers code-based tools at runtime.
 * Tools are JavaScript functions that receive (params, browser) and return data.
 *
 * Communication:
 *   - TabServerTransport for web app / zihin.io (postMessage)
 *   - WebSocket bridge for external MCP clients (Claude Desktop, Cursor, etc.)
 *   - Tool execution flows through code-tool-executor → BrowserWindow → CDP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import { z } from 'zod'
import { EXTENSION_CHANNEL_PREFIX } from './protocol.js'
import type { CodeToolDefinition, ToolParameter } from './code-tool-types.js'
import { executeCodeTool } from './code-tool-executor.js'
import { BrowserWindow } from './browser-window.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const DYNAMIC_SERVER_NAME = 'izan-ext-dynamic'
const DYNAMIC_CHANNEL_ID = `${EXTENSION_CHANNEL_PREFIX}dynamic`

// ─── State ───────────────────────────────────────────────────────────────────

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null

/** Currently loaded code tool definitions keyed by tool name */
const loadedTools = new Map<string, CodeToolDefinition>()

// ─── Tool Registration ───────────────────────────────────────────────────────

function buildZodShape(params: ToolParameter[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const param of params) {
    let field: z.ZodTypeAny
    if (param.type === 'number') field = z.number()
    else if (param.type === 'boolean') field = z.boolean()
    else field = param.enum ? z.enum(param.enum as [string, ...string[]]) : z.string()

    if (param.description) field = field.describe(param.description)
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

function registerCodeTool(server: McpServer, tool: CodeToolDefinition): void {
  const inputSchema = buildZodShape(tool.parameters)

  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema },
    // @ts-ignore - MCP SDK type depth issue with dynamic Zod shapes
    async (args: Record<string, unknown>) => {
      console.log(`[izan-ext] Tool call: "${tool.name}" args=${JSON.stringify(args).slice(0, 200)}`)
      const t0 = Date.now()

      const result = await executeCodeTool(tool, args)
      const dt = Date.now() - t0

      if (!result.success) {
        console.error(`[izan-ext] Tool "${tool.name}": FAILED in ${dt}ms - ${result.error}`)
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error}` }],
          isError: true,
        }
      }

      console.log(`[izan-ext] Tool "${tool.name}": OK in ${dt}ms`)

      const text = formatResult(result.data)
      return { content: [{ type: 'text' as const, text }] }
    },
  )

  loadedTools.set(tool.name, tool)
}

// ─── Response Formatting ─────────────────────────────────────────────────────

const MAX_RESULT_CHARS = 50_000

function escapeCell(v: unknown): string {
  if (v == null || v === '') return ''
  const s = String(v).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim()
  return s.length > 200 ? s.slice(0, 197) + '...' : s
}

function toMarkdownTable(items: Record<string, unknown>[]): string {
  if (items.length === 0) return ''
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

function formatResult(data: unknown): string {
  if (data == null) return 'Action completed successfully.'
  if (typeof data === 'string') return capOutput(data)

  if (Array.isArray(data)) {
    if (data.length === 0) return 'No results found.'
    // Check if flat array of objects -> markdown table
    const isFlat = data.every(item =>
      typeof item === 'object' && item !== null &&
      Object.values(item).every(v => v == null || typeof v !== 'object'),
    )
    if (isFlat) {
      const table = data.length > 200
        ? toMarkdownTable(data.slice(0, 200)) + `\n\n*Showing 200 of ${data.length} items.*`
        : toMarkdownTable(data as Record<string, unknown>[])
      return capOutput(table)
    }
    return capOutput(JSON.stringify(data, null, 2))
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== '')
    if (entries.length === 0) return 'Action completed successfully.'
    const text = entries.map(([k, v]) => {
      if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`
      return `${k}: ${v}`
    }).join('\n')
    return capOutput(text)
  }

  return String(data)
}

function capOutput(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) return text
  return text.slice(0, MAX_RESULT_CHARS) + '\n\n---\n*Output truncated.*'
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load code tool definitions. Replaces the full set.
 * Returns true if the server needs restart (tools changed).
 */
export function loadToolDefinitions(tools: CodeToolDefinition[]): boolean {
  let changed = false
  const incomingNames = new Set<string>()

  for (const tool of tools) {
    incomingNames.add(tool.name)
    const existing = loadedTools.get(tool.name)

    if (!existing) {
      loadedTools.set(tool.name, tool)
      if (serverInstance) changed = true
    } else if (existing.code !== tool.code || existing.description !== tool.description ||
      JSON.stringify(existing.parameters) !== JSON.stringify(tool.parameters)) {
      loadedTools.set(tool.name, tool)
      if (serverInstance) changed = true
    }
  }

  for (const name of loadedTools.keys()) {
    if (!incomingNames.has(name)) {
      loadedTools.delete(name)
      changed = true
    }
  }

  return changed
}

/**
 * Add or update a single code tool.
 * Returns true if the server needs restart.
 */
export function addToolDefinition(tool: CodeToolDefinition): boolean {
  const existing = loadedTools.get(tool.name)

  if (!existing) {
    loadedTools.set(tool.name, tool)
    return serverInstance !== null
  }

  if (existing.code !== tool.code || existing.description !== tool.description ||
    JSON.stringify(existing.parameters) !== JSON.stringify(tool.parameters)) {
    loadedTools.set(tool.name, tool)
    return serverInstance !== null
  }

  return false
}

/**
 * Remove a tool by name. Returns true if it existed.
 */
export function removeToolDefinition(toolName: string): boolean {
  return loadedTools.delete(toolName)
}

/**
 * Get all loaded tools as an array.
 */
export function getLoadedTools(): CodeToolDefinition[] {
  return Array.from(loadedTools.values())
}

export function getLoadedToolCount(): number {
  return loadedTools.size
}

/**
 * Start the dynamic MCP server with TabServerTransport.
 */
export async function startDynamicServer(): Promise<boolean> {
  if (serverInstance) return false

  const server = new McpServer(
    { name: DYNAMIC_SERVER_NAME, version: '0.2.0' },
    { capabilities: { tools: {} } },
  )

  // Built-in: accessibility_snapshot
  server.registerTool(
    'accessibility_snapshot',
    {
      description: 'Get the accessibility tree of the current page or a specific element. Returns a text representation with roles, names, and properties. Pass a CSS selector to scope to a subtree.',
      inputSchema: {
        selector: z.string().optional().describe('Optional CSS selector to scope the snapshot'),
      },
    },
    // @ts-ignore - MCP SDK type depth issue
    async (args: { selector?: string }) => {
      const bw = BrowserWindow.getInstance()
      if (!bw.isOpen()) {
        return {
          content: [{ type: 'text' as const, text: 'No browser tab is open. Use a tool that opens a URL first.' }],
          isError: true,
        }
      }
      const tree = await bw.accessibilitySnapshot(args.selector)
      return { content: [{ type: 'text' as const, text: tree as string }] }
    },
  )

  // Built-in: web_fetch
  server.registerTool(
    'web_fetch',
    {
      description: 'Open a URL in the browser and return its accessibility tree. Use this to read any web page.',
      inputSchema: {
        url: z.string().describe('Full URL to fetch (e.g. "https://example.com")'),
      },
    },
    // @ts-ignore - MCP SDK type depth issue
    async (args: { url: string }) => {
      const bw = BrowserWindow.getInstance()
      if (bw.isOpen() && bw.isAttachedOnly()) await bw.close()
      if (bw.isOpen()) await bw.navigate(args.url)
      else await bw.open(args.url)
      await bw.waitForLoad()
      await bw.wait(1000)
      const tree = await bw.accessibilitySnapshot()
      return { content: [{ type: 'text' as const, text: tree as string }] }
    },
  )

  // Register all code-based tools
  for (const tool of loadedTools.values()) {
    registerCodeTool(server, tool)
  }

  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId: DYNAMIC_CHANNEL_ID,
  })

  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  console.log(`[izan-ext] Dynamic server started with ${loadedTools.size} tool(s) + built-ins`)
  return true
}

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

export function isDynamicServerRunning(): boolean {
  return serverInstance !== null
}

export function getDynamicServerMeta() {
  return {
    id: 'ext-dynamic',
    name: 'izan.io Browser Tools',
    description: 'Code-based browser automation tools for AI',
    category: 'automation',
    channelId: DYNAMIC_CHANNEL_ID,
  }
}
