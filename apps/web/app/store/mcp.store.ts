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
import {
  listenForExtension,
  pingExtension,
  extensionServerUrl,
  type ExtensionServerMeta,
  type ExtensionReadyPayload,
} from '~/lib/mcp/extension-bridge'

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

  // ─── Extension state ────────────────────────────────────────────
  /** Whether the izan.io Chrome extension has been detected */
  isExtensionInstalled: boolean
  /** MCP servers provided by the extension */
  extensionServers: ExtensionServerMeta[]
  /** Whether the current agent requires the extension but it's not installed */
  extensionRequired: boolean

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
  isExtensionInstalled: false,
  extensionServers: [],
  extensionRequired: false,

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

    // Listen for the izan.io Chrome extension
    listenForExtension(
      (payload: ExtensionReadyPayload) => {
        set({
          isExtensionInstalled: true,
          extensionServers: payload.servers,
          extensionRequired: false,
        })
        // Re-activate the current agent to pick up extension servers
        const { lastActivatedAgent } = get()
        if (lastActivatedAgent) {
          void get().activateAgentMCPs(lastActivatedAgent)
        }
        // Ensure automation store is initialized so it can receive "Tamamla" steps from side panel
        import('~/store/automation.store').then(({ useAutomationStore }) => {
          void useAutomationStore.getState().initialize()
        })
      },
      () => {
        // Extension disconnected — clean up extension servers from registry
        const { registry, extensionServers } = get()
        if (registry) {
          for (const extServer of extensionServers) {
            void registry.removeServer(extServer.id)
          }
        }
        set({
          isExtensionInstalled: false,
          extensionServers: [],
        })
      },
    )
    // Ping in case extension loaded before the web app
    pingExtension()

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
    let extensionNeeded = false

    // 1. Implicit (builtin) MCP IDs (excluding disabled)
    for (const mcpId of effectiveImplicitIds) {
      neededIds.add(mcpId)
    }

    // 2. Custom MCP IDs from the agent
    for (const mcpId of agent.customMCPIds) {
      neededIds.add(mcpId)
    }

    // 3. Extension MCP IDs from the agent (only if extension announces them)
    const { extensionServers: extServersForFilter, isExtensionInstalled: extInstalled } = get()
    const announcedExtIds = new Set(extServersForFilter.map(es => es.id))
    for (const mcpId of agent.extensionMCPIds ?? []) {
      // Skip stale extension server IDs that the extension no longer provides
      if (mcpId.startsWith('ext-') && extInstalled && !announcedExtIds.has(mcpId)) {
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.log('[mcp] Skipping stale extension server:', mcpId)
        }
        continue
      }
      neededIds.add(mcpId)
    }

    // 4. Auto-include ext-dynamic if agent has automationServerIds (pre-built macros from S3)
    const automationServerIds = (agent as { automationServerIds?: string[] }).automationServerIds ?? []
    if (automationServerIds.length > 0) {
      neededIds.add('ext-dynamic')
    }

    // Start/stop browser servers in parallel
    const browserServerOps: Promise<void>[] = []
    if (neededIds.has('general')) {
      browserServerOps.push(ensureGeneralServer())
    } else {
      browserServerOps.push(shutdownGeneralServer())
    }
    if (neededIds.has('domain-check-client')) {
      browserServerOps.push(ensureDomainCheckServer())
    } else {
      browserServerOps.push(shutdownDomainCheckServer())
    }
    if (neededIds.has('crypto-analysis-client')) {
      const coingeckoKey = useExternalApiKeysStore.getState().getExternalApiKey('coingecko_api')
      browserServerOps.push(ensureCryptoAnalysisServer(coingeckoKey))
    } else {
      browserServerOps.push(shutdownCryptoAnalysisServer())
    }

    // Disconnect unneeded servers in parallel
    const removeOps = [...activeServerIds]
      .filter(sid => !neededIds.has(sid))
      .map(sid => registry.removeServer(sid))

    // Wait for browser servers and removals together
    await Promise.all([...browserServerOps, ...removeOps])

    // Connect servers that are needed but not yet connected — in parallel
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('[mcp] activateAgentMCPs:', agent.id, 'neededIds:', [...neededIds])
    }
    const { extensionServers: extServers, isExtensionInstalled } = get()
    const connectOps: Promise<void>[] = []

    for (const sid of neededIds) {
      const existing = registry.getServer(sid)
      if (existing?.status === 'connected') continue

      // Check if it's a builtin server
      const builtinConfig = DEFAULT_MCP_SERVERS.find(s => s.id === sid)
      if (builtinConfig) {
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.log('[mcp] Adding server:', sid, 'url:', builtinConfig.url)
        }
        connectOps.push(registry.addServer(builtinConfig).then(() => {}))
        continue
      }

      // Check if it's a user server (direct → proxy fallback)
      const userServer = userServers.find(us => us.id === sid)
      if (userServer) {
        connectOps.push(
          registry.addServer(buildUserMcpConfigDirect(userServer)).then(async (state) => {
            if (state.status === 'error') {
              await registry.removeServer(sid)
              await registry.addServer(buildUserMcpConfigProxy(userServer))
            }
          })
        )
        continue
      }

      // Check if it's an extension server
      const extServer = extServers.find(es => es.id === sid)
      if (extServer) {
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.log('[mcp] Adding extension server:', sid, 'channelId:', extServer.channelId)
        }
        connectOps.push(
          registry.addServer({
            id: extServer.id,
            name: extServer.name,
            description: extServer.description,
            url: extensionServerUrl(extServer.channelId),
            category: extServer.category as MCPServerConfig['category'],
            source: 'extension' as MCPServerConfig['source'],
          }).then(() => {})
        )
        continue
      }

      // Extension server needed but extension not installed → flag it
      if (sid.startsWith('ext-') && !isExtensionInstalled) {
        extensionNeeded = true
      }
    }

    await Promise.all(connectOps)

    // If ext-dynamic is connected and extension is available, sync automation tool definitions
    if (neededIds.has('ext-dynamic') && get().isExtensionInstalled) {
      try {
        const { useAutomationStore } = await import('~/store/automation.store')
        const autoStore = useAutomationStore.getState()
        if (!autoStore.initialized) await autoStore.initialize()
        autoStore.syncToExtension()
      } catch (err) {
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.warn('[mcp] Failed to sync automation tools to extension:', err)
        }
      }
    }

    // Fetch remote tool definitions for pre-built extension servers from S3.
    // User-created automation tools (ext-user-*) are already synced via syncToExtension() above.
    if (get().isExtensionInstalled) {
      const remoteServerIds = [...neededIds].filter(id =>
        id.startsWith('ext-') && id !== 'ext-dynamic' && !id.startsWith('ext-user-') && !registry.getServer(id)
      )
      if (remoteServerIds.length > 0) {
        try {
          const { fetchRemoteToolDefinitions } = await import('~/lib/mcp/remote-tools')
          const tools = await fetchRemoteToolDefinitions(remoteServerIds)
          if (tools.length > 0) {
            const { syncToolDefinitions } = await import('~/lib/mcp/extension-bridge')
            syncToolDefinitions(tools)
          }
        } catch (err) {
          if (typeof window !== 'undefined' && import.meta.env?.DEV) {
            console.warn('[mcp] Failed to fetch remote tool definitions:', err)
          }
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
      extensionRequired: extensionNeeded,
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
      isExtensionInstalled: false,
      extensionServers: [],
      extensionRequired: false,
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

    // Do NOT connect here. Connection happens when activateAgentMCPs runs
    // for an agent that has this server in customMCPIds.

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
    const extensionIds = agent.extensionMCPIds ?? []

    const tools: MCPToolInfo[] = []
    const seenToolKeys = new Set<string>()

    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('[mcp] getToolsForAgent:', agent.id, 'effectiveImplicitIds:', effectiveImplicitIds, 'extensionIds:', extensionIds)
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

    // 2. Extension MCP tools
    for (const mcpId of extensionIds) {
      const server = registry.getServer(mcpId)
      if (server?.status === 'connected') {
        server.tools.forEach(addUnique)
      }
    }

    // 3. Custom MCP tools
    for (const mcpId of agent.customMCPIds) {
      const server = registry.getServer(mcpId)
      if (server?.status === 'connected') {
        server.tools.forEach(addUnique)
      }
    }

    // 4. Automation tools (ext-dynamic) when agent has automationServerIds
    const automationServerIds = (agent as { automationServerIds?: string[] }).automationServerIds ?? []
    if (automationServerIds.length > 0) {
      const dynServer = registry.getServer('ext-dynamic')
      if (dynServer?.status === 'connected') {
        dynServer.tools.forEach(addUnique)
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
