/**
 * Integration tests for @izan/mcp-servers-google
 * Without GOOGLE_API_KEY/GOOGLE_CSE_ID, returns "not configured" message.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { handler } from '@izan/mcp-servers-google'

function makeEvent(body: Record<string, unknown>): { body: string; httpMethod: string } {
  return {
    body: JSON.stringify(body),
    httpMethod: 'POST',
  }
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body) as { result?: { content?: { text: string }[] }; error?: unknown }
}

describe('Google MCP integration', () => {
  const originalKey = process.env.GOOGLE_API_KEY
  const originalCse = process.env.GOOGLE_CSE_ID

  beforeEach(() => {
    delete process.env.GOOGLE_API_KEY
    delete process.env.GOOGLE_CSE_ID
  })

  afterEach(() => {
    if (originalKey !== undefined) process.env.GOOGLE_API_KEY = originalKey
    if (originalCse !== undefined) process.env.GOOGLE_CSE_ID = originalCse
  })

  it('initialize returns server info', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    expect(result).toMatchObject({
      protocolVersion: '2025-03-26',
      serverInfo: { name: 'izan-mcp-google', version: '0.1.0' },
    })
  })

  it('tools/list returns search tool', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const tools = (result as { tools?: { name: string }[] }).tools ?? []
    expect(tools.map((t) => t.name)).toContain('search')
  })

  it('tools/call search without API keys returns configuration message', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'search', arguments: { query: 'test' } },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toMatch(/GOOGLE|not configured/i)
  })
})
