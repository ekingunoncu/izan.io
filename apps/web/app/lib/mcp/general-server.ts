/**
 * General MCP server lifecycle helpers (client-side TabServerTransport)
 */

import {
  startGeneralServer,
  stopGeneralServer,
  isGeneralServerRunning,
} from '@izan/mcp-browser-servers'

let serverStarted = false

/**
 * Start the general MCP server if not already running
 */
export async function ensureGeneralServer(): Promise<void> {
  if (serverStarted || isGeneralServerRunning()) {
    return
  }

  try {
    await startGeneralServer()
    serverStarted = true
    console.log('[general-server] Started TabServerTransport')
  } catch (error) {
    console.error('[general-server] Failed to start:', error)
    throw error
  }
}

/**
 * Stop the general MCP server
 */
export async function shutdownGeneralServer(): Promise<void> {
  if (!serverStarted && !isGeneralServerRunning()) {
    return
  }

  try {
    await stopGeneralServer()
    serverStarted = false
    console.log('[general-server] Stopped TabServerTransport')
  } catch (error) {
    console.error('[general-server] Failed to stop:', error)
  }
}
