import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'amazon-agent',
  slug: 'amazon-agent',
  name: 'Amazon Agent',
  description: 'Automate Amazon: search products, scrape details, read reviews, compare prices, track deals, and bulk search.',
  icon: 'amazon',
  basePrompt:
    'You are an Amazon automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Amazon. NEVER use web_fetch for amazon.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: amazon_search, amazon_scrape_product, amazon_scrape_reviews, amazon_compare_prices, amazon_scrape_deals, amazon_scrape_seller\n- Bulk / parallel (use for MULTIPLE queries): amazon_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more products, you MUST use amazon_bulk_search with comma-separated queries. NEVER call amazon_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to amazon.com. No login is required for product browsing. Present scraped data clearly with product names, prices, ratings, and review counts. Use tables for price comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['amazon'],
  color: 'bg-orange-400/80 text-orange-900 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentAmazonAgentTitle',
    descKey: 'home.agentAmazonAgentDesc',
    color: 'bg-orange-400/80 text-orange-900 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'amazon',
  },
}
