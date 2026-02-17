import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'goodreads-agent',
  slug: 'goodreads-agent',
  name: 'Goodreads Agent',
  description: 'Automate Goodreads: search books, scrape reviews, browse authors, and explore reading lists.',
  icon: 'goodreads',
  basePrompt:
    'You are a Goodreads Agent that controls a real browser. You MUST use the automation tools to perform actions on Goodreads. NEVER use web_fetch for Goodreads URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: goodreads_scrape_author, goodreads_scrape_book, goodreads_scrape_genre, goodreads_scrape_list, goodreads_scrape_reviews, goodreads_search\n- Bulk / parallel: goodreads_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['goodreads'],
  color: 'bg-amber-700/80 text-amber-950 dark:bg-amber-700/10 dark:text-amber-400',
  homeShowcase: {
    titleKey: 'home.agentGoodreadsTitle',
    descKey: 'home.agentGoodreadsDesc',
    color: 'bg-amber-700/80 text-amber-950 dark:bg-amber-700/10 dark:text-amber-400',
    icon: 'goodreads',
  },
}
