// Database schema types for izan.io

/** Status of a long-running background task */
export type TaskStatus = 'running' | 'completed' | 'failed'

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
  /** Extension MCP server IDs (Chrome extension; requires extension installed) */
  extensionMCPIds: string[]
  /** Pre-built automation (macro) server IDs from S3 manifest */
  automationServerIds: string[]
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
  /** Max tool-calling iterations per message. Default 25 */
  maxIterations?: number
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
  /** Background task status (undefined = normal chat) */
  taskStatus?: TaskStatus
  /** Current tool-calling round for background task progress */
  taskCurrentStep?: number
  /** Estimated total rounds (based on MAX_TOOL_ROUNDS_BACKGROUND) */
  taskTotalSteps?: number
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
  /** Agent IDs whose chat banner the user has dismissed (don't show again). Record for O(1) lookup. */
  dismissedChatBannerAgentIds: Record<string, boolean>
  /** Max messages per chat. 0 = unlimited (default) */
  chatMessageLimit?: number
  /** Max chats per agent. 0 = unlimited (default) */
  chatHistoryLimit?: number
}

// ─── Usage Analytics Types ────────────────────────────────────────────────────

/** A single LLM API call record for analytics tracking */
export interface UsageRecord {
  id: string
  chatId: string
  agentId: string
  /** Full model id, e.g. "gpt-4.1" */
  modelId: string
  /** Provider id, e.g. "openai" */
  providerId: string
  inputTokens: number
  outputTokens: number
  /** Estimated USD cost calculated at record time */
  cost: number
  /** Tool names invoked in this round */
  toolCalls: string[]
  timestamp: number
}

// ─── Automation Tool Types ────────────────────────────────────────────────────

/** A single parameter for an automation tool */
export interface AutomationToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
  enum?: string[]
  default?: string | number | boolean
  source?: 'urlParam' | 'input'
  sourceKey?: string
}

/** An extraction field within an extract step */
export interface AutomationExtractionField {
  key: string
  selector: string
  type: 'text' | 'html' | 'attribute' | 'value'
  attribute?: string
}

/** A single action step in an automation tool */
export interface AutomationActionStep {
  action: string
  label?: string
  continueOnError?: boolean
  [key: string]: unknown
}

/**
 * AutomationTool - a no-code MCP tool created via browser recording.
 * Stored as a JSON action sequence executed by the dynamic MCP server.
 */
export interface AutomationTool {
  /** Unique identifier (UUID) */
  id: string
  /** Tool function name (snake_case, used by LLM) */
  name: string
  /** Human-friendly display name */
  displayName: string
  /** Description of what the tool does */
  description: string
  /** Schema version */
  version: string
  /** Input parameters the LLM provides */
  parameters: AutomationToolParameter[]
  /** Ordered sequence of actions to execute */
  steps: AutomationActionStep[]
  /** Named parallel lanes - each lane has a name and independent step sequence executed concurrently.
   *  When present with length > 1, all lanes run in parallel in separate browser windows.
   *  Legacy format (AutomationActionStep[][]) is auto-wrapped on load. */
  lanes?: Array<{ name: string; steps: AutomationActionStep[] }>
  /** Viewport dimensions captured at recording time - used to emulate the same resolution during replay */
  viewport?: { width: number; height: number }
  /** Which automation server this tool belongs to */
  serverId: string
  /** Created timestamp */
  createdAt: number
  /** Updated timestamp */
  updatedAt: number
}

/**
 * AutomationServer - a user-created MCP server containing automation tools.
 * Corresponds to a logical grouping in the dynamic MCP server.
 */
export interface AutomationServer {
  /** Server identifier (e.g. ext-user-my-scraper) */
  id: string
  /** Human-readable name */
  name: string
  /** Description of the server */
  description: string
  /** Category for grouping */
  category: string
  /** Tool IDs belonging to this server */
  toolIds: string[]
  /** When true, server is hidden from MCP (enable/disable in Settings) */
  disabled?: boolean
  /** Created timestamp */
  createdAt: number
  /** Updated timestamp */
  updatedAt: number
}

// ─── Agent Types ──────────────────────────────────────────────────────────────

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
  temperature: def.temperature,
  maxTokens: def.maxTokens,
  topP: def.topP,
  enabled: true,
  source: 'builtin' as const,
  customMCPIds: [],
  extensionMCPIds: def.extensionMCPIds ?? [],
  automationServerIds: def.automationServerIds ?? [],
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
  dismissedChatBannerAgentIds: {},
  chatMessageLimit: 0,
  chatHistoryLimit: 0,
}
