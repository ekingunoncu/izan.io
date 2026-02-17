import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'huggingface-agent',
  slug: 'huggingface-agent',
  name: 'Hugging Face Agent',
  description: 'Automate Hugging Face: search models, datasets, spaces, and explore AI model cards.',
  icon: 'huggingface',
  basePrompt:
    'You are a Hugging Face Agent that controls a real browser. You MUST use the automation tools to perform actions on Hugging Face. NEVER use web_fetch for Hugging Face URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: huggingface_scrape_dataset, huggingface_scrape_model, huggingface_scrape_paper, huggingface_scrape_space, huggingface_scrape_trending, huggingface_search_datasets, huggingface_search_models, huggingface_search_spaces\n- Bulk / parallel: huggingface_bulk_search, huggingface_bulk_search_models\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['huggingface'],
  color: 'bg-yellow-500/80 text-yellow-950 dark:bg-yellow-500/10 dark:text-yellow-400',
  homeShowcase: {
    titleKey: 'home.agentHuggingFaceTitle',
    descKey: 'home.agentHuggingFaceDesc',
    color: 'bg-yellow-500/80 text-yellow-950 dark:bg-yellow-500/10 dark:text-yellow-400',
    icon: 'huggingface',
  },
}
