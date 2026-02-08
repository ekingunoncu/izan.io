/**
 * @izan/mcp-browser-servers - Technical indicator calculations
 *
 * Wraps the `technicalindicators` npm package to compute
 * RSI, MACD, Bollinger Bands, EMA, SMA, ATR, Stochastic, and ADX
 * from CoinGecko OHLC data.
 */

import {
  RSI,
  MACD,
  BollingerBands,
  EMA,
  SMA,
  ATR,
  Stochastic,
  ADX,
} from 'technicalindicators'

import type {
  OHLCCandle,
  OHLCData,
  IndicatorResults,
  RSIResult,
  MACDResult,
  MACDValue,
  BollingerBandsResult,
  BollingerBandValue,
  MovingAverageResult,
  ATRResult,
  StochasticResult,
  StochasticValue,
  ADXResult,
  ADXValue,
  SignalDirection,
} from './types.js'

// ─── OHLC Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse CoinGecko OHLC candles into separate arrays for indicator calculations
 */
export function parseOHLC(candles: OHLCCandle[]): OHLCData {
  const timestamps: number[] = []
  const open: number[] = []
  const high: number[] = []
  const low: number[] = []
  const close: number[] = []

  for (const [ts, o, h, l, c] of candles) {
    timestamps.push(ts)
    open.push(o)
    high.push(h)
    low.push(l)
    close.push(c)
  }

  return { timestamps, open, high, low, close }
}

// ─── Individual Indicator Calculations ─────────────────────────────────────────

export function calculateRSI(close: number[], period = 14): RSIResult {
  const values = RSI.calculate({ values: close, period })
  const latest = values[values.length - 1] ?? 50

  let signal: SignalDirection = 'neutral'
  if (latest >= 65) signal = 'bearish' // overbought / approaching (TradingView-style)
  else if (latest <= 35) signal = 'bullish' // oversold / approaching

  return { values, latest, signal }
}

export function calculateMACD(
  close: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const raw = MACD.calculate({
    values: close,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })

  const values: MACDValue[] = raw.map((r) => ({
    MACD: r.MACD ?? 0,
    signal: r.signal ?? 0,
    histogram: r.histogram ?? 0,
  }))

  const latest = values[values.length - 1] ?? { MACD: 0, signal: 0, histogram: 0 }

  let signal: SignalDirection = 'neutral'
  if (latest.histogram > 0 && latest.MACD > latest.signal) signal = 'bullish'
  else if (latest.histogram < 0 && latest.MACD < latest.signal) signal = 'bearish'

  return { values, latest, signal }
}

export function calculateBollingerBands(
  close: number[],
  period = 20,
  stdDev = 2,
): BollingerBandsResult {
  const raw = BollingerBands.calculate({ period, values: close, stdDev })

  const values: BollingerBandValue[] = raw.map((r) => ({
    upper: r.upper,
    middle: r.middle,
    lower: r.lower,
    pb: r.upper !== r.lower ? (close[close.length - 1] - r.lower) / (r.upper - r.lower) : 0.5,
  }))

  const latest = values[values.length - 1] ?? { upper: 0, middle: 0, lower: 0, pb: 0.5 }
  const currentPrice = close[close.length - 1]

  let signal: SignalDirection = 'neutral'
  if (currentPrice <= latest.lower) signal = 'bullish' // price at/below lower band
  else if (currentPrice >= latest.upper) signal = 'bearish' // price at/above upper band
  else if (latest.pb >= 0.8) signal = 'bearish' // upper zone (TradingView: resistance)
  else if (latest.pb <= 0.2) signal = 'bullish' // lower zone (support)

  return { values, latest, signal }
}

export function calculateEMA(close: number[], period: number): MovingAverageResult {
  const values = EMA.calculate({ values: close, period })
  return { values, latest: values[values.length - 1] ?? 0 }
}

export function calculateSMA(close: number[], period: number): MovingAverageResult {
  const values = SMA.calculate({ values: close, period })
  return { values, latest: values[values.length - 1] ?? 0 }
}

export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period = 14,
): ATRResult {
  const values = ATR.calculate({ high, low, close, period })
  return { values, latest: values[values.length - 1] ?? 0 }
}

export function calculateStochastic(
  high: number[],
  low: number[],
  close: number[],
  period = 14,
  signalPeriod = 3,
): StochasticResult {
  const raw = Stochastic.calculate({
    high,
    low,
    close,
    period,
    signalPeriod,
  })

  const values: StochasticValue[] = raw
    .filter((r) => r.k !== undefined && r.d !== undefined)
    .map((r) => ({
      k: r.k,
      d: r.d,
    }))

  const latest = values[values.length - 1] ?? { k: 50, d: 50 }

  let signal: SignalDirection = 'neutral'
  if (latest.k < 25 && latest.d < 25) signal = 'bullish' // oversold (TradingView-style)
  else if (latest.k > 75 && latest.d > 75) signal = 'bearish' // overbought

  return { values, latest, signal }
}

