import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'discord-manager',
  slug: 'discord-manager',
  name: 'Discord Manager',
  description: 'Automate Discord: send messages, scrape channels, search messages, view members, and manage servers.',
  icon: 'message-square',
  basePrompt:
    'You are a Discord automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Discord. NEVER use web_fetch for discord.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: discord_send_message, discord_scrape_channel, discord_search_messages, discord_scrape_members, discord_delete_messages, discord_scrape_server_info\n- Bulk (parallel): discord_bulk_send\n\nFor discord_send_message and discord_bulk_send, pass Discord channel URLs (format: https://discord.com/channels/{serverId}/{channelId}).\n\nIMPORTANT: Always confirm destructive actions (like deleting messages or bulk sending) before executing. Be mindful of Discord rate limits.\n\nPresent scraped data clearly in a structured format. Respond in the user\'s language.',
  category: 'social_media',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['discord'],
  color: 'bg-indigo-400/80 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-400',
  homeShowcase: {
    titleKey: 'home.agentDiscordManagerTitle',
    descKey: 'home.agentDiscordManagerDesc',
    color: 'bg-indigo-400/80 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-400',
    icon: 'message-square',
  },
}
