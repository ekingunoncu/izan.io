/**
 * Protocol constants and types for extension ↔ web app communication.
 */

// ─── Event Names ──────────────────────────────────────────────────────────────

export const EXTENSION_EVENT_READY = 'izan:extension-ready'
export const EXTENSION_EVENT_PING = 'izan:extension-ping'
export const EXTENSION_EVENT_DISCONNECTED = 'izan:extension-disconnected'

// ─── Tool Definition Sync Events ──────────────────────────────────────────────

/** Web app → extension: bulk sync all tool definitions */
export const EXTENSION_EVENT_TOOL_SYNC = 'izan:tool-definitions-sync'
/** Web app → extension: single tool added */
export const EXTENSION_EVENT_TOOL_ADDED = 'izan:tool-definition-added'
/** Web app → extension: single tool removed */
export const EXTENSION_EVENT_TOOL_REMOVED = 'izan:tool-definition-removed'

// ─── Recording Events ─────────────────────────────────────────────────────────

/** Web app → extension: start recording user actions */
export const EXTENSION_EVENT_RECORDING_START = 'izan:start-recording'
/** Web app → extension: stop recording */
export const EXTENSION_EVENT_RECORDING_STOP = 'izan:stop-recording'
/** Extension → web app: a single step was recorded */
export const EXTENSION_EVENT_RECORDING_STEP = 'izan:recording-step'
/** Extension → web app: recording finished, full steps array */
export const EXTENSION_EVENT_RECORDING_COMPLETE = 'izan:recording-complete'

// ─── Side-panel ↔ Page bridge (via content script) ───────────────────────────

/** Content script → page: request (getServers, createServer, etc.) */
export const EXTENSION_EVENT_PAGE_REQUEST = 'izan:ext-page-request'
/** Page → content script: response */
export const EXTENSION_EVENT_PAGE_RESPONSE = 'izan:ext-page-response'

// ─── Prefixes ─────────────────────────────────────────────────────────────────

export const EXTENSION_CHANNEL_PREFIX = 'izan-ext-'
export const EXTENSION_SERVER_ID_PREFIX = 'ext-'

// ─── Types ────────────────────────────────────────────────────────────────────

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

/** Payload for izan:tool-definitions-sync */
export interface ToolSyncPayload {
  /** Array of tool definition JSON objects */
  tools: unknown[]
}

/** Payload for izan:tool-definition-added */
export interface ToolAddedPayload {
  tool: unknown
}

/** Payload for izan:tool-definition-removed */
export interface ToolRemovedPayload {
  toolName: string
}

/** Payload for izan:recording-step */
export interface RecordingStepPayload {
  step: unknown
  index: number
}

/** Payload for izan:recording-complete */
export interface RecordingCompletePayload {
  steps: unknown[]
}
