/**
 * Random Number Generator - MCP Server
 *
 * Uses TabServerTransport from @mcp-b/transports for in-browser communication.
 * Follows the same lifecycle pattern as @izan/mcp-browser-servers.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import { EXTENSION_CHANNEL_PREFIX } from '../../src/protocol.js'
import {
  handleGenerateRandomNumber,
  TOOL_NAME,
  TOOL_DESCRIPTION,
  TOOL_INPUT_SCHEMA,
} from './tools.js'

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null

/**
 * Start the random-number MCP server.
 * @returns `true` if started successfully, `false` if already running.
 */
export async function startRandomNumberServer(): Promise<boolean> {
  if (serverInstance) {
    return false
  }

  const server = new McpServer(
    { name: 'izan-ext-random-number', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.registerTool(
    TOOL_NAME,
    { description: TOOL_DESCRIPTION, inputSchema: TOOL_INPUT_SCHEMA },
    async (args) => {
      const result = await handleGenerateRandomNumber(args)
      return { content: [{ type: 'text' as const, text: result }] }
    },
  )

  const channelId = `${EXTENSION_CHANNEL_PREFIX}random-number`
  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId,
  })

  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  return true
}

/**
 * Stop the random-number MCP server.
 */
export async function stopRandomNumberServer(): Promise<void> {
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
 * Check whether the random-number server is currently running.
 */
export function isRandomNumberServerRunning(): boolean {
  return serverInstance !== null
}
