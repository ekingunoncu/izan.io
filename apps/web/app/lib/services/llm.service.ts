import type {
  ILLMService,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionResult,
  LLMGenerationOptions,
  MessageContentPart,
  ThinkingLevel,
  TokenUsage,
} from './interfaces'

/** Partial tool call from stream delta (accumulated across chunks) */
interface StreamToolCallAccum {
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}
import { getChatUrl, getResponsesUrl, usesResponsesApi, type ProviderId } from '../llm-providers'

// ─── Custom Error Types ──────────────────────────────────────────────────────

/** API error with HTTP status code for better error classification */
export class LLMApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'LLMApiError'
    this.status = status
  }
}

/** Network-level error (fetch itself failed - no HTTP response) */
export class LLMNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMNetworkError'
  }
}

/** Extract text content from a message (handles both string and array content) */
function getTextContent(content: string | MessageContentPart[]): string {
  if (typeof content === 'string') return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('\n')
}

/**
 * Normalize messages for APIs that only accept [user, assistant] roles.
 * Merges system message content into the first user message.
 * Preserves structured (multimodal) content for vision support.
 */
function normalizeMessagesForStrictRoles(
  messages: ChatCompletionMessageParam[],
): Array<{ role: 'user' | 'assistant'; content: string | MessageContentPart[] }> {
  const systemParts: string[] = []
  const chatOnly: Array<{ role: 'user' | 'assistant'; content: string | MessageContentPart[] }> = []

  for (const msg of messages) {
    const role = msg.role as string
    if (role === 'system') {
      const text = getTextContent(msg.content)
      if (text) systemParts.push(text)
    } else if (role === 'user' || role === 'assistant') {
      chatOnly.push({ role, content: msg.content })
    }
    // Skip tool/function messages for plain chat
  }

  if (systemParts.length === 0) return chatOnly

  const systemContent = systemParts.join('\n\n')
  if (chatOnly.length === 0) {
    return [{ role: 'user', content: systemContent }]
  }

  const first = chatOnly[0]
  if (first.role === 'user') {
    // Prepend system content to the first user message
    if (Array.isArray(first.content)) {
      // Structured content: prepend system as a text part
      return [
        { role: 'user', content: [{ type: 'text' as const, text: systemContent }, ...first.content] },
        ...chatOnly.slice(1),
      ]
    }
    return [
      { role: 'user', content: systemContent + '\n\n' + first.content },
      ...chatOnly.slice(1),
    ]
  }
  return [{ role: 'user', content: systemContent }, ...chatOnly]
}

/** Parse SSE stream and yield parsed JSON objects for each data: line */
async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  isAborted: () => boolean,
): AsyncGenerator<Record<string, unknown>> {
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    if (isAborted()) break
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        yield JSON.parse(data) as Record<string, unknown>
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
  if (buffer.trim().startsWith('data: ')) {
    const data = buffer.slice(6)
    if (data !== '[DONE]') {
      try {
        yield JSON.parse(data) as Record<string, unknown>
      } catch {
        // ignore
      }
    }
  }
}

/**
 * LLMService - Cloud LLM operations
 *
 * All providers use direct API calls from the browser.
 */
export class LLMService implements ILLMService {
  private provider: string | null = null
  private model: string | null = null
  private apiKey: string | null = null
  private baseURL: string | null = null
  private activeControllers: Set<AbortController> = new Set()

  configure(
    provider: string,
    model: string,
    apiKey: string,
    baseURL?: string,
  ): void {
    this.provider = provider
    this.model = model
    this.apiKey = apiKey
    this.baseURL = baseURL ?? null
  }

  isConfigured(): boolean {
    return !!(this.provider && this.model && this.apiKey)
  }

  getProvider(): string | null {
    return this.provider
  }

  getModel(): string | null {
    return this.model
  }

  private get url(): string {
    if (!this.provider || !this.apiKey) return ''
    return getChatUrl(
      this.provider as ProviderId,
      this.baseURL ?? undefined,
    )
  }

