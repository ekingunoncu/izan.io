/**
 * @izan/mcp-browser-servers - Crypto analysis shared types
 */

// ─── CoinGecko API Response Types ──────────────────────────────────────────────

/** Trending coin item from /search/trending */
export interface TrendingCoinItem {
  id: string
  coin_id: number
  name: string
  symbol: string
  market_cap_rank: number | null
  thumb: string
  small: string
  large: string
  slug: string
  price_btc: number
  score: number
}

/** Trending response wrapper */
export interface TrendingResponse {
  coins: Array<{ item: TrendingCoinItem }>
}

/** Search result from /search */
export interface SearchResponse {
  coins: Array<{
    id: string
    name: string
    api_symbol: string
    symbol: string
    market_cap_rank: number | null
    thumb: string
    large: string
  }>
  exchanges: Array<{ id: string; name: string }>
  categories: Array<{ id: number; name: string }>
}

/** Market data from /coins/markets */
export interface CoinMarketData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number | null
  fully_diluted_valuation: number | null
  total_volume: number
  high_24h: number | null
  low_24h: number | null
  price_change_24h: number | null
  price_change_percentage_24h: number | null
  market_cap_change_24h: number | null
  market_cap_change_percentage_24h: number | null
  circulating_supply: number | null
  total_supply: number | null
  max_supply: number | null
  ath: number | null
  ath_change_percentage: number | null
  ath_date: string | null
  atl: number | null
  atl_change_percentage: number | null
  atl_date: string | null
  last_updated: string
  price_change_percentage_1h_in_currency?: number | null
  price_change_percentage_24h_in_currency?: number | null
  price_change_percentage_7d_in_currency?: number | null
}

/** Simple price from /simple/price */
export interface SimplePriceResponse {
  [coinId: string]: {
    usd: number
    usd_market_cap?: number
    usd_24h_vol?: number
    usd_24h_change?: number
    last_updated_at?: number
  }
}

/** Coin detail from /coins/{id} */
export interface CoinDetail {
  id: string
  symbol: string
  name: string
  description: { en: string }
  links: {
    homepage: string[]
    blockchain_site: string[]
    repos_url: { github: string[]; bitbucket: string[] }
  }
  genesis_date: string | null
  market_cap_rank: number | null
  coingecko_rank: number | null
  coingecko_score: number | null
  developer_score: number | null
  community_score: number | null
  liquidity_score: number | null
  public_interest_score: number | null
  market_data: {
    current_price: { usd: number }
    market_cap: { usd: number }
    total_volume: { usd: number }
    high_24h: { usd: number }
    low_24h: { usd: number }
    price_change_percentage_24h: number | null
    price_change_percentage_7d: number | null
    price_change_percentage_30d: number | null
    circulating_supply: number | null
    total_supply: number | null
    max_supply: number | null
  }
  last_updated: string
}

/** OHLC candle from /coins/{id}/ohlc - [timestamp, open, high, low, close] */
export type OHLCCandle = [number, number, number, number, number]

/** Market chart from /coins/{id}/market_chart */
export interface MarketChartResponse {
  prices: Array<[number, number]>
  market_caps: Array<[number, number]>
  total_volumes: Array<[number, number]>
}

/** Global market data from /global */
export interface GlobalMarketData {
  data: {
    active_cryptocurrencies: number
    upcoming_icos: number
    ongoing_icos: number
    ended_icos: number
    markets: number
    total_market_cap: Record<string, number>
    total_volume: Record<string, number>
    market_cap_percentage: Record<string, number>
    market_cap_change_percentage_24h_usd: number
    updated_at: number
  }
}

/** Coin category from /coins/categories */
export interface CoinCategory {
  id: string
  name: string
  market_cap: number | null
  market_cap_change_24h: number | null
  volume_24h: number | null
  top_3_coins: string[]
  content: string | null
  updated_at: string
}

// ─── Technical Indicator Types ─────────────────────────────────────────────────

/** Parsed OHLC data for indicator calculations */
export interface OHLCData {
  timestamps: number[]
  open: number[]
  high: number[]
  low: number[]
  close: number[]
}

export type SignalDirection = 'bullish' | 'bearish' | 'neutral'

export interface RSIResult {
  values: number[]
  latest: number
  signal: SignalDirection
}

export interface MACDValue {
  MACD: number
  signal: number
  histogram: number
}

export interface MACDResult {
  values: MACDValue[]
  latest: MACDValue
  signal: SignalDirection
}

export interface BollingerBandValue {
  upper: number
  middle: number
  lower: number
  pb: number // percent bandwidth
}

export interface BollingerBandsResult {
  values: BollingerBandValue[]
  latest: BollingerBandValue
  signal: SignalDirection
}

export interface MovingAverageResult {
  values: number[]
  latest: number
}

export interface ATRResult {
  values: number[]
  latest: number
}

export interface StochasticValue {
  k: number
  d: number
}

export interface StochasticResult {
  values: StochasticValue[]
  latest: StochasticValue
  signal: SignalDirection
}

export interface ADXValue {
  adx: number
  ppilusdi: number
  pminusdi: number
}

export interface ADXResult {
  values: ADXValue[]
  latest: ADXValue
  signal: SignalDirection
  trendStrength: 'weak' | 'moderate' | 'strong' | 'very_strong'
}

/** Complete indicator results from calculate_technical_indicators */
export interface IndicatorResults {
  rsi: RSIResult
  macd: MACDResult
  bollingerBands: BollingerBandsResult
  ema: { ema9: MovingAverageResult; ema21: MovingAverageResult; ema50: MovingAverageResult }
  sma: { sma20: MovingAverageResult; sma50: MovingAverageResult; sma200: MovingAverageResult }
  emaSignal: SignalDirection
  smaSignal: SignalDirection
  atr: ATRResult
  stochastic: StochasticResult
  adx: ADXResult
  overallSignal: SignalDirection
  signalSummary: string
}

// ─── Analysis Report Types ─────────────────────────────────────────────────────

export interface MomentumScore {
  score: number
  priceChange24h: number | null
  priceChange7d: number | null
  volumeToMarketCap: number
}

export interface TrustScore {
  score: number
  developerScore: number | null
  communityScore: number | null
  liquidityScore: number | null
  publicInterestScore: number | null
}

export interface AnalysisReport {
  coin: {
    id: string
    name: string
    symbol: string
  }
  market: {
    price: number
    marketCap: number
    volume: number
    high24h: number
    low24h: number
    priceChange24h: number | null
    priceChange7d: number | null
    priceChange30d: number | null
    marketCapRank: number | null
    circulatingSupply: number | null
    totalSupply: number | null
    maxSupply: number | null
  }
  technicalIndicators: IndicatorResults
  /** When CoinGecko has no OHLC/market_chart data for small/illiquid coins */
  technicalIndicatorsNote?: string
  momentum: MomentumScore
  trust: TrustScore
  overallSignal: SignalDirection
  generatedAt: string
}
