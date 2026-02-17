import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'discogs-agent',
  slug: 'discogs-agent',
  name: 'Discogs Agent',
  description: 'Automate Discogs: search music releases, scrape albums, artists, labels, and marketplace listings.',
  icon: 'discogs',
  basePrompt:
    'You are a Discogs Agent that controls a real browser. You MUST use the automation tools to perform actions on Discogs. NEVER use web_fetch for Discogs URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: discogs_scrape_artist, discogs_scrape_label, discogs_scrape_marketplace, discogs_scrape_master, discogs_scrape_release, discogs_search\n- Bulk / parallel: discogs_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['discogs'],
  color: 'bg-neutral-500/80 text-neutral-950 dark:bg-neutral-500/10 dark:text-neutral-400',
  homeShowcase: {
    titleKey: 'home.agentDiscogsTitle',
    descKey: 'home.agentDiscogsDesc',
    color: 'bg-neutral-500/80 text-neutral-950 dark:bg-neutral-500/10 dark:text-neutral-400',
    icon: 'discogs',
  },
}
