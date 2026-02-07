export interface BuiltinAgentDefinition {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  basePrompt: string
  category: string
  implicitMCPIds: string[]
  homeShowcase?: {
    titleKey: string
    descKey: string
    color: string
    icon: string
  }
  /** Tailwind color classes for agent detail page (used when no homeShowcase) */
  color?: string
}
