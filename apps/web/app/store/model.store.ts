import { create } from 'zustand'
import { llmService, storageService } from '~/lib/services'
import { getProvider } from '~/lib/providers'

/**
 * ModelState - State interface for provider/model management
 * Replaces old WebLLM-based model store (no WebGPU, no download progress)
 * Provider/model metadata comes from useProvidersWithModels (models.dev + static).
 */
interface ModelState {
  // State
  selectedProvider: string | null
  selectedModel: string | null
  providerKeys: Record<string, string>
  isInitialized: boolean
  error: string | null

  // Computed helpers
  isConfigured: () => boolean
  getApiKey: (providerId: string) => string | null

  // Actions
  initialize: () => Promise<void>
  setProvider: (providerId: string) => Promise<void>
  setModel: (modelId: string) => Promise<void>
  setApiKey: (providerId: string, apiKey: string) => Promise<void>
  removeApiKey: (providerId: string) => Promise<void>
  clearError: () => void
}

/**
 * useModelStore - Zustand store for cloud LLM provider/model state
 */
export const useModelStore = create<ModelState>((set, get) => ({
  // Initial state
  selectedProvider: null,
  selectedModel: null,
  providerKeys: {},
  isInitialized: false,
  error: null,

  // Computed helpers
  isConfigured: () => {
    const { selectedProvider, selectedModel, providerKeys } = get()
    if (!selectedProvider || !selectedModel) return false
    return !!providerKeys[selectedProvider]
  },

  getApiKey: (providerId: string) => {
    return get().providerKeys[providerId] ?? null
  },

  // Initialize from stored preferences
  initialize: async () => {
    if (get().isInitialized) return

    try {
      const prefs = await storageService.getPreferences()
      const keys = prefs.providerKeys ?? {}
      const provider = prefs.selectedProvider ?? null
      const model = prefs.selectedModel ?? null

      set({
        selectedProvider: provider,
        selectedModel: model,
        providerKeys: keys,
        isInitialized: true,
      })

      // Configure LLM service if we have everything
      if (provider && model && keys[provider]) {
        llmService.configure(provider, model, keys[provider])
      }
    } catch (error) {
      console.error('Failed to initialize model store:', error)
      set({ isInitialized: true })
    }
  },

  // Select a provider
  setProvider: async (providerId: string) => {
    const provider = getProvider(providerId)
    if (!provider) {
      set({ error: `Provider bulunamadı: ${providerId}` })
      return
    }

    // Auto-select first model of the provider
    const firstModel = provider.models[0]?.id ?? null

    set({
      selectedProvider: providerId,
      selectedModel: firstModel,
      error: null,
    })

    await storageService.updatePreferences({
      selectedProvider: providerId,
      selectedModel: firstModel,
    })

    // Reconfigure LLM service
    const key = get().providerKeys[providerId]
    if (firstModel && key) {
      llmService.configure(providerId, firstModel, key)
    }
  },

  // Select a model within current provider
  setModel: async (modelId: string) => {
    const { selectedProvider, providerKeys } = get()

    set({ selectedModel: modelId, error: null })

    await storageService.updatePreferences({ selectedModel: modelId })

    // Reconfigure LLM service
    if (selectedProvider && providerKeys[selectedProvider]) {
      llmService.configure(selectedProvider, modelId, providerKeys[selectedProvider])
    }
  },

  // Save API key for a provider
  setApiKey: async (providerId: string, apiKey: string) => {
    const { providerKeys, selectedProvider, selectedModel } = get()

    const newKeys = { ...providerKeys, [providerId]: apiKey }
    set({ providerKeys: newKeys, error: null })

    await storageService.updatePreferences({ providerKeys: newKeys })

    // Reconfigure LLM service if this is the active provider
    if (providerId === selectedProvider && selectedModel) {
      llmService.configure(providerId, selectedModel, apiKey)
    }
  },

  // Remove API key for a provider
  removeApiKey: async (providerId: string) => {
    const { providerKeys } = get()

    const newKeys = { ...providerKeys }
    delete newKeys[providerId]
    set({ providerKeys: newKeys })

    await storageService.updatePreferences({ providerKeys: newKeys })
  },

  clearError: () => {
    set({ error: null })
  },
}))
