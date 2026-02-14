// Static ?raw imports - Vite bundles markdown at build time
import enGettingStarted from './en/getting-started.md?raw'
import enAgents from './en/agents.md?raw'
import enMcpServers from './en/mcp-servers.md?raw'
import enMacros from './en/macros.md?raw'
import enChromeExtension from './en/chrome-extension.md?raw'
import enApiKeysPrivacy from './en/api-keys-privacy.md?raw'
import enProviders from './en/providers.md?raw'
import enAnalytics from './en/analytics.md?raw'
import enScheduledPlans from './en/scheduled-plans.md?raw'

import trGettingStarted from './tr/getting-started.md?raw'
import trAgents from './tr/agents.md?raw'
import trMcpServers from './tr/mcp-servers.md?raw'
import trMacros from './tr/macros.md?raw'
import trChromeExtension from './tr/chrome-extension.md?raw'
import trApiKeysPrivacy from './tr/api-keys-privacy.md?raw'
import trProviders from './tr/providers.md?raw'
import trAnalytics from './tr/analytics.md?raw'
import trScheduledPlans from './tr/scheduled-plans.md?raw'

import deGettingStarted from './de/getting-started.md?raw'
import deAgents from './de/agents.md?raw'
import deMcpServers from './de/mcp-servers.md?raw'
import deMacros from './de/macros.md?raw'
import deChromeExtension from './de/chrome-extension.md?raw'
import deApiKeysPrivacy from './de/api-keys-privacy.md?raw'
import deProviders from './de/providers.md?raw'
import deAnalytics from './de/analytics.md?raw'
import deScheduledPlans from './de/scheduled-plans.md?raw'

const CONTENT: Record<string, Record<string, string>> = {
  en: {
    'getting-started': enGettingStarted,
    agents: enAgents,
    'mcp-servers': enMcpServers,
    macros: enMacros,
    'chrome-extension': enChromeExtension,
    'api-keys-privacy': enApiKeysPrivacy,
    providers: enProviders,
    analytics: enAnalytics,
    'scheduled-plans': enScheduledPlans,
  },
  tr: {
    'getting-started': trGettingStarted,
    agents: trAgents,
    'mcp-servers': trMcpServers,
    macros: trMacros,
    'chrome-extension': trChromeExtension,
    'api-keys-privacy': trApiKeysPrivacy,
    providers: trProviders,
    analytics: trAnalytics,
    'scheduled-plans': trScheduledPlans,
  },
  de: {
    'getting-started': deGettingStarted,
    agents: deAgents,
    'mcp-servers': deMcpServers,
    macros: deMacros,
    'chrome-extension': deChromeExtension,
    'api-keys-privacy': deApiKeysPrivacy,
    providers: deProviders,
    analytics: deAnalytics,
    'scheduled-plans': deScheduledPlans,
  },
}

export function getDocContent(lang: string, slug: string): string | null {
  return CONTENT[lang]?.[slug] ?? CONTENT['en']?.[slug] ?? null
}
