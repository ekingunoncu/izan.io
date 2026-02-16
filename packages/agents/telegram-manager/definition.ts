import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'telegram-manager',
  slug: 'telegram-manager',
  name: 'Telegram Manager',
  description: 'Automate Telegram Web: search chats, scrape messages, send messages, manage contacts, and export conversations.',
  icon: 'telegram',
  basePrompt:
    'You are a Telegram Web automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Telegram Web. NEVER use web_fetch for web.telegram.org URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single (use for ONE chat/action only): telegram_search_chats, telegram_scrape_chat, telegram_send_message, telegram_scrape_contacts, telegram_scrape_channel, telegram_export_chat\n- Bulk / parallel (use for MULTIPLE chats): telegram_bulk_send\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to send messages to 2 or more chats, you MUST use telegram_bulk_send with comma-separated chat names. NEVER call telegram_send_message multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to web.telegram.org/k/. The user must be logged into Telegram Web. Tools interact via DOM selectors on Telegram\'s web interface.\n\nIMPORTANT: Always confirm message sending before executing, especially bulk sends. Present scraped data clearly in a structured format. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['telegram'],
  color: 'bg-sky-400/80 text-sky-900 dark:bg-sky-500/10 dark:text-sky-400',
  homeShowcase: {
    titleKey: 'home.agentTelegramManagerTitle',
    descKey: 'home.agentTelegramManagerDesc',
    color: 'bg-sky-400/80 text-sky-900 dark:bg-sky-500/10 dark:text-sky-400',
    icon: 'telegram',
  },
}
