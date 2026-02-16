import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'producthunt-agent',
  slug: 'producthunt-agent',
  name: 'Product Hunt Agent',
  description: 'Automate Product Hunt: search products, scrape launches, browse collections, read reviews, track upvotes, and discover trending.',
  icon: 'producthunt',
  basePrompt:
    'You are a Product Hunt automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Product Hunt. NEVER use web_fetch for producthunt.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: producthunt_search, producthunt_scrape_product, producthunt_scrape_launches, producthunt_scrape_collection, producthunt_scrape_reviews, producthunt_scrape_trending\n- Bulk / parallel (use for MULTIPLE searches): producthunt_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more products or categories, you MUST use producthunt_bulk_search with comma-separated queries. NEVER call producthunt_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to producthunt.com. No login required for browsing. Present scraped data clearly with product names, taglines, upvote counts, maker info, and launch dates. Use tables for comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['producthunt'],
  color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentProducthuntAgentTitle',
    descKey: 'home.agentProducthuntAgentDesc',
    color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'producthunt',
  },
}
