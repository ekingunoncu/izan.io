/**
 * Stdio MCP Server
 *
 * Uses the low-level MCP Server API so we can dynamically update the tool list
 * when the extension adds/removes tools — without restarting the server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { CodeToolDefinition } from './protocol.js'
import type { WSBridge } from './ws-bridge.js'

let server: Server | null = null

export async function startStdioServer(bridge: WSBridge, getTools: () => CodeToolDefinition[]): Promise<void> {
  server = new Server(
    { name: 'izan-browser', version: '0.1.0' },
    { capabilities: { tools: { listChanged: true } } },
  )

  // Dynamic tool list — always returns the latest tools from extension
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getTools()
    return {
      tools: tools.map(t => ({
        name: t.name,
        description: t.description || '',
        inputSchema: {
          type: 'object' as const,
          properties: Object.fromEntries(
            (t.parameters || []).map(p => [p.name, {
              type: p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean' : 'string',
              description: p.description || '',
            }])
          ),
          required: (t.parameters || []).filter(p => p.required).map(p => p.name),
        },
      })),
    }
  })

  // Tool call handler — forwards to extension via bridge
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const callId = `call_${Date.now()}`
    process.stderr.write(`[izan-mcp] Tool call: ${name} (${callId})\n`)

    if (!bridge.isConnected()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Chrome extension is not connected' }],
        isError: true,
      }
    }

    const result = await bridge.callTool(callId, name, (args ?? {}) as Record<string, unknown>)

    if (!result.success) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${result.error}` }],
        isError: true,
      }
    }

    const text = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)
    return { content: [{ type: 'text' as const, text }] }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  const tools = getTools()
  process.stderr.write(`[izan-mcp] MCP server started with ${tools.length} tool(s)\n`)
}

/** Notify the MCP client that the tool list has changed */
export async function notifyToolListChanged(): Promise<void> {
  if (!server) return
  try {
    await server.sendToolListChanged()
    process.stderr.write('[izan-mcp] Notified client: tool list changed\n')
  } catch { /* client might not support notifications */ }
}

export async function stopStdioServer(): Promise<void> {
  if (server) {
    try { await server.close() } catch { /* ignore */ }
    server = null
  }
}
