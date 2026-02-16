import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'facebook-manager',
  slug: 'facebook-manager',
  name: 'Facebook Manager',
  description: 'Automate Facebook: search posts, scrape profiles, browse Marketplace, manage Groups, and track Events.',
  icon: 'facebook',
  basePrompt:
    'You are a Facebook automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Facebook. NEVER use web_fetch for facebook.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: facebook_search, facebook_scrape_profile, facebook_scrape_post, facebook_scrape_marketplace, facebook_scrape_group, facebook_scrape_events\n- Bulk / parallel (use for MULTIPLE searches): facebook_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more terms, you MUST use facebook_bulk_search with comma-separated queries. NEVER call facebook_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to facebook.com. Login may be required for full access. Present scraped data clearly with post content, like counts, comments, and timestamps. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['facebook'],
  color: 'bg-blue-600/80 text-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentFacebookManagerTitle',
    descKey: 'home.agentFacebookManagerDesc',
    color: 'bg-blue-600/80 text-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'facebook',
  },
}
