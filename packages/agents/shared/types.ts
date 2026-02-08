export interface BuiltinAgentDefinition {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  basePrompt: string
  category: string
  implicitMCPIds: string[]
  /** External API key IDs this agent requires (e.g. serp_api). User provides keys in Settings. */
  requiredApiKeys?: string[]
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
}
