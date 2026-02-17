import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'letterboxd-agent',
  slug: 'letterboxd-agent',
  name: 'Letterboxd Agent',
  description: 'Automate Letterboxd: search films, scrape reviews, browse user profiles, lists, and popular films.',
  icon: 'letterboxd',
  basePrompt:
    'You are a Letterboxd Agent that controls a real browser. You MUST use the automation tools to perform actions on Letterboxd. NEVER use web_fetch for Letterboxd URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: letterboxd_scrape_film, letterboxd_scrape_list, letterboxd_scrape_member, letterboxd_scrape_popular, letterboxd_scrape_reviews, letterboxd_search\n- Bulk / parallel: letterboxd_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['letterboxd'],
  color: 'bg-green-600/80 text-green-950 dark:bg-green-600/10 dark:text-green-400',
  homeShowcase: {
    titleKey: 'home.agentLetterboxdTitle',
    descKey: 'home.agentLetterboxdDesc',
    color: 'bg-green-600/80 text-green-950 dark:bg-green-600/10 dark:text-green-400',
    icon: 'letterboxd',
  },
}
