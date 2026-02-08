/**
 * @izan/mcp-servers-web-fetch - Basic HTTP fetch tool
 *
 * Fetches content from any public URL. Supports GET and POST.
 * Used by web search agent to retrieve pages, APIs, articles.
 */

import { z } from 'zod'
import type { ToolDef } from '@izan/mcp-servers-shared'

const fetchSchema = z.object({
  url: z.string().url().describe('Full URL to fetch (e.g. https://example.com/page)'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'HEAD']).optional().default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('Optional request headers as key-value object'),
  body: z.string().optional().describe('Request body for POST/PUT/PATCH'),
})

const MAX_BODY_LENGTH = 500_000 // ~500KB
const TIMEOUT_MS = 15_000 // 15s

function isBlockedHost(host: string): boolean {
  const lower = host.toLowerCase()
  if (lower === 'localhost' || lower === '127.0.0.1') return true
  if (lower.startsWith('192.168.') || lower.startsWith('10.')) return true
  // 172.16.0.0/12 (172.16–172.31)
  if (lower.startsWith('172.')) {
    const parts = lower.split('.')
    const b = parseInt(parts[1] ?? '0', 10)
    if (b >= 16 && b <= 31) return true
  }
  if (lower.endsWith('.local')) return true
  return false
}

async function fetchUrl(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: string,
): Promise<string> {
  const u = new URL(url)
  if (isBlockedHost(u.hostname)) {
    return `Error: Cannot fetch from private/localhost URL (${u.hostname})`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const reqHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; Izan-WebFetch/1.0)',
    Accept: 'text/html,application/json,application/xml,text/plain,*/*',
    ...headers,
  }

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: method !== 'GET' && method !== 'HEAD' && body ? body : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const contentType = res.headers.get('content-type') ?? ''
    const text = await res.text()

    if (text.length > MAX_BODY_LENGTH) {
      return `[Truncated - response too large]\n\nStatus: ${res.status} ${res.statusText}\nContent-Type: ${contentType}\n\n${text.slice(0, MAX_BODY_LENGTH)}\n\n... (${(text.length / 1000).toFixed(1)}KB total, showing first ${MAX_BODY_LENGTH / 1000}KB)`
    }

    return `Status: ${res.status} ${res.statusText}\nContent-Type: ${contentType}\n\n${text}`
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort')) return `Error: Request timed out after ${TIMEOUT_MS / 1000}s`
    return `Error: ${msg}`
  }
}

const fetchTool: ToolDef = {
  name: 'fetch_url',
  description: 'Fetch the full content of a URL. Call this after search when you find relevant links – e.g. news articles, blog posts – to get the actual page content instead of snippets. Use for: reading articles, checking API responses, verifying facts. Supports GET, POST. Private/localhost blocked.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Full URL to fetch (e.g. https://example.com/page)' },
      method: { type: 'string', description: 'HTTP method (GET, POST, PUT, PATCH, HEAD)', enum: ['GET', 'POST', 'PUT', 'PATCH', 'HEAD'], default: 'GET' },
      headers: { type: 'object', description: 'Optional request headers' },
      body: { type: 'string', description: 'Request body for POST/PUT/PATCH' },
    },
    required: ['url'],
  },
  handler: async (args: Record<string, unknown>) => {
    const { url, method, headers, body } = fetchSchema.parse(args)
    return fetchUrl(url, method, headers, body)
  },
}

export const TOOLS: ToolDef[] = [fetchTool]
