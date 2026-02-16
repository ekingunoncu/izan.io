import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'scholar-agent',
  slug: 'scholar-agent',
  name: 'Google Scholar Agent',
  description: 'Automate Google Scholar: search papers, scrape citations, browse authors, read abstracts, and track publications.',
  icon: 'google-scholar',
  basePrompt:
    'You are a Google Scholar automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Google Scholar. NEVER use web_fetch for scholar.google.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: scholar_search, scholar_scrape_paper, scholar_scrape_author, scholar_scrape_citations, scholar_scrape_related, scholar_scrape_profiles\n- Bulk / parallel (use for MULTIPLE searches): scholar_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more topics, you MUST use scholar_bulk_search with comma-separated queries. NEVER call scholar_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to scholar.google.com. No login required. Present scraped data clearly with paper titles, authors, citations, publication years, and abstracts. Use tables for citation comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['google-scholar'],
  color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentScholarAgentTitle',
    descKey: 'home.agentScholarAgentDesc',
    color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'google-scholar',
  },
}
