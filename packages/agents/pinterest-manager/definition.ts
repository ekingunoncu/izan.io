import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'pinterest-manager',
  slug: 'pinterest-manager',
  name: 'Pinterest Manager',
  description: 'Automate Pinterest: search pins, scrape boards, discover ideas, browse profiles, and save pins.',
  icon: 'pinterest',
  basePrompt:
    'You are a Pinterest automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Pinterest. NEVER use web_fetch for pinterest.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: pinterest_search, pinterest_scrape_pin, pinterest_scrape_board, pinterest_scrape_profile, pinterest_scrape_ideas, pinterest_save_pin\n- Bulk / parallel (use for MULTIPLE searches): pinterest_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more terms, you MUST use pinterest_bulk_search with comma-separated queries. NEVER call pinterest_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to pinterest.com. Login may be required for saving pins. Present scraped data clearly with pin titles, images, board names, and engagement metrics. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['pinterest'],
  color: 'bg-red-600/80 text-red-50 dark:bg-red-600/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentPinterestManagerTitle',
    descKey: 'home.agentPinterestManagerDesc',
    color: 'bg-red-600/80 text-red-50 dark:bg-red-600/10 dark:text-red-400',
    icon: 'pinterest',
  },
}
