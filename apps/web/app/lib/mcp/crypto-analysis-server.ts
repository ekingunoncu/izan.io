/**
 * Crypto-analysis client-side MCP server lifecycle helpers
 * Manages TabServerTransport server instance
 */

import {
  startCryptoAnalysisServer,
  stopCryptoAnalysisServer,
  isCryptoAnalysisServerRunning,
  setCoinGeckoApiKey,
} from '@izan/mcp-browser-servers'

let serverStarted = false

/**
 * Start the crypto-analysis MCP server if not already running.
 * Pass optional CoinGecko API key for higher rate limits.
 */
export async function ensureCryptoAnalysisServer(apiKey?: string | null): Promise<void> {
  setCoinGeckoApiKey(apiKey ?? null)

  if (serverStarted || isCryptoAnalysisServerRunning()) {
    return
  }

  try {
    await startCryptoAnalysisServer()
    serverStarted = true
    console.log('[crypto-analysis-server] Started TabServerTransport')
  } catch (error) {
    console.error('[crypto-analysis-server] Failed to start:', error)
    throw error
  }
}

/**
 * Stop the crypto-analysis MCP server
 */
export async function shutdownCryptoAnalysisServer(): Promise<void> {
  if (!serverStarted && !isCryptoAnalysisServerRunning()) {
    return
  }

  try {
    await stopCryptoAnalysisServer()
    serverStarted = false
    console.log('[crypto-analysis-server] Stopped TabServerTransport')
  } catch (error) {
    console.error('[crypto-analysis-server] Failed to stop:', error)
  }
}
