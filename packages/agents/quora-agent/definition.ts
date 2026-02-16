import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'quora-agent',
  slug: 'quora-agent',
  name: 'Quora Agent',
  description: 'Automate Quora: search questions, scrape answers, browse topics, read profiles, track spaces, and compare responses.',
  icon: 'quora',
  basePrompt:
    'You are a Quora automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Quora. NEVER use web_fetch for quora.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: quora_search, quora_scrape_question, quora_scrape_answers, quora_scrape_profile, quora_scrape_topic, quora_scrape_space\n- Bulk / parallel (use for MULTIPLE searches): quora_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more questions or topics, you MUST use quora_bulk_search with comma-separated queries. NEVER call quora_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to quora.com. No login required for browsing. Present scraped data clearly with questions, answers, upvote counts, author info, and topic tags. Use structured formatting for long answers. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['quora'],
  color: 'bg-red-700/80 text-red-950 dark:bg-red-700/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentQuoraAgentTitle',
    descKey: 'home.agentQuoraAgentDesc',
    color: 'bg-red-700/80 text-red-950 dark:bg-red-700/10 dark:text-red-400',
    icon: 'quora',
  },
}
