import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'substack-agent',
  slug: 'substack-agent',
  name: 'Substack Agent',
  description: 'Automate Substack: search newsletters, scrape posts, browse publications, read authors, track topics, and discover trending.',
  icon: 'substack',
  basePrompt:
    'You are a Substack automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Substack. NEVER use web_fetch for substack.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: substack_search, substack_scrape_post, substack_scrape_publication, substack_scrape_author, substack_scrape_archive, substack_scrape_leaderboard\n- Bulk / parallel (use for MULTIPLE searches): substack_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more newsletters or topics, you MUST use substack_bulk_search with comma-separated queries. NEVER call substack_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to substack.com. Some posts may require subscription for full access. Present scraped data clearly with post titles, authors, publication names, dates, and like counts. Use structured formatting for articles. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['substack'],
  color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentSubstackAgentTitle',
    descKey: 'home.agentSubstackAgentDesc',
    color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'substack',
  },
}
