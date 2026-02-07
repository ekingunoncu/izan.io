import type {
  ILLMService,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionResult,
  ChatCompletionMessageToolCall,
} from './interfaces'

/** Partial tool call from stream delta (accumulated across chunks) */
interface StreamToolCallAccum {
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}
import type { ProviderId } from '@izan/llm-proxy'
import { getChatUrl } from '../llm-providers'

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

  async streamChat(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('LLM yapılandırılmadı. Ayarlardan bir provider ve model seçin.')
    }

    this.abortController?.abort()
    this.abortController = new AbortController()

    const url = this.url
    if (!url) {
      throw new Error('Geçersiz provider yapılandırması')
    }

    await this.streamDirect(messages, onChunk)
  }

  private async streamDirect(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: this.abortController!.signal,
      cache: 'no-store',
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(err.error || `API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const isAborted = () => this.abortController?.signal.aborted ?? false
    for await (const parsed of parseSSEStream(reader, isAborted)) {
      const err = parsed.error as { message?: string } | undefined
      if (err) throw new Error(err.message || 'API error')
      const content = (parsed.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content
      if (content) onChunk(content)
    }
  }

  private async streamDirectWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    onChunk: (chunk: string) => void,
  ): Promise<ChatCompletionResult> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: this.abortController!.signal,
      cache: 'no-store',
      body: JSON.stringify({
        model: this.model,
        messages,
        tools,
        tool_choice: 'auto',
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(err.error || `API error: ${response.status}`)
    }

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
        onChunk(delta.content)
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
  ): Promise<ChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('LLM yapılandırılmadı. Ayarlardan bir provider ve model seçin.')
    }

    this.abortController?.abort()
    this.abortController = new AbortController()

    return this.chatWithToolsDirect(messages, tools)
  }

  async streamChatWithTools(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    onChunk: (chunk: string) => void,
  ): Promise<ChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('LLM yapılandırılmadı. Ayarlardan bir provider ve model seçin.')
    }

    this.abortController?.abort()
    this.abortController = new AbortController()

    return this.streamDirectWithTools(messages, tools, onChunk)
  }

  private async chatWithToolsDirect(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
  ): Promise<ChatCompletionResult> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: this.abortController!.signal,
      body: JSON.stringify({
        model: this.model,
        messages,
        tools,
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(err.error || `API error: ${response.status}`)
    }

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
