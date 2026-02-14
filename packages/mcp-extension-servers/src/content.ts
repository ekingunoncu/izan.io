/**
 * Content Script (ISOLATED world)
 *
 * Injected into izan.io pages to start extension MCP servers
 * and announce them to the web application.
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
  EXTENSION_EVENT_RECORDING_COMPLETE,
  type ExtensionReadyPayload,
  type ToolSyncPayload,
  type ToolAddedPayload,
  type ToolRemovedPayload,
} from './protocol.js'
import { startAllServers, stopAllServers, getAllServerMeta } from './registry.js'
import { loadToolDefinitions, addToolDefinition, removeToolDefinition, stopDynamicServer, startDynamicServer } from './dynamic-server.js'
import { type ToolDefinition, toolDefinitionSchema } from './tool-schema.js'
import { initRecorderUI } from './recorder-ui.js'

// ─── Announce ─────────────────────────────────────────────────────────────────

/**
 * Dispatch the `izan:extension-ready` event with server metadata.
 * The web app listens for this to discover extension servers.
 */
function announceServers(): void {
  const payload: ExtensionReadyPayload = {
    version: '0.1.0',
    servers: getAllServerMeta(),
  }

  globalThis.dispatchEvent(
    new CustomEvent(EXTENSION_EVENT_READY, { detail: payload }),
  )

  console.log(
    `[izan-ext] Announced ${payload.servers.length} server(s) to web app`,
    payload.servers.map((s) => s.id),
  )
}

/**
 * Dispatch the `izan:extension-disconnected` event.
 * The web app uses this to clean up extension servers.
 */
function announceDisconnect(): void {
  globalThis.dispatchEvent(new CustomEvent(EXTENSION_EVENT_DISCONNECTED))
  console.log('[izan-ext] Disconnected from web app')
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
  }, RESTART_DEBOUNCE_MS)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  console.log('[izan-ext][content] Content script loaded, URL:', location.href)
  try {
    // Start all registered MCP servers
    await startAllServers()

    // Announce to the web app
    announceServers()

    // Listen for pings from the web app (in case it loaded after the extension)
    globalThis.addEventListener(EXTENSION_EVENT_PING, () => {
      announceServers()
    })

    // Listen for tool definition sync events from the web app
    globalThis.addEventListener(EXTENSION_EVENT_TOOL_SYNC, (event) => {
      const payload = (event as CustomEvent<ToolSyncPayload>).detail
      if (!payload?.tools) return
      try {
        const tools = payload.tools.map((t) => toolDefinitionSchema.parse(t))
        const needsRestart = loadToolDefinitions(tools as ToolDefinition[])
        console.log(`[izan-ext] Synced ${tools.length} tool definition(s), needsRestart=${needsRestart}`)
        if (needsRestart) {
          // Debounced restart: multiple sync/add events within 300ms are coalesced
          // into a single restart. Do NOT announce - the web app will reconnect ext-dynamic itself.
          debouncedRestartDynamic()
        }
      } catch (err) {
        console.error('[izan-ext] Failed to sync tool definitions:', err)
      }
    })

    globalThis.addEventListener(EXTENSION_EVENT_TOOL_ADDED, (event) => {
      const payload = (event as CustomEvent<ToolAddedPayload>).detail
      if (!payload?.tool) return
      try {
        const tool = toolDefinitionSchema.parse(payload.tool)
        const needsRestart = addToolDefinition(tool as ToolDefinition)
        console.log(`[izan-ext] Added tool: ${tool.name}, needsRestart=${needsRestart}`)
        if (needsRestart) {
          // Debounced restart: coalesced with other sync/add events within 300ms.
          debouncedRestartDynamic()
        }
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

    // Initialize the recorder UI system (listens for start/stop events)
    initRecorderUI()

    // Bootstrap sync: push existing automation data from chrome.storage to the web app
    chrome.storage.local.get('izan_automation').then((result) => {
      const data = result.izan_automation as { servers?: unknown[]; tools?: unknown[] } | undefined
      if (data?.servers?.length || data?.tools?.length) {
        globalThis.postMessage({
          source: 'izan-extension',
          channel: 'page-request',
          type: 'izan-sync-automation',
          requestId: crypto.randomUUID(),
          servers: data.servers ?? [],
          tools: data.tools ?? [],
        }, location.origin)
        console.log('[izan-ext][content] Bootstrap sync: pushed automation data to page')
      }
    }).catch(() => {})

    // Messages from background: recording complete or sync automation data
    chrome.runtime.onMessage.addListener((msg: { type: string; steps?: unknown[]; parameters?: unknown[]; serverId?: string; servers?: unknown[]; tools?: unknown[] }, _sender, sendResponse) => {
      console.log('[izan-ext][content] chrome.runtime.onMessage received:', msg.type)
      if (msg.type === 'izan-recording-complete' && msg.steps) {
        globalThis.dispatchEvent(
          new CustomEvent(EXTENSION_EVENT_RECORDING_COMPLETE, {
            detail: { steps: msg.steps, parameters: msg.parameters ?? [], serverId: msg.serverId },
          }),
        )
        sendResponse({ ok: true })
        return false
      }

      // Forward background's best-effort sync to the web app page
      if (msg.type === 'izan-sync-automation') {
        globalThis.postMessage({
          source: 'izan-extension',
          channel: 'page-request',
          type: 'izan-sync-automation',
          requestId: crypto.randomUUID(),
          servers: msg.servers ?? [],
          tools: msg.tools ?? [],
        }, location.origin)
        sendResponse({ ok: true })
        return false
      }

      return false
    })

    // Reverse sync: listen for web app → extension automation data via postMessage
    // Also handles request-automation-data: page asks extension to push fresh data
    globalThis.addEventListener('message', (evt: MessageEvent) => {
      const data = evt.data
      if (data?.source !== 'izan-page') return

      if (data.channel === 'set-preference') {
        const key = data.key as string | undefined
        const value = data.value
        if (key) {
          chrome.storage.local.set({ [`izan_pref_${key}`]: value }).catch(() => {})
          console.log('[izan-ext][content] Stored preference:', key, value)
        }
      } else if (data.channel === 'automation-sync') {
        const servers = data.servers as unknown[] | undefined
        const tools = data.tools as unknown[] | undefined
        if (servers && tools) {
          chrome.storage.local.set({
            izan_automation: { servers, tools, version: Date.now() },
          }).catch(() => {})
          console.log('[izan-ext][content] Reverse sync: wrote automation data to chrome.storage')
        }
      } else if (data.channel === 'request-automation-data') {
        // Page is requesting fresh automation data (e.g. settings page opened)
        chrome.storage.local.get('izan_automation').then((result) => {
          const stored = result.izan_automation as { servers?: unknown[]; tools?: unknown[] } | undefined
          if (stored?.servers?.length || stored?.tools?.length) {
            globalThis.postMessage({
              source: 'izan-extension',
              channel: 'page-request',
              type: 'izan-sync-automation',
              requestId: crypto.randomUUID(),
              servers: stored.servers ?? [],
              tools: stored.tools ?? [],
            }, location.origin)
            console.log('[izan-ext][content] Responded to request-automation-data')
          }
        }).catch(() => {})
      }
    })

    // Clean up when the page unloads
    globalThis.addEventListener('beforeunload', () => {
      announceDisconnect()
      // Fire-and-forget stop; the page is closing anyway
      stopAllServers().catch(() => {})
    })
  } catch (error) {
    console.error('[izan-ext] Failed to initialize extension servers:', error)
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

bootstrap().catch((error) => {
  console.error('[izan-ext] Bootstrap failed:', error)
})
