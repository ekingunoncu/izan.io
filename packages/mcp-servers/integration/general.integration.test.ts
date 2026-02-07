/**
 * Integration tests for @izan/mcp-servers-general
 */

import { describe, it, expect } from 'vitest'
import { handler } from '@izan/mcp-servers-general'

function makeEvent(body: Record<string, unknown>): { body: string; httpMethod: string } {
  return {
    body: JSON.stringify(body),
    httpMethod: 'POST',
  }
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body) as { result?: unknown; error?: { message: string } }
}

describe('General MCP integration', () => {
  it('initialize returns protocol version and server info', async () => {
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
      serverInfo: { name: 'izan-mcp-general', version: '0.1.0' },
    })
  })

  it('tools/list returns all tools', async () => {
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
    const names = tools.map((t) => t.name)
    expect(names).toContain('get_time')
    expect(names).toContain('random_number')
    expect(names).toContain('uuid')
    expect(names).toContain('calculate')
    expect(names).toContain('generate_password')
  })

  it('tools/call get_time returns formatted time', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_time', arguments: {} },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { type: string; text: string }[] }).content ?? []
    expect(content[0].type).toBe('text')
    expect(content[0].text).toMatch(/\d{4}|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/)
  })

  it('tools/call random_number returns number in range', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'random_number', arguments: { min: 1, max: 10 } },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    const n = parseInt(content[0].text, 10)
    expect(n).toBeGreaterThanOrEqual(1)
    expect(n).toBeLessThanOrEqual(10)
  })

  it('tools/call uuid returns valid UUID', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'uuid', arguments: {} },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('tools/call calculate evaluates expression', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'calculate', arguments: { expression: '2 + 3 * 4' } },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toBe('14')
  })

  it('tools/call generate_password returns password of correct length', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'generate_password', arguments: { length: 12 } },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toHaveLength(12)
  })

  it('tools/call with unknown tool returns error', async () => {
    const res = await handler(
      makeEvent({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'unknown_tool', arguments: {} },
      }) as Parameters<typeof handler>[0],
    )
    expect(res.statusCode).toBe(200)
    const { error } = parseBody(res)
    expect(error?.message).toContain('Tool not found')
  })
})
