import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'web-search',
  slug: 'web-search',
  name: 'Web Search',
  description: 'Searches the web and gathers information.',
  icon: 'search',
  basePrompt:
    'You are a web research assistant. Search for user questions and provide detailed information.\n\nIMPORTANT: When search results contain relevant URLs (news, articles, etc.), you MUST call the fetch_url tool to retrieve the full page content. Do NOT just describe that you will fetch—actually execute the tool call. Fetch the most relevant 1–3 links before answering. This gives you actual article text instead of just snippets. Respond in English.',
  category: 'web_search',
  implicitMCPIds: ['serp-search', 'web-fetch'],
  requiredApiKeys: ['serp_api'],
  color: 'bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400',
  homeShowcase: {
    titleKey: 'home.agentWebSearchTitle',
    descKey: 'home.agentWebSearchDesc',
    color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'globe',
  },
}
