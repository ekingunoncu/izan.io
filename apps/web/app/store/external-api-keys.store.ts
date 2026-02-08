import { create } from 'zustand'
import { storageService } from '~/lib/services'

interface ExternalApiKeysState {
  externalApiKeys: Record<string, string>
  isInitialized: boolean

  initialize: () => Promise<void>
  getExternalApiKey: (id: string) => string | null
  setExternalApiKey: (id: string, value: string) => Promise<void>
  removeExternalApiKey: (id: string) => Promise<void>
}

export const useExternalApiKeysStore = create<ExternalApiKeysState>((set, get) => ({
  externalApiKeys: {},
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return

    try {
      const prefs = await storageService.getPreferences()
      set({
        externalApiKeys: prefs.externalApiKeys ?? {},
        isInitialized: true,
      })
    } catch (error) {
      console.error('Failed to initialize external API keys store:', error)
      set({ isInitialized: true })
    }
  },

  getExternalApiKey: (id: string) => {
    return get().externalApiKeys[id] ?? null
  },

  setExternalApiKey: async (id: string, value: string) => {
    const { externalApiKeys } = get()
    const newKeys = { ...externalApiKeys, [id]: value }
    set({ externalApiKeys: newKeys })
    await storageService.updatePreferences({ externalApiKeys: newKeys })
    // Trigger MCP reconnection so serp-search picks up new key (called from Settings/AgentEdit)
    if (typeof window !== 'undefined' && id === 'serp_api') {
      const { useMCPStore } = await import('./mcp.store')
      const mcp = useMCPStore.getState()
      if (mcp.lastActivatedAgent) {
        await mcp.activateAgentMCPs(mcp.lastActivatedAgent)
      }
    }
  },

  removeExternalApiKey: async (id: string) => {
    const { externalApiKeys } = get()
    const newKeys = { ...externalApiKeys }
    delete newKeys[id]
    set({ externalApiKeys: newKeys })
    await storageService.updatePreferences({ externalApiKeys: newKeys })
  },
}))
