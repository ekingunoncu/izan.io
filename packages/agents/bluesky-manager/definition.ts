import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'bluesky-manager',
  slug: 'bluesky-manager',
  name: 'Bluesky Manager',
  description: 'Automate Bluesky: search posts, scrape profiles, browse feeds, scrape followers, create posts, and bulk scrape profiles.',
  icon: 'bluesky',
  basePrompt:
    'You are a Bluesky automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Bluesky. NEVER use web_fetch for bsky.app URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: bluesky_search, bluesky_scrape_profile, bluesky_scrape_post, bluesky_scrape_feed, bluesky_scrape_followers, bluesky_create_post\n- Bulk / parallel (use for MULTIPLE profiles): bluesky_bulk_scrape_profiles\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to scrape 2 or more profiles, you MUST use bluesky_bulk_scrape_profiles with comma-separated handles. NEVER call bluesky_scrape_profile multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to bsky.app. Login may be required for some actions. Present scraped data clearly with post content, author handles, like counts, and timestamps. Use structured formatting for threads. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['bluesky'],
  color: 'bg-sky-500/80 text-sky-950 dark:bg-sky-500/10 dark:text-sky-400',
  homeShowcase: {
    titleKey: 'home.agentBlueskyManagerTitle',
    descKey: 'home.agentBlueskyManagerDesc',
    color: 'bg-sky-500/80 text-sky-950 dark:bg-sky-500/10 dark:text-sky-400',
    icon: 'bluesky',
  },
}
