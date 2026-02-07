/**
 * @izan/agent-core
 *
 * Agent framework core for izan.io.
 * Provides agent routing, tool execution, and type definitions.
 * LLM-agnostic: works with any provider via dependency injection.
 *
 * @example
 * ```ts
 * import { AgentRouter, ToolExecutor } from '@izan/agent-core'
 * import type { ChatFunction, AgentDefinition } from '@izan/agent-core'
 * import { MCPServerRegistry } from '@izan/mcp-client'
 *
 * // Define agents
 * const agents: AgentDefinition[] = [
 *   {
 *     id: 'general',
 *     name: 'General Assistant',
 *     description: 'General purpose AI assistant',
 *     icon: 'bot',
 *     category: 'general',
 *     systemPrompt: 'You are a helpful assistant.',
 *     enabled: true,
 *   },
 * ]
 *
 * // Inject your LLM chat function
 * const chatFn: ChatFunction = async (messages) => {
 *   // Call WebLLM, OpenAI, etc.
 *   return 'assistant response'
 * }
 *
 * // Set up routing and tool execution
 * const router = new AgentRouter(agents, chatFn)
 * const registry = new MCPServerRegistry()
 * const executor = new ToolExecutor(registry)
 *
 * // Route a message to the best agent
 * const agent = await router.route('Help me search the web')
 *
 * // Execute a tool call
 * const result = await executor.execute({
 *   serverId: 'web-search',
 *   toolName: 'search',
 *   arguments: { query: 'hello world' },
 * })
 * ```
 */

// Types
export type {
  AgentCategory,
  AgentDefinition,
  ToolCall,
  ToolResult,
  ChatMessage,
  ChatFunction,
} from './types.js'

// Router
export { AgentRouter } from './router.js'

// Executor
export { ToolExecutor } from './executor.js'
