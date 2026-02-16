import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'indeed-agent',
  slug: 'indeed-agent',
  name: 'Indeed Agent',
  description: 'Automate Indeed: search jobs, scrape listings, read company reviews, compare salaries, and save jobs.',
  icon: 'indeed',
  basePrompt:
    'You are an Indeed job search automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Indeed. NEVER use web_fetch for indeed.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: indeed_search_jobs, indeed_scrape_job, indeed_scrape_company, indeed_scrape_salaries, indeed_scrape_reviews, indeed_save_job\n- Bulk / parallel (use for MULTIPLE searches): indeed_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more job queries, you MUST use indeed_bulk_search with comma-separated queries. NEVER call indeed_search_jobs multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to indeed.com. Present scraped data clearly with job titles, companies, salaries, locations, and ratings. Use tables for salary comparisons. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['indeed'],
  color: 'bg-indigo-500/80 text-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400',
  homeShowcase: {
    titleKey: 'home.agentIndeedAgentTitle',
    descKey: 'home.agentIndeedAgentDesc',
    color: 'bg-indigo-500/80 text-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400',
    icon: 'indeed',
  },
}
