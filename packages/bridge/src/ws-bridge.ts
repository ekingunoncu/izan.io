/**
 * WebSocket Bridge
 *
 * Runs a WebSocket server on localhost. The Chrome extension connects to it.
 * Forwards tool calls from the MCP stdio server to the extension,
 * and returns results back.
 */

import { WebSocketServer, type WebSocket } from 'ws'
import type {
  BridgeMessage,
  ExtensionMessage,
  CodeToolDefinition,
} from './protocol.js'

export type ToolCallHandler = (callId: string, name: string, args: Record<string, unknown>) => void
export type ToolsReadyHandler = (tools: CodeToolDefinition[]) => void
export type ConnectionHandler = (connected: boolean) => void

export class WSBridge {
  private wss: WebSocketServer | null = null
  private client: WebSocket | null = null
  private pendingResults = new Map<string, {
    resolve: (value: { success: boolean; data?: unknown; error?: string }) => void
    timer: ReturnType<typeof setTimeout>
  }>()

  private onToolsReady: ToolsReadyHandler | null = null
  private onConnection: ConnectionHandler | null = null

  constructor(private port: number) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: '127.0.0.1' })

      this.wss.on('listening', () => {
        process.stderr.write(`[izan-mcp] WebSocket server listening on ws://127.0.0.1:${this.port}\n`)
        resolve()
      })

      this.wss.on('error', (err) => {
        process.stderr.write(`[izan-mcp] WebSocket server error: ${err.message}\n`)
        reject(err)
      })

      this.wss.on('connection', (ws) => {
        // Only allow one extension connection at a time
        if (this.client) {
          process.stderr.write('[izan-mcp] Replacing existing extension connection\n')
          this.client.close()
        }

        this.client = ws
        process.stderr.write('[izan-mcp] Extension connected\n')
        this.onConnection?.(true)

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString()) as ExtensionMessage
            this.handleExtensionMessage(msg)
          } catch (err) {
            process.stderr.write(`[izan-mcp] Failed to parse extension message: ${err}\n`)
          }
        })

        ws.on('close', () => {
          if (this.client === ws) {
            this.client = null
            process.stderr.write('[izan-mcp] Extension disconnected\n')
            this.onConnection?.(false)
          }
        })

        ws.on('error', (err) => {
          process.stderr.write(`[izan-mcp] Extension socket error: ${err.message}\n`)
        })
      })
    })
  }

  private handleExtensionMessage(msg: ExtensionMessage): void {
    switch (msg.type) {
      case 'ready':
      case 'tools-updated':
        process.stderr.write(`[izan-mcp] Received ${msg.tools.length} tool(s) from extension\n`)
        this.onToolsReady?.(msg.tools)
        break

      case 'tool-result': {
        const pending = this.pendingResults.get(msg.callId)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingResults.delete(msg.callId)
          pending.resolve({
            success: msg.success,
            data: msg.data,
            error: msg.error,
          })
        }
        break
      }
    }
  }

  /** Send a tool call to the extension and wait for the result. */
  callTool(callId: string, name: string, args: Record<string, unknown>, timeoutMs = 120_000): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.client || this.client.readyState !== this.client.OPEN) {
        resolve({ success: false, error: 'Extension not connected' })
        return
      }

      const timer = setTimeout(() => {
        this.pendingResults.delete(callId)
        resolve({ success: false, error: `Tool call timed out after ${timeoutMs}ms` })
      }, timeoutMs)

      this.pendingResults.set(callId, { resolve, timer })

      const msg: BridgeMessage = { type: 'tool-call', callId, name, args }
      this.client.send(JSON.stringify(msg))
    })
  }

  /** Request the extension to send its current tool list. */
  requestToolList(): void {
    if (!this.client || this.client.readyState !== this.client.OPEN) return
    const msg: BridgeMessage = { type: 'list-tools' }
    this.client.send(JSON.stringify(msg))
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === this.client.OPEN
  }

  setToolsReadyHandler(handler: ToolsReadyHandler): void {
    this.onToolsReady = handler
  }

  setConnectionHandler(handler: ConnectionHandler): void {
    this.onConnection = handler
  }

  async stop(): Promise<void> {
    for (const [, pending] of this.pendingResults) {
      clearTimeout(pending.timer)
      pending.resolve({ success: false, error: 'Bridge shutting down' })
    }
    this.pendingResults.clear()

    if (this.client) {
      this.client.close()
      this.client = null
    }
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve())
      })
      this.wss = null
    }
  }
}
