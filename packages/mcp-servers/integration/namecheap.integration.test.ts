/**
 * Integration tests for @izan/mcp-servers-namecheap
 * Without NAMECHEAP_* env vars (or whitelisted IP), returns "not configured" / error.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { handler } from '@izan/mcp-servers-namecheap'

function makeEvent(body: Record<string, unknown>): { body: string; httpMethod: string } {
  return {
    body: JSON.stringify(body),
    httpMethod: 'POST',
  }
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body) as { result?: { content?: { text: string }[] }; error?: unknown }
}

function callTool(name: string, args: Record<string, unknown>) {
  return handler(
    makeEvent({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }) as Parameters<typeof handler>[0],
  )
}

describe('Namecheap MCP integration', () => {
  const originalUser = process.env.NAMECHEAP_API_USER
  const originalKey = process.env.NAMECHEAP_API_KEY
  const originalIp = process.env.NAMECHEAP_CLIENT_IP

  beforeEach(() => {
    delete process.env.NAMECHEAP_API_USER
    delete process.env.NAMECHEAP_API_KEY
    delete process.env.NAMECHEAP_CLIENT_IP
  })

  afterEach(() => {
    if (originalUser !== undefined) process.env.NAMECHEAP_API_USER = originalUser
    if (originalKey !== undefined) process.env.NAMECHEAP_API_KEY = originalKey
    if (originalIp !== undefined) process.env.NAMECHEAP_CLIENT_IP = originalIp
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
      serverInfo: { name: 'izan-mcp-namecheap', version: '0.1.0' },
    })
  })

  it('tools/list returns all 6 tools', async () => {
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
    const expected = ['get_domain_price', 'suggest_domains', 'get_domains_price', 'list_tlds', 'get_domain_info', 'whois_lookup']
    for (const n of expected) {
      expect(names).toContain(n)
    }
    expect(tools).toHaveLength(6)
  })

  it.skipIf(
    !!(
      process.env.NAMECHEAP_API_USER &&
      process.env.NAMECHEAP_API_KEY &&
      process.env.NAMECHEAP_CLIENT_IP
    ),
  )('tools/call get_domain_price without API returns error message', async () => {
    const res = await callTool('get_domain_price', { domain: 'example.com' })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toMatch(/NAMECHEAP|not configured|whitelisted/i)
  })

  it('tools/call get_domain_price with invalid domain format returns validation', async () => {
    const res = await callTool('get_domain_price', { domain: 'invalid' })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toMatch(/TLD|Invalid|include/i)
  })

  it('tools/call get_domains_price with invalid input returns validation', async () => {
    const res = await callTool('get_domains_price', { domains: 'no-dots-here' })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toMatch(/Invalid|comma-separated/i)
  })

  it('tools/call whois_lookup returns registrar/domain info for example.com', async () => {
    const res = await callTool('whois_lookup', { domain: 'example.com' })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    const text = content[0].text
    expect(text).toMatch(/Domain:|example\.com/i)
    expect(text).toMatch(/Registrar|Created|Available/i)
  })

  it('tools/call whois_lookup with invalid domain returns validation', async () => {
    const res = await callTool('whois_lookup', { domain: 'nodots' })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const content = (result as { content?: { text: string }[] }).content ?? []
    expect(content[0].text).toMatch(/Invalid|TLD/i)
  })

  it('tools/call with unknown tool returns error', async () => {
    const res = await callTool('unknown_tool', {})
    expect(res.statusCode).toBe(200)
    const { error } = parseBody(res)
    expect(error).toBeDefined()
    expect((error as { message?: string })?.message).toMatch(/Tool not found/i)
  })
})

describe('Namecheap MCP - real API (when NAMECHEAP_* env configured)', () => {
  const hasCredentials =
    !!process.env.NAMECHEAP_API_USER &&
    !!process.env.NAMECHEAP_API_KEY &&
    !!process.env.NAMECHEAP_CLIENT_IP

  it.skipIf(!hasCredentials)('get_domain_price returns availability', async () => {
    const res = await callTool('get_domain_price', { domain: 'example.com' })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const text = (result as { content?: { text: string }[] })?.content?.[0]?.text ?? ''
    expect(text).toMatch(/AVAILABLE|NOT AVAILABLE|Domain:/)
  })

  it.skipIf(!hasCredentials)('get_domains_price returns results', async () => {
    const res = await callTool('get_domains_price', {
      domains: 'example.com, google.com, available-test-xyz12345.com',
    })
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const text = (result as { content?: { text: string }[] })?.content?.[0]?.text ?? ''
    expect(text).toMatch(/Bulk check|Available|Not Available/i)
  })

  it.skipIf(!hasCredentials)('list_tlds returns TLD list', async () => {
    const res = await callTool('list_tlds', {})
    expect(res.statusCode).toBe(200)
    const { result } = parseBody(res)
    const text = (result as { content?: { text: string }[] })?.content?.[0]?.text ?? ''
    expect(text).toMatch(/TLD|com|Popular/i)
  })
})
