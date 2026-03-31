/**
 * WebSocket Bridge Client
 *
 * Connects the Chrome extension to the izan-mcp bridge CLI.
 * When connected, sends the current tool list and handles
 * tool call requests from external MCP clients.
 */

import type { CodeToolDefinition } from './code-tool-types.js'
import { executeCodeTool } from './code-tool-executor.js'

const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:3717'
const RECONNECT_INTERVAL_MS = 5_000
const MAX_RECONNECT_INTERVAL_MS = 30_000

// ─── Types (mirror bridge protocol) ────────────────────────────────────────

interface ToolCallMessage {
  type: 'tool-call'
  callId: string
  name: string
  args: Record<string, unknown>
}

interface ListToolsMessage {
  type: 'list-tools'
}

type BridgeMessage = ToolCallMessage | ListToolsMessage

// ─── State ──────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = RECONNECT_INTERVAL_MS
let getToolsFn: (() => CodeToolDefinition[]) | null = null
let isShuttingDown = false
let _connected = false

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Start the WebSocket bridge client.
 * Attempts to connect to the bridge CLI and automatically reconnects.
 */
export function startBridgeClient(getTools: () => CodeToolDefinition[]): void {
  getToolsFn = getTools
  isShuttingDown = false
  connect()
}

/**
 * Stop the WebSocket bridge client.
 */
export function stopBridgeClient(): void {
  isShuttingDown = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
  _connected = false
}

/**
 * Notify the bridge that the tool list has changed.
 */
export function notifyToolsUpdated(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN || !getToolsFn) return
  const tools = getToolsFn()
  ws.send(JSON.stringify({ type: 'tools-updated', tools }))
  console.log(`[izan-ext] Bridge: sent ${tools.length} updated tool(s)`)
}

/**
 * Whether the bridge is currently connected.
 */
export function isBridgeConnected(): boolean {
  return _connected
}

// ─── Connection ─────────────────────────────────────────────────────────────

function connect(): void {
  if (isShuttingDown) return

  try {
    ws = new WebSocket(DEFAULT_BRIDGE_URL)
  } catch {
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    console.log('[izan-ext] Bridge: connected')
    _connected = true
    reconnectDelay = RECONNECT_INTERVAL_MS

    // Send current tools
    if (getToolsFn) {
      const tools = getToolsFn()
      ws!.send(JSON.stringify({ type: 'ready', tools }))
      console.log(`[izan-ext] Bridge: sent ${tools.length} tool(s)`)
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as BridgeMessage
      handleBridgeMessage(msg)
    } catch (err) {
      console.error('[izan-ext] Bridge: failed to parse message:', err)
    }
  }

  ws.onclose = () => {
    _connected = false
    ws = null
    if (!isShuttingDown) {
      console.log('[izan-ext] Bridge: disconnected, scheduling reconnect')
      scheduleReconnect()
    }
  }

  ws.onerror = () => {
    // onclose will fire after this, which handles reconnect
  }
}

function scheduleReconnect(): void {
  if (isShuttingDown || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_INTERVAL_MS)
    connect()
  }, reconnectDelay)
}

// ─── Message Handling ───────────────────────────────────────────────────────

async function handleBridgeMessage(msg: BridgeMessage): Promise<void> {
  switch (msg.type) {
    case 'tool-call':
      await handleToolCall(msg)
      break

    case 'list-tools':
      if (getToolsFn && ws?.readyState === WebSocket.OPEN) {
        const tools = getToolsFn()
        ws.send(JSON.stringify({ type: 'tools-updated', tools }))
      }
      break
  }
}

async function handleToolCall(msg: ToolCallMessage): Promise<void> {
  if (!getToolsFn) {
    sendResult(msg.callId, false, undefined, 'No tools loaded')
    return
  }

  const tools = getToolsFn()
  const tool = tools.find(t => t.name === msg.name)

  if (!tool) {
    sendResult(msg.callId, false, undefined, `Tool "${msg.name}" not found`)
    return
  }

  console.log(`[izan-ext] Bridge: executing tool "${msg.name}" (${msg.callId})`)
  const t0 = Date.now()

  try {
    const result = await executeCodeTool(tool, msg.args)
    const dt = Date.now() - t0
    console.log(`[izan-ext] Bridge: tool "${msg.name}" ${result.success ? 'OK' : 'FAILED'} in ${dt}ms`)
    sendResult(msg.callId, result.success, result.data, result.error)
  } catch (err) {
    const dt = Date.now() - t0
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[izan-ext] Bridge: tool "${msg.name}" ERROR in ${dt}ms:`, error)
    sendResult(msg.callId, false, undefined, error)
  }
}

function sendResult(callId: string, success: boolean, data?: unknown, error?: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'tool-result', callId, success, data, error }))
}
