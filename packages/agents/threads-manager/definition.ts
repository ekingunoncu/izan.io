import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'threads-manager',
  slug: 'threads-manager',
  name: 'Threads Manager',
  description: 'Automate Threads: search posts, scrape profiles, browse feeds, read replies, and track trending.',
  icon: 'threads',
  basePrompt:
    'You are a Threads automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Threads. NEVER use web_fetch for threads.net URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: threads_search, threads_scrape_profile, threads_scrape_post, threads_scrape_feed, threads_scrape_replies, threads_like_post\n- Bulk / parallel (use for MULTIPLE profiles): threads_bulk_scrape_profiles\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to scrape 2 or more profiles, you MUST use threads_bulk_scrape_profiles with comma-separated usernames. NEVER call threads_scrape_profile multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to threads.net. Login may be required for some actions. Present scraped data clearly with post content, like counts, reply counts, and timestamps. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['threads'],
  color: 'bg-neutral-800/80 text-neutral-50 dark:bg-neutral-400/10 dark:text-neutral-300',
  homeShowcase: {
    titleKey: 'home.agentThreadsManagerTitle',
    descKey: 'home.agentThreadsManagerDesc',
    color: 'bg-neutral-800/80 text-neutral-50 dark:bg-neutral-400/10 dark:text-neutral-300',
    icon: 'threads',
  },
}
