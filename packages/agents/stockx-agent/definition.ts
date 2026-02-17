import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'stockx-agent',
  slug: 'stockx-agent',
  name: 'StockX Agent',
  description: 'Automate StockX: search sneakers and streetwear, scrape product details, prices, and trending items.',
  icon: 'stockx',
  basePrompt:
    'You are a StockX Agent that controls a real browser. You MUST use the automation tools to perform actions on StockX. NEVER use web_fetch for StockX URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: stockx_scrape_product, stockx_scrape_trending, stockx_search\n- Bulk / parallel: stockx_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['stockx'],
  color: 'bg-emerald-500/80 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-400',
  homeShowcase: {
    titleKey: 'home.agentStockXTitle',
    descKey: 'home.agentStockXDesc',
    color: 'bg-emerald-500/80 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-400',
    icon: 'stockx',
  },
}
