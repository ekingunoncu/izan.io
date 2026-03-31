/**
 * WebSocket Bridge Protocol
 *
 * Message types exchanged between the MCP bridge CLI and the Chrome extension.
 * The bridge runs a WebSocket server; the extension connects as a client.
 */

export const DEFAULT_WS_PORT = 3717

// ─── Tool Parameter (shared with extension) ────────────────────────────────

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
  enum?: string[]
  default?: string | number | boolean
}

// ─── Code Tool Definition ──────────────────────────────────────────────────

export interface CodeToolDefinition {
  id: string
  name: string
  description: string
  version: string
  parameters: ToolParameter[]
  code: string
}

// ─── Extension -> Bridge Messages ──────────────────────────────────────────

export interface ReadyMessage {
  type: 'ready'
  tools: CodeToolDefinition[]
}

export interface ToolsUpdatedMessage {
  type: 'tools-updated'
  tools: CodeToolDefinition[]
}

export interface ToolResultMessage {
  type: 'tool-result'
  callId: string
  success: boolean
  data?: unknown
  error?: string
}

export type ExtensionMessage = ReadyMessage | ToolsUpdatedMessage | ToolResultMessage

// ─── Bridge -> Extension Messages ──────────────────────────────────────────

export interface ToolCallMessage {
  type: 'tool-call'
  callId: string
  name: string
  args: Record<string, unknown>
}

export interface ListToolsMessage {
  type: 'list-tools'
}

export type BridgeMessage = ToolCallMessage | ListToolsMessage
