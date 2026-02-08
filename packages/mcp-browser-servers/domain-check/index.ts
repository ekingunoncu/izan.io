/**
 * @izan/mcp-browser-servers - MCP Server for browser-based domain availability checks
 * Uses TabServerTransport from @mcp-b/transports
 */

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import { handleCheckDomainsAvailability } from './tools.js'

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null

/**
 * Start the domain-check MCP server
 * Returns true if started successfully, false if already running
 */
export async function startDomainCheckServer(): Promise<boolean> {
  if (serverInstance) {
    return false // Already running
  }

  const server = new McpServer(
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

  server.registerTool('check_domains_availability', {
    description:
      'Fast bulk domain availability check via RDAP. No API key. 1–15 domains, parallel. Use BEFORE get_domain_price or get_domains_price (Namecheap) for pricing.',
    inputSchema: {
      domains: z
        .string()
        .describe(
          'Comma-separated domains (e.g. "example.com, test.io, myapp.net"). Max 15.',
        ),
      concurrency: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of parallel workers (1–10, default 4)'),
    },
  }, async (args) => {
    const result = await handleCheckDomainsAvailability(args)
    return result
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
