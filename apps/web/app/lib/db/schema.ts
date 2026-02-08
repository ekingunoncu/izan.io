// Database schema types for izan.io

/** Where the agent originates from */
export type AgentSource = 'builtin' | 'user'

/**
 * Agent represents an AI assistant with specific capabilities
 */
export interface Agent {
  id: string
  /** URL-safe unique identifier for shareable links (e.g. general, domain-expert, my-assistant) */
  slug: string
  name: string
  description: string
  icon: string
  basePrompt: string
  enabled: boolean
  category: AgentCategory
  /** Whether this agent is builtin or user-created */
  source: AgentSource
  /** Implicit (builtin) MCP server IDs attached to this agent */
  implicitMCPIds: string[]
  /** Custom (user-added) MCP server IDs attached to this agent */
  customMCPIds: string[]
  /** IDs of other agents this agent can communicate with */
  linkedAgentIds: string[]
  /** Whether the user has edited this agent's defaults */
  isEdited: boolean
  /** Optional model hyperparameters (agent-specific overrides). 0–2 for temperature, OpenAI default 1 */
  temperature?: number
  /** Max tokens for response. Omit for provider default */
  maxTokens?: number
  /** Nucleus sampling top_p, 0–1, OpenAI default 1 */
  topP?: number
  createdAt: number
  updatedAt: number
}

export type AgentCategory =
  | 'general'
  | 'web_search'
  | 'code_assistant'
  | 'calendar'
  | 'email'
  | 'database'
  | 'api_connector'
  | 'file_manager'
  | 'custom'

/**
 * Chat represents a conversation thread within an agent
 */
export interface Chat {
  id: string
  agentId: string
  title: string
  createdAt: number
  updatedAt: number
}

/**
 * Message represents a single message in a chat
 */
export interface Message {
  id: string
  chatId: string
  role: MessageRole
  content: string
  modelId?: string // Which model generated this message
  timestamp: number
}

export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * User-added MCP server persisted in IndexedDB
 */
export interface UserMCPServer {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** MCP endpoint URL */
  url: string
  /** Optional description */
  description: string
  /** Optional custom headers */
  headers?: Record<string, string>
  /** Agent IDs this server is assigned to */
  assignedAgentIds: string[]
  /** Created timestamp */
  createdAt: number
  /** Updated timestamp */
  updatedAt: number
}

/**
 * User preferences for persistence
 */
export interface UserPreferences {
  id: string // Always 'default' for single user
  lastAgentId: string | null
  lastChatId: string | null
  /** Selected cloud LLM provider (e.g. 'openai', 'anthropic') */
  selectedProvider: string | null
  /** Selected model ID within the provider */
  selectedModel: string | null
  /** API keys per provider, stored client-side in IndexedDB */
  providerKeys: Record<string, string>
  /** Built-in MCP server IDs that are globally disabled */
  disabledBuiltinMCPIds: string[]
  /** Agent IDs the user has favorited (shown first in selector) */
  favoriteAgentIds: string[]
  /** External API keys (e.g. serp_api) - user provides keys for MCP tools */
  externalApiKeys: Record<string, string>
}

import { BUILTIN_AGENT_DEFINITIONS } from '@izan/agents'

/**
 * Default agents available in the system.
 * Source: packages/agents (auto-discovered)
 */
const now = Date.now()

/** Generate URL-safe slug from name */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'agent'
}

export const DEFAULT_AGENTS: Agent[] = BUILTIN_AGENT_DEFINITIONS.map((def) => ({
  ...def,
  temperature: def.temperature ?? 1,
  maxTokens: def.maxTokens,
  topP: def.topP ?? 1,
  enabled: true,
  source: 'builtin' as const,
  customMCPIds: [],
  linkedAgentIds: [],
  isEdited: false,
  createdAt: now,
  updatedAt: now,
}))

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  lastAgentId: 'general',
  lastChatId: null,
  selectedProvider: null,
  selectedModel: null,
  providerKeys: {},
  disabledBuiltinMCPIds: [],
  favoriteAgentIds: [],
  externalApiKeys: {},
}
