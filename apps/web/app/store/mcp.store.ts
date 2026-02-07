import { create } from 'zustand'
import {
  MCPServerRegistry,
  type MCPServerConfig,
  type MCPServerState,
  type MCPToolInfo,
  type MCPToolCallResult,
} from '@izan/mcp-client'
import { DEFAULT_MCP_SERVERS, IMPLICIT_AGENT_SERVERS } from '~/lib/mcp/config'
import { db, type UserMCPServer } from '~/lib/db'
import type { Agent } from '~/lib/db/schema'

interface MCPState {
  registry: MCPServerRegistry | null
  /** All connected servers (builtin + user) visible in the registry */
  servers: MCPServerState[]
  /** User-added servers persisted in IndexedDB */
  userServers: UserMCPServer[]
  /** Currently active MCP server IDs (connected for the current agent) */
  activeServerIds: Set<string>
  isInitialized: boolean
  error: string | null

  // Lifecycle
  initialize: () => Promise<void>
  reconnect: () => Promise<void>

  /**
   * Activate MCPs for a specific agent.
   * Only connects the MCPs that the agent needs (lazy loading).
   * Disconnects previously active MCPs that are no longer needed.
   */
  activateAgentMCPs: (agent: Agent) => Promise<void>

  // Low-level registry wrappers
  addServer: (config: MCPServerConfig) => Promise<MCPServerState>
  removeServer: (serverId: string) => Promise<void>

