/**
 * @izan/llm-proxy - Type definitions
 *
 * Shared types for the LLM proxy Lambda and client.
 * Matches all providers from OpenCode (anomalyco/opencode).
 */

/** Supported LLM provider identifiers (matches OpenCode's bundled providers) */
export type ProviderId =
  | 'openai'
  | 'google'
  | 'groq'
  | 'xai'
  | 'deepseek'
  | 'openrouter'
  | 'mistral'
  | 'togetherai'
  | 'fireworks'
  | 'perplexity'
  | 'cerebras'
  | 'deepinfra'
  | 'cohere'
  | 'moonshot'
  | 'minimax'
  | 'ollama'
  | 'qwen'
  | 'custom'

/** Chat message in OpenAI-compatible format */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

/** Tool call from model response */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** Tool definition in OpenAI-compatible format */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Request body for POST /chat */
export interface ChatRequest {
  provider: ProviderId
  model: string
  apiKey: string
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
  /** Custom base URL for 'custom', 'ollama', etc. */
  baseURL?: string
}

/** Non-streaming response */
export interface ChatResponse {
  content: string | null
  toolCalls: ToolCall[] | null
  finishReason: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/** SSE event for streaming */
export interface StreamEvent {
  type: 'text-delta' | 'tool-call' | 'finish' | 'error'
  textDelta?: string
  toolCall?: ToolCall
  finishReason?: string
  error?: string
}
