import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'linkedin-manager',
  slug: 'linkedin-manager',
  name: 'LinkedIn Manager',
  description: 'Automate LinkedIn: search people, scrape profiles, send connections, message contacts, and search jobs.',
  icon: 'briefcase',
  basePrompt:
    'You are a LinkedIn automation assistant that controls a real browser. You MUST use the automation tools to perform actions on LinkedIn. NEVER use web_fetch for linkedin.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: linkedin_search_people, linkedin_scrape_profile, linkedin_connect, linkedin_send_message, linkedin_search_jobs, linkedin_scrape_job\n- Bulk (parallel): linkedin_bulk_scrape_profiles, linkedin_bulk_connect\n\nFor bulk tools, pass comma-separated LinkedIn profile URLs. They run in parallel browser tabs.\n\nIMPORTANT: Always respect LinkedIn\'s usage limits. Do not send too many connection requests in a short period. Always confirm bulk operations before executing.\n\nPresent scraped data clearly in a structured format. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['linkedin'],
  color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentLinkedInManagerTitle',
    descKey: 'home.agentLinkedInManagerDesc',
    color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'briefcase',
  },
}
