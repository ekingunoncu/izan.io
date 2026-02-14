import type { Chat, Message, UserPreferences } from '../db/schema'

/**
 * IStorageService - Interface for data persistence operations
 */
export interface IStorageService {
  // Chat operations
  getChats(agentId: string): Promise<Chat[]>
  getChatById(chatId: string): Promise<Chat | undefined>
  createChat(chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat>
  updateChat(chatId: string, updates: Partial<Chat>): Promise<void>
  deleteChat(chatId: string): Promise<void>
  
  // Message operations
  getMessages(chatId: string): Promise<Message[]>
  createMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message>
  updateMessage(messageId: string, content: string): Promise<void>
  deleteMessage(messageId: string): Promise<void>
  deleteMessagesByChatId(chatId: string): Promise<void>
  
  // Bulk delete operations
  clearAllChats(): Promise<void>
  clearAgentChats(agentId: string): Promise<void>

  // Preferences operations
  getPreferences(): Promise<UserPreferences>
  updatePreferences(updates: Partial<UserPreferences>): Promise<void>
}

/**
 * Chat message in OpenAI-compatible format (used across the app)
 */
export interface ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ChatCompletionMessageToolCall[]
  tool_call_id?: string
}

/** Tool call from model response */
export interface ChatCompletionMessageToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** Tool definition in OpenAI-compatible format */
export interface ChatCompletionTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Token usage from an API response */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

/** Result from a chat completion that may include tool calls */
export interface ChatCompletionResult {
  content: string | null
  toolCalls: ChatCompletionMessageToolCall[] | null
  finishReason: string
  usage: TokenUsage | null
}

/** Optional model hyperparameters for chat completion */
export interface LLMGenerationOptions {
  temperature?: number
  max_tokens?: number
  top_p?: number
}

/**
 * ILLMService - Interface for LLM operations (cloud provider via proxy)
 */
export interface ILLMService {
  // Provider/model configuration
  configure(provider: string, model: string, apiKey: string): void
  isConfigured(): boolean
  getProvider(): string | null
  getModel(): string | null

  // Chat completion (streaming)
  streamChat(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerationOptions,
  ): Promise<TokenUsage | null>

  // Chat completion with tools (non-streaming, returns tool_calls or text)
  chatWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult>

  // Chat completion with tools (streaming - streams text, returns tool_calls when model calls tools)
  streamChatWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult>

  // Generation control
  abort(): void
}

export type StreamingMessageHandler = (chunk: string) => void
export type ProgressHandler = (progress: number, status: string) => void
