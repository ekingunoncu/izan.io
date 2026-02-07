/**
 * @izan/mcp-servers-google - Google Custom Search tool
 *
 * Requires GOOGLE_CSE_ID and GOOGLE_API_KEY environment variables.
 * Create a Programmable Search Engine at https://programmablesearchengine.google.com/
 */

import { z } from 'zod'
import type { ToolDef } from '@izan/mcp-servers-shared'

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().min(1).max(10).optional().default(5).describe('Maximum number of results (1-10)'),
})

interface GoogleSearchItem {
  title?: string
  link?: string
  snippet?: string
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[]
  error?: { code: number; message: string }
}

async function searchGoogle(query: string, count: number): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cseId = process.env.GOOGLE_CSE_ID

  if (!apiKey || !cseId) {
    return 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.'
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query,
    num: String(Math.min(count, 10)),
  })

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params}`,
  )

  if (!res.ok) {
    const errText = await res.text()
    return `Google Search API error (${res.status}): ${errText}`
  }

  const data = (await res.json()) as GoogleSearchResponse

  if (data.error) {
    return `Google Search error: ${data.error.message}`
  }

  const results = data.items ?? []
  if (results.length === 0) {
    return `No results found for: ${query}`
  }

  const lines = results.map((r, i) => {
    const title = r.title ?? 'Untitled'
    const url = r.link ?? ''
    const snippet = r.snippet ?? ''
    return `${i + 1}. ${title}\n   ${url}\n   ${snippet}`
  })

  return `Search results for "${query}":\n\n${lines.join('\n\n')}`
}

const search: ToolDef = {
  name: 'search',
  description: 'Search the web using Google. Returns titles, URLs, and snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Maximum number of results (1-10)', default: 5 },
    },
    required: ['query'],
  },
  handler: async (args) => {
    const { query, count } = searchSchema.parse(args)
    return searchGoogle(query, count)
  },
}

export const TOOLS: ToolDef[] = [search]
