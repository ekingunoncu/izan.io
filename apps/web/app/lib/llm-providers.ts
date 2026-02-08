/**
 * LLM provider endpoint configuration.
 * OpenAI-compatible providers: base URL + /chat/completions.
 */

/** Supported LLM provider identifiers */
export type ProviderId =
  | 'openai'
  | 'google'
  | 'groq'
  | 'xai'
  | 'deepseek'
  | 'openrouter'
  | 'mistral'
  | 'togetherai'
  | 'fireworks'
  | 'perplexity'
  | 'cerebras'
  | 'deepinfra'
  | 'cohere'
  | 'moonshot'
  | 'minimax'
  | 'ollama'
  | 'qwen'
  | 'custom'

export interface ProviderEndpointConfig {
  baseURL: string
  authType: 'bearer'
}

const OPENAI_COMPAT = (baseURL: string): ProviderEndpointConfig => ({
  baseURL: baseURL.replace(/\/$/, ''),
  authType: 'bearer',
})

export const PROVIDER_ENDPOINTS: Partial<Record<ProviderId, ProviderEndpointConfig>> = {
  openai: OPENAI_COMPAT('https://api.openai.com/v1'),
  google: OPENAI_COMPAT('https://generativelanguage.googleapis.com/v1beta/openai'),
  groq: OPENAI_COMPAT('https://api.groq.com/openai/v1'),
  deepseek: OPENAI_COMPAT('https://api.deepseek.com/v1'),
  openrouter: OPENAI_COMPAT('https://openrouter.ai/api/v1'),
  mistral: OPENAI_COMPAT('https://api.mistral.ai/v1'),
  togetherai: OPENAI_COMPAT('https://api.together.xyz/v1'),
  perplexity: OPENAI_COMPAT('https://api.perplexity.ai'),
  cohere: OPENAI_COMPAT('https://api.cohere.ai/compatibility/v1'),
  xai: OPENAI_COMPAT('https://api.x.ai/v1'),
  cerebras: OPENAI_COMPAT('https://api.cerebras.ai/v1'),
  deepinfra: OPENAI_COMPAT('https://api.deepinfra.com/v1/openai'),
  fireworks: OPENAI_COMPAT('https://api.fireworks.ai/inference/v1'),
  moonshot: OPENAI_COMPAT('https://api.moonshot.cn/v1'),
  minimax: OPENAI_COMPAT('https://api.minimax.chat/v1'),
  qwen: OPENAI_COMPAT('https://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
}

export function getChatUrl(provider: ProviderId, baseURL?: string): string {
  if (provider === 'custom' && baseURL) {
    return baseURL.replace(/\/$/, '') + '/chat/completions'
  }
  if (provider === 'ollama') {
    return (baseURL || 'http://localhost:11434/v1').replace(/\/$/, '') + '/chat/completions'
  }
  const config = PROVIDER_ENDPOINTS[provider]
  if (!config) return ''
  return config.baseURL + '/chat/completions'
}

/** OpenAI Responses API URL - for models that only support v1/responses (o1, o3, o4, gpt-5) */
export function getResponsesUrl(provider: ProviderId, baseURL?: string): string {
  if (provider !== 'openai') return ''
  if (baseURL) return baseURL.replace(/\/$/, '') + '/responses'
  return 'https://api.openai.com/v1/responses'
}

/** Models that require OpenAI Responses API (not chat/completions) */
export function usesResponsesApi(provider: string, model: string): boolean {
  if (provider !== 'openai') return false
  const m = (model ?? '').toLowerCase()
  return m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4') || m.startsWith('gpt-5')
}
