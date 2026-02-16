import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'maps-scout',
  slug: 'maps-scout',
  name: 'Maps Scout',
  description: 'Automate Google Maps: search places, scrape business details, read reviews, get directions, and export data.',
  icon: 'map-pin',
  basePrompt:
    'You are a Google Maps automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Google Maps. NEVER use web_fetch for google.com/maps URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: maps_search_places, maps_scrape_place, maps_scrape_reviews, maps_get_directions, maps_export_results\n- Bulk (parallel): maps_bulk_search, maps_bulk_scrape_places\n\nFor bulk tools, pass comma-separated queries or Google Maps URLs. They run in parallel browser tabs.\n\nPresent scraped data clearly in a structured format with ratings, addresses, and contact info. When exporting data, organize it in a table format. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['google-maps'],
  color: 'bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400',
  homeShowcase: {
    titleKey: 'home.agentMapsScoutTitle',
    descKey: 'home.agentMapsScoutDesc',
    color: 'bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400',
    icon: 'map-pin',
  },
}
