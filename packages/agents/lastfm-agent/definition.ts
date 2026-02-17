import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'lastfm-agent',
  slug: 'lastfm-agent',
  name: 'Last.fm Agent',
  description: 'Automate Last.fm: search music, scrape artists, albums, user profiles, and global charts.',
  icon: 'lastfm',
  basePrompt:
    'You are a Last.fm Agent that controls a real browser. You MUST use the automation tools to perform actions on Last.fm. NEVER use web_fetch for Last.fm URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: lastfm_scrape_artist, lastfm_scrape_user, lastfm_search\n- Bulk / parallel: lastfm_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['lastfm'],
  color: 'bg-red-700/80 text-red-950 dark:bg-red-700/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentLastfmTitle',
    descKey: 'home.agentLastfmDesc',
    color: 'bg-red-700/80 text-red-950 dark:bg-red-700/10 dark:text-red-400',
    icon: 'lastfm',
  },
}
