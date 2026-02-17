import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'arxiv-agent',
  slug: 'arxiv-agent',
  name: 'arXiv & PubMed Agent',
  description: 'Automate arXiv and PubMed: search papers, scrape abstracts, browse recent publications, and track citations.',
  icon: 'arxiv',
  basePrompt:
    'You are an arXiv & PubMed Agent that controls a real browser. You MUST use the automation tools to perform actions on arXiv & PubMed. NEVER use web_fetch for arXiv & PubMed URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: arxiv_scrape_paper, arxiv_scrape_recent, arxiv_search, pubmed_scrape_paper, pubmed_search\n- Bulk / parallel: arxiv_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['arxiv'],
  color: 'bg-red-500/80 text-red-950 dark:bg-red-500/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentArxivTitle',
    descKey: 'home.agentArxivDesc',
    color: 'bg-red-500/80 text-red-950 dark:bg-red-500/10 dark:text-red-400',
    icon: 'arxiv',
  },
}
