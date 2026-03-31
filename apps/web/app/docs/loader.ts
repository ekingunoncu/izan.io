// Static ?raw imports - Vite bundles markdown at build time
import enGettingStarted from './en/getting-started.md?raw'
import enChromeExtension from './en/chrome-extension.md?raw'
import enTools from './en/tools.md?raw'
import enBridge from './en/bridge.md?raw'
import enMarketplace from './en/marketplace.md?raw'

import trGettingStarted from './tr/getting-started.md?raw'
import trChromeExtension from './tr/chrome-extension.md?raw'
import trTools from './tr/tools.md?raw'
import trBridge from './tr/bridge.md?raw'
import trMarketplace from './tr/marketplace.md?raw'

import deGettingStarted from './de/getting-started.md?raw'
import deChromeExtension from './de/chrome-extension.md?raw'
import deTools from './de/tools.md?raw'
import deBridge from './de/bridge.md?raw'
import deMarketplace from './de/marketplace.md?raw'

const CONTENT: Record<string, Record<string, string>> = {
  en: {
    'getting-started': enGettingStarted,
    'chrome-extension': enChromeExtension,
    tools: enTools,
    bridge: enBridge,
    marketplace: enMarketplace,
  },
  tr: {
    'getting-started': trGettingStarted,
    'chrome-extension': trChromeExtension,
    tools: trTools,
    bridge: trBridge,
    marketplace: trMarketplace,
  },
  de: {
    'getting-started': deGettingStarted,
    'chrome-extension': deChromeExtension,
    tools: deTools,
    bridge: deBridge,
    marketplace: deMarketplace,
  },
}

export function getDocContent(lang: string, slug: string): string | null {
  return CONTENT[lang]?.[slug] ?? CONTENT['en']?.[slug] ?? null
}
