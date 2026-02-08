/**
 * @izan/mcp-servers-serp-search - SerpApi search tool
 *
 * Requires X-SerpApi-Key header from client (user's own API key).
 * Supports all SerpApi engines: google, bing, duckduckgo, yahoo, amazon, etc.
 */

import { z } from 'zod'
import type { ToolDef } from '@izan/mcp-servers-shared'

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  engine: z.string().optional().default('google').describe('Search engine: google, bing, duckduckgo, yahoo, amazon, google_images, google_news, etc.'),
  count: z.number().min(1).max(20).optional().default(5).describe('Maximum number of results (1-20)'),
  location: z.string().optional().describe('Location for localized results (e.g. Austin, Texas, United States)'),
})

const NO_KEY_MESSAGE = `Serp API key not configured. To use web search:

1. Get a free API key at https://serpapi.com/dashboard
2. Go to Settings > External API Keys
3. Add your Serp API key

Or edit this agent and add the key in the API Keys section. Changing the key here updates it globally for all agents that use it.`

function getApiKey(context?: { headers?: Record<string, string> }): string | null {
  const headers = context?.headers ?? {}
  const key = headers['x-serp-api-key'] ?? headers['X-SerpApi-Key'] ?? headers['x-serpapi-key']
  return key?.trim() || null
}

interface SerpApiOrganicResult {
  title?: string
  link?: string
  snippet?: string
  position?: number
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[]
  error?: string
  search_metadata?: { status?: string }
}

/** SerpAPI: engine-specific query parameter names (see serpapi.com docs) */
const QUERY_PARAM: Record<string, string> = {
  yahoo: 'p',
  amazon: 'k',
  yandex: 'text',
  naver: 'query',
}
const DEFAULT_QUERY_PARAM = 'q'

async function searchSerp(
  apiKey: string,
  query: string,
  engine: string,
  count: number,
  location?: string,
): Promise<string> {
  const queryKey = QUERY_PARAM[engine] ?? DEFAULT_QUERY_PARAM
  const params = new URLSearchParams({
    api_key: apiKey,
    engine,
    [queryKey]: query,
    num: String(Math.min(count, 20)),
  })
  if (location) params.set('location', location)

  const res = await fetch(`https://serpapi.com/search?${params}`)

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 401 || errText.includes('Invalid API key') || errText.includes('API key')) {
      return `Serp API key is invalid or expired. Please check your key at Settings > External API Keys. Get a new key at https://serpapi.com/dashboard`
    }
    return `Serp API error (${res.status}): ${errText}`
  }

  const data = (await res.json()) as SerpApiResponse

  if (data.error) {
    if (data.error.toLowerCase().includes('invalid') || data.error.toLowerCase().includes('api key')) {
      return `Serp API key error: ${data.error}. Please update your key at Settings > External API Keys. Get a new key at https://serpapi.com/dashboard`
    }
    return `Serp API error: ${data.error}`
  }

  const results = data.organic_results ?? []
  if (results.length === 0) {
    return `No results found for: ${query}`
  }

  const lines = results.slice(0, count).map((r, i) => {
    const title = r.title ?? 'Untitled'
    const url = r.link ?? ''
    const snippet = r.snippet ?? ''
    return `${i + 1}. ${title}\n   ${url}\n   ${snippet}`
  })

  return `Search results for "${query}" (${engine}):\n\n${lines.join('\n\n')}`
}

const search: ToolDef = {
  name: 'search',
  description: 'Search the web using SerpApi. Supports engines: google, bing, duckduckgo, yahoo, amazon, google_images, google_news, google_shopping, etc. Returns titles, URLs, and snippets. Requires Serp API key (set in Settings > External API Keys).',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      engine: { type: 'string', description: 'Search engine (google, bing, duckduckgo, yahoo, etc.)', default: 'google' },
      count: { type: 'number', description: 'Maximum number of results (1-20)', default: 5 },
      location: { type: 'string', description: 'Location for localized results' },
    },
    required: ['query'],
  },
  handler: async (args: Record<string, unknown>, context?: { headers?: Record<string, string> }) => {
    const { query, engine, count, location } = searchSchema.parse(args)
    const apiKey = getApiKey(context)

    if (!apiKey) {
      return NO_KEY_MESSAGE
    }

    return searchSerp(apiKey, query, engine, count, location)
  },
}

export const TOOLS: ToolDef[] = [search]
