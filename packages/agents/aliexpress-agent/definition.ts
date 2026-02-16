import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'aliexpress-agent',
  slug: 'aliexpress-agent',
  name: 'AliExpress Agent',
  description: 'Automate AliExpress: search products, scrape listings, read reviews, browse stores, track prices, and compare sellers.',
  icon: 'aliexpress',
  basePrompt:
    'You are an AliExpress automation assistant that controls a real browser. You MUST use the automation tools to perform actions on AliExpress. NEVER use web_fetch for aliexpress.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: aliexpress_search, aliexpress_scrape_product, aliexpress_scrape_reviews, aliexpress_scrape_store, aliexpress_scrape_deals, aliexpress_compare_prices\n- Bulk / parallel (use for MULTIPLE searches): aliexpress_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more products, you MUST use aliexpress_bulk_search with comma-separated queries. NEVER call aliexpress_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to aliexpress.com. No login required for browsing. Present scraped data clearly with product names, prices, ratings, shipping info, and seller details. Use tables for price comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['aliexpress'],
  color: 'bg-red-600/80 text-red-950 dark:bg-red-600/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentAliexpressAgentTitle',
    descKey: 'home.agentAliexpressAgentDesc',
    color: 'bg-red-600/80 text-red-950 dark:bg-red-600/10 dark:text-red-400',
    icon: 'aliexpress',
  },
}