export function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period = 14,
): ADXResult {
  const raw = ADX.calculate({ high, low, close, period })

  const values: ADXValue[] = raw.map((r) => ({
    adx: r.adx,
    ppilusdi: r.pdi,
    pminusdi: r.mdi,
  }))

  const latest = values[values.length - 1] ?? { adx: 0, ppilusdi: 0, pminusdi: 0 }

  let signal: SignalDirection = 'neutral'
  if (latest.ppilusdi > latest.pminusdi) signal = 'bullish'
  else if (latest.pminusdi > latest.ppilusdi) signal = 'bearish'

  let trendStrength: ADXResult['trendStrength'] = 'weak'
  if (latest.adx >= 50) trendStrength = 'very_strong'
  else if (latest.adx >= 35) trendStrength = 'strong'
  else if (latest.adx >= 20) trendStrength = 'moderate'

  return { values, latest, signal, trendStrength }
}

// ─── Combined Indicator Calculation ────────────────────────────────────────────

/**
 * Calculate all technical indicators from OHLC candle data.
 * Returns structured results with signal interpretations.
 */
export function calculateAllIndicators(candles: OHLCCandle[]): IndicatorResults {
  const { high, low, close } = parseOHLC(candles)

  const rsi = calculateRSI(close)
  const macd = calculateMACD(close)
  const bollingerBands = calculateBollingerBands(close)

  const ema = {
    ema9: calculateEMA(close, 9),
    ema21: calculateEMA(close, 21),
    ema50: calculateEMA(close, 50),
  }

  const sma = {
    sma20: calculateSMA(close, 20),
    sma50: calculateSMA(close, 50),
    sma200: calculateSMA(close, 200),
  }

  const atr = calculateATR(high, low, close)
  const stochastic = calculateStochastic(high, low, close)
  const adx = calculateADX(high, low, close)

  // ─── EMA / SMA trend signals (TradingView-style) ──────────────────────────────
  const price = close[close.length - 1] ?? 0
  const ema9 = ema.ema9.latest
  const ema21 = ema.ema21.latest
  const ema50 = ema.ema50.latest
  const sma20 = sma.sma20.latest
  const sma50 = sma.sma50.latest
  const sma200 = sma.sma200.latest

  const emaSignal: SignalDirection =
    price > ema9 && ema9 > ema21 && ema21 > ema50
      ? 'bullish'
      : price < ema9 && ema9 < ema21 && ema21 < ema50
        ? 'bearish'
        : 'neutral'

  const smaSignal: SignalDirection =
    price > sma20 && price > sma50 && price > sma200
      ? 'bullish'
      : price < sma20 && price < sma50 && price < sma200
        ? 'bearish'
        : 'neutral'

  // ─── Aggregate signal (7 indicators: RSI, MACD, BB, Stoch, ADX, EMA, SMA) ───
  const signals: SignalDirection[] = [
    rsi.signal,
    macd.signal,
    bollingerBands.signal,
    stochastic.signal,
    adx.signal,
    emaSignal,
    smaSignal,
  ]

  const bullishCount = signals.filter((s) => s === 'bullish').length
  const bearishCount = signals.filter((s) => s === 'bearish').length

  let overallSignal: SignalDirection = 'neutral'
  if (bullishCount >= 4) overallSignal = 'bullish'
  else if (bearishCount >= 4) overallSignal = 'bearish'
  else if (bearishCount >= 3 && bullishCount < 2) overallSignal = 'bearish'
  else if (bullishCount >= 3 && bearishCount < 2) overallSignal = 'bullish'

  const signalSummary =
    `RSI(${rsi.signal}) MACD(${macd.signal}) BB(${bollingerBands.signal}) ` +
    `Stoch(${stochastic.signal}) ADX(${adx.signal}) EMA(${emaSignal}) SMA(${smaSignal}) → ${overallSignal.toUpperCase()} ` +
    `[${bullishCount}B ${bearishCount}S ${signals.length - bullishCount - bearishCount}N]`

  return {
    rsi,
    macd,
    bollingerBands,
    ema,
    sma,
    emaSignal,
    smaSignal,
    atr,
    stochastic,
    adx,
    overallSignal,
    signalSummary,
  }
}
