import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'expedia-agent',
  slug: 'expedia-agent',
  name: 'Expedia Agent',
  description: 'Automate Expedia: search hotels, scrape flights, browse packages, read reviews, track prices, and compare deals.',
  icon: 'expedia',
  basePrompt:
    'You are an Expedia automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Expedia. NEVER use web_fetch for expedia.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: expedia_search_hotels, expedia_search_flights, expedia_scrape_hotel, expedia_scrape_reviews, expedia_search_packages, expedia_compare_prices\n- Bulk / parallel (use for MULTIPLE searches): expedia_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more destinations, you MUST use expedia_bulk_search with comma-separated queries. NEVER call expedia_search_hotels multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to expedia.com. No login required for browsing. Present scraped data clearly with hotel names, prices, ratings, flight details, and package deals. Use tables for price comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['expedia'],
  color: 'bg-yellow-600/80 text-yellow-950 dark:bg-yellow-600/10 dark:text-yellow-400',
  homeShowcase: {
    titleKey: 'home.agentExpediaAgentTitle',
    descKey: 'home.agentExpediaAgentDesc',
    color: 'bg-yellow-600/80 text-yellow-950 dark:bg-yellow-600/10 dark:text-yellow-400',
    icon: 'expedia',
  },
}
