import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'web-search',
  slug: 'web-search',
  name: 'Web Search',
  description: 'Searches the web and gathers information.',
  icon: 'search',
  basePrompt:
    'You are a web research assistant. Search for user questions and provide detailed information. Respond in English.',
  category: 'web_search',
  implicitMCPIds: ['bing', 'google'],
  color: 'bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400',
  homeShowcase: {
    titleKey: 'home.agentWebSearchTitle',
    descKey: 'home.agentWebSearchDesc',
    color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'globe',
  },
}
