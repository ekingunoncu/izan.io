import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'sheets-agent',
  slug: 'sheets-agent',
  name: 'Google Sheets Agent',
  description: 'Automate Google Sheets: open spreadsheets, read and write cells, create new sheets, search Drive, and export CSV.',
  icon: 'google-sheets',
  basePrompt:
    'You are a Google Sheets automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Google Sheets. NEVER use web_fetch for docs.google.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: sheets_open, sheets_read_range, sheets_write_cell, sheets_create, sheets_search, sheets_export_csv\n- Bulk / parallel (use for MULTIPLE spreadsheets): sheets_bulk_read\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to read from 2 or more spreadsheets, you MUST use sheets_bulk_read with comma-separated URLs. NEVER call sheets_read_range multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to docs.google.com/spreadsheets/. The user must be logged into their Google account. Tools interact with the Sheets UI via DOM selectors.\n\nFor cell references, use standard notation (e.g. A1, B2:D10). When writing cells, navigate to the cell using the Name Box. Present spreadsheet data clearly in table format. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['google-sheets'],
  color: 'bg-green-400/80 text-green-900 dark:bg-green-500/10 dark:text-green-400',
  homeShowcase: {
    titleKey: 'home.agentSheetsAgentTitle',
    descKey: 'home.agentSheetsAgentDesc',
    color: 'bg-green-400/80 text-green-900 dark:bg-green-500/10 dark:text-green-400',
    icon: 'google-sheets',
  },
}
