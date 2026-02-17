import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'transfermarkt-agent',
  slug: 'transfermarkt-agent',
  name: 'Transfermarkt Agent',
  description: 'Automate Transfermarkt: search players, clubs, scrape transfers, and track market values.',
  icon: 'transfermarkt',
  basePrompt:
    'You are a Transfermarkt Agent that controls a real browser. You MUST use the automation tools to perform actions on Transfermarkt. NEVER use web_fetch for Transfermarkt URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: transfermarkt_scrape_player, transfermarkt_scrape_transfers, transfermarkt_search\n- Bulk / parallel: transfermarkt_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['transfermarkt'],
  color: 'bg-teal-500/80 text-teal-950 dark:bg-teal-500/10 dark:text-teal-400',
  homeShowcase: {
    titleKey: 'home.agentTransfermarktTitle',
    descKey: 'home.agentTransfermarktDesc',
    color: 'bg-teal-500/80 text-teal-950 dark:bg-teal-500/10 dark:text-teal-400',
    icon: 'transfermarkt',
  },
}
