import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'vivino-agent',
  slug: 'vivino-agent',
  name: 'Vivino Agent',
  description: 'Automate Vivino: search wines, scrape ratings, and discover top-rated wines.',
  icon: 'vivino',
  basePrompt:
    'You are a Vivino Agent that controls a real browser. You MUST use the automation tools to perform actions on Vivino. NEVER use web_fetch for Vivino URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: vivino_scrape_wine, vivino_search\n- Bulk / parallel: vivino_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['vivino'],
  color: 'bg-rose-700/80 text-rose-950 dark:bg-rose-700/10 dark:text-rose-400',
  homeShowcase: {
    titleKey: 'home.agentVivinoTitle',
    descKey: 'home.agentVivinoDesc',
    color: 'bg-rose-700/80 text-rose-950 dark:bg-rose-700/10 dark:text-rose-400',
    icon: 'vivino',
  },
}
