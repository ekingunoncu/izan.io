import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'shopify-agent',
  slug: 'shopify-agent',
  name: 'Shopify Agent',
  description: 'Automate Shopify stores: search products, scrape store details, read reviews, track prices, and discover collections.',
  icon: 'shopify',
  basePrompt:
    'You are a Shopify store automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Shopify stores. NEVER use web_fetch for Shopify store URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: shopify_scrape_store, shopify_scrape_product, shopify_search_products, shopify_scrape_collections, shopify_scrape_reviews, shopify_compare_prices\n- Bulk / parallel (use for MULTIPLE stores): shopify_bulk_scrape_stores\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to scrape 2 or more stores, you MUST use shopify_bulk_scrape_stores with comma-separated store URLs. NEVER call shopify_scrape_store multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to Shopify store URLs. Many Shopify stores expose a products.json endpoint. No login required for browsing. Present scraped data clearly with product names, prices, variants, images, and reviews. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['shopify'],
  color: 'bg-green-500/80 text-green-950 dark:bg-green-500/10 dark:text-green-400',
  homeShowcase: {
    titleKey: 'home.agentShopifyAgentTitle',
    descKey: 'home.agentShopifyAgentDesc',
    color: 'bg-green-500/80 text-green-950 dark:bg-green-500/10 dark:text-green-400',
    icon: 'shopify',
  },
}
