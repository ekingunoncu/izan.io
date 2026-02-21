/**
 * Image Generation MCP server lifecycle helpers (client-side TabServerTransport)
 */

import {
  startImageGenServer,
  stopImageGenServer,
  isImageGenServerRunning,
} from '@izan/mcp-browser-servers'
import type { ImageProvider } from '@izan/mcp-browser-servers'

let serverStarted = false

/**
 * Start the image generation MCP server if not already running.
 * Injects API key resolver from the model store.
 */
export async function ensureImageGenServer(
  getApiKey: (provider: ImageProvider) => string | null,
): Promise<void> {
  if (serverStarted || isImageGenServerRunning()) {
    return
  }

  try {
    await startImageGenServer(getApiKey)
    serverStarted = true
    console.log('[image-gen-server] Started TabServerTransport')
  } catch (error) {
    console.error('[image-gen-server] Failed to start:', error)
    throw error
  }
}

/**
 * Stop the image generation MCP server
 */
export async function shutdownImageGenServer(): Promise<void> {
  if (!serverStarted && !isImageGenServerRunning()) {
    return
  }

  try {
    await stopImageGenServer()
    serverStarted = false
    console.log('[image-gen-server] Stopped TabServerTransport')
  } catch (error) {
    console.error('[image-gen-server] Failed to stop:', error)
  }
}
