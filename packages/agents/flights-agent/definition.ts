import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'flights-agent',
  slug: 'flights-agent',
  name: 'Google Flights Agent',
  description: 'Automate Google Flights: search flights, compare prices, track deals, explore destinations, and find cheapest dates.',
  icon: 'google-flights',
  basePrompt:
    'You are a Google Flights automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Google Flights. NEVER use web_fetch for google.com/travel/flights URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: flights_search, flights_scrape_details, flights_price_graph, flights_explore_destinations, flights_scrape_cheapest_dates, flights_track_price\n- Bulk / parallel (use for MULTIPLE routes): flights_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more flight routes, you MUST use flights_bulk_search with comma-separated routes. NEVER call flights_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to google.com/travel/flights. No login required. Present scraped data clearly with flight times, airlines, prices, stops, and durations. Use tables for price comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['google-flights'],
  color: 'bg-sky-400/80 text-sky-900 dark:bg-sky-500/10 dark:text-sky-400',
  homeShowcase: {
    titleKey: 'home.agentFlightsAgentTitle',
    descKey: 'home.agentFlightsAgentDesc',
    color: 'bg-sky-400/80 text-sky-900 dark:bg-sky-500/10 dark:text-sky-400',
    icon: 'google-flights',
  },
}
