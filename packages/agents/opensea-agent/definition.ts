import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'opensea-agent',
  slug: 'opensea-agent',
  name: 'OpenSea Agent',
  description: 'Automate OpenSea: search NFT collections, scrape floor prices, and browse rankings.',
  icon: 'opensea',
  basePrompt:
    'You are an OpenSea Agent that controls a real browser. You MUST use the automation tools to perform actions on OpenSea. NEVER use web_fetch for OpenSea URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: opensea_scrape_collection, opensea_scrape_rankings, opensea_search\n- Bulk / parallel: opensea_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['opensea'],
  color: 'bg-blue-500/80 text-blue-950 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentOpenSeaTitle',
    descKey: 'home.agentOpenSeaDesc',
    color: 'bg-blue-500/80 text-blue-950 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'opensea',
  },
}
