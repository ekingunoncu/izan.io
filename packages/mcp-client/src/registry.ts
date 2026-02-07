/**
 * @izan/mcp-client - Server Registry
 *
 * Manages multiple MCP server connections and provides unified access
 * to tools across all servers.
 */

import { IzanMCPClient } from './client.js'
import type {
  MCPServerConfig,
  MCPServerState,
  MCPToolInfo,
  MCPToolCallResult,
  ServerCategory,
} from './types.js'

/** Callback for server state changes */
export type ServerStateChangeHandler = (
  serverId: string,
  state: MCPServerState,
) => void

export class MCPServerRegistry {
  private servers: Map<string, MCPServerState> = new Map()
  private clients: Map<string, IzanMCPClient> = new Map()
  private onStateChange?: ServerStateChangeHandler

  /**
   * @param onStateChange - Optional callback invoked whenever a server's state changes
   */
  constructor(onStateChange?: ServerStateChangeHandler) {
    this.onStateChange = onStateChange
  }

  /**
   * Register and connect to an MCP server.
   * Discovers available tools after connection.
   */
  async addServer(config: MCPServerConfig): Promise<MCPServerState> {
    // Remove existing server with same ID if present
    if (this.servers.has(config.id)) {
      await this.removeServer(config.id)
    }

    const state: MCPServerState = {
      config,
      status: 'connecting',
      tools: [],
    }
    this.servers.set(config.id, state)
    this.emitChange(config.id)

    const client = new IzanMCPClient(config.id)
    this.clients.set(config.id, client)

    try {
      console.log(`[izan-mcp-client] Connecting to ${config.id} at ${config.url}`)
      await client.connect(config.url, config.headers)

      // Discover tools
      const tools = await client.listTools()
      console.log(`[izan-mcp-client] ${config.id} connected, discovered ${tools.length} tools:`, tools.map(t => t.name))

      state.status = 'connected'
      state.tools = tools
      this.emitChange(config.id)

      return { ...state }
    } catch (error) {
      state.status = 'error'
      state.error =
        error instanceof Error ? error.message : 'Connection failed'
      state.tools = []
      this.emitChange(config.id)
      console.error(`[izan-mcp-client] Failed to connect ${config.id}:`, error)

      return { ...state }
    }
  }

  /**
   * Disconnect and remove an MCP server from the registry.
   */
  async removeServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId)
    if (client) {
      await client.disconnect()
      this.clients.delete(serverId)
    }
    this.servers.delete(serverId)
  }

  /**
   * Get all registered servers and their state.
   */
  getServers(): MCPServerState[] {
    return Array.from(this.servers.values())
  }

  /**
   * Get a specific server's state.
   */
  getServer(serverId: string): MCPServerState | undefined {
    return this.servers.get(serverId)
  }

  /**
   * Get all discovered tools across all connected servers.
   */
  getAllTools(): MCPToolInfo[] {
    return Array.from(this.servers.values())
      .filter((s) => s.status === 'connected')
      .flatMap((s) => s.tools)
  }

  /**
   * Get tools filtered by server category.
   */
  getToolsByCategory(category: ServerCategory): MCPToolInfo[] {
    return Array.from(this.servers.values())
      .filter((s) => s.status === 'connected' && s.config.category === category)
      .flatMap((s) => s.tools)
  }

  /**
   * Call a tool on a specific server.
   * @param serverId - ID of the server that owns the tool
   * @param toolName - Name of the tool to call
   * @param args - Arguments to pass to the tool
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolCallResult> {
    const client = this.clients.get(serverId)
    if (!client) {
      return {
        success: false,
        content: [],
        error: `Server not found: ${serverId}`,
      }
    }

    if (!client.isConnected) {
      return {
        success: false,
        content: [],
        error: `Server not connected: ${serverId}`,
      }
    }

    return client.callTool(toolName, args)
  }

  /**
   * Disconnect all servers and clear the registry.
   */
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys())
    await Promise.all(serverIds.map((id) => this.removeServer(id)))
  }

  private emitChange(serverId: string): void {
    const state = this.servers.get(serverId)
    if (state && this.onStateChange) {
      this.onStateChange(serverId, { ...state })
    }
  }
}
