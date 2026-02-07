/**
 * @izan/llm-proxy - Provider factory
 *
 * Creates Vercel AI SDK provider instances based on provider ID and API key.
 * Matches all providers from OpenCode (anomalyco/opencode packages/opencode/src/provider/provider.ts).
 */

import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createXai } from '@ai-sdk/xai'
import { createMistral } from '@ai-sdk/mistral'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { createPerplexity } from '@ai-sdk/perplexity'
import { createCerebras } from '@ai-sdk/cerebras'
import { createDeepInfra } from '@ai-sdk/deepinfra'
import { createCohere } from '@ai-sdk/cohere'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { ProviderId } from './types'

/** Provider configuration for creating SDK instances */
interface ProviderConfig {
  apiKey: string
  model: string
  baseURL?: string
}

/**
 * Create a language model instance for the given provider.
 * Returns a Vercel AI SDK LanguageModelV1 ready for generateText/streamText.
 */
export function createLanguageModel(
  providerId: ProviderId,
  config: ProviderConfig,
): LanguageModel {
  const { apiKey, model, baseURL } = config

  switch (providerId) {
    case 'openai': {
      const provider = createOpenAI({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'google': {
      const provider = createGoogleGenerativeAI({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'groq': {
      const provider = createGroq({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'xai': {
      const provider = createXai({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'mistral': {
      const provider = createMistral({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'togetherai': {
      const provider = createTogetherAI({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'perplexity': {
      const provider = createPerplexity({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'cerebras': {
      const provider = createCerebras({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'deepinfra': {
      const provider = createDeepInfra({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'cohere': {
      const provider = createCohere({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'deepseek': {
      const provider = createOpenAICompatible({
        name: 'deepseek',
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      })
      return provider(model) as LanguageModel
    }

    case 'fireworks': {
      const provider = createOpenAICompatible({
        name: 'fireworks',
        apiKey,
        baseURL: 'https://api.fireworks.ai/inference/v1',
      })
      return provider(model) as LanguageModel
    }

    case 'moonshot': {
      const provider = createOpenAICompatible({
        name: 'moonshot',
        apiKey,
        baseURL: 'https://api.moonshot.cn/v1',
      })
      return provider(model) as LanguageModel
    }

    case 'minimax': {
      const provider = createOpenAICompatible({
        name: 'minimax',
        apiKey,
        baseURL: 'https://api.minimax.chat/v1',
      })
      return provider(model) as LanguageModel
    }

    case 'qwen': {
      const provider = createOpenAICompatible({
        name: 'qwen',
        apiKey,
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      })
      return provider(model) as LanguageModel
    }

    case 'openrouter': {
      const provider = createOpenRouter({ apiKey })
      return provider(model) as LanguageModel
    }

    case 'ollama': {
      const provider = createOpenAICompatible({
        name: 'ollama',
        apiKey: apiKey || 'ollama',
        baseURL: baseURL || 'http://localhost:11434/v1',
      })
      return provider(model) as LanguageModel
    }

    case 'custom': {
      if (!baseURL) {
        throw new Error('Custom provider requires a baseURL')
      }
      const provider = createOpenAICompatible({
        name: 'custom',
        apiKey,
        baseURL,
      })
      return provider(model) as LanguageModel
    }

    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }
}
