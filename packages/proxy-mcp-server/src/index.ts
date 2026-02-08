/**
 * @izan/proxy-mcp-server - MCP Proxy Lambda
 *
 * Proxies MCP JSON-RPC requests to external MCP servers. Target (url, headers)
 * comes from client via X-MCP-Proxy-Target header (base64 JSON).
 * Avoids CORS when user adds remote MCPs (RapidAPI, etc).
 *
 * Route: POST /api/proxy/mcp
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

const CORS_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://izan.io',
  'https://www.izan.io',
])

function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = origin && CORS_ORIGINS.has(origin)
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id, X-MCP-Proxy-Target',
  }
  if (allowed && origin) base['Access-Control-Allow-Origin'] = origin
  return base
}

interface ProxyTarget {
  url: string
  headers?: Record<string, string>
}

function parseTargetHeader(raw: string | undefined): ProxyTarget | null {
  if (!raw || !raw.trim()) return null
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded) as ProxyTarget
    if (!parsed.url || typeof parsed.url !== 'string') return null
    if (!parsed.url.startsWith('http://') && !parsed.url.startsWith('https://')) return null
    return {
      url: parsed.url,
      headers: parsed.headers && typeof parsed.headers === 'object' ? parsed.headers : {},
    }
  } catch {
    return null
  }
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string>,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? null
  const cors = getCorsHeaders(origin)

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' }
  }

  if (event.requestContext?.http?.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, cors)
  }

  const h = event.headers ?? {}
  const targetRaw = h['x-mcp-proxy-target'] ?? h['X-MCP-Proxy-Target']
  const target = parseTargetHeader(targetRaw)
  if (!target) {
    return jsonResponse(400, { error: 'Missing or invalid X-MCP-Proxy-Target header' }, cors)
  }

  const rawBody = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body

  if (!rawBody) {
    return jsonResponse(400, { error: 'Request body is required' }, cors)
  }

  const passHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...target.headers,
  }
  const forwardKeys = ['mcp-protocol-version', 'mcp-session-id', 'authorization']
  for (const [k, v] of Object.entries(h)) {
    if (v && forwardKeys.includes(k.toLowerCase())) passHeaders[k] = v
  }

  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: passHeaders,
      body: rawBody,
    })

    const resBody = await res.text()
    const resHeaders: Record<string, string> = { ...cors }

    if (res.headers.get('content-type')) {
      resHeaders['Content-Type'] = res.headers.get('content-type')!
    }
    const mcpSessionId = res.headers.get('mcp-session-id')
    if (mcpSessionId) resHeaders['Mcp-Session-Id'] = mcpSessionId

    return {
      statusCode: res.status,
      headers: resHeaders,
      body: resBody,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[proxy-mcp] Error:', message)
    return jsonResponse(502, {
      jsonrpc: '2.0',
      error: { code: -32603, message: `Proxy error: ${message}` },
    }, cors)
  }
}
