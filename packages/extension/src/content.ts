/**
 * Content Script (ISOLATED world)
 *
 * Injected into izan.io / zihin.io pages to start the extension MCP server
 * and announce it to the web application.
 *
 * Runs in ISOLATED world for chrome.runtime access (BrowserWindow).
 * TabServerTransport uses postMessage/BroadcastChannel which works across
 * the same-origin window shared with the page.
 */

import {
  EXTENSION_EVENT_READY,
  EXTENSION_EVENT_PING,
  EXTENSION_EVENT_DISCONNECTED,
  EXTENSION_EVENT_TOOL_SYNC,
  EXTENSION_EVENT_TOOL_ADDED,
  EXTENSION_EVENT_TOOL_REMOVED,
  type ExtensionReadyPayload,
  type ToolSyncPayload,
  type ToolAddedPayload,
  type ToolRemovedPayload,
} from './protocol.js'
import { startAllServers, stopAllServers, getAllServerMeta } from './registry.js'
import {
  loadToolDefinitions,
  addToolDefinition,
  removeToolDefinition,
  stopDynamicServer,
  startDynamicServer,
} from './dynamic-server.js'
import type { CodeToolDefinition } from './code-tool-types.js'

// ─── Announce ─────────────────────────────────────────────────────────────────

function announceServers(): void {
  const payload: ExtensionReadyPayload = {
    version: '0.2.0',
    servers: getAllServerMeta(),
  }

  globalThis.dispatchEvent(
    new CustomEvent(EXTENSION_EVENT_READY, { detail: payload }),
  )

  console.log(
    `[izan-ext] Announced ${payload.servers.length} server(s)`,
    payload.servers.map((s) => s.id),
  )
}

function announceDisconnect(): void {
  globalThis.dispatchEvent(new CustomEvent(EXTENSION_EVENT_DISCONNECTED))
  console.log('[izan-ext] Disconnected')
}

// ─── Debounced dynamic-server restart ─────────────────────────────────────────

let restartTimer: ReturnType<typeof setTimeout> | null = null
const RESTART_DEBOUNCE_MS = 300

function debouncedRestartDynamic(): void {
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(async () => {
    restartTimer = null
    await stopDynamicServer()
    await startDynamicServer()
    announceServers()
  }, RESTART_DEBOUNCE_MS)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  console.log('[izan-ext][content] Content script loaded, URL:', location.href)
  try {
    // Start the MCP server
    await startAllServers()
    announceServers()

    // Listen for pings (in case page loaded after extension)
    globalThis.addEventListener(EXTENSION_EVENT_PING, () => {
      announceServers()
    })

    // ─── Tool Definition Sync (from web app / zihin.io) ───────────────

    globalThis.addEventListener(EXTENSION_EVENT_TOOL_SYNC, (event) => {
      const payload = (event as CustomEvent<ToolSyncPayload>).detail
      if (!payload?.tools) return
      try {
        const tools = payload.tools as CodeToolDefinition[]
        const needsRestart = loadToolDefinitions(tools)
        console.log(`[izan-ext] Synced ${tools.length} tool(s), needsRestart=${needsRestart}`)
        if (needsRestart) debouncedRestartDynamic()
      } catch (err) {
        console.error('[izan-ext] Failed to sync tools:', err)
      }
    })

    globalThis.addEventListener(EXTENSION_EVENT_TOOL_ADDED, (event) => {
      const payload = (event as CustomEvent<ToolAddedPayload>).detail
      if (!payload?.tool) return
      try {
        const tool = payload.tool as CodeToolDefinition
        const needsRestart = addToolDefinition(tool)
        console.log(`[izan-ext] Added tool: ${tool.name}, needsRestart=${needsRestart}`)
        if (needsRestart) debouncedRestartDynamic()
      } catch (err) {
        console.error('[izan-ext] Failed to add tool:', err)
      }
    })

    globalThis.addEventListener(EXTENSION_EVENT_TOOL_REMOVED, (event) => {
      const payload = (event as CustomEvent<ToolRemovedPayload>).detail
      if (!payload?.toolName) return
      const wasRemoved = removeToolDefinition(payload.toolName)
      console.log(`[izan-ext] Removed tool: ${payload.toolName}, wasRemoved=${wasRemoved}`)
      if (wasRemoved) {
        void (async () => {
          await stopDynamicServer()
          await startDynamicServer()
          announceServers()
        })()
      }
    })

    // ─── Bootstrap: load tools from chrome.storage ────────────────────

    chrome.storage.local.get('izan_tools').then((result) => {
      const data = result.izan_tools as { tools?: CodeToolDefinition[] } | undefined
      if (data?.tools?.length) {
        const needsRestart = loadToolDefinitions(data.tools)
        console.log(`[izan-ext] Loaded ${data.tools.length} tool(s) from storage, needsRestart=${needsRestart}`)
        if (needsRestart) debouncedRestartDynamic()
      }
    }).catch(() => {})

    // ─── Preferences ──────────────────────────────────────────────────

    globalThis.addEventListener('message', (evt: MessageEvent) => {
      const data = evt.data
      if (data?.source !== 'izan-page') return

      if (data.channel === 'set-preference') {
        const key = data.key as string | undefined
        const value = data.value
        if (key) {
          chrome.storage.local.set({ [`izan_pref_${key}`]: value }).catch(() => {})
        }
      }
    })

    // ─── Cleanup on unload ────────────────────────────────────────────

    globalThis.addEventListener('beforeunload', () => {
      announceDisconnect()
      stopAllServers().catch(() => {})
    })
  } catch (error) {
    console.error('[izan-ext] Failed to initialize:', error)
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

bootstrap().catch((error) => {
  console.error('[izan-ext] Bootstrap failed:', error)
})
