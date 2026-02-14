import { create } from 'zustand'
import { storageService } from '~/lib/services'
import { db, DEFAULT_AGENTS, slugify, type Agent } from '~/lib/db'
import type { AgentCategory, AutomationToolParameter, AutomationActionStep } from '~/lib/db/schema'
import { useMCPStore } from './mcp.store'
import { useAutomationStore } from './automation.store'

// ─── Agent Export/Import Types ─────────────────────────────────────────────────

interface AgentExportMacroTool {
  name: string
  displayName: string
  description: string
  version: string
  parameters: AutomationToolParameter[]
  steps: AutomationActionStep[]
  lanes?: Array<{ name: string; steps: AutomationActionStep[] }>
  viewport?: { width: number; height: number }
}

interface AgentExportMacroServer {
  name: string
  description: string
  category: string
  tools: AgentExportMacroTool[]
}

interface AgentExportCustomMCP {
  name: string
  url: string
  description: string
  headers?: Record<string, string>
}

export interface AgentExportData {
  version: 1
  exportedAt: number
  agent: {
    name: string
    slug: string
    description: string
    icon: string
    basePrompt: string
    category: AgentCategory
    implicitMCPIds: string[]
    extensionMCPIds: string[]
    temperature?: number
    maxTokens?: number
    topP?: number
    maxIterations?: number
  }
  linkedAgents?: AgentExportData[]
  customMCPs?: AgentExportCustomMCP[]
  macros?: { servers: AgentExportMacroServer[] }
}

/**
 * AgentState - State interface for agent management
 * Full CRUD, search, MCP management, and agent linking
 */
interface AgentState {
  // State
  agents: Agent[]
  currentAgentId: string | null
  currentAgent: Agent | null
  isInitialized: boolean
  favoriteAgentIds: string[]

  // Lifecycle
  initialize: () => Promise<void>
  selectAgent: (agentId: string) => Promise<void>
  getAgentById: (agentId: string) => Agent | undefined
  getAgentBySlug: (slug: string) => Agent | undefined
  getAgentSlug: (agent: Agent) => string

  // CRUD
  createAgent: (data: {
    name: string
    description: string
    icon: string
    basePrompt: string
  }) => Promise<Agent>
  updateAgent: (
    agentId: string,
    updates: Partial<Pick<Agent, 'name' | 'description' | 'icon' | 'basePrompt' | 'enabled' | 'category' | 'implicitMCPIds' | 'customMCPIds' | 'extensionMCPIds' | 'automationServerIds' | 'linkedAgentIds' | 'temperature' | 'maxTokens' | 'topP' | 'maxIterations'>>,
  ) => Promise<void>
  deleteAgent: (agentId: string) => Promise<void>
  resetAgent: (agentId: string) => Promise<void>

  // Search
  searchAgents: (query: string) => Agent[]

  // Export / Import
  exportAgent: (agentId: string) => AgentExportData | null
  importAgent: (json: unknown) => Promise<Agent>

  // MCP management
  addImplicitMCP: (agentId: string, mcpId: string) => Promise<void>
  removeImplicitMCP: (agentId: string, mcpId: string) => Promise<void>
  addCustomMCP: (agentId: string, mcpId: string) => Promise<void>
  removeCustomMCP: (agentId: string, mcpId: string) => Promise<void>

  // Agent linking
  linkAgent: (agentId: string, targetAgentId: string) => Promise<void>
  unlinkAgent: (agentId: string, targetAgentId: string) => Promise<void>

  // Favorites
  toggleFavoriteAgent: (agentId: string) => Promise<void>
}

