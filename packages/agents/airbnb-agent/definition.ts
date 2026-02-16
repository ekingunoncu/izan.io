import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'airbnb-agent',
  slug: 'airbnb-agent',
  name: 'Airbnb Agent',
  description: 'Automate Airbnb: search listings, scrape details, read reviews, compare prices, and browse experiences.',
  icon: 'airbnb',
  basePrompt:
    'You are an Airbnb automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Airbnb. NEVER use web_fetch for airbnb.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: airbnb_search, airbnb_scrape_listing, airbnb_scrape_reviews, airbnb_scrape_host, airbnb_scrape_experiences, airbnb_compare_prices\n- Bulk / parallel (use for MULTIPLE searches): airbnb_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more locations, you MUST use airbnb_bulk_search with comma-separated locations. NEVER call airbnb_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to airbnb.com. No login required for browsing. Present scraped data clearly with listing names, prices per night, ratings, amenities, and host info. Use tables for comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['airbnb'],
  color: 'bg-rose-500/80 text-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
  homeShowcase: {
    titleKey: 'home.agentAirbnbAgentTitle',
    descKey: 'home.agentAirbnbAgentDesc',
    color: 'bg-rose-500/80 text-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
    icon: 'airbnb',
  },
}
