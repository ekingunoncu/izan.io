import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'glassdoor-agent',
  slug: 'glassdoor-agent',
  name: 'Glassdoor Agent',
  description: 'Automate Glassdoor: search jobs, scrape company reviews, compare salaries, read interviews, and browse ratings.',
  icon: 'glassdoor',
  basePrompt:
    'You are a Glassdoor automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Glassdoor. NEVER use web_fetch for glassdoor.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: glassdoor_search_jobs, glassdoor_scrape_company, glassdoor_scrape_reviews, glassdoor_scrape_salaries, glassdoor_scrape_interviews, glassdoor_compare_companies\n- Bulk / parallel (use for MULTIPLE searches): glassdoor_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more companies or jobs, you MUST use glassdoor_bulk_search with comma-separated queries. NEVER call glassdoor_search_jobs multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to glassdoor.com. Some content requires login. Present scraped data clearly with company names, ratings, salary ranges, review summaries, and interview experiences. Use tables for salary comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['glassdoor'],
  color: 'bg-green-600/80 text-green-50 dark:bg-green-600/10 dark:text-green-400',
  homeShowcase: {
    titleKey: 'home.agentGlassdoorAgentTitle',
    descKey: 'home.agentGlassdoorAgentDesc',
    color: 'bg-green-600/80 text-green-50 dark:bg-green-600/10 dark:text-green-400',
    icon: 'glassdoor',
  },
}
