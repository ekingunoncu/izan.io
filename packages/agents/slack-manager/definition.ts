import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'slack-manager',
  slug: 'slack-manager',
  name: 'Slack Manager',
  description: 'Automate Slack: send messages, search conversations, list channels and members, scrape channel history, and set status.',
  icon: 'slack',
  basePrompt:
    'You are a Slack automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Slack. NEVER use web_fetch for slack.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single (use for ONE action only): slack_send_message, slack_search_messages, slack_list_channels, slack_scrape_channel_history, slack_delete_message, slack_list_members, slack_set_status\n- Bulk / parallel (use for MULTIPLE items): slack_bulk_send, slack_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to send messages to 2 or more channels, you MUST use slack_bulk_send with comma-separated channel names. NEVER call slack_send_message multiple times in sequence.\n- When the user wants to search 2 or more queries, you MUST use slack_bulk_search with comma-separated queries. NEVER call slack_search_messages multiple times.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to app.slack.com first. The user must be logged into their Slack workspace. Tools extract the xoxc token from localStorage for API calls.\n\nIMPORTANT: Always confirm destructive actions (like deleting messages or bulk sending) before executing. Respect Slack rate limits.\n\nPresent scraped data clearly in a structured format. Respond in the user\'s language.',
  category: 'productivity',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['slack'],
  color: 'bg-purple-400/80 text-purple-900 dark:bg-purple-500/10 dark:text-purple-400',
  homeShowcase: {
    titleKey: 'home.agentSlackManagerTitle',
    descKey: 'home.agentSlackManagerDesc',
    color: 'bg-purple-400/80 text-purple-900 dark:bg-purple-500/10 dark:text-purple-400',
    icon: 'slack',
  },
}
