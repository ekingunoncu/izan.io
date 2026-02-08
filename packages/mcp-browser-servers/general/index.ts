/**
 * @izan/mcp-browser-servers - General purpose MCP server (client-side)
 * Uses TabServerTransport from @mcp-b/transports
 */

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import {
  handleGetTime,
  handleRandomNumber,
  handleUuid,
  handleCalculate,
  handleGeneratePassword,
} from './tools.js'

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null

/**
 * Start the general MCP server
 * Returns true if started successfully, false if already running
 */
export async function startGeneralServer(): Promise<boolean> {
  if (serverInstance) {
    return false // Already running
  }

  const server = new McpServer(
    {
      name: 'izan-general',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  server.registerTool('get_time', {
    description: 'Returns the current date and time. Optionally accepts a timezone.',
    inputSchema: {
      timezone: z.string().optional().describe('IANA timezone (e.g. Europe/Istanbul). Defaults to UTC.'),
    },
  }, async ({ timezone }) => {
    const result = await handleGetTime({ timezone })
    return { content: [{ type: 'text' as const, text: result }] }
  })

  server.registerTool('random_number', {
    description: 'Generates a random integer between min and max (inclusive).',
    inputSchema: {
      min: z.number().optional().describe('Minimum (inclusive)'),
      max: z.number().optional().describe('Maximum (inclusive)'),
    },
  }, async (args) => {
    const result = await handleRandomNumber(args)
    return { content: [{ type: 'text' as const, text: result }] }
  })

  server.registerTool('uuid', {
    description: 'Generates a random UUID v4.',
    inputSchema: {},
  }, async () => {
    const result = await handleUuid({})
    return { content: [{ type: 'text' as const, text: result }] }
  })

  server.registerTool('calculate', {
    description: 'Evaluates a simple math expression. Supports +, -, *, /, parentheses. Only numbers allowed.',
    inputSchema: {
      expression: z.string().describe('Math expression (e.g. "2 + 3 * 4")'),
    },
  }, async ({ expression }) => {
    const result = await handleCalculate({ expression })
    return { content: [{ type: 'text' as const, text: result }] }
  })

  server.registerTool('generate_password', {
    description: 'Generates a random secure password.',
    inputSchema: {
      length: z.number().optional().describe('Password length (8-64)'),
      include_symbols: z.boolean().optional().describe('Include special characters'),
    },
  }, async (args) => {
    const result = await handleGeneratePassword(args)
    return { content: [{ type: 'text' as const, text: result }] }
  })

  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId: 'izan-general',
  })
  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  return true
}

/**
 * Stop the general MCP server
 */
export async function stopGeneralServer(): Promise<void> {
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

export function isGeneralServerRunning(): boolean {
  return serverInstance !== null
}
