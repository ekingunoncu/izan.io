/**
 * FlowStore - Zustand store for the flow orchestration editor.
 * Root-agent focused: only the selected root agent and its linked agents are shown.
 * Persists node positions to UserPreferences.
 */

import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import type { Agent } from '~/lib/db/schema'
import { getLayoutedElements } from '~/lib/flow/layout'
import { storageService } from '~/lib/services'
import { useAgentStore } from '~/store/agent.store'

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  /** The currently selected root agent */
  rootAgentId: string | null
  /** History stack for drill-down navigation */
  rootAgentHistory: string[]
  /** Saved positions from DB */
  savedPositions: Record<string, { x: number; y: number }>
  /** Debounced save timer */
  _saveTimer: ReturnType<typeof setTimeout> | null
  /** Incremented on each graph rebuild to trigger fitView in FlowEditor */
  _fitViewTrigger: number
  /** True after initializeFlow completes */
  _ready: boolean

  /** Initialize flow from agents + saved positions */
  initializeFlow: (agents: Agent[], savedPositions?: Record<string, { x: number; y: number }>) => void
  /** Set root agent and reset history */
  setRootAgent: (agentId: string) => void
  /** Drill into a linked agent (push current root to history) */
  drillInto: (agentId: string) => void
  /** Drill back to previous root from history */
  drillBack: () => void
  /** Refresh nodes/edges from current agent state */
  refreshFromAgents: (agents: Agent[]) => void
  /** Update a single node position (called on drag) */
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  /** Auto-layout all nodes */
  autoLayout: () => void
  /** Save positions to DB (debounced) */
  savePositions: () => void
}

/** Recursively collect all reachable agents from root, with circular link protection */
function buildGraph(
  agents: Agent[],
  rootAgentId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  if (!rootAgentId) return { nodes: [], edges: [] }

  const rootAgent = agents.find(a => a.id === rootAgentId)
  if (!rootAgent) return { nodes: [], edges: [] }

  // BFS to collect all reachable agents — visited set prevents circular loops
  const visited = new Set<string>()
  const visibleAgents: Agent[] = []
  const queue: string[] = [rootAgentId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const agent = agents.find(a => a.id === currentId)
    if (!agent) continue
    visibleAgents.push(agent)

    for (const linkedId of agent.linkedAgentIds) {
      if (!visited.has(linkedId)) queue.push(linkedId)
    }
  }

  const nodes: Node[] = visibleAgents.map(agent => ({
    id: agent.id,
    type: 'agentNode',
    position: { x: 0, y: 0 },
    data: {
      agent,
      isRoot: agent.id === rootAgentId,
      mcpCount: agent.implicitMCPIds.length + agent.customMCPIds.length + (agent.extensionMCPIds?.length ?? 0),
      linkedCount: agent.linkedAgentIds.length,
      macroCount: agent.automationServerIds?.length ?? 0,
    },
  }))

  // Edges from every agent to its linked agents (deduplicated)
  const edgeSet = new Set<string>()
  const edges: Edge[] = []
  for (const agent of visibleAgents) {
    for (const linkedId of agent.linkedAgentIds) {
      if (!visited.has(linkedId)) continue // target not in graph
      const edgeId = `${agent.id}->${linkedId}`
      if (edgeSet.has(edgeId)) continue
      edgeSet.add(edgeId)
      edges.push({
        id: edgeId,
        source: agent.id,
        target: linkedId,
        type: 'agentEdge',
        animated: true,
      })
    }
  }

  return { nodes, edges }
}

/** Build graph + apply auto-layout + return state patch including fitView trigger bump */
function rebuildAndLayout(
  agents: Agent[],
  rootAgentId: string | null,
  currentTrigger: number,
): Partial<FlowState> {
  const { nodes, edges } = buildGraph(agents, rootAgentId)
  if (nodes.length === 0) {
    return { nodes, edges, _fitViewTrigger: currentTrigger + 1 }
  }
  const layouted = getLayoutedElements(nodes, edges)
  return {
    nodes: layouted.nodes,
    edges: layouted.edges,
    _fitViewTrigger: currentTrigger + 1,
  }
}

