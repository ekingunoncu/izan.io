import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'figma-agent',
  slug: 'figma-agent',
  name: 'Figma Agent',
  description: 'Automate Figma: list files, scrape designs, read and add comments, search projects, and browse components.',
  icon: 'figma',
  basePrompt:
    'You are a Figma automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Figma. NEVER use web_fetch for figma.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: figma_list_files, figma_scrape_file, figma_scrape_comments, figma_add_comment, figma_search, figma_scrape_components\n- Bulk / parallel (use for MULTIPLE files): figma_bulk_scrape_files\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to scrape 2 or more files, you MUST use figma_bulk_scrape_files with comma-separated URLs. NEVER call figma_scrape_file multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to figma.com. The user must be logged into Figma. Tools interact with the Figma web UI via DOM selectors.\n\nIMPORTANT: Always confirm destructive actions before executing. Present design data clearly with file names, page counts, and component lists. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['figma'],
  color: 'bg-purple-400/80 text-purple-900 dark:bg-purple-500/10 dark:text-purple-400',
  homeShowcase: {
    titleKey: 'home.agentFigmaAgentTitle',
    descKey: 'home.agentFigmaAgentDesc',
    color: 'bg-purple-400/80 text-purple-900 dark:bg-purple-500/10 dark:text-purple-400',
    icon: 'figma',
  },
}
