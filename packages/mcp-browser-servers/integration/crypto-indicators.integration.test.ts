/**
 * Integration tests for crypto-analysis technical indicators
 * Fetches real OHLC data from CoinGecko, then validates indicator outputs
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { getCoinOHLC } from '../crypto-analysis/coingecko.js'
import {
  parseOHLC,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateEMA,
  calculateSMA,
  calculateATR,
  calculateStochastic,
  calculateADX,
  calculateAllIndicators,
} from '../crypto-analysis/indicators.js'
import type { OHLCCandle, OHLCData } from '../crypto-analysis/types.js'

let candles: OHLCCandle[]
let ohlc: OHLCData

beforeAll(async () => {
  // Wait for rate limit cooldown after previous test file's 9 API calls
  await new Promise((resolve) => setTimeout(resolve, 30_000))
  // Fetch 30-day bitcoin OHLC (should give ~720 candles)
  candles = await getCoinOHLC('bitcoin', { days: '30' })
  ohlc = parseOHLC(candles)
}, 65_000)

describe('OHLC parsing', () => {
  it('parseOHLC extracts correct arrays', () => {
    expect(ohlc.timestamps.length).toBe(candles.length)
    expect(ohlc.open.length).toBe(candles.length)
    expect(ohlc.high.length).toBe(candles.length)
    expect(ohlc.low.length).toBe(candles.length)
    expect(ohlc.close.length).toBe(candles.length)

    // All prices should be positive
    for (let i = 0; i < ohlc.close.length; i++) {
      expect(ohlc.open[i]).toBeGreaterThan(0)
      expect(ohlc.high[i]).toBeGreaterThanOrEqual(ohlc.low[i])
      expect(ohlc.close[i]).toBeGreaterThan(0)
    }
  })
})

describe('Individual indicators with real bitcoin data', () => {
  it('RSI returns values between 0-100', () => {
    const result = calculateRSI(ohlc.close)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    expect(result.latest).toBeGreaterThanOrEqual(0)
    expect(result.latest).toBeLessThanOrEqual(100)
    expect(['bullish', 'bearish', 'neutral']).toContain(result.signal)
  })

  it('MACD returns objects with MACD, signal, histogram', () => {
    const result = calculateMACD(ohlc.close)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v).toHaveProperty('MACD')
      expect(v).toHaveProperty('signal')
      expect(v).toHaveProperty('histogram')
      expect(typeof v.MACD).toBe('number')
      expect(typeof v.signal).toBe('number')
      expect(typeof v.histogram).toBe('number')
    }
    expect(result.latest).toHaveProperty('MACD')
    expect(['bullish', 'bearish', 'neutral']).toContain(result.signal)
  })

  it('Bollinger Bands returns upper > middle > lower', () => {
    const result = calculateBollingerBands(ohlc.close)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v.upper).toBeGreaterThanOrEqual(v.middle)
      expect(v.middle).toBeGreaterThanOrEqual(v.lower)
      expect(v.upper).toBeGreaterThan(0)
    }
    expect(result.latest.upper).toBeGreaterThan(result.latest.lower)
    expect(['bullish', 'bearish', 'neutral']).toContain(result.signal)
  })

  it('EMA returns positive values', () => {
    const result = calculateEMA(ohlc.close, 9)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v).toBeGreaterThan(0)
    }
    expect(result.latest).toBeGreaterThan(0)
  })

  it('SMA returns positive values', () => {
    const result = calculateSMA(ohlc.close, 20)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v).toBeGreaterThan(0)
    }
    expect(result.latest).toBeGreaterThan(0)
  })

  it('ATR returns positive values', () => {
    const result = calculateATR(ohlc.high, ohlc.low, ohlc.close)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v).toBeGreaterThanOrEqual(0)
    }
    expect(result.latest).toBeGreaterThanOrEqual(0)
  })

  it('Stochastic returns k and d values between 0-100', () => {
    const result = calculateStochastic(ohlc.high, ohlc.low, ohlc.close)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v.k).toBeGreaterThanOrEqual(0)
      expect(v.k).toBeLessThanOrEqual(100)
      expect(v.d).toBeGreaterThanOrEqual(0)
      expect(v.d).toBeLessThanOrEqual(100)
    }
    expect(result.latest.k).toBeGreaterThanOrEqual(0)
    expect(result.latest.d).toBeGreaterThanOrEqual(0)
    expect(['bullish', 'bearish', 'neutral']).toContain(result.signal)
  })

  it('ADX returns values between 0-100 with trend strength', () => {
    const result = calculateADX(ohlc.high, ohlc.low, ohlc.close)

    expect(result.values.length).toBeGreaterThan(0)
    for (const v of result.values) {
      expect(v.adx).toBeGreaterThanOrEqual(0)
      expect(v.adx).toBeLessThanOrEqual(100)
    }
    expect(result.latest.adx).toBeGreaterThanOrEqual(0)
    expect(['bullish', 'bearish', 'neutral']).toContain(result.signal)
    expect(['weak', 'moderate', 'strong', 'very_strong']).toContain(result.trendStrength)
  })
})

describe('Combined calculateAllIndicators', () => {
  it('returns complete indicator results with overall signal', () => {
    const result = calculateAllIndicators(candles)

    // Check all indicator groups exist
    expect(result.rsi).toBeDefined()
    expect(result.macd).toBeDefined()
    expect(result.bollingerBands).toBeDefined()
    expect(result.ema).toBeDefined()
    expect(result.sma).toBeDefined()
    expect(result.atr).toBeDefined()
    expect(result.stochastic).toBeDefined()
    expect(result.adx).toBeDefined()

    // EMA sub-periods
    expect(result.ema.ema9).toBeDefined()
    expect(result.ema.ema21).toBeDefined()
    expect(result.ema.ema50).toBeDefined()

    // SMA sub-periods
    expect(result.sma.sma20).toBeDefined()
    expect(result.sma.sma50).toBeDefined()
    expect(result.sma.sma200).toBeDefined()

    // Overall signal
    expect(['bullish', 'bearish', 'neutral']).toContain(result.overallSignal)
    expect(typeof result.signalSummary).toBe('string')
    expect(result.signalSummary.length).toBeGreaterThan(0)
  })
})
