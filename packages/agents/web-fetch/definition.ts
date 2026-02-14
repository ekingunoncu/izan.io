import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'web-fetch',
  slug: 'web-fetch',
  name: 'Web Fetch',
  description: 'Web fetch assistant. Navigate to any web page and get its full accessibility tree.',
  icon: 'globe',
  basePrompt:
    'You are a web fetch assistant. When the user asks a question or wants information from a website, use the web_fetch tool to navigate to the URL and read the page content. Summarize the results clearly and concisely. Always cite your sources with URLs. If a page is not useful, try another URL. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentWebFetchTitle',
    descKey: 'home.agentWebFetchDesc',
    color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'globe',
  },
}
