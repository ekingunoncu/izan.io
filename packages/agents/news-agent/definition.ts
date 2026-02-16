import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'news-agent',
  slug: 'news-agent',
  name: 'Google News Agent',
  description: 'Automate Google News: search articles, browse topics, scrape headlines, read full stories, and track trending.',
  icon: 'google-news',
  basePrompt:
    'You are a Google News automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Google News. NEVER use web_fetch for news.google.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: news_search, news_scrape_headlines, news_scrape_topic, news_scrape_article, news_scrape_trending, news_scrape_local\n- Bulk / parallel (use for MULTIPLE searches): news_bulk_search\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to search for 2 or more topics, you MUST use news_bulk_search with comma-separated queries. NEVER call news_search multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to news.google.com. No login required. Present scraped data clearly with headlines, sources, timestamps, and summaries. Group articles by topic or source when useful. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['google-news'],
  color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
  homeShowcase: {
    titleKey: 'home.agentNewsAgentTitle',
    descKey: 'home.agentNewsAgentDesc',
    color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
    icon: 'google-news',
  },
}
