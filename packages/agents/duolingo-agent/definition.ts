import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'duolingo-agent',
  slug: 'duolingo-agent',
  name: 'Duolingo Agent',
  description: 'Automate Duolingo: scrape profiles, leaderboards, and course information.',
  icon: 'duolingo',
  basePrompt:
    'You are a Duolingo Agent that controls a real browser. You MUST use the automation tools to perform actions on Duolingo. NEVER use web_fetch for Duolingo URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: duolingo_scrape_course, duolingo_scrape_leaderboard, duolingo_search\n- Bulk / parallel: duolingo_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['duolingo'],
  color: 'bg-lime-500/80 text-lime-950 dark:bg-lime-500/10 dark:text-lime-400',
  homeShowcase: {
    titleKey: 'home.agentDuolingoTitle',
    descKey: 'home.agentDuolingoDesc',
    color: 'bg-lime-500/80 text-lime-950 dark:bg-lime-500/10 dark:text-lime-400',
    icon: 'duolingo',
  },
}
