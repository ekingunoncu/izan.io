/**
 * Provider registry and model definitions for izan.io
 *
 * All providers from OpenCode (anomalyco/opencode) are supported.
 * Model data sourced from OpenCode's models.dev integration and provider docs.
 */

import type { ProviderId } from '../llm-providers'

/** Provider metadata */
export interface ProviderInfo {
  id: ProviderId
  name: string
  description: string
  icon: string
  /** URL to get an API key */
  apiKeyUrl: string
  /** Env variable name hint */
  envHint: string
  /** Models available for this provider */
  models: ModelInfo[]
  /** Has a free tier (no credit card required for initial use). Sources: official docs. */
  hasFreeTier?: boolean
}

/** Model metadata */
export interface ModelInfo {
  id: string
  name: string
  description: string
  contextWindow: number
  maxOutput: number
  supportsTools: boolean
  supportsVision: boolean
  canReason: boolean
  /** Cost per 1M input tokens (USD) */
  costIn: number
  /** Cost per 1M output tokens (USD) */
  costOut: number
}

// ─── PROVIDERS ──────────────────────────────────────────────────────────────

export const PROVIDERS: ProviderInfo[] = [
  // ── OpenAI ──
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4.1, o3, o4-mini ve daha fazlasi',
    icon: 'brain',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    envHint: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4.1', name: 'GPT 4.1', description: 'En yetenekli GPT modeli.', contextWindow: 1_047_576, maxOutput: 20000, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.0, costOut: 8.0 },
      { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', description: 'Hizli ve uygun fiyatli.', contextWindow: 200_000, maxOutput: 20000, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.4, costOut: 1.6 },
      { id: 'gpt-4.1-nano', name: 'GPT 4.1 Nano', description: 'En hafif GPT.', contextWindow: 1_047_576, maxOutput: 20000, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.1, costOut: 0.4 },
      { id: 'gpt-4o', name: 'GPT 4o', description: 'Cok modlu, hizli.', contextWindow: 128_000, maxOutput: 4096, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.5, costOut: 10.0 },
      { id: 'gpt-4o-mini', name: 'GPT 4o Mini', description: 'Hafif ve ekonomik.', contextWindow: 128_000, maxOutput: 4096, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.15, costOut: 0.6 },
      { id: 'o4-mini', name: 'o4 Mini', description: 'izan yetenekli, karmasik problemler.', contextWindow: 128_000, maxOutput: 50000, supportsTools: true, supportsVision: true, canReason: true, costIn: 1.1, costOut: 4.4 },
      { id: 'o3', name: 'o3', description: 'En guclu izan modeli.', contextWindow: 200_000, maxOutput: 50000, supportsTools: true, supportsVision: true, canReason: true, costIn: 10.0, costOut: 40.0 },
      { id: 'o3-mini', name: 'o3 Mini', description: 'Hafif izan modeli.', contextWindow: 200_000, maxOutput: 50000, supportsTools: true, supportsVision: false, canReason: true, costIn: 1.1, costOut: 4.4 },
    ],
  },

  // ── Google ──
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini 2.5 Pro, Flash',
    icon: 'sparkles',
    apiKeyUrl: 'https://aistudio.google.com/apikey',
    envHint: 'GOOGLE_API_KEY',
    hasFreeTier: true, // Free tier: 250 RPD, no credit card (aistudio.google.com)
    models: [
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', description: 'En guclu Gemini.', contextWindow: 1_000_000, maxOutput: 65536, supportsTools: true, supportsVision: true, canReason: true, costIn: 1.25, costOut: 10.0 },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', description: 'Hizli ve ekonomik.', contextWindow: 1_000_000, maxOutput: 65536, supportsTools: true, supportsVision: true, canReason: true, costIn: 0.15, costOut: 0.6 },
    ],
  },

  // ── Groq ──
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra hizli: Llama, Qwen, DeepSeek',
    icon: 'zap',
    apiKeyUrl: 'https://console.groq.com/keys',
    envHint: 'GROQ_API_KEY',
    hasFreeTier: true, // Free tier: tokens/min, no credit card
    models: [
      { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B', description: 'Qwen izan modeli.', contextWindow: 128_000, maxOutput: 50000, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.29, costOut: 0.39 },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Guclu acik kaynak model.', contextWindow: 128_000, maxOutput: 32768, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.59, costOut: 0.79 },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', description: 'En yeni Llama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.11, costOut: 0.34 },
      { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', description: 'Guclu Llama 4 modeli.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.20, costOut: 0.20 },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', description: 'izan odakli.', contextWindow: 128_000, maxOutput: 16384, supportsTools: false, supportsVision: false, canReason: true, costIn: 0.75, costOut: 0.99 },
    ],
  },

  // ── Mistral ──
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Mistral Large, Medium, Codestral',
    icon: 'wind',
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    envHint: 'MISTRAL_API_KEY',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'En guclu Mistral modeli.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.0, costOut: 6.0 },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Dengeli performans.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.4, costOut: 2.0 },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Hizli ve ekonomik.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.1, costOut: 0.3 },
      { id: 'codestral-latest', name: 'Codestral', description: 'Kod yazma icin optimize.', contextWindow: 256_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.3, costOut: 0.9 },
    ],
  },

  // ── xAI ──
  {
    id: 'xai',
    name: 'xAI',
    description: 'Grok 3, Grok 3 Mini, Grok 3 Fast',
    icon: 'bot',
    apiKeyUrl: 'https://console.x.ai/',
    envHint: 'XAI_API_KEY',
    models: [
      { id: 'grok-3-beta', name: 'Grok 3 Beta', description: 'En guclu Grok.', contextWindow: 131_072, maxOutput: 20000, supportsTools: true, supportsVision: false, canReason: false, costIn: 3.0, costOut: 15.0 },
      { id: 'grok-3-fast-beta', name: 'Grok 3 Fast Beta', description: 'Hizli Grok.', contextWindow: 131_072, maxOutput: 20000, supportsTools: true, supportsVision: false, canReason: false, costIn: 5.0, costOut: 25.0 },
      { id: 'grok-3-mini-beta', name: 'Grok 3 Mini Beta', description: 'Ekonomik Grok.', contextWindow: 131_072, maxOutput: 20000, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.3, costOut: 0.5 },
      { id: 'grok-3-mini-fast-beta', name: 'Grok 3 Mini Fast', description: 'En hizli Grok.', contextWindow: 131_072, maxOutput: 20000, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.6, costOut: 4.0 },
    ],
  },

  // ── DeepSeek ──
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek Chat, Reasoner',
    icon: 'brain',
    apiKeyUrl: 'https://platform.deepseek.com/',
    envHint: 'DEEPSEEK_API_KEY',
    hasFreeTier: true, // Trial credits for new accounts
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Genel amacli sohbet.', contextWindow: 64_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.14, costOut: 0.28 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Derin dusunme ve izan.', contextWindow: 64_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 0.55, costOut: 2.19 },
    ],
  },

  // ── Qwen (DashScope) ──
  {
    id: 'qwen',
    name: 'Qwen (DashScope)',
    description: 'Alibaba Qwen - qwen-turbo, qwen-plus, qwen-max',
    icon: 'bot',
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    envHint: 'DASHSCOPE_API_KEY',
    models: [
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: 'Hizli ve ekonomik.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.3, costOut: 0.6 },
      { id: 'qwen-plus', name: 'Qwen Plus', description: 'Dengeli performans.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.4, costOut: 1.2 },
      { id: 'qwen-max', name: 'Qwen Max', description: 'En guclu Qwen modeli.', contextWindow: 32_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.0, costOut: 6.0 },
      { id: 'qwen3-8b', name: 'Qwen 3 8B', description: 'Hafif Qwen 3.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.15, costOut: 0.50 },
      { id: 'qwen3-32b', name: 'Qwen 3 32B', description: 'Guclu Qwen 3.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.20, costOut: 0.60 },
      { id: 'qwen3-235b-a22b', name: 'Qwen 3 235B', description: 'En buyuk Qwen 3 MoE.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.20, costOut: 0.60 },
    ],
  },

  // ── Together AI ──
  {
    id: 'togetherai',
    name: 'Together AI',
    description: 'Qwen, Llama, DeepSeek, DBRX ve daha fazlasi',
    icon: 'layers',
    apiKeyUrl: 'https://api.together.ai/settings/api-keys',
    envHint: 'TOGETHER_AI_API_KEY',
    hasFreeTier: true, // DeepSeek-R1-Distill-Llama-70B-free model + $25 credits for new users
    models: [
      { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen 3 235B', description: 'En buyuk Qwen 3 MoE.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.20, costOut: 0.60 },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo', description: 'Guclu ve hizli Qwen.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.12, costOut: 0.18 },
      { id: 'Qwen/QwQ-32B', name: 'QwQ 32B', description: 'Qwen izan modeli.', contextWindow: 128_000, maxOutput: 32768, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.12, costOut: 0.18 },
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', description: 'Kod yazma icin optimize.', contextWindow: 32_768, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.12, costOut: 0.18 },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', description: 'Hizli Llama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.18, costOut: 0.18 },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'Tam DeepSeek R1.', contextWindow: 64_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 0.55, costOut: 2.19 },
      { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', name: 'DeepSeek R1 70B (Ücretsiz)', description: 'Ücretsiz izan modeli.', contextWindow: 131_072, maxOutput: 16384, supportsTools: false, supportsVision: false, canReason: true, costIn: 0, costOut: 0 },
      { id: 'mistralai/Mistral-Small-24B-Instruct-2501', name: 'Mistral Small 24B', description: 'Hafif Mistral modeli.', contextWindow: 32_768, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.08, costOut: 0.18 },
    ],
  },

  // ── Fireworks AI ──
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Qwen, Llama, DeepSeek - hizli izan',
    icon: 'flame',
    apiKeyUrl: 'https://fireworks.ai/account/api-keys',
    envHint: 'FIREWORKS_API_KEY',
    models: [
      { id: 'accounts/fireworks/models/qwen3-235b-a22b', name: 'Qwen 3 235B', description: 'Dev Qwen 3 MoE modeli.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.20, costOut: 0.60 },
      { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Guclu Qwen 2.5.', contextWindow: 32_768, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.90, costOut: 0.90 },
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', description: 'Guclu acik kaynak.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.90, costOut: 0.90 },
      { id: 'accounts/fireworks/models/deepseek-r1', name: 'DeepSeek R1', description: 'Derin izan.', contextWindow: 128_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 3.0, costOut: 8.0 },
    ],
  },

  // ── Perplexity ──
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Arama destekli AI - Sonar modelleri',
    icon: 'search',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    envHint: 'PERPLEXITY_API_KEY',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', description: 'Guclu arama destekli model.', contextWindow: 200_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: false, costIn: 3.0, costOut: 15.0 },
      { id: 'sonar', name: 'Sonar', description: 'Hizli arama destekli.', contextWindow: 128_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: false, costIn: 1.0, costOut: 1.0 },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: 'izan + arama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 2.0, costOut: 8.0 },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', description: 'Hafif izan + arama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 1.0, costOut: 5.0 },
    ],
  },

  // ── Cerebras ──
  {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Ultra hizli izan - Llama, Qwen',
    icon: 'cpu',
    apiKeyUrl: 'https://inference.cerebras.ai/',
    envHint: 'CEREBRAS_API_KEY',
    hasFreeTier: true, // 1M tokens/day free
    models: [
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Ultra hizli Llama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.85, costOut: 1.20 },
      { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', description: 'En yeni Llama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 0.15, costOut: 0.50 },
      { id: 'qwen-3-32b', name: 'Qwen 3 32B', description: 'Cerebras uzerinde Qwen 3.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.15, costOut: 0.50 },
    ],
  },

  // ── Deep Infra ──
  {
    id: 'deepinfra',
    name: 'Deep Infra',
    description: 'Qwen, Llama, Mistral - ucuz izan',
    icon: 'server',
    apiKeyUrl: 'https://deepinfra.com/dash/api_keys',
    envHint: 'DEEPINFRA_API_KEY',
    models: [
      { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen 3 235B', description: 'Dev Qwen 3 MoE.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.16, costOut: 0.34 },
      { id: 'Qwen/QwQ-32B', name: 'QwQ 32B', description: 'Qwen izan.', contextWindow: 128_000, maxOutput: 32768, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.10, costOut: 0.18 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', description: 'Guclu Qwen.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.23, costOut: 0.40 },
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', description: 'Kod icin optimize.', contextWindow: 32_768, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.07, costOut: 0.16 },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', description: 'Hizli Llama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.12, costOut: 0.30 },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'Tam izan modeli.', contextWindow: 64_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 0.35, costOut: 1.50 },
    ],
  },

  // ── Cohere ──
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Command R+, Command R',
    icon: 'terminal',
    apiKeyUrl: 'https://dashboard.cohere.com/api-keys',
    envHint: 'COHERE_API_KEY',
    hasFreeTier: true, // Trial API key free (rate limited)
    models: [
      { id: 'command-r-plus', name: 'Command R+', description: 'En guclu Cohere modeli.', contextWindow: 128_000, maxOutput: 4096, supportsTools: true, supportsVision: false, canReason: false, costIn: 2.5, costOut: 10.0 },
      { id: 'command-r', name: 'Command R', description: 'Hizli ve ekonomik.', contextWindow: 128_000, maxOutput: 4096, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.15, costOut: 0.6 },
      { id: 'command-a-03-2025', name: 'Command A', description: 'En yeni Cohere modeli.', contextWindow: 256_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.5, costOut: 10.0 },
    ],
  },

  // ── Moonshot AI (Kimi) ──
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    description: 'Kimi K2 - guclu acik kaynak model',
    icon: 'moon',
    apiKeyUrl: 'https://platform.moonshot.cn/console',
    envHint: 'MOONSHOT_API_KEY',
    models: [
      { id: 'kimi-k2-0711', name: 'Kimi K2', description: 'Guclu MoE modeli.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.60, costOut: 2.0 },
    ],
  },

  // ── MiniMax ──
  {
    id: 'minimax',
    name: 'MiniMax',
    description: 'MiniMax M2.1 - Cin AI modeli',
    icon: 'minimize',
    apiKeyUrl: 'https://platform.minimax.io/',
    envHint: 'MINIMAX_API_KEY',
    models: [
      { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', description: 'Guclu genel amacli model.', contextWindow: 1_000_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 1.10, costOut: 5.50 },
    ],
  },

  // ── OpenRouter ──
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Yuzlerce modele tek API key ile erisim',
    icon: 'globe',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    envHint: 'OPENROUTER_API_KEY',
    models: [
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic via OpenRouter.', contextWindow: 200_000, maxOutput: 50000, supportsTools: true, supportsVision: true, canReason: true, costIn: 3.0, costOut: 15.0 },
      { id: 'openai/gpt-4.1', name: 'GPT 4.1', description: 'OpenAI via OpenRouter.', contextWindow: 1_047_576, maxOutput: 20000, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.0, costOut: 8.0 },
      { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', description: 'Google via OpenRouter.', contextWindow: 1_000_000, maxOutput: 65536, supportsTools: true, supportsVision: true, canReason: true, costIn: 1.25, costOut: 10.0 },
      { id: 'qwen/qwen3-235b-a22b', name: 'Qwen 3 235B', description: 'Qwen via OpenRouter.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.20, costOut: 0.60 },
      { id: 'qwen/qwq-32b', name: 'QwQ 32B', description: 'Qwen izan via OpenRouter.', contextWindow: 128_000, maxOutput: 32768, supportsTools: true, supportsVision: false, canReason: true, costIn: 0.12, costOut: 0.18 },
      { id: 'mistralai/mistral-large-latest', name: 'Mistral Large', description: 'Mistral via OpenRouter.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: true, canReason: false, costIn: 2.0, costOut: 6.0 },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'DeepSeek via OpenRouter.', contextWindow: 64_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 0.55, costOut: 2.19 },
      { id: 'moonshotai/kimi-k2', name: 'Kimi K2', description: 'Moonshot via OpenRouter.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0.60, costOut: 2.0 },
    ],
  },

  // ── Ollama (Local) ──
  {
    id: 'ollama',
    name: 'Ollama (Yerel)',
    description: 'Yerel modeller: Qwen, Llama, Mistral vb.',
    icon: 'hard-drive',
    apiKeyUrl: 'https://ollama.com/',
    envHint: 'OLLAMA_HOST',
    hasFreeTier: true, // Fully free, local, no API key needed
    models: [
      { id: 'qwen3:32b', name: 'Qwen 3 32B', description: 'Yerel Qwen 3 modeli.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0, costOut: 0 },
      { id: 'qwen3:8b', name: 'Qwen 3 8B', description: 'Hafif Qwen 3.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: true, costIn: 0, costOut: 0 },
      { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder 32B', description: 'Yerel kod modeli.', contextWindow: 32_768, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0, costOut: 0 },
      { id: 'llama3.3:70b', name: 'Llama 3.3 70B', description: 'Yerel Llama.', contextWindow: 128_000, maxOutput: 8192, supportsTools: true, supportsVision: false, canReason: false, costIn: 0, costOut: 0 },
      { id: 'mistral:7b', name: 'Mistral 7B', description: 'Hafif yerel model.', contextWindow: 32_768, maxOutput: 4096, supportsTools: true, supportsVision: false, canReason: false, costIn: 0, costOut: 0 },
      { id: 'deepseek-r1:32b', name: 'DeepSeek R1 32B', description: 'Yerel izan.', contextWindow: 64_000, maxOutput: 8192, supportsTools: false, supportsVision: false, canReason: true, costIn: 0, costOut: 0 },
    ],
  },
]

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Get provider by ID */
export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/** Filter providers by search query - matches id, name, description, envHint, model ids/names */
export function filterProviders(
  providers: ProviderInfo[],
  query: string
): ProviderInfo[] {
  const q = query.trim().toLowerCase()
  if (!q) return providers
  const words = q.split(/\s+/).filter(Boolean)
  return providers.filter((p) => {
    const haystack = [
      p.id,
      p.name,
      p.description,
      p.envHint,
      ...p.models.flatMap((m) => [m.id, m.name]),
    ]
      .join(' ')
      .toLowerCase()
    return words.every((w) => haystack.includes(w))
  })
}

/** Get model by provider ID and model ID */
export function getModel(
  providerId: string,
  modelId: string,
): ModelInfo | undefined {
  const provider = getProvider(providerId)
  return provider?.models.find((m) => m.id === modelId)
}

/** Get all provider IDs */
export function getProviderIds(): ProviderId[] {
  return PROVIDERS.map((p) => p.id)
}
