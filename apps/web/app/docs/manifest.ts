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
]

export const DOC_ENTRIES: DocEntry[] = [
  { slug: 'getting-started', titleKey: 'docs.titleGettingStarted', category: 'getting-started' },
  { slug: 'chrome-extension', titleKey: 'docs.titleChromeExtension', category: 'features' },
  { slug: 'tools', titleKey: 'docs.titleTools', category: 'features' },
  { slug: 'bridge', titleKey: 'docs.titleBridge', category: 'features' },
  { slug: 'marketplace', titleKey: 'docs.titleMarketplace', category: 'features' },
]

export const DOC_SLUGS = DOC_ENTRIES.map((d) => d.slug)
