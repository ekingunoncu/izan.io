import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'medium-agent',
  slug: 'medium-agent',
  name: 'Medium Agent',
  description: 'Automate Medium: search articles, scrape stories, browse publications, read authors, track topics, and discover trending.',
  icon: 'medium',
  basePrompt:
    'You are a Medium automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Medium. NEVER use web_fetch for medium.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: medium_search, medium_scrape_article, medium_scrape_author, medium_scrape_publication, medium_scrape_topic, medium_scrape_trending\n- Bulk / parallel (use for MULTIPLE searches): medium_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more topics or articles, you MUST use medium_bulk_search with comma-separated queries. NEVER call medium_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to medium.com. Some articles may require login for full access. Present scraped data clearly with article titles, authors, read time, clap counts, and publication names. Use structured formatting for articles. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['medium'],
  color: 'bg-neutral-500/80 text-neutral-950 dark:bg-neutral-500/10 dark:text-neutral-400',
  homeShowcase: {
    titleKey: 'home.agentMediumAgentTitle',
    descKey: 'home.agentMediumAgentDesc',
    color: 'bg-neutral-500/80 text-neutral-950 dark:bg-neutral-500/10 dark:text-neutral-400',
    icon: 'medium',
  },
}
