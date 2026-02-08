/**
 * Integration tests for crypto-analysis CoinGecko data-fetching tools
 * Hits real CoinGecko v3 API (no mocks)
 */

import { describe, it, expect } from 'vitest'
import { TOOLS } from '../crypto-analysis/tools.js'

function findTool(name: string) {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool not found: ${name}`)
  return tool
}

function parseContent(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text)
}

describe('CoinGecko data-fetching tools', () => {
  it('get_trending_coins returns trending coins with expected fields', async () => {
    const tool = findTool('get_trending_coins')
    const result = await tool.handler({})
    const data = parseContent(result)

    expect(data.trending_coins).toBeDefined()
    expect(Array.isArray(data.trending_coins)).toBe(true)
    expect(data.trending_coins.length).toBeGreaterThan(0)
    expect(data.count).toBeGreaterThan(0)

    const coin = data.trending_coins[0]
    expect(coin).toHaveProperty('id')
    expect(coin).toHaveProperty('name')
    expect(coin).toHaveProperty('symbol')
    expect(typeof coin.id).toBe('string')
    expect(typeof coin.name).toBe('string')
  })

  it('search_coins finds "bitcoin" with matching ID', async () => {
    const tool = findTool('search_coins')
    const result = await tool.handler({ query: 'bitcoin' })
    const data = parseContent(result)

    expect(data.coins).toBeDefined()
    expect(Array.isArray(data.coins)).toBe(true)
    expect(data.coins.length).toBeGreaterThan(0)

    const btc = data.coins.find((c: { id: string }) => c.id === 'bitcoin')
    expect(btc).toBeDefined()
    expect(btc.name).toBe('Bitcoin')
    expect(btc.symbol).toBe('BTC')
  })

  it('get_coin_markets returns market data for bitcoin', async () => {
    const tool = findTool('get_coin_markets')
    const result = await tool.handler({ ids: 'bitcoin' })
    const data = parseContent(result)

    expect(data.coins).toBeDefined()
    expect(data.coins.length).toBe(1)

    const btc = data.coins[0]
    expect(btc.id).toBe('bitcoin')
    expect(btc.current_price).toBeGreaterThan(0)
    expect(btc.market_cap).toBeGreaterThan(0)
    expect(btc.total_volume).toBeGreaterThan(0)
    expect(btc.market_cap_rank).toBeDefined()
  })

  it('get_simple_price returns prices for bitcoin and ethereum', async () => {
    const tool = findTool('get_simple_price')
    const result = await tool.handler({ ids: 'bitcoin,ethereum' })
    const data = parseContent(result)

    expect(data.bitcoin).toBeDefined()
    expect(data.ethereum).toBeDefined()
    expect(data.bitcoin.usd).toBeGreaterThan(0)
    expect(data.ethereum.usd).toBeGreaterThan(0)
  })

  it('get_coin_details returns fundamentals for bitcoin', async () => {
    const tool = findTool('get_coin_details')
    const result = await tool.handler({ id: 'bitcoin' })
    const data = parseContent(result)

    expect(data.id).toBe('bitcoin')
    expect(data.name).toBe('Bitcoin')
    expect(data.symbol).toBe('btc')
    expect(data.genesis_date).toBeDefined()

    // Scores (may be null/undefined on free tier)
    expect(data.scores).toBeDefined()
    // Scores can be number, null, or undefined depending on the coin and API tier
    for (const key of ['developer_score', 'community_score', 'liquidity_score'] as const) {
      const val = data.scores[key]
      expect(val === null || val === undefined || typeof val === 'number').toBe(true)
    }

    // Market data
    expect(data.market_data).toBeDefined()
    expect(data.market_data.current_price_usd).toBeGreaterThan(0)
    expect(data.market_data.market_cap_usd).toBeGreaterThan(0)
  })

  it('get_coin_ohlc returns OHLC candles for bitcoin 7 days', async () => {
    const tool = findTool('get_coin_ohlc')
    const result = await tool.handler({ id: 'bitcoin', days: '7' })
    const data = parseContent(result)

    expect(data.coin_id).toBe('bitcoin')
    expect(data.candle_count).toBeGreaterThan(0)
    expect(Array.isArray(data.candles)).toBe(true)

    const candle = data.candles[0]
    expect(candle).toHaveProperty('timestamp')
    expect(candle).toHaveProperty('open')
    expect(candle).toHaveProperty('high')
    expect(candle).toHaveProperty('low')
    expect(candle).toHaveProperty('close')
    expect(candle.open).toBeGreaterThan(0)
    expect(candle.high).toBeGreaterThanOrEqual(candle.low)
  })

  it('get_coin_market_chart returns historical data for bitcoin 7 days', async () => {
    const tool = findTool('get_coin_market_chart')
    const result = await tool.handler({ id: 'bitcoin', days: '7' })
    const data = parseContent(result)

    expect(data.coin_id).toBe('bitcoin')
    expect(data.data_points).toBeGreaterThan(0)

    expect(Array.isArray(data.prices)).toBe(true)
    expect(data.prices.length).toBeGreaterThan(0)
    expect(data.prices[0]).toHaveProperty('price')
    expect(data.prices[0].price).toBeGreaterThan(0)

    expect(Array.isArray(data.total_volumes)).toBe(true)
    expect(data.total_volumes.length).toBeGreaterThan(0)

    expect(Array.isArray(data.market_caps)).toBe(true)
    expect(data.market_caps.length).toBeGreaterThan(0)
  })

  it('get_global_market_data returns global crypto stats', async () => {
    const tool = findTool('get_global_market_data')
    const result = await tool.handler({})
    const data = parseContent(result)

    expect(data.active_cryptocurrencies).toBeGreaterThan(0)
    expect(data.markets).toBeGreaterThan(0)
    expect(data.total_market_cap_usd).toBeGreaterThan(0)
    expect(data.total_volume_usd).toBeGreaterThan(0)
    expect(data.btc_dominance).toBeGreaterThan(0)
    expect(data.btc_dominance).toBeLessThan(100)
  })

  it('get_coin_categories returns categories with market data', async () => {
    const tool = findTool('get_coin_categories')
    const result = await tool.handler({})
    const data = parseContent(result)

    expect(data.categories).toBeDefined()
    expect(Array.isArray(data.categories)).toBe(true)
    expect(data.categories.length).toBeGreaterThan(0)
    expect(data.total).toBeGreaterThan(0)

    const cat = data.categories[0]
    expect(cat).toHaveProperty('id')
    expect(cat).toHaveProperty('name')
    expect(typeof cat.name).toBe('string')
  })
})
