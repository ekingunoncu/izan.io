import { create } from 'zustand'
import { storageService } from '~/lib/services'
import { db, DEFAULT_AGENTS, slugify, type Agent } from '~/lib/db'

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
    updates: Partial<Pick<Agent, 'name' | 'description' | 'icon' | 'basePrompt' | 'enabled' | 'category' | 'implicitMCPIds' | 'customMCPIds' | 'linkedAgentIds' | 'temperature' | 'maxTokens' | 'topP'>>,
  ) => Promise<void>
  deleteAgent: (agentId: string) => Promise<void>
  resetAgent: (agentId: string) => Promise<void>

  // Search
  searchAgents: (query: string) => Agent[]

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
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent || agent.implicitMCPIds.includes(mcpId)) return

    const updated: Agent = {
      ...agent,
      implicitMCPIds: [...agent.implicitMCPIds, mcpId],
      isEdited: true,
      updatedAt: Date.now(),
    }
    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
  },

  removeImplicitMCP: async (agentId, mcpId) => {
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return

    const updated: Agent = {
      ...agent,
      implicitMCPIds: agent.implicitMCPIds.filter(id => id !== mcpId),
      isEdited: true,
      updatedAt: Date.now(),
    }
    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
  },

  addCustomMCP: async (agentId, mcpId) => {
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent || agent.customMCPIds.includes(mcpId)) return

    const updated: Agent = {
      ...agent,
      customMCPIds: [...agent.customMCPIds, mcpId],
      isEdited: true,
      updatedAt: Date.now(),
    }
    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
  },

  removeCustomMCP: async (agentId, mcpId) => {
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return

    const updated: Agent = {
      ...agent,
      customMCPIds: agent.customMCPIds.filter(id => id !== mcpId),
      isEdited: true,
      updatedAt: Date.now(),
    }
    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
  },

  // ─── Agent Linking ──────────────────────────────────────────────

  linkAgent: async (agentId, targetAgentId) => {
    if (agentId === targetAgentId) return
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent || agent.linkedAgentIds.includes(targetAgentId)) return

    const updated: Agent = {
      ...agent,
      linkedAgentIds: [...agent.linkedAgentIds, targetAgentId],
      isEdited: true,
      updatedAt: Date.now(),
    }
    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
  },

  unlinkAgent: async (agentId, targetAgentId) => {
    const { agents } = get()
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return

    const updated: Agent = {
      ...agent,
      linkedAgentIds: agent.linkedAgentIds.filter(id => id !== targetAgentId),
      isEdited: true,
      updatedAt: Date.now(),
    }
    await db.agents.put(updated)
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? updated : a),
      currentAgent: s.currentAgentId === agentId ? updated : s.currentAgent,
    }))
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
