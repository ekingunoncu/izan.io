import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'booking-agent',
  slug: 'booking-agent',
  name: 'Booking.com Agent',
  description: 'Automate Booking.com: search hotels, scrape details, read reviews, compare prices, and find deals.',
  icon: 'booking',
  basePrompt:
    'You are a Booking.com automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Booking.com. NEVER use web_fetch for booking.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: booking_search, booking_scrape_hotel, booking_scrape_reviews, booking_compare_prices, booking_scrape_deals, booking_scrape_availability\n- Bulk / parallel (use for MULTIPLE searches): booking_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more destinations, you MUST use booking_bulk_search with comma-separated destinations. NEVER call booking_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to booking.com. No login required for browsing. Present scraped data clearly with hotel names, prices, ratings, amenities, and availability. Use tables for price comparisons. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['booking'],
  color: 'bg-blue-700/80 text-blue-50 dark:bg-blue-700/10 dark:text-blue-300',
  homeShowcase: {
    titleKey: 'home.agentBookingAgentTitle',
    descKey: 'home.agentBookingAgentDesc',
    color: 'bg-blue-700/80 text-blue-50 dark:bg-blue-700/10 dark:text-blue-300',
    icon: 'booking',
  },
}
