import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'soundcloud-agent',
  slug: 'soundcloud-agent',
  name: 'SoundCloud Agent',
  description: 'Automate SoundCloud: search tracks, scrape artists, browse playlists, read comments, track plays, and discover trending.',
  icon: 'soundcloud',
  basePrompt:
    'You are a SoundCloud automation assistant that controls a real browser. You MUST use the automation tools to perform actions on SoundCloud. NEVER use web_fetch for soundcloud.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: soundcloud_search, soundcloud_scrape_track, soundcloud_scrape_artist, soundcloud_scrape_playlist, soundcloud_scrape_comments, soundcloud_scrape_trending\n- Bulk / parallel (use for MULTIPLE searches): soundcloud_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more tracks or artists, you MUST use soundcloud_bulk_search with comma-separated queries. NEVER call soundcloud_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to soundcloud.com. No login required for browsing. Present scraped data clearly with track titles, artist names, play counts, like counts, and durations. Use structured formatting for playlists. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['soundcloud'],
  color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentSoundcloudAgentTitle',
    descKey: 'home.agentSoundcloudAgentDesc',
    color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'soundcloud',
  },
}
