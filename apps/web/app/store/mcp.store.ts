import { create } from 'zustand'
import {
  MCPServerRegistry,
  type MCPServerConfig,
  type MCPServerState,
  type MCPToolInfo,
  type MCPToolCallResult,
} from '@izan/mcp-client'
import { DEFAULT_MCP_SERVERS, IMPLICIT_AGENT_SERVERS, getProxyMcpUrl } from '~/lib/mcp/config'
import { db, type UserMCPServer } from '~/lib/db'
import type { Agent } from '~/lib/db/schema'
import {
  ensureDomainCheckServer,
  shutdownDomainCheckServer,
} from '~/lib/mcp/domain-check-server'
import {
  ensureCryptoAnalysisServer,
  shutdownCryptoAnalysisServer,
} from '~/lib/mcp/crypto-analysis-server'
import {
  ensureGeneralServer,
  shutdownGeneralServer,
} from '~/lib/mcp/general-server'
import { storageService } from '~/lib/services'
import { useExternalApiKeysStore } from './external-api-keys.store'

/** Direct config (try first) */
function buildUserMcpConfigDirect(userServer: UserMCPServer): MCPServerConfig {
  return {
    id: userServer.id,
    name: userServer.name,
    description: userServer.description,
    url: userServer.url,
    category: 'custom',
    source: 'user',
    headers: userServer.headers,
  }
}

/** Proxy config (fallback when direct fails / CORS) */
function buildUserMcpConfigProxy(userServer: UserMCPServer): MCPServerConfig {
  const targetPayload = { url: userServer.url, headers: userServer.headers ?? {} }
  const targetB64 = btoa(unescape(encodeURIComponent(JSON.stringify(targetPayload))))
  return {
    id: userServer.id,
    name: userServer.name,
    description: userServer.description,
    url: getProxyMcpUrl(),
    category: 'custom',
    source: 'user',
    headers: { 'X-MCP-Proxy-Target': targetB64 },
  }
}

interface MCPState {
  registry: MCPServerRegistry | null
  /** All connected servers (builtin + user) visible in the registry */
  servers: MCPServerState[]
  /** User-added servers persisted in IndexedDB */
  userServers: UserMCPServer[]
  /** Currently active MCP server IDs (connected for the current agent) */
  activeServerIds: Set<string>
  /** Built-in MCP server IDs that are globally disabled */
  disabledBuiltinMCPIds: string[]
  /** Last agent we activated MCPs for (for re-activation when disabled changes) */
  lastActivatedAgent: Agent | null
  isInitialized: boolean
  error: string | null

  // Lifecycle
  initialize: () => Promise<void>
  reconnect: () => Promise<void>

  /**
   * Set globally disabled built-in MCP server IDs.
   * Persists to preferences and re-activates current agent's MCPs.
   */
  setDisabledBuiltinMCPIds: (ids: string[]) => Promise<void>

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
  disabledBuiltinMCPIds: [],
  lastActivatedAgent: null,
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
      await useExternalApiKeysStore.getState().initialize()
      const [userServers, prefs] = await Promise.all([
        db.mcpServers.toArray(),
        storageService.getPreferences(),
      ])
      set({
        userServers,
        disabledBuiltinMCPIds: prefs.disabledBuiltinMCPIds ?? [],
        isInitialized: true,
        error: null,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MCP initialization failed'
      set({ isInitialized: true, error: message })
    }
  },

  setDisabledBuiltinMCPIds: async (ids) => {
    await storageService.updatePreferences({ disabledBuiltinMCPIds: ids })
    set({ disabledBuiltinMCPIds: ids })
    const { lastActivatedAgent } = get()
    if (lastActivatedAgent) {
      await get().activateAgentMCPs(lastActivatedAgent)
    }
  },

