/**
 * Stdio MCP Server
 *
 * Exposes tools from the Chrome extension as a standard MCP server
 * that communicates via stdin/stdout (for Claude Desktop, Cursor, etc.).
 *
 * Tool registration is dynamic: when the extension connects and sends
 * its tool list, we restart the server with the new tools.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import type { CodeToolDefinition, ToolParameter } from './protocol.js'
import type { WSBridge } from './ws-bridge.js'

let server: McpServer | null = null
let transport: StdioServerTransport | null = null
let callCounter = 0

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

function generateCallId(): string {
  return `call_${++callCounter}_${Date.now()}`
}

export async function startStdioServer(tools: CodeToolDefinition[], bridge: WSBridge): Promise<void> {
  // Stop existing server if running
  if (server) {
    try { await server.close() } catch { /* ignore */ }
    server = null
  }

  server = new McpServer(
    { name: 'izan-browser', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  // Register each tool from the extension
  for (const tool of tools) {
    const inputSchema = buildZodShape(tool.parameters)

    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema },
      async (args: Record<string, unknown>) => {
        const callId = generateCallId()
        process.stderr.write(`[izan-mcp] Tool call: ${tool.name} (${callId})\n`)

        const result = await bridge.callTool(callId, tool.name, args)

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `Error: ${result.error}` }],
            isError: true,
          }
        }

        const text = typeof result.data === 'string'
          ? result.data
          : JSON.stringify(result.data, null, 2)

        return {
          content: [{ type: 'text' as const, text }],
        }
      },
    )
  }

  process.stderr.write(`[izan-mcp] MCP server registered ${tools.length} tool(s)\n`)

  // First time: create transport. Subsequent: reuse (stdio can't be re-opened)
  if (!transport) {
    transport = new StdioServerTransport()
    await server.connect(transport)
    process.stderr.write('[izan-mcp] MCP server connected to stdio\n')
  } else {
    await server.connect(transport)
    process.stderr.write('[izan-mcp] MCP server reconnected to stdio\n')
  }
}

export async function stopStdioServer(): Promise<void> {
  if (server) {
    try { await server.close() } catch { /* ignore */ }
    server = null
  }
}
