import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'untappd-agent',
  slug: 'untappd-agent',
  name: 'Untappd Agent',
  description: 'Automate Untappd: search beers, scrape breweries, and browse top-rated beers.',
  icon: 'untappd',
  basePrompt:
    'You are an Untappd Agent that controls a real browser. You MUST use the automation tools to perform actions on Untappd. NEVER use web_fetch for Untappd URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: untappd_scrape_beer, untappd_scrape_brewery, untappd_search\n- Bulk / parallel: untappd_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['untappd'],
  color: 'bg-yellow-600/80 text-yellow-950 dark:bg-yellow-600/10 dark:text-yellow-400',
  homeShowcase: {
    titleKey: 'home.agentUntappdTitle',
    descKey: 'home.agentUntappdDesc',
    color: 'bg-yellow-600/80 text-yellow-950 dark:bg-yellow-600/10 dark:text-yellow-400',
    icon: 'untappd',
  },
}
