/**
 * @izan/mcp-client-side - MCP Server for browser-based domain availability checks
 * Uses TabServerTransport from @mcp-b/transports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { TabServerTransport } from '@mcp-b/transports'
import { TOOLS } from './tools.js'

let serverInstance: Server | null = null
let transportInstance: TabServerTransport | null = null

/**
 * Start the domain-check MCP server
 * Returns true if started successfully, false if already running
 */
export async function startDomainCheckServer(): Promise<boolean> {
  if (serverInstance) {
    return false // Already running
  }

  const server = new Server(
    {
      name: 'izan-domain-check',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }
  })

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    const tool = TOOLS.find((t) => t.name === name)
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }

    const result = await tool.handler((args ?? {}) as Record<string, unknown>)
    return {
      content:
        'content' in result && Array.isArray(result.content)
          ? result.content
          : [{ type: 'text' as const, text: String(result) }],
      isError: false,
    }
  })

  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId: 'izan-domain-check',
  })
  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  return true
}

/**
 * Stop the domain-check MCP server
 */
export async function stopDomainCheckServer(): Promise<void> {
  if (serverInstance) {
    try {
      await serverInstance.close()
    } catch {
      // Ignore close errors
    }
    serverInstance = null
  }
  if (transportInstance) {
    try {
      await transportInstance.close()
    } catch {
      // Ignore close errors
    }
    transportInstance = null
  }
}

/**
 * Check if server is running
 */
export function isDomainCheckServerRunning(): boolean {
  return serverInstance !== null
}
