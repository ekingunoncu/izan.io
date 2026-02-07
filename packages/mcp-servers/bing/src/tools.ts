/**
 * @izan/mcp-servers-bing - Bing Web Search tool
 *
 * Requires BING_SEARCH_API_KEY environment variable.
 * Get keys from Azure Portal: Bing Search v7 resource.
 */

import { z } from 'zod'
import type { ToolDef } from '@izan/mcp-servers-shared'

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().min(1).max(50).optional().default(10).describe('Maximum number of results'),
})

interface BingWebSearchResponse {
  webPages?: {
    value?: Array<{
      name?: string
      url?: string
      snippet?: string
    }>
  }
  error?: { code: string; message: string }
}

async function searchBing(query: string, count: number): Promise<string> {
  const apiKey = process.env.BING_SEARCH_API_KEY
  if (!apiKey) {
    return 'Bing Search API key not configured. Set BING_SEARCH_API_KEY environment variable.'
  }

  const params = new URLSearchParams({
    q: query,
    count: String(count),
    mkt: 'en-US',
  })

  const res = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?${params}`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    },
  )

  if (!res.ok) {
    const errText = await res.text()
    return `Bing Search API error (${res.status}): ${errText}`
  }

  const data = (await res.json()) as BingWebSearchResponse

  if (data.error) {
    return `Bing Search error: ${data.error.message}`
  }

  const results = data.webPages?.value ?? []
  if (results.length === 0) {
    return `No results found for: ${query}`
  }

  const lines = results.map((r, i) => {
    const title = r.name ?? 'Untitled'
    const url = r.url ?? ''
    const snippet = r.snippet ?? ''
    return `${i + 1}. ${title}\n   ${url}\n   ${snippet}`
  })

  return `Search results for "${query}":\n\n${lines.join('\n\n')}`
}

const search: ToolDef = {
  name: 'search',
  description: 'Search the web using Bing. Returns titles, URLs, and snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Maximum number of results (1-50)', default: 10 },
    },
    required: ['query'],
  },
  handler: async (args) => {
    const { query, count } = searchSchema.parse(args)
    return searchBing(query, count)
  },
}

export const TOOLS: ToolDef[] = [search]
