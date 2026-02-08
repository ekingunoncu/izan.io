/**
 * @izan/mcp-browser-servers - Simple in-memory TTL cache
 * Reduces API calls and rate limit pressure
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

/** Cache TTLs (ms) - balance freshness vs rate limit */
export const TTL = {
  /** Price data - 60s */
  PRICE: 60_000,
  /** Simple price - 60s */
  SIMPLE_PRICE: 60_000,
  /** Global market - 90s */
  GLOBAL: 90_000,
  /** Markets list - 60s */
  MARKETS: 60_000,
  /** Trending - 90s */
  TRENDING: 90_000,
  /** Search - 5 min (results rarely change) */
  SEARCH: 300_000,
  /** Coin details - 2 min */
  COIN_DETAILS: 120_000,
  /** OHLC - 5 min (for indicators) */
  OHLC: 300_000,
  /** Market chart - 5 min */
  MARKET_CHART: 300_000,
  /** Categories - 5 min */
  CATEGORIES: 300_000,
} as const
