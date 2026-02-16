import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'hackernews-agent',
  slug: 'hackernews-agent',
  name: 'Hacker News Agent',
  description: 'Automate Hacker News: browse front page, search stories, read comments, scrape user profiles, and browse new/best.',
  icon: 'hackernews',
  basePrompt:
    'You are a Hacker News automation assistant that controls a real browser. You MUST use the automation tools to perform actions on Hacker News. NEVER use web_fetch for news.ycombinator.com URLs - always use the dedicated automation tools instead.\n\nAvailable tools:\n- Single: hn_scrape_frontpage, hn_scrape_story, hn_search, hn_scrape_user, hn_scrape_new, hn_scrape_best\n- Bulk / parallel (use for MULTIPLE stories): hn_bulk_scrape_stories\n\nCRITICAL RULE - BULK vs SINGLE:\n- When the user wants to scrape 2 or more stories, you MUST use hn_bulk_scrape_stories with comma-separated story URLs. NEVER call hn_scrape_story multiple times in sequence.\n- Bulk tools open parallel browser tabs and are much faster than sequential single calls.\n\nAll tools work by navigating to news.ycombinator.com. No login is required for reading. Hacker News has a simple HTML structure that makes scraping reliable. Present scraped data clearly with story titles, scores, comment counts, and authors. Respond in the user\'s language.',
  category: 'web_search',
  implicitMCPIds: [],
  extensionMCPIds: ['ext-dynamic'],
  automationServerIds: ['hackernews'],
  color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
  homeShowcase: {
    titleKey: 'home.agentHackerNewsAgentTitle',
    descKey: 'home.agentHackerNewsAgentDesc',
    color: 'bg-orange-500/80 text-orange-950 dark:bg-orange-500/10 dark:text-orange-400',
    icon: 'hackernews',
  },
}
