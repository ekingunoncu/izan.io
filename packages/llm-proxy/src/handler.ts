/**
 * @izan/llm-proxy - Lambda handler
 *
 * Stateless CORS proxy that routes LLM requests to the correct provider
 * using Vercel AI SDK. Supports both streaming (SSE) and non-streaming.
 */

import { generateText, streamText, tool, jsonSchema } from 'ai'
import type { ModelMessage } from 'ai'
import { createLanguageModel } from './providers'
import type { ChatRequest, ChatResponse, ToolCall, StreamEvent } from './types'

/** Convert our ChatMessage format to AI SDK ModelMessage format */
function toModelMessages(messages: ChatRequest['messages']): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role === 'tool') {
      return {
        role: 'tool' as const,
        content: [
          {
            type: 'tool-result' as const,
            toolCallId: msg.tool_call_id ?? '',
            toolName: '',
            output: { type: 'text' as const, value: msg.content },
          },
        ],
      }
    }

    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      return {
        role: 'assistant' as const,
        content: [
          ...(msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
          ...msg.tool_calls.map((tc) => ({
            type: 'tool-call' as const,
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: JSON.parse(tc.function.arguments) as unknown,
          })),
        ],
      }
    }

    return {
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }
  })
}

/** Convert our ToolDefinition format to AI SDK tool format */
function toTools(
  tools?: ChatRequest['tools'],
): Record<string, ReturnType<typeof tool>> | undefined {
  if (!tools?.length) return undefined

  const result: Record<string, ReturnType<typeof tool>> = {}
  for (const t of tools) {
    result[t.function.name] = tool({
      description: t.function.description,
      inputSchema: jsonSchema((t.function.parameters as object) || { properties: {}, additionalProperties: false }),
    })
  }
  return result
}

/** Extract tool calls from AI SDK result (uses input not args) */
function extractToolCalls(
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }> | undefined,
): ToolCall[] | null {
  if (!toolCalls?.length) return null
  return toolCalls.map((tc) => ({
    id: tc.toolCallId,
    type: 'function' as const,
    function: {
      name: tc.toolName,
      arguments: JSON.stringify(tc.input),
    },
  }))
}

/**
 * Handle a non-streaming chat request.
 */
export async function handleChat(body: ChatRequest): Promise<ChatResponse> {
  const model = createLanguageModel(body.provider, {
    apiKey: body.apiKey,
    model: body.model,
    baseURL: body.baseURL,
  })

  const result = await generateText({
    model,
    messages: toModelMessages(body.messages),
    tools: toTools(body.tools),
    temperature: body.temperature ?? 0.7,
    maxOutputTokens: body.maxTokens ?? 4096,
  })

  const usage = result.usage
  return {
    content: result.text || null,
    toolCalls: extractToolCalls(
      result.toolCalls?.map((tc) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        input: 'input' in tc ? tc.input : {},
      })),
    ),
    finishReason: result.finishReason ?? 'stop',
    usage: usage
      ? {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        }
      : undefined,
  }
}

/**
 * Handle a streaming chat request. Returns an async iterable of SSE events.
 */
export async function* handleStreamChat(
  body: ChatRequest,
): AsyncGenerator<StreamEvent> {
  const model = createLanguageModel(body.provider, {
    apiKey: body.apiKey,
    model: body.model,
    baseURL: body.baseURL,
  })

  const result = streamText({
    model,
    messages: toModelMessages(body.messages),
    tools: toTools(body.tools),
    temperature: body.temperature ?? 0.7,
    maxOutputTokens: body.maxTokens ?? 4096,
  })

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'text-delta':
        yield { type: 'text-delta', textDelta: part.text }
        break

      case 'tool-call':
        yield {
          type: 'tool-call',
          toolCall: {
            id: part.toolCallId,
            type: 'function',
            function: {
              name: part.toolName,
              arguments: JSON.stringify('input' in part ? part.input : {}),
            },
          },
        }
        break

      case 'finish':
        yield { type: 'finish', finishReason: part.finishReason }
        break

      case 'finish-step':
        yield { type: 'finish', finishReason: part.finishReason }
        break

      case 'error':
        yield { type: 'error', error: String(part.error) }
        break
    }
  }
}
