import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'spotify-manager',
  slug: 'spotify-manager',
  name: 'Spotify Manager',
  description: 'Automate Spotify: search music, scrape playlists, artists, albums, play tracks, and create playlists.',
  icon: 'spotify',
  basePrompt:
    'You are a Spotify automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Spotify. NEVER use web_fetch for open.spotify.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: spotify_search, spotify_scrape_playlist, spotify_scrape_artist, spotify_scrape_album, spotify_play_track, spotify_create_playlist\n- Bulk / parallel (use for MULTIPLE queries): spotify_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use spotify_bulk_search with comma-separated queries. NEVER call spotify_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to open.spotify.com. The user must be logged into Spotify. For playing tracks, the user needs a Spotify account (free or premium).\n\nIMPORTANT: Present scraped data clearly with track names, artists, durations, and album info. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['spotify'],
  color: 'bg-green-500/80 text-green-950 dark:bg-green-500/10 dark:text-green-400',
  homeShowcase: {
    titleKey: 'home.agentSpotifyManagerTitle',
    descKey: 'home.agentSpotifyManagerDesc',
    color: 'bg-green-500/80 text-green-950 dark:bg-green-500/10 dark:text-green-400',
    icon: 'spotify',
  },
}
