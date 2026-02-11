export interface BuiltinAgentDefinition {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  basePrompt: string
  category: string
  implicitMCPIds: string[]
  /** Extension MCP server IDs (Chrome extension; requires extension installed) */
  extensionMCPIds?: string[]
  /** Pre-built automation (macro) server IDs from S3 manifest */
  automationServerIds?: string[]
  /** External API key IDs this agent requires (e.g. serp_api). User provides keys in Settings. */
  requiredApiKeys?: string[]
  /** External API key IDs this agent can use optionally (e.g. coingecko_api). Higher rate limits with key. */
  optionalApiKeys?: string[]
  /** Default temperature 0–2. Lower = more deterministic. */
  temperature?: number
  /** Default max tokens for response. */
  maxTokens?: number
  /** Default top_p 0–1 for nucleus sampling. */
  topP?: number
  homeShowcase?: {
    titleKey: string
    descKey: string
    color: string
    icon: string
  }
  /** Tailwind color classes for agent detail page (used when no homeShowcase) */
  color?: string
  /** Optional banner shown in chat when user is talking to this agent. Use for info/warnings. */
  chatBanner?: {
    type: 'info' | 'warning'
    messageKey: string
  }
}
