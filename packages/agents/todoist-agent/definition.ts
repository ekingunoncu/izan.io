import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'todoist-agent',
  slug: 'todoist-agent',
  name: 'Todoist Agent',
  description: 'Automate Todoist: view tasks, create new tasks, browse upcoming, and manage projects.',
  icon: 'todoist',
  basePrompt:
    'You are a Todoist Agent that controls a real browser. You MUST use the automation tools to perform actions on Todoist. NEVER use web_fetch for Todoist URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: todoist_create_task, todoist_scrape_inbox, todoist_scrape_labels, todoist_scrape_productivity, todoist_scrape_project (requires numeric project_id from URL), todoist_scrape_today, todoist_scrape_upcoming, todoist_search\n- Bulk / parallel: todoist_bulk_scrape_projects (requires comma-separated numeric project_ids), todoist_bulk_search\n\nCRITICAL RULES:\n- todoist_scrape_project and todoist_bulk_scrape_projects require numeric project IDs (e.g. 2349078265), NOT project names. The ID is found in the Todoist URL: app.todoist.com/app/project/<project_id>.\n- When the user wants to search for 2 or more queries, you MUST use todoist_bulk_search with comma-separated queries. NEVER call todoist_search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['todoist'],
  color: 'bg-red-600/80 text-red-950 dark:bg-red-600/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentTodoistTitle',
    descKey: 'home.agentTodoistDesc',
    color: 'bg-red-600/80 text-red-950 dark:bg-red-600/10 dark:text-red-400',
    icon: 'todoist',
  },
}
