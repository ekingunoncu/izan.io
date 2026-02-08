/**
 * @izan/mcp-browser-servers - CoinGecko v3 API client
 *
 * All endpoints use the free tier (no API key required, CORS OK).
 * Includes a simple token-bucket rate limiter to stay within free limits.
 * Uses in-memory cache to reduce API calls. Throws RateLimitError on 429 for fallback.
 */

import { getCached, setCache, TTL } from './cache.js'
import type {
  TrendingResponse,
  SearchResponse,
  CoinMarketData,
  SimplePriceResponse,
  CoinDetail,
  OHLCCandle,
  MarketChartResponse,
  GlobalMarketData,
  CoinCategory,
} from './types.js'

const BASE_URL = 'https://api.coingecko.com/api/v3'

/** Optional API key for higher rate limits. Set via setCoinGeckoApiKey (e.g. from user settings). */
let coinGeckoApiKey: string | null = null

/**
 * Set CoinGecko API key for authenticated requests (higher rate limits).
 * Call with key from user settings when crypto server starts.
 */
export function setCoinGeckoApiKey(key: string | null): void {
  coinGeckoApiKey = key && key.trim() ? key.trim() : null
}

export class RateLimitError extends Error {
  constructor(message = 'CoinGecko API rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

// ─── Rate Limiter (Token Bucket) ───────────────────────────────────────────────

const MAX_TOKENS = 5
const REFILL_INTERVAL_MS = 12_000 // 1 token per 12 seconds (conservative for free tier ~5 req/min)
const MIN_INTERVAL_MS = 2_000 // minimum gap between requests

let tokens = MAX_TOKENS
let lastRefill = Date.now()
let lastRequestTime = 0

function refillTokens(): void {
  const now = Date.now()
  const elapsed = now - lastRefill
  const newTokens = Math.floor(elapsed / REFILL_INTERVAL_MS)
  if (newTokens > 0) {
    tokens = Math.min(MAX_TOKENS, tokens + newTokens)
    lastRefill = now
  }
}

async function waitForToken(): Promise<void> {
  // Ensure minimum interval between requests
  const timeSinceLastRequest = Date.now() - lastRequestTime
  if (timeSinceLastRequest < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - timeSinceLastRequest))
  }

  refillTokens()
  if (tokens > 0) {
    tokens--
    lastRequestTime = Date.now()
    return
  }
  // Wait until a token is available
  const waitMs = REFILL_INTERVAL_MS - (Date.now() - lastRefill)
  await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 1_000)))
  return waitForToken()
}

// ─── Fetch Helper ──────────────────────────────────────────────────────────────

async function cgFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  await waitForToken()

  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const headers: Record<string, string> = {}
  if (coinGeckoApiKey) {
    headers['x-cg-demo-api-key'] = coinGeckoApiKey
  }

  const response = await fetch(url.toString(), { headers })

  if (response.status === 429) {
    // Rate limited - exponential backoff with up to 2 retries
    for (let attempt = 1; attempt <= 2; attempt++) {
      const backoffMs = attempt * 15_000
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
      tokens = 0 // force rate limiter to wait on next calls
      lastRequestTime = Date.now()
      const retryResponse = await fetch(url.toString(), { headers })
      if (retryResponse.ok) {
        return retryResponse.json() as Promise<T>
      }
      if (retryResponse.status !== 429) {
        throw new Error(`CoinGecko API error ${retryResponse.status}: ${await retryResponse.text()}`)
      }
    }
    throw new RateLimitError(
      'CoinGecko API rate limit exceeded. Get a free API key at https://www.coingecko.com/en/developers/dashboard for higher limits.',
    )
  }

  if (!response.ok) {
    throw new Error(`CoinGecko API error ${response.status}: ${await response.text()}`)
  }

  return response.json() as Promise<T>
}

// ─── API Endpoints ─────────────────────────────────────────────────────────────

/**
 * Get trending coins by search volume
 * Endpoint: /search/trending
 */
export async function getTrendingCoins(): Promise<TrendingResponse> {
  const key = 'trending'
  const cached = getCached<TrendingResponse>(key)
  if (cached) return cached
  const data = await cgFetch<TrendingResponse>('/search/trending')
  setCache(key, data, TTL.TRENDING)
  return data
}

/**
 * Search coins, exchanges, categories by query
 * Endpoint: /search
 */
export async function searchCoins(query: string): Promise<SearchResponse> {
  const key = `search:${query.toLowerCase()}`
  const cached = getCached<SearchResponse>(key)
  if (cached) return cached
  const data = await cgFetch<SearchResponse>('/search', { query })
  setCache(key, data, TTL.SEARCH)
  return data
}

/**
 * Get market data for coins
 * Endpoint: /coins/markets
 */
export async function getCoinMarkets(options: {
  vs_currency?: string
  ids?: string
  order?: string
  per_page?: number
  page?: number
  price_change_percentage?: string
}): Promise<CoinMarketData[]> {
  const params: Record<string, string> = {
    vs_currency: options.vs_currency ?? 'usd',
  }
  if (options.ids) params.ids = options.ids
  if (options.order) params.order = options.order
  if (options.per_page) params.per_page = String(options.per_page)
  if (options.page) params.page = String(options.page)
  if (options.price_change_percentage) {
    params.price_change_percentage = options.price_change_percentage
  }
  const key = `markets:${JSON.stringify(params)}`
  const cached = getCached<CoinMarketData[]>(key)
  if (cached) return cached
  const data = await cgFetch<CoinMarketData[]>('/coins/markets', params)
  setCache(key, data, TTL.MARKETS)
  return data
}

