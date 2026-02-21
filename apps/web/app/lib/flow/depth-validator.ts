/**
 * Depth and cycle validation for agent linking graph.
 * Ensures max depth of 3 levels and no circular dependencies.
 */

import type { Agent } from '~/lib/db/schema'

const MAX_AGENT_DEPTH = 3

/** Check if adding a link from sourceId to targetId would exceed max depth */
export function wouldExceedDepth(
  sourceId: string,
  targetId: string,
  agents: Agent[],
): boolean {
  const agentMap = new Map(agents.map(a => [a.id, a]))
  // Calculate depth of targetId's subtree
  const getDepth = (id: string, visited: Set<string>): number => {
    if (visited.has(id)) return 0
    visited.add(id)
    const agent = agentMap.get(id)
    if (!agent || agent.linkedAgentIds.length === 0) return 0
    return 1 + Math.max(...agent.linkedAgentIds.map(lid => getDepth(lid, visited)))
  }
  const targetDepth = getDepth(targetId, new Set())

  // Calculate depth FROM root to sourceId
  const getDepthToNode = (currentId: string, targetNodeId: string, visited: Set<string>): number => {
    if (currentId === targetNodeId) return 0
    if (visited.has(currentId)) return -1
    visited.add(currentId)
    const agent = agentMap.get(currentId)
    if (!agent) return -1
    for (const lid of agent.linkedAgentIds) {
      const d = getDepthToNode(lid, targetNodeId, new Set(visited))
      if (d >= 0) return 1 + d
    }
    return -1
  }

  // Find depth to source from any root
  let sourceDepth = 0
  for (const agent of agents) {
    // Check agents that aren't targets of any link (potential roots)
    const d = getDepthToNode(agent.id, sourceId, new Set())
    if (d > sourceDepth) sourceDepth = d
  }

  return sourceDepth + 1 + targetDepth >= MAX_AGENT_DEPTH
}

/** Check if adding a link from sourceId to targetId would create a cycle */
export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  agents: Agent[],
): boolean {
  if (sourceId === targetId) return true

  const agentMap = new Map(agents.map(a => [a.id, a]))

  // Check if targetId can reach sourceId (would create cycle)
  const canReach = (fromId: string, toId: string, visited: Set<string>): boolean => {
    if (fromId === toId) return true
    if (visited.has(fromId)) return false
    visited.add(fromId)
    const agent = agentMap.get(fromId)
    if (!agent) return false
    return agent.linkedAgentIds.some(lid => canReach(lid, toId, visited))
  }

  return canReach(targetId, sourceId, new Set())
}

/** Validate a proposed connection and return an error message if invalid */
export function validateConnection(
  sourceId: string,
  targetId: string,
  agents: Agent[],
): string | null {
  if (sourceId === targetId) return 'Cannot link an agent to itself'
  if (wouldCreateCycle(sourceId, targetId, agents)) return 'This connection would create a circular dependency'
  if (wouldExceedDepth(sourceId, targetId, agents)) return 'This connection would exceed the maximum agent depth of 3'
  return null
}
