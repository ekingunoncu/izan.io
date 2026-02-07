/**
 * @izan/agent-core - Agent Router
 *
 * Uses an LLM to determine which agent should handle a user's message.
 * LLM-agnostic: the chat function is injected via constructor.
 */

import type { AgentDefinition, ChatFunction } from './types.js'

export class AgentRouter {
  private agents: AgentDefinition[]
  private chatFn: ChatFunction
  private defaultAgentId: string

  /**
   * @param agents - List of available agent definitions
   * @param chatFn - LLM chat function for routing decisions
   * @param defaultAgentId - Fallback agent ID when routing fails (default: 'general')
   */
  constructor(
    agents: AgentDefinition[],
    chatFn: ChatFunction,
    defaultAgentId = 'general',
  ) {
    this.agents = agents
    this.chatFn = chatFn
    this.defaultAgentId = defaultAgentId
  }

  /**
   * Route a user message to the most appropriate agent.
   * Uses the LLM to analyze the message and pick the best agent.
   *
   * @param userMessage - The user's input message
   * @returns The selected agent definition
   */
  async route(userMessage: string): Promise<AgentDefinition> {
    const enabledAgents = this.getAvailableAgents()

    // If only one agent is available, return it directly
    if (enabledAgents.length <= 1) {
      return enabledAgents[0] ?? this.getDefaultAgent()
    }

    const routingPrompt = this.buildRoutingPrompt(enabledAgents)

    try {
      const response = await this.chatFn([
        { role: 'system', content: routingPrompt },
        { role: 'user', content: userMessage },
      ])

      const agentId = this.parseAgentId(response, enabledAgents)
      const agent = enabledAgents.find((a) => a.id === agentId)

      return agent ?? this.getDefaultAgent()
    } catch (error) {
      console.error('[izan-router] Routing failed, using default agent:', error)
      return this.getDefaultAgent()
    }
  }

  /**
   * Get all enabled agents.
   */
  getAvailableAgents(): AgentDefinition[] {
    return this.agents.filter((a) => a.enabled)
  }

  /**
   * Update the agent list (e.g. when agents are enabled/disabled).
   */
  setAgents(agents: AgentDefinition[]): void {
    this.agents = agents
  }

  private getDefaultAgent(): AgentDefinition {
    return (
      this.agents.find((a) => a.id === this.defaultAgentId) ??
      this.agents[0]!
    )
  }

  private buildRoutingPrompt(agents: AgentDefinition[]): string {
    const agentList = agents
      .map((a) => `- ${a.id}: ${a.description}`)
      .join('\n')

    return [
      'You are a message router. Analyze the user message and determine which agent should handle it.',
      'Respond with ONLY the agent ID, nothing else.',
      '',
      'Available agents:',
      agentList,
    ].join('\n')
  }

  private parseAgentId(
    response: string,
    agents: AgentDefinition[],
  ): string | null {
    const cleaned = response.trim().toLowerCase()
    const validIds = agents.map((a) => a.id)

    // Exact match
    if (validIds.includes(cleaned)) {
      return cleaned
    }

    // Check if any agent ID is contained in the response
    for (const id of validIds) {
      if (cleaned.includes(id)) {
        return id
      }
    }

    return null
  }
}
