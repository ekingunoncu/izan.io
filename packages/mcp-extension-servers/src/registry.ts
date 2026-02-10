/**
 * Extension Server Registry
 *
 * Manages the lifecycle of all MCP servers within the extension.
 * Provides a single entry point to start/stop all servers and
 * collect their metadata for announcement to the web app.
 *
 * To add a new server:
 *   1. Create a directory under `servers/` with config.json, index.ts, tools.ts
 *   2. Import and register it in the `SERVER_ENTRIES` array below
 */

import type { ExtensionServerMeta } from './protocol.js'

// ─── Server Imports ───────────────────────────────────────────────────────────

import randomNumberConfig from '../servers/random-number/config.json'
import {
  startRandomNumberServer,
  stopRandomNumberServer,
  isRandomNumberServerRunning,
} from '../servers/random-number/index.js'

// Dynamic server (JSON-based automation tools)
import {
  startDynamicServer,
  stopDynamicServer,
  isDynamicServerRunning,
  getDynamicServerMeta,
} from './dynamic-server.js'

// ─── Server Entry Type ───────────────────────────────────────────────────────

interface ServerEntry {
  /** Server config loaded from config.json */
  config: { id: string; name: string; description: string; category: string }
  /** Start the server. Returns true if started, false if already running. */
  start: () => Promise<boolean>
  /** Stop the server gracefully. */
  stop: () => Promise<void>
  /** Check if the server is currently running. */
  isRunning: () => boolean
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * All registered extension MCP servers.
 *
 * To add a new server, append a new entry here after importing its
 * start/stop/isRunning functions and config.json.
 */
const SERVER_ENTRIES: ServerEntry[] = [
  {
    config: randomNumberConfig,
    start: startRandomNumberServer,
    stop: stopRandomNumberServer,
    isRunning: isRandomNumberServerRunning,
  },
  // Football-betting and other browser-automation tools are now JSON-defined
  // and loaded dynamically via the dynamic server below.
  {
    config: getDynamicServerMeta(),
    start: startDynamicServer,
    stop: stopDynamicServer,
    isRunning: isDynamicServerRunning,
  },
]

/**
 * Derive the TabServerTransport channel ID from a server ID.
 * e.g. "ext-random-number" → "izan-ext-random-number"
 */
function channelIdFromServerId(serverId: string): string {
  // Server IDs already start with "ext-", channel prefix is "izan-ext-"
  // so "ext-random-number" → "izan-ext-random-number"
  return `izan-${serverId}`
}

/**
 * Start all registered extension MCP servers.
 * Servers that are already running are skipped.
 */
export async function startAllServers(): Promise<void> {
  const results = await Promise.allSettled(
    SERVER_ENTRIES.map(async (entry) => {
      if (!entry.isRunning()) {
        await entry.start()
        console.log(`[izan-ext] Started server: ${entry.config.id}`)
      }
    }),
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[izan-ext] Failed to start server:', result.reason)
    }
  }
}

/**
 * Stop all registered extension MCP servers.
 */
export async function stopAllServers(): Promise<void> {
  await Promise.allSettled(
    SERVER_ENTRIES.map(async (entry) => {
      if (entry.isRunning()) {
        await entry.stop()
        console.log(`[izan-ext] Stopped server: ${entry.config.id}`)
      }
    }),
  )
}

/**
 * Get metadata for all registered servers (for announcement to the web app).
 */
export function getAllServerMeta(): ExtensionServerMeta[] {
  return SERVER_ENTRIES.map((entry) => ({
    id: entry.config.id,
    name: entry.config.name,
    description: entry.config.description,
    category: entry.config.category,
    channelId: channelIdFromServerId(entry.config.id),
  }))
}

/**
 * Get the total number of registered servers.
 */
export function getServerCount(): number {
  return SERVER_ENTRIES.length
}

/**
 * Check if all servers are currently running.
 */
export function areAllServersRunning(): boolean {
  return SERVER_ENTRIES.every((entry) => entry.isRunning())
}
