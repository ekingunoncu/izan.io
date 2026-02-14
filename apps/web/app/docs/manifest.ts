export interface DocEntry {
  slug: string
  titleKey: string
  category: string
}

export interface DocCategory {
  id: string
  titleKey: string
}

export const DOC_CATEGORIES: DocCategory[] = [
  { id: 'getting-started', titleKey: 'docs.catGettingStarted' },
  { id: 'features', titleKey: 'docs.catFeatures' },
  { id: 'configuration', titleKey: 'docs.catConfiguration' },
]

export const DOC_ENTRIES: DocEntry[] = [
  { slug: 'getting-started', titleKey: 'docs.titleGettingStarted', category: 'getting-started' },
  { slug: 'agents', titleKey: 'docs.titleAgents', category: 'features' },
  { slug: 'mcp-servers', titleKey: 'docs.titleMcpServers', category: 'features' },
  { slug: 'macros', titleKey: 'docs.titleMacros', category: 'features' },
  { slug: 'chrome-extension', titleKey: 'docs.titleChromeExtension', category: 'features' },
  { slug: 'api-keys-privacy', titleKey: 'docs.titleApiKeysPrivacy', category: 'configuration' },
  { slug: 'providers', titleKey: 'docs.titleProviders', category: 'configuration' },
  { slug: 'analytics', titleKey: 'docs.titleAnalytics', category: 'features' },
  { slug: 'scheduled-plans', titleKey: 'docs.titleScheduledPlans', category: 'features' },
]

export const DOC_SLUGS = DOC_ENTRIES.map((d) => d.slug)
