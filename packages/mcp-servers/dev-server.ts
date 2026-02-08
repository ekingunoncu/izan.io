/**
 * Local development server for MCP servers.
 * Routes POST /api/:serverId/mcp to the corresponding Lambda handler.
 *
 * Usage: npx tsx packages/mcp-servers/dev-server.ts
 * Listens on http://localhost:3100/api/{serverId}/mcp
 */

import { config } from 'dotenv'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load root .env (NAMECHEAP_*, GOOGLE_*, BING_*, etc.) so MCP servers have API keys
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '..', '.env') })

import { createServer } from 'node:http'
import { isOriginAllowed } from './shared/src/types.js'

function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = isOriginAllowed(origin)
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-SerpApi-Key',
  }
  if (allowed && origin) base['Access-Control-Allow-Origin'] = origin
  return base
}
import { readdirSync, existsSync } from 'node:fs'

const MCP_SERVERS_ROOT = join(__dirname, '.')

function discoverMcpServers(): string[] {
  const entries = readdirSync(MCP_SERVERS_ROOT, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && e.name !== 'shared')
    .filter((e) =>
      existsSync(join(MCP_SERVERS_ROOT, e.name, 'src', 'index.ts')),
    )
    .map((e) => e.name)
}

const serverIds = discoverMcpServers()
const handlers: Map<string, (event: { body?: string; httpMethod?: string; headers?: Record<string, string>; isBase64Encoded?: boolean }) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }>> = new Map()

async function loadHandlers(): Promise<void> {
  for (const serverId of serverIds) {
    try {
      const mod = await import(
        `./${serverId}/src/index.ts`
      ) as { handler: (event: unknown) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }> }
      handlers.set(serverId, mod.handler)
    } catch (err) {
      console.error(`[dev-server] Failed to load ${serverId}:`, err)
    }
  }
}

const PORT = Number(process.env.PORT) || 3100

const server = createServer(async (req, res) => {
  const origin = req.headers.origin ?? null
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  // GET /api/github-stars → proxy for GitHub API (matches production Lambda)
  if (req.method === 'GET' && req.url?.startsWith('/api/github-stars')) {
    try {
      const ghRes = await fetch('https://api.github.com/repos/ekingunoncu/izan.io')
      const data = (await ghRes.json()) as { stargazers_count?: number }
      const stars = typeof data?.stargazers_count === 'number' ? data.stargazers_count : 0
      res.writeHead(200, {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      })
      res.end(JSON.stringify({ stars }))
    } catch {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ stars: 0 }))
    }
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...cors, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const match = req.url?.match(/^\/api\/([^/]+)\/mcp\/?$/)
  const serverId = match?.[1]

  if (!serverId || !handlers.has(serverId)) {
    res.writeHead(404, { ...cors, 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        error: `Unknown MCP server: ${serverId ?? 'null'}. Available: ${serverIds.join(', ')}`,
      }),
    )
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const body = Buffer.concat(chunks).toString('utf-8')

  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v
    else if (Array.isArray(v)) headers[k] = v[0] ?? ''
  }

  try {
    const handler = handlers.get(serverId)!
    const result = await handler({
      httpMethod: 'POST',
      headers,
      body,
      isBase64Encoded: false,
    })

    res.writeHead(result.statusCode, result.headers)
    res.end(result.body)
  } catch (err) {
    console.error(`[dev-server] Error (${serverId}):`, err)
    res.writeHead(500, { ...getCorsHeaders(origin), 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

loadHandlers().then(() => {
  server.listen(PORT, () => {
    console.log(
      `[izan-mcp-servers] Dev server at http://localhost:${PORT}/api/{${serverIds.join(',')}}/mcp`,
    )
  })
})
