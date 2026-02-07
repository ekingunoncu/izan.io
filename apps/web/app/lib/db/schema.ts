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
}

/**
 * Default agents available in the system.
 * All prompts and labels are in English by default.
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

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'general',
    slug: 'general',
    name: 'General Assistant',
    description: 'General purpose AI assistant. Helps with any topic.',
    icon: 'bot',
    basePrompt:
      'You are a helpful AI assistant. Respond in English. Be kind and informative to the user.',
    enabled: true,
    category: 'general',
    source: 'builtin',
    implicitMCPIds: ['general'],
    customMCPIds: [],
    linkedAgentIds: [],
    isEdited: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'web-search',
    slug: 'web-search',
    name: 'Web Search',
    description: 'Searches the web and gathers information.',
    icon: 'search',
    basePrompt:
      'You are a web research assistant. Search for user questions and provide detailed information. Respond in English.',
    enabled: true,
    category: 'web_search',
    source: 'builtin',
    implicitMCPIds: ['bing', 'google'],
    customMCPIds: [],
    linkedAgentIds: [],
    isEdited: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'domain-expert',
    slug: 'domain-expert',
    name: 'Domain Expert',
    description: 'Domain availability checking and registration insights.',
    icon: 'globe',
    basePrompt:
      'You are a domain expert assistant. Help users check domain availability, suggest domain names, and provide registration insights. Use the domain check tools to verify availability. Respond in English.',
    enabled: true,
    category: 'custom',
    source: 'builtin',
    implicitMCPIds: ['namecheap'],
    customMCPIds: [],
    linkedAgentIds: [],
    isEdited: false,
    createdAt: now,
    updatedAt: now,
  },
]

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
}
