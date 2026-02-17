import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'kaggle-agent',
  slug: 'kaggle-agent',
  name: 'Kaggle Agent',
  description: 'Automate Kaggle: search datasets, competitions, models, scrape profiles, and explore notebooks.',
  icon: 'kaggle',
  basePrompt:
    'You are a Kaggle Agent that controls a real browser. You MUST use the automation tools to perform actions on Kaggle. NEVER use web_fetch for Kaggle URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: kaggle_scrape_competition, kaggle_scrape_dataset, kaggle_scrape_leaderboard, kaggle_scrape_notebook, kaggle_scrape_profile, kaggle_scrape_trending, kaggle_search, kaggle_search_competitions, kaggle_search_datasets, kaggle_search_models\n- Bulk / parallel: kaggle_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['kaggle'],
  color: 'bg-sky-500/80 text-sky-950 dark:bg-sky-500/10 dark:text-sky-400',
  homeShowcase: {
    titleKey: 'home.agentKaggleTitle',
    descKey: 'home.agentKaggleDesc',
    color: 'bg-sky-500/80 text-sky-950 dark:bg-sky-500/10 dark:text-sky-400',
    icon: 'kaggle',
  },
}
