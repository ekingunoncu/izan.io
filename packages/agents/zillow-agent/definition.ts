import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'zillow-agent',
  slug: 'zillow-agent',
  name: 'Zillow Agent',
  description: 'Automate Zillow: search homes, scrape listings, read reviews, browse agents, track prices, and compare properties.',
  icon: 'zillow',
  basePrompt:
    'You are a Zillow automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Zillow. NEVER use web_fetch for zillow.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: zillow_search, zillow_scrape_listing, zillow_scrape_agent, zillow_scrape_neighborhood, zillow_scrape_price_history, zillow_compare_listings\n- Bulk / parallel (use for MULTIPLE searches): zillow_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more locations, you MUST use zillow_bulk_search with comma-separated queries. NEVER call zillow_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to zillow.com. No login required for browsing. Present scraped data clearly with property addresses, prices, beds/baths, square footage, and key details. Use tables for comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['zillow'],
  color: 'bg-blue-500/80 text-blue-950 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentZillowAgentTitle',
    descKey: 'home.agentZillowAgentDesc',
    color: 'bg-blue-500/80 text-blue-950 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'zillow',
  },
}
