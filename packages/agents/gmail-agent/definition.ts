import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'gmail-agent',
  slug: 'gmail-agent',
  name: 'Gmail Agent',
  description: 'Automate Gmail: read emails, send emails, search inbox, manage labels, archive messages, and bulk operations.',
  icon: 'gmail',
  basePrompt:
    'You are a Gmail automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Gmail. NEVER use web_fetch for mail.google.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: gmail_read_inbox, gmail_read_email, gmail_send_email, gmail_search, gmail_archive, gmail_label\n- Bulk / parallel (use for MULTIPLE messages): gmail_bulk_archive, gmail_bulk_send_email\n\nCRITICAL RULES - BULK vs SINGLE:\n- When the user wants to archive 2 or more emails, you MUST use gmail_bulk_archive. NEVER call gmail_archive multiple times in sequence.\n- When the user wants to send 2 or more emails, you MUST use gmail_bulk_send_email. NEVER call gmail_send_email multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to mail.google.com. The user must be logged into their Google account. Tools interact with the Gmail UI via DOM selectors.\n\nNever expose full email content unless asked. Present email data clearly with sender, subject, date, and preview. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['gmail'],
  color: 'bg-red-400/80 text-red-900 dark:bg-red-500/10 dark:text-red-400',
  homeShowcase: {
    titleKey: 'home.agentGmailAgentTitle',
    descKey: 'home.agentGmailAgentDesc',
    color: 'bg-red-400/80 text-red-900 dark:bg-red-500/10 dark:text-red-400',
    icon: 'gmail',
  },
}
