import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'myfitnesspal-agent',
  slug: 'myfitnesspal-agent',
  name: 'MyFitnessPal Agent',
  description: 'Automate MyFitnessPal: search foods, scrape nutrition data, and browse food diary.',
  icon: 'myfitnesspal',
  basePrompt:
    'You are a MyFitnessPal Agent that controls a real browser. You MUST use the automation tools to perform actions on MyFitnessPal. NEVER use web_fetch for MyFitnessPal URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: myfitnesspal_browse_recipes, myfitnesspal_compare_foods, myfitnesspal_scrape_diary, myfitnesspal_scrape_exercise, myfitnesspal_scrape_food, myfitnesspal_scrape_recipe, myfitnesspal_search, myfitnesspal_search_food\n- Bulk / parallel: myfitnesspal_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['myfitnesspal'],
  color: 'bg-blue-500/80 text-blue-950 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentMyFitnessPalTitle',
    descKey: 'home.agentMyFitnessPalDesc',
    color: 'bg-blue-500/80 text-blue-950 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'myfitnesspal',
  },
}