// --- Agent store subscription (auto-refresh when agents change) ---
let _agentSubInitialized = false
let _prevAgentsRef: Agent[] = []

function setupAgentSubscription() {
  if (_agentSubInitialized) return
  _agentSubInitialized = true
  _prevAgentsRef = useAgentStore.getState().agents

  useAgentStore.subscribe((state) => {
    if (state.agents === _prevAgentsRef) return
    _prevAgentsRef = state.agents
    const flowState = useFlowStore.getState()
    if (flowState._ready && flowState.rootAgentId) {
      flowState.refreshFromAgents(state.agents)
    }
  })
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  rootAgentId: null,
  rootAgentHistory: [],
  savedPositions: {},
  _saveTimer: null,
  _fitViewTrigger: 0,
  _ready: false,

  initializeFlow: (agents, savedPositions = {}) => {
    // Pick initial root: first enabled agent or null
    const firstEnabled = agents.find(a => a.enabled)
    const rootAgentId = firstEnabled?.id ?? null
    const patch = rebuildAndLayout(agents, rootAgentId, get()._fitViewTrigger)
    set({ ...patch, savedPositions, rootAgentId, rootAgentHistory: [], _ready: true })
    // Start listening to agent store changes
    setupAgentSubscription()
  },

  setRootAgent: (agentId) => {
    const agents = useAgentStore.getState().agents
    const patch = rebuildAndLayout(agents, agentId, get()._fitViewTrigger)
    set({ ...patch, rootAgentId: agentId, rootAgentHistory: [] })
  },

  drillInto: (agentId) => {
    const { rootAgentId, rootAgentHistory } = get()
    if (!rootAgentId || agentId === rootAgentId) return
    const agents = useAgentStore.getState().agents
    const patch = rebuildAndLayout(agents, agentId, get()._fitViewTrigger)
    set({
      ...patch,
      rootAgentId: agentId,
      rootAgentHistory: [...rootAgentHistory, rootAgentId],
    })
  },

  drillBack: () => {
    const { rootAgentHistory } = get()
    if (rootAgentHistory.length === 0) return
    const prev = rootAgentHistory[rootAgentHistory.length - 1]
    const agents = useAgentStore.getState().agents
    const patch = rebuildAndLayout(agents, prev, get()._fitViewTrigger)
    set({
      ...patch,
      rootAgentId: prev,
      rootAgentHistory: rootAgentHistory.slice(0, -1),
    })
  },

  refreshFromAgents: (agents) => {
    const { rootAgentId } = get()
    const patch = rebuildAndLayout(agents, rootAgentId, get()._fitViewTrigger)
    set(patch)
  },

  updateNodePosition: (nodeId, position) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === nodeId ? { ...n, position } : n),
      savedPositions: { ...state.savedPositions, [nodeId]: position },
    }))
    get().savePositions()
  },

  autoLayout: () => {
    const { nodes, edges } = get()
    const layouted = getLayoutedElements(nodes, edges)
    const newPositions: Record<string, { x: number; y: number }> = {}
    for (const node of layouted.nodes) {
      newPositions[node.id] = node.position
    }
    set(state => ({
      nodes: layouted.nodes,
      edges: layouted.edges,
      savedPositions: { ...state.savedPositions, ...newPositions },
      _fitViewTrigger: state._fitViewTrigger + 1,
    }))
    get().savePositions()
  },

  savePositions: () => {
    const state = get()
    if (state._saveTimer) clearTimeout(state._saveTimer)
    const timer = setTimeout(() => {
      storageService.updatePreferences({ flowNodePositions: state.savedPositions }).catch(() => {})
    }, 500)
    set({ _saveTimer: timer })
  },
}))
