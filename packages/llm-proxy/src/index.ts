/**
 * @izan/llm-proxy - AWS Lambda entry point
 *
 * Stateless CORS proxy for LLM API calls.
 * Receives { provider, model, apiKey, messages, tools?, stream? }
 * and forwards to the correct LLM provider via Vercel AI SDK.
 *
 * Uses Lambda Function URL with RESPONSE_STREAM for real streaming.
 * awslambda is provided by the Lambda Node.js runtime (no import).
 */

import { handleChat, handleStreamChat } from './handler'
import type { ChatRequest } from './types'

// Re-export types for consumers
export type {
  ProviderId,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ToolCall,
  ToolDefinition,
  StreamEvent,
} from './types'

/** CORS headers applied to all responses */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/** Lambda runtime provides awslambda globally for response streaming */
declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: LambdaEvent,
      responseStream: NodeJS.WritableStream,
      context: unknown,
    ) => Promise<void>,
  ) => (event: LambdaEvent, context: unknown, callback: unknown) => void
  HttpResponseStream: {
    from(
      stream: NodeJS.WritableStream,
      metadata: { statusCode: number; headers: Record<string, string> },
    ): NodeJS.WritableStream
  }
}

type LambdaEvent = {
  requestContext?: { http?: { method?: string } }
  httpMethod?: string
  body?: string | null
  isBase64Encoded?: boolean
}

function parseBody(event: LambdaEvent): string | null {
  const raw = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body
  return raw ?? null
}

function getMethod(event: LambdaEvent): string {
  return event.requestContext?.http?.method ?? event.httpMethod ?? 'POST'
}

/**
 * Streaming handler - writes to responseStream as events arrive.
 * Used when Lambda is invoked via Function URL with RESPONSE_STREAM.
 */
const streamingHandler = async (
  event: LambdaEvent,
  responseStream: NodeJS.WritableStream,
  _context: unknown,
): Promise<void> => {
  const method = getMethod(event)

  if (method === 'OPTIONS') {
    const wrapped = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 204,
      headers: CORS_HEADERS,
    })
    wrapped.end()
    return
  }

  if (method !== 'POST') {
    const wrapped = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
    wrapped.write(JSON.stringify({ error: 'Method not allowed' }))
    wrapped.end()
    return
  }

  const rawBody = parseBody(event)
  if (!rawBody) {
    const wrapped = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
    wrapped.write(JSON.stringify({ error: 'Request body is required' }))
    wrapped.end()
    return
  }

  let body: ChatRequest
  try {
    body = JSON.parse(rawBody) as ChatRequest
  } catch {
    const wrapped = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
    wrapped.write(JSON.stringify({ error: 'Invalid JSON body' }))
    wrapped.end()
    return
  }

  if (!body.provider || !body.model || !body.apiKey || !body.messages?.length) {
    const wrapped = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
    wrapped.write(
      JSON.stringify({
        error: 'Missing required fields: provider, model, apiKey, messages',
      }),
    )
    wrapped.end()
    return
  }

  try {
    if (body.stream) {
      const wrapped = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/x-ndjson',
        },
      })
      for await (const ev of handleStreamChat(body)) {
        wrapped.write(JSON.stringify(ev) + '\n')
      }
      wrapped.end()
    } else {
      const result = await handleChat(body)
      const wrapped = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
      wrapped.write(JSON.stringify(result))
      wrapped.end()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[llm-proxy] Error:', message)
    const wrapped = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
    wrapped.write(JSON.stringify({ error: message }))
    wrapped.end()
  }
}

/**
 * Handler for Lambda Function URL with invokeMode: RESPONSE_STREAM.
 * Streams NDJSON events to the client as they arrive from the LLM.
 */
export const handler = awslambda.streamifyResponse(streamingHandler)