  private get responsesUrl(): string {
    if (!this.provider || !this.apiKey) return ''
    return getResponsesUrl(
      this.provider as ProviderId,
      this.baseURL ?? undefined,
    )
  }

  private get useResponsesApi(): boolean {
    return usesResponsesApi(this.provider ?? '', this.model ?? '')
  }

  async streamChat(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerationOptions,
  ): Promise<TokenUsage | null> {
    if (!this.isConfigured()) {
      throw new Error('LLM not configured. Select a provider and model in settings.')
    }

    const url = this.url
    if (!url) {
      throw new Error('Invalid provider configuration')
    }

    const controller = new AbortController()
    this.activeControllers.add(controller)
    try {
      return await this.streamDirect(messages, onChunk, controller, options)
    } finally {
      this.activeControllers.delete(controller)
    }
  }

  /** Models that require max_completion_tokens instead of max_tokens (OpenAI o1, o3, o4) */
  private usesMaxCompletionTokens(): boolean {
    const m = (this.model ?? '').toLowerCase()
    return m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')
  }

  /** Apply generation options (temperature, max_tokens, top_p) to a request body */
  private applyOptions(body: Record<string, unknown>, options?: LLMGenerationOptions, responsesApi = false): void {
    if (options?.temperature != null) body.temperature = options.temperature
    if (options?.max_tokens != null) {
      if (responsesApi) {
        body.max_output_tokens = options.max_tokens
      } else if (this.usesMaxCompletionTokens()) {
        body.max_completion_tokens = options.max_tokens
      } else {
        body.max_tokens = options.max_tokens
      }
    }
    if (options?.top_p != null) body.top_p = options.top_p
    this.applyThinkingOptions(body, options?.thinkingLevel, responsesApi)
  }

