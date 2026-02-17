import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'canva-agent',
  slug: 'canva-agent',
  name: 'Canva Agent',
  description: 'Automate Canva: search templates, scrape designs, browse categories, discover elements, track trending, and compare styles.',
  icon: 'canva',
  basePrompt:
    'You are a Canva automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Canva. NEVER use web_fetch for canva.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: canva_search_templates, canva_scrape_template, canva_scrape_design, canva_search_elements, canva_scrape_trending, canva_scrape_brand\n- Bulk / parallel (use for MULTIPLE searches): canva_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more templates or design types, you MUST use canva_bulk_search with comma-separated queries. NEVER call canva_search_templates multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to canva.com. Some features may require login. Present scraped data clearly with template names, categories, dimensions, and style descriptions. Use structured formatting for template collections. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['canva'],
  color: 'bg-cyan-500/80 text-cyan-950 dark:bg-cyan-500/10 dark:text-cyan-400',
  homeShowcase: {
    titleKey: 'home.agentCanvaAgentTitle',
    descKey: 'home.agentCanvaAgentDesc',
    color: 'bg-cyan-500/80 text-cyan-950 dark:bg-cyan-500/10 dark:text-cyan-400',
    icon: 'canva',
  },
}
