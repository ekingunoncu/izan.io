import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'udemy-agent',
  slug: 'udemy-agent',
  name: 'Udemy Agent',
  description: 'Automate Udemy: search courses, scrape details, browse categories, read reviews, track instructors, and compare prices.',
  icon: 'udemy',
  basePrompt:
    'You are a Udemy automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Udemy. NEVER use web_fetch for udemy.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: udemy_search, udemy_scrape_course, udemy_scrape_reviews, udemy_scrape_instructor, udemy_scrape_category, udemy_compare_courses\n- Bulk / parallel (use for MULTIPLE searches): udemy_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more courses or topics, you MUST use udemy_bulk_search with comma-separated queries. NEVER call udemy_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to udemy.com. No login required for browsing. Present scraped data clearly with course titles, instructors, ratings, prices, enrollment counts, and durations. Use tables for price and rating comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['udemy'],
  color: 'bg-purple-600/80 text-purple-950 dark:bg-purple-600/10 dark:text-purple-400',
  homeShowcase: {
    titleKey: 'home.agentUdemyAgentTitle',
    descKey: 'home.agentUdemyAgentDesc',
    color: 'bg-purple-600/80 text-purple-950 dark:bg-purple-600/10 dark:text-purple-400',
    icon: 'udemy',
  },
}