/**
 * Quick multi-coin price lookup
 * Endpoint: /simple/price
 */
export async function getSimplePrice(options: {
  ids: string
  vs_currencies?: string
  include_market_cap?: boolean
  include_24hr_vol?: boolean
  include_24hr_change?: boolean
  include_last_updated_at?: boolean
}): Promise<SimplePriceResponse> {
  const params: Record<string, string> = {
    ids: options.ids,
    vs_currencies: options.vs_currencies ?? 'usd',
  }
  if (options.include_market_cap) params.include_market_cap = 'true'
  if (options.include_24hr_vol) params.include_24hr_vol = 'true'
  if (options.include_24hr_change) params.include_24hr_change = 'true'
  if (options.include_last_updated_at) params.include_last_updated_at = 'true'
  const key = `simple:${options.ids}:${options.vs_currencies ?? 'usd'}`
  const cached = getCached<SimplePriceResponse>(key)
  if (cached) return cached
  const data = await cgFetch<SimplePriceResponse>('/simple/price', params)
  setCache(key, data, TTL.SIMPLE_PRICE)
  return data
}

/**
 * Get detailed coin data (fundamentals, scores, links)
 * Endpoint: /coins/{id}
 */
export async function getCoinDetails(
  id: string,
  options?: {
    localization?: boolean
    tickers?: boolean
    market_data?: boolean
    community_data?: boolean
    developer_data?: boolean
  },
): Promise<CoinDetail> {
  const params: Record<string, string> = {
    localization: String(options?.localization ?? false),
    tickers: String(options?.tickers ?? false),
    market_data: String(options?.market_data ?? true),
    community_data: String(options?.community_data ?? true),
    developer_data: String(options?.developer_data ?? true),
  }
  const key = `details:${id}`
  const cached = getCached<CoinDetail>(key)
  if (cached) return cached
  const data = await cgFetch<CoinDetail>(`/coins/${encodeURIComponent(id)}`, params)
  setCache(key, data, TTL.COIN_DETAILS)
  return data
}

/**
 * Convert market_chart prices array to OHLC candles.
 * Uses price as o=h=l=c (synthetic) when OHLC endpoint returns empty for small/illiquid coins.
 */
export function marketChartPricesToOHLC(prices: Array<[number, number]>): OHLCCandle[] {
  return prices.map(([ts, price]) => [ts, price, price, price, price] as OHLCCandle)
}

/**
 * Get OHLC candlestick data
 * Endpoint: /coins/{id}/ohlc
 * days: 1, 7, 14, 30, 90, 180, 365, max
 */
export async function getCoinOHLC(
  id: string,
  options?: { vs_currency?: string; days?: string },
): Promise<OHLCCandle[]> {
  const vs = options?.vs_currency ?? 'usd'
  const days = options?.days ?? '7'
  const key = `ohlc:${id}:${vs}:${days}`
  const cached = getCached<OHLCCandle[]>(key)
  if (cached) return cached
  const data = await cgFetch<OHLCCandle[]>(`/coins/${encodeURIComponent(id)}/ohlc`, {
    vs_currency: vs,
    days,
  })
  setCache(key, data, TTL.OHLC)
  return data
}

/**
 * Get historical market chart data (price, volume, market cap)
 * Endpoint: /coins/{id}/market_chart
 * Auto granularity: 5min for 1 day, hourly for 2-90 days, daily for 90+ days
 */
export async function getCoinMarketChart(
  id: string,
  options?: { vs_currency?: string; days?: string },
): Promise<MarketChartResponse> {
  const vs = options?.vs_currency ?? 'usd'
  const days = options?.days ?? '7'
  const key = `chart:${id}:${vs}:${days}`
  const cached = getCached<MarketChartResponse>(key)
  if (cached) return cached
  const data = await cgFetch<MarketChartResponse>(`/coins/${encodeURIComponent(id)}/market_chart`, {
    vs_currency: vs,
    days,
  })
  setCache(key, data, TTL.MARKET_CHART)
  return data
}

/**
 * Get global cryptocurrency market data
 * Endpoint: /global
 */
export async function getGlobalMarketData(): Promise<GlobalMarketData> {
  const key = 'global'
  const cached = getCached<GlobalMarketData>(key)
  if (cached) return cached
  const data = await cgFetch<GlobalMarketData>('/global')
  setCache(key, data, TTL.GLOBAL)
  return data
}

/**
 * Get coin categories with market data
 * Endpoint: /coins/categories
 */
export async function getCoinCategories(options?: {
  order?: string
}): Promise<CoinCategory[]> {
  const params: Record<string, string> = {}
  if (options?.order) params.order = options.order
  const key = `categories:${params.order ?? 'default'}`
  const cached = getCached<CoinCategory[]>(key)
  if (cached) return cached
  const data = await cgFetch<CoinCategory[]>('/coins/categories', params)
  setCache(key, data, TTL.CATEGORIES)
  return data
}
