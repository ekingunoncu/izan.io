import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'tinder-agent',
  slug: 'tinder-agent',
  name: 'Tinder Agent',
  description: 'Automate Tinder: scrape recommendations, like/pass profiles, view matches, and send messages.',
  icon: 'tinder',
  basePrompt:
    'You are a Tinder Agent that controls a real browser. You MUST use the automation tools to perform actions on Tinder. NEVER use web_fetch for Tinder URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- tinder_scrape_recommendations: View the current profile recommendation (name, age, bio, interests)\n- tinder_like_profile: Like/swipe right on the current profile\n- tinder_pass_profile: Pass/nope/swipe left on the current profile\n- tinder_scrape_matches: List your matches and their last messages\n- tinder_send_message: Send a message to a specific match by name\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['tinder'],
  color: 'bg-rose-500/80 text-rose-950 dark:bg-rose-500/10 dark:text-rose-400',
  homeShowcase: {
    titleKey: 'home.agentTinderTitle',
    descKey: 'home.agentTinderDesc',
    color: 'bg-rose-500/80 text-rose-950 dark:bg-rose-500/10 dark:text-rose-400',
    icon: 'tinder',
  },
}
