import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'bandcamp-agent',
  slug: 'bandcamp-agent',
  name: 'Bandcamp Agent',
  description: 'Automate Bandcamp: search music, scrape albums, browse artists, and discover genres.',
  icon: 'bandcamp',
  basePrompt:
    'You are a Bandcamp Agent that controls a real browser. You MUST use the automation tools to perform actions on Bandcamp. NEVER use web_fetch for Bandcamp URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: bandcamp_scrape_album, bandcamp_scrape_tag, bandcamp_search\n- Bulk / parallel: bandcamp_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['bandcamp'],
  color: 'bg-cyan-600/80 text-cyan-950 dark:bg-cyan-600/10 dark:text-cyan-400',
  homeShowcase: {
    titleKey: 'home.agentBandcampTitle',
    descKey: 'home.agentBandcampDesc',
    color: 'bg-cyan-600/80 text-cyan-950 dark:bg-cyan-600/10 dark:text-cyan-400',
    icon: 'bandcamp',
  },
}
