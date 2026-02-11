import type {
  ILLMService,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionResult,
  ChatCompletionMessageToolCall,
  LLMGenerationOptions,
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

/**
 * Normalize messages for APIs that only accept [user, assistant] roles.
 * Merges system message content into the first user message.
 */
function normalizeMessagesForStrictRoles(
  messages: ChatCompletionMessageParam[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const systemParts: string[] = []
  const chatOnly: Array<{ role: 'user' | 'assistant'; content: string }> = []

  for (const msg of messages) {
    const role = msg.role as string
    const content = typeof msg.content === 'string' ? msg.content : ''
    if (role === 'system') {
      if (content) systemParts.push(content)
    } else if (role === 'user' || role === 'assistant') {
      chatOnly.push({ role, content })
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
  private abortController: AbortController | null = null

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
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('LLM not configured. Select a provider and model in settings.')
    }

    this.abortController?.abort()
    this.abortController = new AbortController()

    const url = this.url
    if (!url) {
      throw new Error('Invalid provider configuration')
    }

    await this.streamDirect(messages, onChunk, options)
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
  }

  /** Fetch with abort and network error handling */
  private async fetchApi(url: string, body: Record<string, unknown>, extraInit?: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: this.abortController!.signal,
        cache: 'no-store',
        ...extraInit,
        body: JSON.stringify(body),
      })
    } catch (err) {
      if (this.abortController?.signal.aborted) throw err
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

  private async streamDirect(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerationOptions,
  ): Promise<void> {
    const normalizedMessages = normalizeMessagesForStrictRoles(messages)
    const isResponsesApi = this.useResponsesApi && this.responsesUrl
    const requestUrl = isResponsesApi ? this.responsesUrl : this.url

    const body: Record<string, unknown> = isResponsesApi
      ? { model: this.model, input: normalizedMessages, stream: true }
      : { model: this.model, messages: normalizedMessages, stream: true }
    this.applyOptions(body, options, !!isResponsesApi)

    const response = await this.fetchApi(requestUrl, body)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const isAborted = () => this.abortController?.signal.aborted ?? false
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
      }
    } else {
      for await (const parsed of parseSSEStream(reader, isAborted)) {
        const err = parsed.error as { message?: string } | undefined
        if (err) throw new Error(err.message || 'API error')
        const content = (parsed.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content
        if (content) {
          await Promise.resolve(onChunk(content))
        }
      }
    }
  }

  private async streamDirectWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult> {
    const body: Record<string, unknown> = {
      model: this.model, messages, tools, tool_choice: 'auto', stream: true,
    }
    this.applyOptions(body, options)

    const response = await this.fetchApi(this.url, body)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    let fullContent = ''
    const toolCallsAccum: Record<number, StreamToolCallAccum> = {}
    let finishReason = 'stop'

    const isAborted = () => this.abortController?.signal.aborted ?? false
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
    }

    const toolCalls: ChatCompletionMessageToolCall[] | null =
      finishReason === 'tool_calls' && Object.keys(toolCallsAccum).length > 0
        ? Object.keys(toolCallsAccum)
            .map(Number)
            .sort((a, b) => a - b)
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
        : null

    return {
      content: fullContent || null,
      toolCalls,
      finishReason,
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

    this.abortController?.abort()
    this.abortController = new AbortController()

    return this.chatWithToolsDirect(messages, tools, options)
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

    this.abortController?.abort()
    this.abortController = new AbortController()

    return this.streamDirectWithTools(messages, tools, onChunk, options)
  }

  private async chatWithToolsDirect(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    options?: LLMGenerationOptions,
  ): Promise<ChatCompletionResult> {
    const body: Record<string, unknown> = {
      model: this.model, messages, tools, tool_choice: 'auto',
    }
    this.applyOptions(body, options)

    const response = await this.fetchApi(this.url, body)

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
    }

    const choice = data.choices?.[0]
    const msg = choice?.message
    const toolCalls = msg?.tool_calls?.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }))

    return {
      content: msg?.content ?? null,
      toolCalls: toolCalls ?? null,
      finishReason: choice?.finish_reason ?? 'stop',
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

export const llmService = new LLMService()