  // User server CRUD
  addUserServer: (server: Omit<UserMCPServer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UserMCPServer>
  removeUserServer: (serverId: string) => Promise<void>
  updateUserServer: (serverId: string, updates: Partial<Pick<UserMCPServer, 'name' | 'url' | 'description' | 'headers'>>) => Promise<void>

  // Agent assignment (kept for compatibility)
  assignServerToAgent: (serverId: string, agentId: string) => Promise<void>
  unassignServerFromAgent: (serverId: string, agentId: string) => Promise<void>
  setServerAgents: (serverId: string, agentIds: string[]) => Promise<void>

  // Tool access
  getToolsForAgent: (agent: Agent) => MCPToolInfo[]
  getAllTools: () => MCPToolInfo[]
  callTool: (
    serverId: string,
    toolName: string,
    args?: Record<string, unknown>,
  ) => Promise<MCPToolCallResult>
}

function syncServersFromRegistry(
  registry: MCPServerRegistry,
  set: (fn: (s: MCPState) => Partial<MCPState>) => void,
) {
  set((state) => ({
    ...state,
    servers: registry.getServers(),
  }))
}

export const useMCPStore = create<MCPState>((set, get) => ({
  registry: null,
  servers: [],
  userServers: [],
  activeServerIds: new Set(),
  isInitialized: false,
  error: null,

  /**
   * Initialize: only creates the registry and loads user servers.
   * Does NOT connect to any MCP servers yet (lazy loading).
   */
  initialize: async () => {
    if (get().isInitialized) {
      return
    }

    const registry = new MCPServerRegistry(() => {
      set((s) => ({
        ...s,
        servers: registry.getServers(),
      }))
    })

    set({ registry })

    try {
      // Load user servers from IndexedDB (metadata only, no connection)
      const userServers = await db.mcpServers.toArray()
      set({ userServers, isInitialized: true, error: null })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MCP initialization failed'
      set({ isInitialized: true, error: message })
    }
  },

  /**
   * Activate MCPs needed by a specific agent.
   * Connects implicit + custom MCPs, disconnects unneeded ones.
   */
  activateAgentMCPs: async (agent: Agent) => {
    const { registry, userServers, activeServerIds } = get()
    if (!registry) {
      return
    }

    // For builtin agents, use IMPLICIT_AGENT_SERVERS as source of truth (fixes IndexedDB drift)
    const implicitIds = agent.source === 'builtin'
      ? (IMPLICIT_AGENT_SERVERS[agent.id] ?? [])
      : agent.implicitMCPIds

    // Determine which servers this agent needs
    const neededIds = new Set<string>()

    // 1. Implicit (builtin) MCP IDs
    for (const mcpId of implicitIds) {
      neededIds.add(mcpId)
    }

    // 2. Custom MCP IDs from the agent
    for (const mcpId of agent.customMCPIds) {
      neededIds.add(mcpId)
    }

    // Disconnect servers that are no longer needed
    for (const sid of activeServerIds) {
      if (!neededIds.has(sid)) {
        await registry.removeServer(sid)
      }
    }

    // Connect servers that are needed but not yet connected
    for (const sid of neededIds) {
      const existing = registry.getServer(sid)
      if (existing?.status === 'connected') continue

      // Check if it's a builtin server
      const builtinConfig = DEFAULT_MCP_SERVERS.find(s => s.id === sid)
      if (builtinConfig) {
        await registry.addServer(builtinConfig)
        continue
      }

      // Check if it's a user server
      const userServer = userServers.find(us => us.id === sid)
      if (userServer) {
        const config: MCPServerConfig = {
          id: userServer.id,
          name: userServer.name,
          description: userServer.description,
          url: userServer.url,
          category: 'custom',
          source: 'user',
          headers: userServer.headers,
        }
        await registry.addServer(config)
      }
    }

    // Update state
    const allServers = registry.getServers()
    const failedServers = allServers.filter(s => s.status === 'error')
    set({
      activeServerIds: neededIds,
      servers: allServers,
      error: failedServers.length > 0
        ? failedServers.map(s => `${s.config.name}: ${s.error}`).join(', ')
        : null,
    })
  },

  reconnect: async () => {
    const { registry } = get()
    if (registry) {
      await registry.disconnectAll()
    }
    set({ isInitialized: false, error: null, registry: null, servers: [], userServers: [], activeServerIds: new Set() })
    await get().initialize()
  },

  // ─── Low-level registry wrappers ─────────────────────────────────

  addServer: async (config) => {
    const { registry } = get()
    if (!registry) {
      throw new Error('MCP not initialized. Call initialize() first.')
    }
    const state = await registry.addServer(config)
    syncServersFromRegistry(registry, set)
    return state
  },

  removeServer: async (serverId) => {
    const { registry } = get()
    if (!registry) return
    await registry.removeServer(serverId)
    syncServersFromRegistry(registry, set)
  },

  // ─── User server CRUD ────────────────────────────────────────────

  addUserServer: async (input) => {
    const { registry } = get()
    if (!registry) throw new Error('MCP not initialized')

    const now = Date.now()
    const server: UserMCPServer = {
      id: crypto.randomUUID(),
      name: input.name,
      url: input.url,
      description: input.description,
      headers: input.headers,
      assignedAgentIds: input.assignedAgentIds,
      createdAt: now,
      updatedAt: now,
    }

    // Persist to IndexedDB
    await db.mcpServers.add(server)

    // Connect via registry
    const config: MCPServerConfig = {
      id: server.id,
      name: server.name,
      description: server.description,
      url: server.url,
      category: 'custom',
      source: 'user',
      headers: server.headers,
    }
    await registry.addServer(config)

    set(s => ({
      ...s,
      userServers: [...s.userServers, server],
      servers: registry.getServers(),
    }))

    return server
  },

  removeUserServer: async (serverId) => {
    const { registry } = get()

    if (registry) {
      await registry.removeServer(serverId)
    }

    await db.mcpServers.delete(serverId)

    set(s => ({
      ...s,
      userServers: s.userServers.filter(us => us.id !== serverId),
      servers: registry ? registry.getServers() : s.servers,
    }))
  },

  updateUserServer: async (serverId, updates) => {
    const { registry, userServers } = get()
    const existing = userServers.find(s => s.id === serverId)
    if (!existing) return

    const updated: UserMCPServer = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }

    await db.mcpServers.put(updated)

    if (registry && (updates.url || updates.headers)) {
      const config: MCPServerConfig = {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        url: updated.url,
        category: 'custom',
        source: 'user',
        headers: updated.headers,
      }
      await registry.addServer(config)
    }

    set(s => ({
      ...s,
      userServers: s.userServers.map(us => us.id === serverId ? updated : us),
      servers: registry ? registry.getServers() : s.servers,
    }))
  },

  // ─── Agent assignment ────────────────────────────────────────────

  assignServerToAgent: async (serverId, agentId) => {
    const { userServers } = get()
    const server = userServers.find(s => s.id === serverId)
    if (!server || server.assignedAgentIds.includes(agentId)) return

    const updated = { ...server, assignedAgentIds: [...server.assignedAgentIds, agentId], updatedAt: Date.now() }
    await db.mcpServers.put(updated)
    set(s => ({ ...s, userServers: s.userServers.map(us => us.id === serverId ? updated : us) }))
  },

  unassignServerFromAgent: async (serverId, agentId) => {
    const { userServers } = get()
    const server = userServers.find(s => s.id === serverId)
    if (!server) return

    const updated = { ...server, assignedAgentIds: server.assignedAgentIds.filter(id => id !== agentId), updatedAt: Date.now() }
    await db.mcpServers.put(updated)
    set(s => ({ ...s, userServers: s.userServers.map(us => us.id === serverId ? updated : us) }))
  },

  setServerAgents: async (serverId, agentIds) => {
    const { userServers } = get()
    const server = userServers.find(s => s.id === serverId)
    if (!server) return

    const updated = { ...server, assignedAgentIds: agentIds, updatedAt: Date.now() }
    await db.mcpServers.put(updated)
    set(s => ({ ...s, userServers: s.userServers.map(us => us.id === serverId ? updated : us) }))
  },

  // ─── Tool access ─────────────────────────────────────────────────

  /**
   * Get tools available for a specific agent.
   * Uses IMPLICIT_AGENT_SERVERS for builtin agents, agent.implicitMCPIds for user agents.
   */
  getToolsForAgent: (agent: Agent) => {
    const { registry } = get()
    if (!registry) {
      return []
    }

    const implicitIds = agent.source === 'builtin'
      ? (IMPLICIT_AGENT_SERVERS[agent.id] ?? [])
      : agent.implicitMCPIds

    const tools: MCPToolInfo[] = []
    const seenToolKeys = new Set<string>()

    const addUnique = (t: MCPToolInfo) => {
      const key = `${t.serverId}:${t.name}`
      if (!seenToolKeys.has(key)) {
        seenToolKeys.add(key)
        tools.push(t)
      }
    }

    // 1. Implicit MCP tools
    for (const mcpId of implicitIds) {
      const server = registry.getServer(mcpId)
      if (server?.status === 'connected') {
        server.tools.forEach(addUnique)
      }
    }

    // 2. Custom MCP tools
    for (const mcpId of agent.customMCPIds) {
      const server = registry.getServer(mcpId)
      if (server?.status === 'connected') {
        server.tools.forEach(addUnique)
      }
    }

    return tools
  },

  getAllTools: () => {
    const { registry } = get()
    if (!registry) return []
    return registry.getAllTools()
  },

  callTool: async (serverId, toolName, args = {}) => {
    const { registry } = get()
    if (!registry) {
      return { success: false, content: [], error: 'MCP not initialized' }
    }
    return registry.callTool(serverId, toolName, args)
  },
}))
