import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'craigslist-agent',
  slug: 'craigslist-agent',
  name: 'Craigslist Agent',
  description: 'Automate Craigslist: search listings, browse housing, jobs, and items for sale across cities.',
  icon: 'craigslist',
  basePrompt:
    'You are a Craigslist Agent that controls a real browser. You MUST use the automation tools to perform actions on Craigslist. NEVER use web_fetch for Craigslist URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: craigslist_browse_category, craigslist_scrape_gallery, craigslist_scrape_post, craigslist_search, craigslist_search_housing, craigslist_search_jobs, craigslist_search_listings\n- Bulk / parallel: craigslist_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['craigslist'],
  color: 'bg-purple-500/80 text-purple-950 dark:bg-purple-500/10 dark:text-purple-400',
  homeShowcase: {
    titleKey: 'home.agentCraigslistTitle',
    descKey: 'home.agentCraigslistDesc',
    color: 'bg-purple-500/80 text-purple-950 dark:bg-purple-500/10 dark:text-purple-400',
    icon: 'craigslist',
  },
}