  /**
   * Activate MCPs needed by a specific agent.
   * Connects implicit + custom MCPs, disconnects unneeded ones.
   * Respects globally disabled built-in MCPs.
   */
  activateAgentMCPs: async (agent: Agent) => {
    const { registry, userServers, activeServerIds, disabledBuiltinMCPIds } = get()
    if (!registry) {
      return
    }

    set({ lastActivatedAgent: agent })

    // For builtin agents: use IMPLICIT_AGENT_SERVERS unless user has edited (isEdited) → then respect agent.implicitMCPIds
    let implicitIds: string[]
    if (agent.source === 'builtin' && agent.isEdited) {
      implicitIds = agent.implicitMCPIds
    } else if (agent.source === 'builtin') {
      implicitIds = IMPLICIT_AGENT_SERVERS[agent.id] ?? []
    } else {
      implicitIds = agent.implicitMCPIds
    }
    // Filter out globally disabled built-in MCPs
    const disabledSet = new Set(disabledBuiltinMCPIds)
    const effectiveImplicitIds = implicitIds.filter(id => !disabledSet.has(id))

    // Determine which servers this agent needs
    const neededIds = new Set<string>()

    // 1. Implicit (builtin) MCP IDs (excluding disabled)
    for (const mcpId of effectiveImplicitIds) {
      neededIds.add(mcpId)
    }

    // 2. Custom MCP IDs from the agent
    for (const mcpId of agent.customMCPIds) {
      neededIds.add(mcpId)
    }

    // Handle general lifecycle (TabServerTransport)
    if (neededIds.has('general')) {
      await ensureGeneralServer()
    } else {
      await shutdownGeneralServer()
    }

    // Handle domain-check-client lifecycle (TabServerTransport)
    if (neededIds.has('domain-check-client')) {
      await ensureDomainCheckServer()
    } else {
      await shutdownDomainCheckServer()
    }

    // Handle crypto-analysis-client lifecycle (TabServerTransport)
    if (neededIds.has('crypto-analysis-client')) {
      const coingeckoKey = useExternalApiKeysStore.getState().getExternalApiKey('coingecko_api')
      await ensureCryptoAnalysisServer(coingeckoKey)
    } else {
      await shutdownCryptoAnalysisServer()
    }

    // Disconnect servers that are no longer needed
    for (const sid of activeServerIds) {
      if (!neededIds.has(sid)) {
        await registry.removeServer(sid)
      }
    }

    // Connect servers that are needed but not yet connected
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('[mcp] activateAgentMCPs:', agent.id, 'neededIds:', [...neededIds])
    }
    for (const sid of neededIds) {
      const existing = registry.getServer(sid)
      const isSerpSearch = sid === 'serp-search'
      if (existing?.status === 'connected' && !isSerpSearch) continue

      // Check if it's a builtin server
      const builtinConfig = DEFAULT_MCP_SERVERS.find(s => s.id === sid)
      if (builtinConfig) {
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.log('[mcp] Adding server:', sid, 'url:', builtinConfig.url)
        }
        let configToAdd = builtinConfig
        if (isSerpSearch) {
          const apiKey = useExternalApiKeysStore.getState().getExternalApiKey('serp_api')
          if (apiKey) {
            configToAdd = { ...builtinConfig, headers: { 'X-SerpApi-Key': apiKey } }
          }
          if (existing?.status === 'connected') {
            await registry.removeServer(sid)
          }
        }
        await registry.addServer(configToAdd)
        continue
      }

      // Check if it's a user server
      const userServer = userServers.find(us => us.id === sid)
      if (userServer) {
        let state = await registry.addServer(buildUserMcpConfigDirect(userServer))
        if (state.status === 'error') {
          await registry.removeServer(sid)
          state = await registry.addServer(buildUserMcpConfigProxy(userServer))
        }
      }
    }

    // Update state
    const allServers = registry.getServers()
    const failedServers = allServers.filter(s => s.status === 'error')
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('[mcp] After activateAgentMCPs - servers:', allServers.map(s => ({ id: s.config.id, status: s.status, tools: s.tools.map(t => t.name) })))
    }
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
    set({
      isInitialized: false,
      error: null,
      registry: null,
      servers: [],
      userServers: [],
      activeServerIds: new Set(),
      lastActivatedAgent: null,
    })
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

    // Connect via registry (try direct first, fallback to proxy on CORS)
    let state = await registry.addServer(buildUserMcpConfigDirect(server))
    if (state.status === 'error') {
      await registry.removeServer(server.id)
      state = await registry.addServer(buildUserMcpConfigProxy(server))
    }

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

    if (registry && (updates.url !== undefined || updates.headers !== undefined)) {
      await registry.removeServer(serverId)
      const state = await registry.addServer(buildUserMcpConfigDirect(updated))
      if (state.status === 'error') {
        await registry.removeServer(serverId)
        await registry.addServer(buildUserMcpConfigProxy(updated))
      }
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
   * For builtin agents: IMPLICIT_AGENT_SERVERS unless isEdited → then agent.implicitMCPIds.
   * Respects globally disabled built-in MCPs.
   */
  getToolsForAgent: (agent: Agent) => {
    const { registry, disabledBuiltinMCPIds } = get()
    if (!registry) {
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.log('[mcp] getToolsForAgent: no registry')
      }
      return []
    }

    let implicitIds: string[]
    if (agent.source === 'builtin' && agent.isEdited) {
      implicitIds = agent.implicitMCPIds
    } else if (agent.source === 'builtin') {
      implicitIds = IMPLICIT_AGENT_SERVERS[agent.id] ?? []
    } else {
      implicitIds = agent.implicitMCPIds
    }

    const disabledSet = new Set(disabledBuiltinMCPIds)
    const effectiveImplicitIds = implicitIds.filter(id => !disabledSet.has(id))

    const tools: MCPToolInfo[] = []
    const seenToolKeys = new Set<string>()

    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('[mcp] getToolsForAgent:', agent.id, 'effectiveImplicitIds:', effectiveImplicitIds)
    }

    const addUnique = (t: MCPToolInfo) => {
      const key = `${t.serverId}:${t.name}`
      if (!seenToolKeys.has(key)) {
        seenToolKeys.add(key)
        tools.push(t)
      }
    }

    // 1. Implicit MCP tools (excluding disabled)
    for (const mcpId of effectiveImplicitIds) {
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

    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('[mcp] getToolsForAgent result:', agent.id, 'tools:', tools.map(t => `${t.serverId}:${t.name}`), 'serverStatuses:', effectiveImplicitIds.map(id => ({ id, status: registry.getServer(id)?.status })))
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
