import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'etsy-agent',
  slug: 'etsy-agent',
  name: 'Etsy Agent',
  description: 'Automate Etsy: search products, scrape listings, read reviews, browse shops, and compare prices.',
  icon: 'etsy',
  basePrompt:
    'You are an Etsy automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Etsy. NEVER use web_fetch for etsy.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: etsy_search, etsy_scrape_listing, etsy_scrape_shop, etsy_scrape_reviews, etsy_scrape_categories, etsy_compare_prices\n- Bulk / parallel (use for MULTIPLE searches): etsy_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more products, you MUST use etsy_bulk_search with comma-separated queries. NEVER call etsy_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to etsy.com. No login required for browsing. Present scraped data clearly with product names, prices, ratings, shop names, and shipping info. Use tables for price comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['etsy'],
  color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentEtsyAgentTitle',
    descKey: 'home.agentEtsyAgentDesc',
    color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'etsy',
  },
}
