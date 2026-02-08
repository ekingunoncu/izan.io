/**
 * Integration test for analyze_coin compound tool
 * Verifies the full pipeline: data fetching + indicators + scoring
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { TOOLS } from '../crypto-analysis/tools.js'

// Wait for CoinGecko rate limit to reset after previous test files
beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 60_000))
}, 65_000)

function findTool(name: string) {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool not found: ${name}`)
  return tool
}

function parseContent(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text)
}

describe('analyze_coin compound tool', () => {
  it('returns complete analysis report for bitcoin', async () => {
    const tool = findTool('analyze_coin')
    const result = await tool.handler({ id: 'bitcoin' })
    const report = parseContent(result)

    // ─── Coin info ─────────────────────────────────────────────────────
    expect(report.coin).toBeDefined()
    expect(report.coin.id).toBe('bitcoin')
    expect(report.coin.name).toBe('Bitcoin')
    expect(report.coin.symbol).toBe('btc')

    // ─── Market data ───────────────────────────────────────────────────
    expect(report.market).toBeDefined()
    expect(report.market.price).toBeGreaterThan(0)
    expect(report.market.marketCap).toBeGreaterThan(0)
    expect(report.market.volume).toBeGreaterThan(0)
    expect(report.market.high24h).toBeGreaterThan(0)
    expect(report.market.low24h).toBeGreaterThan(0)
    expect(report.market.marketCapRank).toBeDefined()
    expect(typeof report.market.priceChange24h).toBe('number')

    // ─── Technical indicators ──────────────────────────────────────────
    expect(report.technicalIndicators).toBeDefined()

    // RSI
    expect(report.technicalIndicators.rsi).toBeDefined()
    expect(report.technicalIndicators.rsi.latest).toBeGreaterThanOrEqual(0)
    expect(report.technicalIndicators.rsi.latest).toBeLessThanOrEqual(100)
    expect(['bullish', 'bearish', 'neutral']).toContain(report.technicalIndicators.rsi.signal)

    // MACD
    expect(report.technicalIndicators.macd).toBeDefined()
    expect(report.technicalIndicators.macd.latest).toHaveProperty('MACD')
    expect(report.technicalIndicators.macd.latest).toHaveProperty('signal')
    expect(report.technicalIndicators.macd.latest).toHaveProperty('histogram')

    // Bollinger Bands
    expect(report.technicalIndicators.bollingerBands).toBeDefined()
    expect(report.technicalIndicators.bollingerBands.latest.upper).toBeGreaterThan(
      report.technicalIndicators.bollingerBands.latest.lower,
    )

    // EMA
    expect(report.technicalIndicators.ema).toBeDefined()
    expect(report.technicalIndicators.ema.ema9.latest).toBeGreaterThan(0)
    expect(report.technicalIndicators.ema.ema21.latest).toBeGreaterThan(0)

    // SMA
    expect(report.technicalIndicators.sma).toBeDefined()
    expect(report.technicalIndicators.sma.sma20.latest).toBeGreaterThan(0)

    // ATR
    expect(report.technicalIndicators.atr).toBeDefined()
    expect(report.technicalIndicators.atr.latest).toBeGreaterThanOrEqual(0)

    // Stochastic
    expect(report.technicalIndicators.stochastic).toBeDefined()
    expect(report.technicalIndicators.stochastic.latest.k).toBeGreaterThanOrEqual(0)
    expect(report.technicalIndicators.stochastic.latest.d).toBeGreaterThanOrEqual(0)

    // ADX
    expect(report.technicalIndicators.adx).toBeDefined()
    expect(report.technicalIndicators.adx.latest.adx).toBeGreaterThanOrEqual(0)

    // Overall signal
    expect(['bullish', 'bearish', 'neutral']).toContain(
      report.technicalIndicators.overallSignal,
    )
    expect(typeof report.technicalIndicators.signalSummary).toBe('string')

    // ─── Momentum score ────────────────────────────────────────────────
    expect(report.momentum).toBeDefined()
    expect(typeof report.momentum.score).toBe('number')
    expect(report.momentum.score).toBeGreaterThanOrEqual(-100)
    expect(report.momentum.score).toBeLessThanOrEqual(100)
    expect(typeof report.momentum.volumeToMarketCap).toBe('number')

    // ─── Trust score ───────────────────────────────────────────────────
    expect(report.trust).toBeDefined()
    expect(typeof report.trust.score).toBe('number')
    // Scores may be number, null, or undefined depending on CoinGecko API tier
    for (const key of ['developerScore', 'communityScore', 'liquidityScore'] as const) {
      const val = report.trust[key]
      expect(val === null || val === undefined || typeof val === 'number').toBe(true)
    }

    // ─── Overall signal ────────────────────────────────────────────────
    expect(['bullish', 'bearish', 'neutral']).toContain(report.overallSignal)

    // ─── Generated timestamp ───────────────────────────────────────────
    expect(report.generatedAt).toBeDefined()
    expect(typeof report.generatedAt).toBe('string')
    // Should be a valid ISO date
    expect(new Date(report.generatedAt).getTime()).toBeGreaterThan(0)
  })
})
