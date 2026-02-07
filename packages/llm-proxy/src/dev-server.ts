/**
 * Local development server for the LLM proxy Lambda.
 * Uses handleChat/handleStreamChat directly (Lambda handler uses streamifyResponse).
 *
 * Usage: npx tsx src/dev-server.ts
 * Listens on http://localhost:3200/chat
 */

import { createServer } from 'node:http'
import { handleChat, handleStreamChat } from './handler.js'
import type { ChatRequest } from './types.js'

const PORT = Number(process.env.PORT) || 3200

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const rawBody = Buffer.concat(chunks).toString('utf-8')

  if (!rawBody) {
    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Request body is required' }))
    return
  }

  let body: ChatRequest
  try {
    body = JSON.parse(rawBody) as ChatRequest
  } catch {
    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  if (!body.provider || !body.model || !body.apiKey || !body.messages?.length) {
    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        error: 'Missing required fields: provider, model, apiKey, messages',
      }),
    )
    return
  }

  try {
    if (body.stream) {
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': 'application/x-ndjson',
      })
      for await (const ev of handleStreamChat(body)) {
        res.write(JSON.stringify(ev) + '\n')
      }
      res.end()
    } else {
      const result = await handleChat(body)
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[dev-server] Error:', message)
    res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  }
})

server.listen(PORT, () => {
  console.log(`[izan-llm-proxy] Dev server running at http://localhost:${PORT}/chat`)
})
