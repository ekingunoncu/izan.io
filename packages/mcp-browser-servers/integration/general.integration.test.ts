/**
 * Integration tests for general MCP tools (client-side)
 */

import { describe, it, expect } from 'vitest'
import { TOOLS } from '../general/tools.js'

function findTool(name: string) {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool not found: ${name}`)
  return tool
}

describe('General tools', () => {
  it('get_time returns formatted time', async () => {
    const tool = findTool('get_time')
    const result = await tool.handler({})
    expect(result).toMatch(/\d{4}|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/)
  })

  it('get_time with timezone returns formatted time', async () => {
    const tool = findTool('get_time')
    const result = await tool.handler({ timezone: 'Europe/Istanbul' })
    expect(result).toMatch(/\d{4}/)
  })

  it('random_number returns number in range', async () => {
    const tool = findTool('random_number')
    const result = await tool.handler({ min: 1, max: 10 })
    const n = parseInt(result, 10)
    expect(n).toBeGreaterThanOrEqual(1)
    expect(n).toBeLessThanOrEqual(10)
  })

  it('uuid returns valid UUID v4', async () => {
    const tool = findTool('uuid')
    const result = await tool.handler({})
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('calculate evaluates expression', async () => {
    const tool = findTool('calculate')
    const result = await tool.handler({ expression: '2 + 3 * 4' })
    expect(result).toBe('14')
  })

  it('generate_password returns password of correct length', async () => {
    const tool = findTool('generate_password')
    const result = await tool.handler({ length: 12 })
    expect(result).toHaveLength(12)
  })
})
