import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'twitch-agent',
  slug: 'twitch-agent',
  name: 'Twitch Agent',
  description: 'Automate Twitch: search streams, scrape channels, browse categories, read chat, track viewers, and discover clips.',
  icon: 'twitch',
  basePrompt:
    'You are a Twitch automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Twitch. NEVER use web_fetch for twitch.tv URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: twitch_search, twitch_scrape_channel, twitch_scrape_stream, twitch_scrape_categories, twitch_scrape_clips, twitch_scrape_chat\n- Bulk / parallel (use for MULTIPLE searches): twitch_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more channels or games, you MUST use twitch_bulk_search with comma-separated queries. NEVER call twitch_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to twitch.tv. No login required for browsing. Present scraped data clearly with stream titles, viewer counts, channel names, and game categories. Use tables for comparisons. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['twitch'],
  color: 'bg-violet-500/80 text-violet-950 dark:bg-violet-500/10 dark:text-violet-400',
  homeShowcase: {
    titleKey: 'home.agentTwitchAgentTitle',
    descKey: 'home.agentTwitchAgentDesc',
    color: 'bg-violet-500/80 text-violet-950 dark:bg-violet-500/10 dark:text-violet-400',
    icon: 'twitch',
  },
}