  /** Apply thinking/reasoning level options based on provider */
  private applyThinkingOptions(body: Record<string, unknown>, level?: ThinkingLevel, responsesApi = false): void {
    if (!level || level === 'off') return
    const p = this.provider
    const m = (this.model ?? '').toLowerCase()

    // OpenAI o-series: reasoning_effort
    if (p === 'openai' && (m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4'))) {
      if (responsesApi) {
        body.reasoning = { effort: level }
      } else {
        body.reasoning_effort = level
      }
      return
    }

    // Google Gemini: thinkingConfig with budget
    if (p === 'google') {
      const budgetMap: Record<string, number> = { low: 1024, medium: 8192, high: 24576 }
      body.thinking = { thinking_budget: budgetMap[level] }
      return
    }

    // Qwen (Alibaba): enable_thinking + thinking_budget
    if (p === 'qwen') {
      const budgetMap: Record<string, number> = { low: 1024, medium: 4096, high: 16384 }
      body.enable_thinking = true
      body.thinking_budget = budgetMap[level]
      return
    }

    // OpenRouter: reasoning.effort
    if (p === 'openrouter') {
      body.reasoning = { effort: level }
      return
    }

    // Groq, TogetherAI, Fireworks, DeepInfra - Qwen3 models need enable_thinking
    if ((p === 'groq' || p === 'togetherai' || p === 'fireworks' || p === 'deepinfra' || p === 'cerebras') && m.includes('qwen')) {
      body.enable_thinking = true
      return
    }

    // DeepSeek, Perplexity, others: no-op (always reasons, no control)
  }

  /** Fetch with abort and network error handling */
  private async fetchApi(url: string, body: Record<string, unknown>, controller: AbortController, extraInit?: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        cache: 'no-store',
        ...extraInit,
        body: JSON.stringify(body),
      })
    } catch (err) {
      if (controller.signal.aborted) throw err
      throw new LLMNetworkError(err instanceof Error ? err.message : String(err))
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }))
      const errorMessage =
        typeof err.error === 'string'
          ? err.error
          : err.error?.message || err.message || JSON.stringify(err.error) || `API error: ${response.status}`
      throw new LLMApiError(errorMessage, response.status)
    }

    return response
  }

  /** Whether the current provider supports stream_options (OpenAI extension, not universal) */
  private supportsStreamOptions(): boolean {
    const p = this.provider
    // Google Gemini and Cohere compatibility endpoints may reject unknown fields
    return p !== 'google' && p !== 'cohere'
  }

  private async streamDirect(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
    controller: AbortController,
    options?: LLMGenerationOptions,
  ): Promise<TokenUsage | null> {
    const normalizedMessages = normalizeMessagesForStrictRoles(messages)
    const isResponsesApi = this.useResponsesApi && this.responsesUrl
    const requestUrl = isResponsesApi ? this.responsesUrl : this.url

    const body: Record<string, unknown> = isResponsesApi
      ? { model: this.model, input: normalizedMessages, stream: true }
      : { model: this.model, messages: normalizedMessages, stream: true }
    if (!isResponsesApi && this.supportsStreamOptions()) {
      body.stream_options = { include_usage: true }
    }
    this.applyOptions(body, options, !!isResponsesApi)

    const response = await this.fetchApi(requestUrl, body, controller)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    let usage: TokenUsage | null = null
    const isAborted = () => controller.signal.aborted
    if (isResponsesApi) {
      for await (const parsed of parseSSEStream(reader, isAborted)) {
        const err = parsed.error as { message?: string } | undefined
        if (err) throw new Error(err.message || 'API error')
        if (parsed.type === 'response.failed') {
          const resp = parsed.response as { error?: { message?: string } } | undefined
          throw new Error(resp?.error?.message || 'API error')
        }
        if (parsed.type === 'response.output_text.delta') {
          const delta = parsed.delta as string | undefined
          if (delta) await Promise.resolve(onChunk(delta))
        }
        if (parsed.type === 'response.completed') {
          const resp = parsed.response as { usage?: { input_tokens?: number; output_tokens?: number } } | undefined
          if (resp?.usage) {
            usage = { inputTokens: resp.usage.input_tokens ?? 0, outputTokens: resp.usage.output_tokens ?? 0 }
          }
        }
      }
    } else {
      for await (const parsed of parseSSEStream(reader, isAborted)) {
        const err = parsed.error as { message?: string } | undefined
        if (err) throw new Error(err.message || 'API error')
        const content = (parsed.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content
        if (content) {
          await Promise.resolve(onChunk(content))
        }
        const u = parsed.usage as { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } | undefined
        if (u) {
          usage = {
            inputTokens: u.prompt_tokens ?? u.input_tokens ?? 0,
            outputTokens: u.completion_tokens ?? u.output_tokens ?? 0,
          }
        }
      }
    }
    return usage
  }

  private async streamDirectWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    onChunk: (chunk: string) => void,
    controller: AbortController,
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult> {
    const body: Record<string, unknown> = {
      model: this.model, messages, tools, tool_choice: 'auto', stream: true,
    }
    if (this.supportsStreamOptions()) {
      body.stream_options = { include_usage: true }
    }
    this.applyOptions(body, options)

    const response = await this.fetchApi(this.url, body, controller)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    let fullContent = ''
    const toolCallsAccum: Record<number, StreamToolCallAccum> = {}
    let finishReason = 'stop'
    let usage: TokenUsage | null = null

    const isAborted = () => controller.signal.aborted
    for await (const parsed of parseSSEStream(reader, isAborted)) {
      const err = parsed.error as { message?: string } | undefined
      if (err) throw new Error(err.message || 'API error')
      const choice = parsed.choices as Array<{
        delta?: {
          content?: string
          tool_calls?: Array<{
            index?: number
            id?: string
            type?: string
            function?: { name?: string; arguments?: string }
          }>
        }
        finish_reason?: string
      }> | undefined
      const delta = choice?.[0]?.delta
      const reason = choice?.[0]?.finish_reason
      if (reason) finishReason = reason
      if (delta?.content) {
        fullContent += delta.content
        await Promise.resolve(onChunk(delta.content))
      }
      if (delta?.tool_calls?.length) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallsAccum[idx]) toolCallsAccum[idx] = {}
          const acc = toolCallsAccum[idx]
          if (tc.id) acc.id = tc.id
          if (tc.type) acc.type = tc.type
          if (tc.function) {
            acc.function ??= { name: '', arguments: '' }
            if (tc.function.name) acc.function.name = (acc.function.name ?? '') + tc.function.name
            if (tc.function.arguments) acc.function.arguments = (acc.function.arguments ?? '') + tc.function.arguments
          }
        }
      }
      const u = parsed.usage as { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } | undefined
      if (u) {
        usage = {
          inputTokens: u.prompt_tokens ?? u.input_tokens ?? 0,
          outputTokens: u.completion_tokens ?? u.output_tokens ?? 0,
        }
      }
    }

    const accumulatedToolCalls = Object.keys(toolCallsAccum)
      .map(Number)
      .sort((a, b) => a - b)
      .filter((idx) => toolCallsAccum[idx].function?.name)
      .map((idx) => {
        const acc = toolCallsAccum[idx]
        return {
          id: acc.id ?? `call_${idx}`,
          type: 'function' as const,
          function: {
            name: acc.function?.name ?? '',
            arguments: acc.function?.arguments ?? '{}',
          },
        }
      })
    const toolCalls = accumulatedToolCalls.length > 0 ? accumulatedToolCalls : null

    return {
      content: fullContent || null,
      toolCalls,
      finishReason,
      usage,
    }
  }

  async chatWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('LLM not configured. Select a provider and model in settings.')
    }

    const controller = new AbortController()
    this.activeControllers.add(controller)
    try {
      return await this.chatWithToolsDirect(messages, tools, controller, options)
    } finally {
      this.activeControllers.delete(controller)
    }
  }

  async streamChatWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('LLM not configured. Select a provider and model in settings.')
    }

    const controller = new AbortController()
    this.activeControllers.add(controller)
    try {
      return await this.streamDirectWithTools(messages, tools, onChunk, controller, options)
    } finally {
      this.activeControllers.delete(controller)
    }
  }

  private async chatWithToolsDirect(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    controller: AbortController,
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult> {
    const body: Record<string, unknown> = {
      model: this.model, messages, tools, tool_choice: 'auto',
    }
    this.applyOptions(body, options)

    const response = await this.fetchApi(this.url, body, controller)

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null
          tool_calls?: Array<{
            id: string
            type: string
            function: { name: string; arguments: string }
          }>
        }
        finish_reason?: string
      }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number }
    }

    const choice = data.choices?.[0]
    const msg = choice?.message
    const toolCalls = msg?.tool_calls?.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }))

    const u = data.usage
    const usage: TokenUsage | null = u
      ? { inputTokens: u.prompt_tokens ?? u.input_tokens ?? 0, outputTokens: u.completion_tokens ?? u.output_tokens ?? 0 }
      : null

    return {
      content: msg?.content ?? null,
      toolCalls: toolCalls ?? null,
      finishReason: choice?.finish_reason ?? 'stop',
      usage,
    }
  }

  /**
   * Temporarily override provider/model/apiKey for a scoped execution.
   * Saves current state, applies override, runs fn, then restores.
   */
  async withOverride<T>(provider: string, model: string, apiKey: string, fn: () => Promise<T>): Promise<T> {
    const prev = { provider: this.provider, model: this.model, apiKey: this.apiKey, baseURL: this.baseURL }
    this.configure(provider, model, apiKey)
    try {
      return await fn()
    } finally {
      this.provider = prev.provider
      this.model = prev.model
      this.apiKey = prev.apiKey
      this.baseURL = prev.baseURL
    }
  }

  abort(): void {
    for (const controller of this.activeControllers) {
      controller.abort()
    }
    this.activeControllers.clear()
  }
}

/** Check if an error is retryable via fallback model (network, 429, 500+) */
export function isRetryableForFallback(error: unknown): boolean {
  if (error instanceof LLMNetworkError) return true
  if (error instanceof LLMApiError) {
    if (error.status === 429 || error.status >= 500) return true
  }
  return false
}

export const llmService = new LLMService()
