/**
 * Extension Bridge
 *
 * Detects the izan.io Chrome extension and manages communication
 * between the web app and extension-provided MCP servers.
 */

// ─── Protocol Constants ───────────────────────────────────────────────────────

export const EXTENSION_EVENT_READY = 'izan:extension-ready'
export const EXTENSION_EVENT_PING = 'izan:extension-ping'
export const EXTENSION_EVENT_DISCONNECTED = 'izan:extension-disconnected'
export const EXTENSION_CHANNEL_PREFIX = 'izan-ext-'

// Tool definition sync events
export const EXTENSION_EVENT_TOOL_SYNC = 'izan:tool-definitions-sync'
export const EXTENSION_EVENT_TOOL_ADDED = 'izan:tool-definition-added'
export const EXTENSION_EVENT_TOOL_REMOVED = 'izan:tool-definition-removed'

// Recording events
export const EXTENSION_EVENT_RECORDING_START = 'izan:start-recording'
export const EXTENSION_EVENT_RECORDING_STOP = 'izan:stop-recording'
export const EXTENSION_EVENT_RECORDING_STEP = 'izan:recording-step'
export const EXTENSION_EVENT_RECORDING_COMPLETE = 'izan:recording-complete'

export interface ExtensionServerMeta {
  id: string
  name: string
  description: string
  category: string
  channelId: string
}

export interface ExtensionReadyPayload {
  version: string
  servers: ExtensionServerMeta[]
}

// ─── State ────────────────────────────────────────────────────────────────────

let extensionDetected = false
let detectedServers: ExtensionServerMeta[] = []
let onReadyCallback: ((payload: ExtensionReadyPayload) => void) | null = null
let onDisconnectCallback: (() => void) | null = null
let listening = false

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleReady(event: Event): void {
  const detail = (event as CustomEvent<ExtensionReadyPayload>).detail
  if (!detail?.servers?.length) return
  extensionDetected = true
  detectedServers = detail.servers
  console.log('[extension-bridge] Detected v' + detail.version, detail.servers.map((s) => s.id))
  onReadyCallback?.(detail)
}

function handleDisconnected(): void {
  extensionDetected = false
  detectedServers = []
  console.log('[extension-bridge] Disconnected')
  onDisconnectCallback?.()
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function listenForExtension(
  onReady: (payload: ExtensionReadyPayload) => void,
  onDisconnect: () => void,
): void {
  if (globalThis.window === undefined || listening) return
  onReadyCallback = onReady
  onDisconnectCallback = onDisconnect
  listening = true
  globalThis.addEventListener(EXTENSION_EVENT_READY, handleReady)
  globalThis.addEventListener(EXTENSION_EVENT_DISCONNECTED, handleDisconnected)
}

export function stopListeningForExtension(): void {
  if (globalThis.window === undefined || !listening) return
  globalThis.removeEventListener(EXTENSION_EVENT_READY, handleReady)
  globalThis.removeEventListener(EXTENSION_EVENT_DISCONNECTED, handleDisconnected)
  onReadyCallback = null
  onDisconnectCallback = null
  listening = false
}

export function pingExtension(): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(new CustomEvent(EXTENSION_EVENT_PING))
}

export function isExtensionAvailable(): boolean { return extensionDetected }
export function getExtensionServers(): ExtensionServerMeta[] { return detectedServers }
export function extensionServerUrl(channelId: string): string { return `tab://${channelId}` }

// ─── Tool Definition Sync ────────────────────────────────────────────────────

/**
 * Send all tool definitions to the extension for the dynamic server.
 */
export function syncToolDefinitions(tools: unknown[]): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(
    new CustomEvent(EXTENSION_EVENT_TOOL_SYNC, { detail: { tools } }),
  )
}

/**
 * Notify the extension that a single tool was added.
 */
export function notifyToolAdded(tool: unknown): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(
    new CustomEvent(EXTENSION_EVENT_TOOL_ADDED, { detail: { tool } }),
  )
}

/**
 * Notify the extension that a tool was removed.
 */
export function notifyToolRemoved(toolName: string): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(
    new CustomEvent(EXTENSION_EVENT_TOOL_REMOVED, { detail: { toolName } }),
  )
}

// ─── Automation Data Sync ────────────────────────────────────────────────────

/**
 * Push full automation server+tool data to the extension via postMessage.
 * The content script (ISOLATED world) listens for this and writes to chrome.storage.local.
 */
export function syncAutomationToExtension(servers: unknown[], tools: unknown[]): void {
  if (globalThis.window === undefined) return
  window.postMessage(
    {
      source: 'izan-page',
      channel: 'automation-sync',
      servers,
      tools,
    },
    '*',
  )
}

// ─── Request Automation Data ─────────────────────────────────────────

/**
 * Request fresh automation data from the extension.
 * The content script listens for this and pushes back via izan-sync-automation.
 */
export function requestAutomationData(): void {
  if (globalThis.window === undefined) return
  window.postMessage(
    {
      source: 'izan-page',
      channel: 'request-automation-data',
    },
    '*',
  )
}

// ─── Recording ───────────────────────────────────────────────────────────────

/**
 * Request the extension to start recording user actions.
 */
export function startRecording(): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(new CustomEvent(EXTENSION_EVENT_RECORDING_START))
}

/**
 * Request the extension to stop recording.
 */
export function stopRecording(): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(new CustomEvent(EXTENSION_EVENT_RECORDING_STOP))
}

/**
 * Listen for recording step events from the extension.
 */
export function onRecordingStep(callback: (step: unknown, index: number) => void): () => void {
  if (globalThis.window === undefined) return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ step: unknown; index: number }>).detail
    if (detail) callback(detail.step, detail.index)
  }
  globalThis.addEventListener(EXTENSION_EVENT_RECORDING_STEP, handler)
  return () => globalThis.removeEventListener(EXTENSION_EVENT_RECORDING_STEP, handler)
}

export interface RecordingCompleteDetail {
  steps: unknown[]
  parameters?: unknown[]
  serverId?: string
}

/**
 * Listen for recording complete events from the extension.
 */
export function onRecordingComplete(callback: (detail: RecordingCompleteDetail) => void): () => void {
  if (globalThis.window === undefined) return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<RecordingCompleteDetail>).detail
    if (detail?.steps) callback(detail)
  }
  globalThis.addEventListener(EXTENSION_EVENT_RECORDING_COMPLETE, handler)
  return () => globalThis.removeEventListener(EXTENSION_EVENT_RECORDING_COMPLETE, handler)
}