/** Persist an agent update to IndexedDB and sync Zustand state */
async function persistAgentUpdate(
  get: () => AgentState,
  set: (fn: (s: AgentState) => Partial<AgentState>) => void,
  agentId: string,
  updater: (agent: Agent) => Partial<Agent>,
): Promise<void> {
  const { agents } = get()
  const agent = agents.find(a => a.id === agentId)
  if (!agent) return

  const updated: Agent = {
    ...agent,
    ...updater(agent),
    isEdited: true,
    updatedAt: Date.now(),
  }
  await db.agents.put(updated)
  set(s => ({
    agents: s.agents.map(a => a.id === agentId ? updated : a),
    currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
  }))
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  currentAgentId: null,
  currentAgent: null,
  isInitialized: false,
  favoriteAgentIds: [],

  // ─── Initialize from IndexedDB ─────────────────────────────────

  initialize: async () => {
    if (get().isInitialized) return

    try {
      const agents = await db.agents.toArray()
      const prefs = await storageService.getPreferences()
      const agentId = prefs.lastAgentId || 'general'
      const agent = agents.find(a => a.id === agentId)

      set({
        agents,
        currentAgentId: agentId,
        currentAgent: agent || agents[0] || null,
        favoriteAgentIds: prefs.favoriteAgentIds ?? [],
        isInitialized: true,
      })
    } catch (error) {
      console.error('Failed to initialize agent store:', error)
      set({
        agents: DEFAULT_AGENTS,
        currentAgentId: 'general',
        currentAgent: DEFAULT_AGENTS[0],
        favoriteAgentIds: [],
        isInitialized: true,
      })
    }
  },

  // ─── Select ─────────────────────────────────────────────────────

  selectAgent: async (agentId: string) => {
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId) ?? DEFAULT_AGENTS.find(a => a.id === agentId)
    if (!agent) {
      console.error('Agent not found:', agentId)
      return
    }
    set({ currentAgentId: agentId, currentAgent: agent })
    await storageService.updatePreferences({ lastAgentId: agentId })
  },

  getAgentById: (agentId: string) => {
    return get().agents.find(a => a.id === agentId) ?? DEFAULT_AGENTS.find(a => a.id === agentId)
  },

  getAgentBySlug: (slug: string) => {
    return get().agents.find(a => a.slug === slug || a.id === slug) ?? DEFAULT_AGENTS.find(a => a.slug === slug || a.id === slug)
  },

  getAgentSlug: (agent: Agent) => agent.slug,

  // ─── CRUD ───────────────────────────────────────────────────────

  createAgent: async (data) => {
    const now = Date.now()
    const baseSlug = slugify(data.name)
    const existingSlugs = new Set(get().agents.map(a => (a as Agent & { slug?: string }).slug ?? a.id))
    let slug = baseSlug
    let n = 1
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${++n}`
    }
    const agent: Agent = {
      id: crypto.randomUUID(),
      slug,
      name: data.name,
      description: data.description,
      icon: data.icon,
      basePrompt: data.basePrompt,
      enabled: true,
      category: 'custom',
      source: 'user',
      implicitMCPIds: [],
      customMCPIds: [],
      extensionMCPIds: [],
      automationServerIds: [],
      linkedAgentIds: [],
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    }

    await db.agents.add(agent)
    set(s => ({ agents: [...s.agents, agent] }))
    return agent
  },

  updateAgent: async (agentId, updates) => {
    const { agents } = get()
    const existing = agents.find(a => a.id === agentId)
    if (!existing) return

    const updated: Agent = {
      ...existing,
      ...updates,
      isEdited: true,
      updatedAt: Date.now(),
    }

    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
  },

  deleteAgent: async (agentId) => {
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent || agent.source !== 'user') {
      console.error('Cannot delete builtin agent:', agentId)
      return
    }

    await db.agents.delete(agentId)

    // Also remove from linked agents of other agents
    const linkedAgents = agents.filter(a => a.linkedAgentIds.includes(agentId))
    for (const la of linkedAgents) {
      const updated = {
        ...la,
        linkedAgentIds: la.linkedAgentIds.filter(id => id !== agentId),
        updatedAt: Date.now(),
      }
      await db.agents.put(updated)
    }

    set(s => {
      const newAgents = s.agents
        .filter(a => a.id !== agentId)
        .map(a => a.linkedAgentIds.includes(agentId)
          ? { ...a, linkedAgentIds: a.linkedAgentIds.filter(id => id !== agentId) }
          : a
        )

      const needsNewSelection = s.currentAgentId === agentId
      return {
        agents: newAgents,
        favoriteAgentIds: s.favoriteAgentIds.filter(id => id !== agentId),
        ...(needsNewSelection
          ? { currentAgentId: newAgents[0]?.id || null, currentAgent: newAgents[0] || null }
          : {}),
      }
    })
    await storageService.updatePreferences({
      favoriteAgentIds: get().favoriteAgentIds,
    })
  },

  resetAgent: async (agentId) => {
    const defaultAgent = DEFAULT_AGENTS.find(a => a.id === agentId)
    if (!defaultAgent) {
      console.error('Not a builtin agent:', agentId)
      return
    }

    const reset: Agent = { ...defaultAgent, updatedAt: Date.now() }
    await db.agents.put(reset)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? reset : a),
      currentAgent: s.currentAgentId === agentId ? reset : s.currentAgent,
    }))
  },

  // ─── Search ─────────────────────────────────────────────────────

  searchAgents: (query: string) => {
    const { agents } = get()
    if (!query.trim()) return agents.filter(a => a.enabled)

    const terms = query.toLowerCase().split(/\s+/)
    return agents.filter(a => {
      if (!a.enabled) return false
      const haystack = `${a.name} ${a.description} ${a.category}`.toLowerCase()
      return terms.every(t => haystack.includes(t))
    })
  },

  // ─── MCP Management ────────────────────────────────────────────

  addImplicitMCP: async (agentId, mcpId) => {
    const agent = get().agents.find(a => a.id === agentId)
    if (!agent || agent.implicitMCPIds.includes(mcpId)) return
    await persistAgentUpdate(get, set, agentId, (a) => ({
      implicitMCPIds: [...a.implicitMCPIds, mcpId],
    }))
  },

  removeImplicitMCP: async (agentId, mcpId) => {
    await persistAgentUpdate(get, set, agentId, (a) => ({
      implicitMCPIds: a.implicitMCPIds.filter(id => id !== mcpId),
    }))
  },

  addCustomMCP: async (agentId, mcpId) => {
    const agent = get().agents.find(a => a.id === agentId)
    if (!agent || agent.customMCPIds.includes(mcpId)) return
    await persistAgentUpdate(get, set, agentId, (a) => ({
      customMCPIds: [...a.customMCPIds, mcpId],
    }))
  },

  removeCustomMCP: async (agentId, mcpId) => {
    await persistAgentUpdate(get, set, agentId, (a) => ({
      customMCPIds: a.customMCPIds.filter(id => id !== mcpId),
    }))
  },

  // ─── Agent Linking ──────────────────────────────────────────────

  linkAgent: async (agentId, targetAgentId) => {
    if (agentId === targetAgentId) return
    const agent = get().agents.find(a => a.id === agentId)
    if (!agent || agent.linkedAgentIds.includes(targetAgentId)) return
    await persistAgentUpdate(get, set, agentId, (a) => ({
      linkedAgentIds: [...a.linkedAgentIds, targetAgentId],
    }))
  },

  unlinkAgent: async (agentId, targetAgentId) => {
    await persistAgentUpdate(get, set, agentId, (a) => ({
      linkedAgentIds: a.linkedAgentIds.filter(id => id !== targetAgentId),
    }))
  },

  // ─── Export / Import ──────────────────────────────────────────────

  exportAgent: (agentId: string) => {
    const agent = get().getAgentById(agentId)
    if (!agent) return null

    const mcpState = useMCPStore.getState()
    const autoState = useAutomationStore.getState()

    // Collect linked agents recursively (avoid cycles)
    const visited = new Set<string>([agentId])
    const collectLinked = (a: Agent): AgentExportData[] => {
      const result: AgentExportData[] = []
      for (const linkedId of a.linkedAgentIds) {
        if (visited.has(linkedId)) continue
        visited.add(linkedId)
        const la = get().getAgentById(linkedId)
        if (!la) continue
        result.push(buildExport(la, collectLinked(la)))
      }
      return result
    }

    const buildExport = (a: Agent, linked: AgentExportData[]): AgentExportData => {
      // Custom MCPs
      const customMCPs = a.customMCPIds
        .map(id => mcpState.userServers.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map(s => ({
          name: s.name,
          url: s.url,
          description: s.description,
          ...(s.headers && Object.keys(s.headers).length > 0 ? { headers: s.headers } : {}),
        }))

      // Macros
      const macroServers = (a.automationServerIds ?? [])
        .map(id => autoState.servers.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map(server => ({
          name: server.name,
          description: server.description,
          category: server.category,
          tools: autoState.tools
            .filter(t => t.serverId === server.id)
            .map(t => ({
              name: t.name,
              displayName: t.displayName,
              description: t.description,
              version: t.version,
              parameters: t.parameters,
              steps: t.steps,
              ...(t.lanes ? { lanes: t.lanes } : {}),
              ...(t.viewport ? { viewport: t.viewport } : {}),
            })),
        }))

      return {
        version: 1,
        exportedAt: Date.now(),
        agent: {
          name: a.name,
          slug: a.slug,
          description: a.description,
          icon: a.icon,
          basePrompt: a.basePrompt,
          category: a.category,
          implicitMCPIds: a.implicitMCPIds,
          extensionMCPIds: a.extensionMCPIds ?? [],
          ...(a.temperature != null ? { temperature: a.temperature } : {}),
          ...(a.maxTokens != null ? { maxTokens: a.maxTokens } : {}),
          ...(a.topP != null ? { topP: a.topP } : {}),
          ...(a.maxIterations != null ? { maxIterations: a.maxIterations } : {}),
        },
        ...(linked.length > 0 ? { linkedAgents: linked } : {}),
        ...(customMCPs.length > 0 ? { customMCPs } : {}),
        ...(macroServers.length > 0 ? { macros: { servers: macroServers } } : {}),
      }
    }

    return buildExport(agent, collectLinked(agent))
  },

  importAgent: async (json: unknown) => {
    const data = json as AgentExportData
    if (!data?.agent?.name) throw new Error('Invalid agent export data')

    const mcpStore = useMCPStore.getState()
    const autoStore = useAutomationStore.getState()
    if (!autoStore.initialized) await autoStore.initialize()

    // 1. Resolve linked agents (slug-based matching, recursive)
    const resolvedLinkedIds: string[] = []
    if (data.linkedAgents?.length) {
      for (const linkedData of data.linkedAgents) {
        const existing = get().getAgentBySlug(linkedData.agent.slug)
        if (existing) {
          resolvedLinkedIds.push(existing.id)
        } else {
          const imported = await get().importAgent(linkedData)
          resolvedLinkedIds.push(imported.id)
        }
      }
    }

    // 2. Resolve custom MCPs (URL-based matching)
    const resolvedCustomMCPIds: string[] = []
    if (data.customMCPs?.length) {
      for (const mcpData of data.customMCPs) {
        const existing = mcpStore.userServers.find(s => s.url === mcpData.url)
        if (existing) {
          resolvedCustomMCPIds.push(existing.id)
        } else {
          const created = await mcpStore.addUserServer({
            name: mcpData.name,
            url: mcpData.url,
            description: mcpData.description || '',
            headers: mcpData.headers,
            assignedAgentIds: [],
          })
          resolvedCustomMCPIds.push(created.id)
        }
      }
    }

    // 3. Import macros
    const resolvedAutoServerIds: string[] = []
    if (data.macros?.servers?.length) {
      for (const serverData of data.macros.servers) {
        const server = await autoStore.importServer({
          server: {
            name: serverData.name,
            description: serverData.description,
            category: serverData.category,
          },
          tools: serverData.tools,
        })
        resolvedAutoServerIds.push(server.id)
      }
    }

    // 4. Create the agent
    const agent = await get().createAgent({
      name: data.agent.name,
      description: data.agent.description,
      icon: data.agent.icon || 'bot',
      basePrompt: data.agent.basePrompt || '',
    })

    // 5. Apply all resolved references and model params
    await get().updateAgent(agent.id, {
      category: data.agent.category || 'custom',
      implicitMCPIds: data.agent.implicitMCPIds || [],
      extensionMCPIds: data.agent.extensionMCPIds || [],
      customMCPIds: resolvedCustomMCPIds,
      automationServerIds: resolvedAutoServerIds,
      linkedAgentIds: resolvedLinkedIds,
      ...(data.agent.temperature != null ? { temperature: data.agent.temperature } : {}),
      ...(data.agent.maxTokens != null ? { maxTokens: data.agent.maxTokens } : {}),
      ...(data.agent.topP != null ? { topP: data.agent.topP } : {}),
      ...(data.agent.maxIterations != null ? { maxIterations: data.agent.maxIterations } : {}),
    })

    return get().getAgentById(agent.id)!
  },

  // ─── Favorites ───────────────────────────────────────────────────

  toggleFavoriteAgent: async (agentId: string) => {
    const { favoriteAgentIds } = get()
    const isFavorite = favoriteAgentIds.includes(agentId)
    const newIds = isFavorite
      ? favoriteAgentIds.filter(id => id !== agentId)
      : [...favoriteAgentIds, agentId]
    set({ favoriteAgentIds: newIds })
    await storageService.updatePreferences({ favoriteAgentIds: newIds })
  },
}))
