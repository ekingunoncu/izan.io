/**
 * Hook that merges models.dev data with provider metadata.
 * Returns providers with full model lists (from models.dev) or static fallback.
 */

import { useState, useEffect } from 'react'
import { PROVIDERS, filterProviders, type ProviderInfo, type ModelInfo } from './providers'
import { fetchModelsFromDev } from './models-dev'

export function useProvidersWithModels(): {
  providers: ProviderInfo[]
  isLoading: boolean
  filterProviders: (query: string) => ProviderInfo[]
} {
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, ModelInfo[]> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchModelsFromDev()
      .then((data) => {
        if (!cancelled) {
          setModelsByProvider(data)
        }
      })
      .catch(() => {
        if (!cancelled) setModelsByProvider({})
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const providers: ProviderInfo[] = PROVIDERS.map((p) => {
    const devModels = modelsByProvider?.[p.id]
    const models = devModels && devModels.length > 0 ? devModels : p.models
    return { ...p, models }
  })

  return {
    providers,
    isLoading,
    filterProviders: (query: string) => filterProviders(providers, query),
  }
}
