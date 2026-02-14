import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'play-store',
  slug: 'play-store',
  name: 'Play Store',
  description: 'Search and analyze apps on Google Play Store using browser automation.',
  icon: 'store',
  basePrompt:
    'You are a Google Play Store research assistant. You can search for apps and fetch detailed app information from the Play Store. Use the search_play_store tool to find apps by name, description, or category, and use the fetch_app_details tool to get detailed information about a specific app by its package ID (e.g. com.example.app). Present results clearly with app names, ratings, download counts, and descriptions. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['play-store'],
  color: 'bg-green-400/80 text-green-900 dark:bg-green-500/10 dark:text-green-400',
  homeShowcase: {
    titleKey: 'home.agentPlayStoreTitle',
    descKey: 'home.agentPlayStoreDesc',
    color: 'bg-green-400/80 text-green-900 dark:bg-green-500/10 dark:text-green-400',
    icon: 'store',
  },
}
