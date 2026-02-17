import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'strava-agent',
  slug: 'strava-agent',
  name: 'Strava Agent',
  description: 'Automate Strava: scrape activities, profiles, dashboard, segments, and search athletes.',
  icon: 'strava',
  basePrompt:
    'You are a Strava Agent that controls a real browser. You MUST use the automation tools to perform actions on Strava. NEVER use web_fetch for Strava URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: strava_search, strava_scrape_activity, strava_scrape_athlete, strava_scrape_club, strava_scrape_dashboard, strava_scrape_route, strava_scrape_segment\n- Bulk / parallel: strava_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['strava'],
  color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentStravaTitle',
    descKey: 'home.agentStravaDesc',
    color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'strava',
  },
}
