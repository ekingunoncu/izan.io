/**
 * Models.dev integration - fetches full model list like OpenCode.
 * https://models.dev/api.json
 */

import type { ProviderId } from './llm-providers'
import type { ModelInfo } from './providers'

const MODELS_DEV_URL = 'https://models.dev/api.json'

/** models.dev provider ID -> our ProviderId */
const PROVIDER_ID_MAP: Record<string, ProviderId> = {
  openai: 'openai',
  google: 'google',
  groq: 'groq',
  alibaba: 'qwen',
  deepseek: 'deepseek',
  xai: 'xai',
  mistral: 'mistral',
  togetherai: 'togetherai',
  perplexity: 'perplexity',
  cerebras: 'cerebras',
  deepinfra: 'deepinfra',
  cohere: 'cohere',
  moonshotai: 'moonshot',
  'moonshotai-cn': 'moonshot',
  minimax: 'minimax',
  openrouter: 'openrouter',
  fireworks: 'fireworks',
  ollama: 'ollama',
  'ollama-cloud': 'ollama',
}

interface ModelsDevModel {
  id: string
  name: string
  family?: string
  reasoning?: boolean
  tool_call?: boolean
  attachment?: boolean
  cost?: { input?: number; output?: number; reasoning?: number }
  limit?: { context?: number; output?: number }
  modalities?: { input?: string[]; output?: string[] }
  status?: 'alpha' | 'beta' | 'deprecated'
}

interface ModelsDevProvider {
  id: string
  name: string
  env?: string[]
  api?: string
  models: Record<string, ModelsDevModel>
}

function toModelInfo(m: ModelsDevModel, id: string): ModelInfo {
  const ctx = m.limit?.context ?? 128_000
  const out = m.limit?.output ?? 8192
  const costIn = m.cost?.input ?? 0
  const costOut = m.cost?.output ?? 0
  const hasImage = m.modalities?.input?.includes('image') ?? false
  return {
    id,
    name: m.name,
    description: m.family ?? '',
    contextWindow: ctx,
    maxOutput: out,
    supportsTools: m.tool_call ?? true,
    supportsVision: hasImage,
    canReason: m.reasoning ?? false,
    costIn,
    costOut,
  }
}

let cache: Record<ProviderId, ModelInfo[]> | null = null
let cacheTime = 0
const CACHE_TTL_MS = 60 * 60 * 1000

export async function fetchModelsFromDev(): Promise<Record<ProviderId, ModelInfo[]>> {
  if (cache && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cache
  }

  try {
    const res = await fetch(MODELS_DEV_URL, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`models.dev: ${res.status}`)
    const data = (await res.json()) as Record<string, ModelsDevProvider>

    const result: Record<ProviderId, ModelInfo[]> = {}

    for (const [devId, provider] of Object.entries(data)) {
      const ourId = PROVIDER_ID_MAP[devId]
      if (!ourId) continue

      const models: ModelInfo[] = []
      for (const [modelId, model] of Object.entries(provider.models ?? {})) {
        if (model.status === 'deprecated') continue
        if (model.status === 'alpha') continue
        models.push(toModelInfo(model, modelId))
      }

      if (models.length > 0) {
        const existing = result[ourId] ?? []
        const seen = new Set(existing.map((m) => m.id))
        for (const m of models) {
          if (!seen.has(m.id)) {
            seen.add(m.id)
            existing.push(m)
          }
        }
        result[ourId] = existing
      }
    }

    for (const id of Object.keys(result) as ProviderId[]) {
      result[id].sort((a, b) => a.name.localeCompare(b.name))
    }

    cache = result
    cacheTime = Date.now()
    return result
  } catch {
    return {}
  }
}
