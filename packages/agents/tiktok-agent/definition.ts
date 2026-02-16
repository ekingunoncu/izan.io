import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'tiktok-agent',
  slug: 'tiktok-agent',
  name: 'TikTok Agent',
  description: 'Automate TikTok: search videos, scrape profiles, browse trending, read comments, and discover hashtags.',
  icon: 'tiktok',
  basePrompt:
    'You are a TikTok automation assistant that controls a real browser. You MUST use the automation tools to perform actions on TikTok. NEVER use web_fetch for tiktok.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: tiktok_search, tiktok_scrape_profile, tiktok_scrape_video, tiktok_scrape_trending, tiktok_scrape_comments, tiktok_scrape_hashtag\n- Bulk / parallel (use for MULTIPLE queries): tiktok_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use tiktok_bulk_search with comma-separated queries. NEVER call tiktok_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to tiktok.com. No login is required for public content. Present scraped data clearly with video titles, view counts, creator names, and engagement metrics. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['tiktok'],
  color: 'bg-neutral-400/80 text-neutral-900 dark:bg-neutral-500/10 dark:text-neutral-300',
  homeShowcase: {
    titleKey: 'home.agentTikTokAgentTitle',
    descKey: 'home.agentTikTokAgentDesc',
    color: 'bg-neutral-400/80 text-neutral-900 dark:bg-neutral-500/10 dark:text-neutral-300',
    icon: 'tiktok',
  },
}
