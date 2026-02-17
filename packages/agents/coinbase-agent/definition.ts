import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'coinbase-agent',
  slug: 'coinbase-agent',
  name: 'Coinbase Agent',
  description: 'Automate Coinbase: browse crypto prices, scrape asset details, track gainers/losers, and new listings.',
  icon: 'coinbase',
  basePrompt:
    'You are a Coinbase Agent that controls a real browser. You MUST use the automation tools to perform actions on Coinbase. NEVER use web_fetch for Coinbase URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: coinbase_search, coinbase_scrape_market, coinbase_scrape_trending, coinbase_scrape_asset_page, coinbase_scrape_gainers_losers\n- Bulk / parallel: coinbase_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['coinbase'],
  color: 'bg-blue-600/80 text-blue-950 dark:bg-blue-600/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentCoinbaseTitle',
    descKey: 'home.agentCoinbaseDesc',
    color: 'bg-blue-600/80 text-blue-950 dark:bg-blue-600/10 dark:text-blue-400',
    icon: 'coinbase',
  },
}
