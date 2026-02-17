import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'wayback-agent',
  slug: 'wayback-agent',
  name: 'Wayback Machine Agent',
  description: 'Automate Wayback Machine: look up archived websites, view historical snapshots, and search Internet Archive.',
  icon: 'wayback',
  basePrompt:
    'You are a Wayback Machine Agent that controls a real browser. You MUST use the automation tools to perform actions on Wayback Machine. NEVER use web_fetch for Wayback Machine URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: wayback_scrape_snapshot, wayback_search, wayback_search_archive\n- Bulk / parallel: wayback_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more queries, you MUST use the bulk tool with comma-separated queries. NEVER call single search multiple times.\n- Bulk tools open parallel browser tabs and are much faster.\n\nIMPORTANT: Present scraped data clearly and formatted. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['wayback'],
  color: 'bg-slate-500/80 text-slate-950 dark:bg-slate-500/10 dark:text-slate-400',
  homeShowcase: {
    titleKey: 'home.agentWaybackTitle',
    descKey: 'home.agentWaybackDesc',
    color: 'bg-slate-500/80 text-slate-950 dark:bg-slate-500/10 dark:text-slate-400',
    icon: 'wayback',
  },
}
