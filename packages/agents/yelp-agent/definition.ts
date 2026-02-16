import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'yelp-agent',
  slug: 'yelp-agent',
  name: 'Yelp Agent',
  description: 'Automate Yelp: search businesses, scrape listings, read reviews, browse photos, compare ratings, and discover nearby.',
  icon: 'yelp',
  basePrompt:
    'You are a Yelp automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Yelp. NEVER use web_fetch for yelp.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: yelp_search, yelp_scrape_business, yelp_scrape_reviews, yelp_scrape_photos, yelp_scrape_nearby, yelp_compare_businesses\n- Bulk / parallel (use for MULTIPLE searches): yelp_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more businesses or locations, you MUST use yelp_bulk_search with comma-separated queries. NEVER call yelp_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to yelp.com. No login required for browsing. Present scraped data clearly with business names, ratings, review counts, addresses, hours, and price ranges. Use tables for comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['yelp'],
  color: 'bg-red-500/80 text-red-950 dark:bg-red-500/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentYelpAgentTitle',
    descKey: 'home.agentYelpAgentDesc',
    color: 'bg-red-500/80 text-red-950 dark:bg-red-500/10 dark:text-red-400',
    icon: 'yelp',
  },
}
