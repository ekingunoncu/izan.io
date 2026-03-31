/**
 * Protocol constants and types for extension ↔ web app / zihin.io communication.
 */

// ─── Event Names ──────────────────────────────────────────────────────────────

export const EXTENSION_EVENT_READY = 'izan:extension-ready'
export const EXTENSION_EVENT_PING = 'izan:extension-ping'
export const EXTENSION_EVENT_DISCONNECTED = 'izan:extension-disconnected'

// ─── Tool Definition Sync Events ──────────────────────────────────────────────

/** Web app / zihin.io → extension: bulk sync all tool definitions */
export const EXTENSION_EVENT_TOOL_SYNC = 'izan:tool-definitions-sync'
/** Web app / zihin.io → extension: single tool added (marketplace install) */
export const EXTENSION_EVENT_TOOL_ADDED = 'izan:tool-definition-added'
/** Web app / zihin.io → extension: single tool removed */
export const EXTENSION_EVENT_TOOL_REMOVED = 'izan:tool-definition-removed'

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
