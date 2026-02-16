import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'wikipedia-agent',
  slug: 'wikipedia-agent',
  name: 'Wikipedia Agent',
  description: 'Automate Wikipedia: search articles, scrape pages, read summaries, browse categories, track edits, and compare topics.',
  icon: 'wikipedia',
  basePrompt:
    'You are a Wikipedia automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Wikipedia. NEVER use web_fetch for wikipedia.org URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: wikipedia_search, wikipedia_scrape_article, wikipedia_scrape_summary, wikipedia_scrape_categories, wikipedia_scrape_references, wikipedia_scrape_history\n- Bulk / parallel (use for MULTIPLE searches): wikipedia_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more topics, you MUST use wikipedia_bulk_search with comma-separated queries. NEVER call wikipedia_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to wikipedia.org. No login required. Present scraped data clearly with article titles, summaries, sections, and references. Use structured formatting for long articles. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['wikipedia'],
  color: 'bg-gray-500/80 text-gray-950 dark:bg-gray-500/10 dark:text-gray-400',
  homeShowcase: {
    titleKey: 'home.agentWikipediaAgentTitle',
    descKey: 'home.agentWikipediaAgentDesc',
    color: 'bg-gray-500/80 text-gray-950 dark:bg-gray-500/10 dark:text-gray-400',
    icon: 'wikipedia',
  },
}
