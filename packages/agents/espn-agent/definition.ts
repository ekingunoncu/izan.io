import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'espn-agent',
  slug: 'espn-agent',
  name: 'ESPN Agent',
  description: 'Automate ESPN: scrape live scores, standings, team info, and sports news.',
  icon: 'espn',
  basePrompt:
    'You are a ESPN Agent that controls a real browser. You MUST use the automation tools to perform actions on ESPN. NEVER use web_fetch for ESPN URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: espn_scrape_news, espn_scrape_scores, espn_scrape_standings, espn_search\n- Bulk / parallel: espn_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['espn'],
  color: 'bg-red-500/80 text-red-950 dark:bg-red-500/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentEspnTitle',
    descKey: 'home.agentEspnDesc',
    color: 'bg-red-500/80 text-red-950 dark:bg-red-500/10 dark:text-red-400',
    icon: 'espn',
  },
}
