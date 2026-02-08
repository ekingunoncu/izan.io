/**
 * Domain-check client-side MCP server lifecycle helpers
 * Manages TabServerTransport server instance
 */

import {
  startDomainCheckServer,
  stopDomainCheckServer,
  isDomainCheckServerRunning,
} from '@izan/mcp-browser-servers'

let serverStarted = false

/**
 * Start the domain-check MCP server if not already running
 */
export async function ensureDomainCheckServer(): Promise<void> {
  if (serverStarted || isDomainCheckServerRunning()) {
    return
  }

  try {
    await startDomainCheckServer()
    serverStarted = true
    console.log('[domain-check-server] Started TabServerTransport')
  } catch (error) {
    console.error('[domain-check-server] Failed to start:', error)
    throw error
  }
}

/**
 * Stop the domain-check MCP server
 */
export async function shutdownDomainCheckServer(): Promise<void> {
  if (!serverStarted && !isDomainCheckServerRunning()) {
    return
  }

  try {
    await stopDomainCheckServer()
    serverStarted = false
    console.log('[domain-check-server] Stopped TabServerTransport')
  } catch (error) {
    console.error('[domain-check-server] Failed to stop:', error)
  }
}
