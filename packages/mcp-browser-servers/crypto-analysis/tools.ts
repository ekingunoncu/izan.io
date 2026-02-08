/**
 * @izan/mcp-browser-servers - Crypto analysis MCP tool definitions
 */

import { z } from 'zod'
import {
  getTrendingCoins,
  searchCoins,
  getCoinMarkets,
  getSimplePrice,
  getCoinDetails,
  getCoinOHLC,
  getCoinMarketChart,
  getGlobalMarketData,
  getCoinCategories,
} from './coingecko.js'
import { calculateAllIndicators } from './indicators.js'
import type { AnalysisReport, MomentumScore, TrustScore, SignalDirection } from './types.js'

type ToolResult = { content: Array<{ type: 'text'; text: string }> }

function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

// ─── Tool Handlers ─────────────────────────────────────────────────────────────

async function handleGetTrendingCoins(
  _args: Record<string, unknown>,
): Promise<ToolResult> {
  const data = await getTrendingCoins()
  const coins = data.coins.map((c) => ({
    id: c.item.id,
    name: c.item.name,
    symbol: c.item.symbol,
    market_cap_rank: c.item.market_cap_rank,
    price_btc: c.item.price_btc,
    score: c.item.score,
  }))
  return jsonResult({ trending_coins: coins, count: coins.length })
}

async function handleSearchCoins(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    query: z.string().describe('Search query (coin name or symbol)'),
  })
  const { query } = schema.parse(args)
  const data = await searchCoins(query)
  return jsonResult({
    coins: data.coins.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      market_cap_rank: c.market_cap_rank,
    })),
    total_results: data.coins.length,
  })
}

async function handleGetCoinMarkets(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    ids: z
      .string()
      .optional()
      .describe('Comma-separated coin IDs (e.g. "bitcoin,ethereum,solana"). If empty, returns top coins by market cap.'),
    vs_currency: z.string().optional().default('usd').describe('Target currency (default: usd)'),
    per_page: z.number().optional().default(20).describe('Results per page (max 250, default 20)'),
    page: z.number().optional().default(1).describe('Page number (default 1)'),
    price_change_percentage: z
      .string()
      .optional()
      .default('1h,24h,7d')
      .describe('Include price change % for periods (e.g. "1h,24h,7d")'),
  })
  const { ids, vs_currency, per_page, page, price_change_percentage } = schema.parse(args)

  const data = await getCoinMarkets({
    ids,
    vs_currency,
    per_page,
    page,
    price_change_percentage,
  })

  return jsonResult({
    coins: data.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      current_price: c.current_price,
      market_cap: c.market_cap,
      market_cap_rank: c.market_cap_rank,
      total_volume: c.total_volume,
      high_24h: c.high_24h,
      low_24h: c.low_24h,
      price_change_24h: c.price_change_24h,
      price_change_percentage_24h: c.price_change_percentage_24h,
      price_change_percentage_1h: c.price_change_percentage_1h_in_currency,
      price_change_percentage_7d: c.price_change_percentage_7d_in_currency,
      circulating_supply: c.circulating_supply,
      total_supply: c.total_supply,
      ath: c.ath,
      ath_change_percentage: c.ath_change_percentage,
    })),
    count: data.length,
  })
}

async function handleGetSimplePrice(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    ids: z.string().describe('Comma-separated coin IDs (e.g. "bitcoin,ethereum")'),
    vs_currencies: z.string().optional().default('usd').describe('Target currencies (default: usd)'),
    include_market_cap: z.boolean().optional().default(true),
    include_24hr_vol: z.boolean().optional().default(true),
    include_24hr_change: z.boolean().optional().default(true),
  })
  const parsed = schema.parse(args)
  const data = await getSimplePrice(parsed)
  return jsonResult(data)
}

async function handleGetCoinDetails(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    id: z.string().describe('Coin ID (e.g. "bitcoin", "ethereum")'),
  })
  const { id } = schema.parse(args)
  const data = await getCoinDetails(id)

  return jsonResult({
    id: data.id,
    symbol: data.symbol,
    name: data.name,
    description: data.description?.en?.slice(0, 500) ?? '',
    genesis_date: data.genesis_date,
    market_cap_rank: data.market_cap_rank,
    coingecko_rank: data.coingecko_rank,
    scores: {
      coingecko_score: data.coingecko_score,
      developer_score: data.developer_score,
      community_score: data.community_score,
      liquidity_score: data.liquidity_score,
      public_interest_score: data.public_interest_score,
    },
    market_data: {
      current_price_usd: data.market_data?.current_price?.usd,
      market_cap_usd: data.market_data?.market_cap?.usd,
      total_volume_usd: data.market_data?.total_volume?.usd,
      high_24h_usd: data.market_data?.high_24h?.usd,
      low_24h_usd: data.market_data?.low_24h?.usd,
      price_change_24h: data.market_data?.price_change_percentage_24h,
      price_change_7d: data.market_data?.price_change_percentage_7d,
      price_change_30d: data.market_data?.price_change_percentage_30d,
      circulating_supply: data.market_data?.circulating_supply,
      total_supply: data.market_data?.total_supply,
      max_supply: data.market_data?.max_supply,
    },
    links: {
      homepage: data.links?.homepage?.filter(Boolean) ?? [],
      github: data.links?.repos_url?.github?.filter(Boolean) ?? [],
    },
    last_updated: data.last_updated,
  })
}

async function handleGetCoinOHLC(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    id: z.string().describe('Coin ID (e.g. "bitcoin")'),
    days: z
      .string()
      .optional()
      .default('7')
      .describe('Data range in days: 1, 7, 14, 30, 90, 180, 365, or max'),
    vs_currency: z.string().optional().default('usd'),
  })
  const { id, days, vs_currency } = schema.parse(args)
  const data = await getCoinOHLC(id, { days, vs_currency })

  return jsonResult({
    coin_id: id,
    days,
    candle_count: data.length,
    candles: data.map(([ts, open, high, low, close]) => ({
      timestamp: ts,
      date: new Date(ts).toISOString(),
      open,
      high,
      low,
      close,
    })),
  })
}

async function handleGetCoinMarketChart(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    id: z.string().describe('Coin ID (e.g. "bitcoin")'),
    days: z
      .string()
      .optional()
      .default('7')
      .describe('Data range in days (1, 7, 14, 30, 90, 180, 365, max). Granularity auto: 5min/1d, hourly/2-90d, daily/90+d'),
    vs_currency: z.string().optional().default('usd'),
  })
  const { id, days, vs_currency } = schema.parse(args)
  const data = await getCoinMarketChart(id, { days, vs_currency })

  return jsonResult({
    coin_id: id,
    days,
    data_points: data.prices.length,
    prices: data.prices.map(([ts, price]) => ({
      timestamp: ts,
      date: new Date(ts).toISOString(),
      price,
    })),
    total_volumes: data.total_volumes.map(([ts, vol]) => ({
      timestamp: ts,
      volume: vol,
    })),
    market_caps: data.market_caps.map(([ts, cap]) => ({
      timestamp: ts,
      market_cap: cap,
    })),
  })
}

async function handleGetGlobalMarketData(
  _args: Record<string, unknown>,
): Promise<ToolResult> {
  const data = await getGlobalMarketData()
  const d = data.data
  return jsonResult({
    active_cryptocurrencies: d.active_cryptocurrencies,
    markets: d.markets,
    total_market_cap_usd: d.total_market_cap?.usd,
    total_volume_usd: d.total_volume?.usd,
    btc_dominance: d.market_cap_percentage?.btc,
    eth_dominance: d.market_cap_percentage?.eth,
    market_cap_change_24h_pct: d.market_cap_change_percentage_24h_usd,
    updated_at: d.updated_at,
  })
}

async function handleGetCoinCategories(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    order: z
      .string()
      .optional()
      .default('market_cap_desc')
      .describe('Sort order: market_cap_desc, market_cap_asc, name_desc, name_asc, market_cap_change_24h_desc, market_cap_change_24h_asc'),
  })
  const { order } = schema.parse(args)
  const data = await getCoinCategories({ order })

  return jsonResult({
    categories: data.slice(0, 30).map((c) => ({
      id: c.id,
      name: c.name,
      market_cap: c.market_cap,
      market_cap_change_24h: c.market_cap_change_24h,
      volume_24h: c.volume_24h,
      top_3_coins: c.top_3_coins,
    })),
    total: data.length,
  })
}

async function handleCalculateTechnicalIndicators(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const schema = z.object({
    id: z.string().describe('Coin ID (e.g. "bitcoin")'),
    days: z
      .string()
      .optional()
      .default('30')
      .describe('OHLC data range in days: 1, 7, 14, 30, 90, 180, 365, max. More days = more accurate long-term indicators.'),
    vs_currency: z.string().optional().default('usd'),
  })
  const { id, days, vs_currency } = schema.parse(args)

  const candles = await getCoinOHLC(id, { days, vs_currency })

  if (candles.length < 15) {
    return jsonResult({
      error: `Not enough OHLC data for indicators (got ${candles.length} candles, need at least 15). Try a longer period.`,
    })
  }

  const indicators = calculateAllIndicators(candles)

  return jsonResult({
    coin_id: id,
    days,
    candle_count: candles.length,
    indicators: {
      rsi: { latest: indicators.rsi.latest, signal: indicators.rsi.signal },
      macd: { latest: indicators.macd.latest, signal: indicators.macd.signal },
      bollinger_bands: {
        latest: indicators.bollingerBands.latest,
        signal: indicators.bollingerBands.signal,
      },
      ema: {
        ema9: indicators.ema.ema9.latest,
        ema21: indicators.ema.ema21.latest,
        ema50: indicators.ema.ema50.latest,
      },
      sma: {
        sma20: indicators.sma.sma20.latest,
        sma50: indicators.sma.sma50.latest,
        sma200: indicators.sma.sma200.latest,
      },
      atr: { latest: indicators.atr.latest },
      stochastic: {
        latest: indicators.stochastic.latest,
        signal: indicators.stochastic.signal,
      },
      adx: {
        latest: indicators.adx.latest,
        signal: indicators.adx.signal,
        trend_strength: indicators.adx.trendStrength,
      },
    },
    overall_signal: indicators.overallSignal,
    signal_summary: indicators.signalSummary,
  })
}

async function handleAnalyzeCoin(args: Record<string, unknown>): Promise<ToolResult> {
  const schema = z.object({
    id: z.string().describe('Coin ID (e.g. "bitcoin", "ethereum", "solana")'),
    vs_currency: z.string().optional().default('usd'),
  })
  const { id, vs_currency } = schema.parse(args)

  // Fetch data sequentially to respect rate limits
  const details = await getCoinDetails(id)
  const ohlcCandles = await getCoinOHLC(id, { days: '30', vs_currency })

  // Technical indicators
  let technicalIndicators: AnalysisReport['technicalIndicators'] | null = null
  if (ohlcCandles.length >= 15) {
    technicalIndicators = calculateAllIndicators(ohlcCandles)
  }

  // Momentum score
  const priceChange24h = details.market_data?.price_change_percentage_24h ?? null
  const priceChange7d = details.market_data?.price_change_percentage_7d ?? null
  const volume = details.market_data?.total_volume?.usd ?? 0
  const marketCap = details.market_data?.market_cap?.usd ?? 1
  const volumeToMarketCap = volume / marketCap

  const momentumRaw =
    ((priceChange24h ?? 0) * 0.4 + (priceChange7d ?? 0) * 0.3) * volumeToMarketCap * 100 +
    volumeToMarketCap * 50
  const momentum: MomentumScore = {
    score: Math.round(Math.max(-100, Math.min(100, momentumRaw)) * 100) / 100,
    priceChange24h,
    priceChange7d,
    volumeToMarketCap: Math.round(volumeToMarketCap * 10000) / 10000,
  }

  // Trust score
  const devScore = details.developer_score ?? null
  const communityScore = details.community_score ?? null
  const liquidityScore = details.liquidity_score ?? null
  const publicInterestScore = details.public_interest_score ?? null

  const validScores = [devScore, communityScore, liquidityScore, publicInterestScore].filter(
    (s): s is number => s !== null,
  )
  const trustScoreRaw = validScores.length > 0
    ? validScores.reduce((a, b) => a + b, 0) / validScores.length
    : 0

  const trust: TrustScore = {
    score: Math.round(trustScoreRaw * 100) / 100,
    developerScore: devScore,
    communityScore,
    liquidityScore,
    publicInterestScore,
  }

  // Overall signal
  let overallSignal: SignalDirection = 'neutral'
  if (technicalIndicators) {
    overallSignal = technicalIndicators.overallSignal
  }
  // Adjust based on momentum
  if (momentum.score > 20 && overallSignal !== 'bearish') overallSignal = 'bullish'
  else if (momentum.score < -20 && overallSignal !== 'bullish') overallSignal = 'bearish'

  const report: AnalysisReport = {
    coin: {
      id: details.id,
      name: details.name,
      symbol: details.symbol,
    },
    market: {
      price: details.market_data?.current_price?.usd ?? 0,
      marketCap: details.market_data?.market_cap?.usd ?? 0,
      volume: details.market_data?.total_volume?.usd ?? 0,
      high24h: details.market_data?.high_24h?.usd ?? 0,
      low24h: details.market_data?.low_24h?.usd ?? 0,
      priceChange24h,
      priceChange7d,
      priceChange30d: details.market_data?.price_change_percentage_30d ?? null,
      marketCapRank: details.market_cap_rank,
      circulatingSupply: details.market_data?.circulating_supply ?? null,
      totalSupply: details.market_data?.total_supply ?? null,
      maxSupply: details.market_data?.max_supply ?? null,
    },
    technicalIndicators: technicalIndicators ?? ({} as AnalysisReport['technicalIndicators']),
    momentum,
    trust,
    overallSignal,
    generatedAt: new Date().toISOString(),
  }

  return jsonResult(report)
}

// ─── Tool Definitions ──────────────────────────────────────────────────────────

export const TOOLS = [
  {
    name: 'get_trending_coins',
    description:
      'Get currently trending cryptocurrency coins by search volume on CoinGecko. Returns top trending coins with their names, symbols, market cap ranks, and BTC prices. Use this to discover what coins are gaining attention.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: handleGetTrendingCoins,
  },
  {
    name: 'search_coins',
    description:
      'Search for cryptocurrency coins by name or symbol. Returns matching coins with IDs needed for other tools. Use this first to find the CoinGecko ID for a coin.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (coin name or symbol, e.g. "bitcoin", "ETH", "solana")',
        },
      },
      required: ['query'],
    },
    handler: handleSearchCoins,
  },
  {
    name: 'get_coin_markets',
    description:
      'Get market data for multiple coins: price, volume, market cap, price changes (1h/24h/7d), ATH, supply info. Can filter by specific coin IDs or return top coins by market cap.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'string',
          description:
            'Comma-separated coin IDs (e.g. "bitcoin,ethereum,solana"). Leave empty for top coins by market cap.',
        },
        vs_currency: { type: 'string', description: 'Target currency (default: usd)' },
        per_page: { type: 'number', description: 'Results per page (max 250, default 20)' },
        page: { type: 'number', description: 'Page number (default 1)' },
        price_change_percentage: {
          type: 'string',
          description: 'Include % change for periods (e.g. "1h,24h,7d")',
        },
      },
    },
    handler: handleGetCoinMarkets,
  },
  {
    name: 'get_simple_price',
    description:
      'Quick price lookup for multiple coins. Returns current price, market cap, 24h volume, and 24h change. Faster than get_coin_markets for simple price checks.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'string',
          description: 'Comma-separated coin IDs (e.g. "bitcoin,ethereum,solana")',
        },
        vs_currencies: { type: 'string', description: 'Target currencies (default: usd)' },
        include_market_cap: { type: 'boolean', description: 'Include market cap (default: true)' },
        include_24hr_vol: { type: 'boolean', description: 'Include 24h volume (default: true)' },
        include_24hr_change: {
          type: 'boolean',
          description: 'Include 24h price change (default: true)',
        },
      },
      required: ['ids'],
    },
    handler: handleGetSimplePrice,
  },
  {
    name: 'get_coin_details',
    description:
      'Get deep fundamental data for a single coin: description, genesis date, developer score, community score, liquidity score, market data, links. Use for fundamental analysis and trustworthiness assessment.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Coin ID (e.g. "bitcoin", "ethereum"). Use search_coins to find IDs.',
        },
      },
      required: ['id'],
    },
    handler: handleGetCoinDetails,
  },
  {
    name: 'get_coin_ohlc',
    description:
      'Get OHLC (Open/High/Low/Close) candlestick data for a coin. Use for chart analysis and as input for technical indicators.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Coin ID (e.g. "bitcoin")' },
        days: {
          type: 'string',
          description: 'Data range: "1", "7", "14", "30", "90", "180", "365", or "max" (default: "7")',
        },
        vs_currency: { type: 'string', description: 'Target currency (default: usd)' },
      },
      required: ['id'],
    },
    handler: handleGetCoinOHLC,
  },
  {
    name: 'get_coin_market_chart',
    description:
      'Get historical price, volume, and market cap data with automatic granularity (5min for 1 day, hourly for 2-90 days, daily for 90+ days). More detailed than OHLC for price trends.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Coin ID (e.g. "bitcoin")' },
        days: {
          type: 'string',
          description: 'Data range in days: "1", "7", "14", "30", "90", "180", "365", "max" (default: "7")',
        },
        vs_currency: { type: 'string', description: 'Target currency (default: usd)' },
      },
      required: ['id'],
    },
    handler: handleGetCoinMarketChart,
  },
  {
    name: 'get_global_market_data',
    description:
      'Get global cryptocurrency market statistics: total market cap, BTC/ETH dominance, number of active coins and exchanges, 24h market cap change. Use for overall market sentiment.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: handleGetGlobalMarketData,
  },
  {
    name: 'get_coin_categories',
    description:
      'Get cryptocurrency categories with market data (DeFi, Layer 1, Layer 2, Gaming, Meme, etc.). Shows category market caps, 24h changes, volumes, and top coins per category.',
    inputSchema: {
      type: 'object',
      properties: {
        order: {
          type: 'string',
          description:
            'Sort: market_cap_desc, market_cap_asc, name_desc, name_asc, market_cap_change_24h_desc, market_cap_change_24h_asc (default: market_cap_desc)',
        },
      },
    },
    handler: handleGetCoinCategories,
  },
  {
    name: 'calculate_technical_indicators',
    description:
      'Calculate technical analysis indicators for a coin: RSI, MACD, Bollinger Bands, EMA (9/21/50), SMA (20/50/200), ATR, Stochastic, ADX. Fetches OHLC data and computes all indicators with buy/sell signals. Use 30+ days for reliable indicators.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Coin ID (e.g. "bitcoin")' },
        days: {
          type: 'string',
          description:
            'OHLC data range: "14", "30", "90", "180", "365" (default: "30"). More days = more accurate long-term indicators.',
        },
        vs_currency: { type: 'string', description: 'Target currency (default: usd)' },
      },
      required: ['id'],
    },
    handler: handleCalculateTechnicalIndicators,
  },
  {
    name: 'analyze_coin',
    description:
      'Full analysis report for a coin: combines market data, fundamental scores (developer/community/liquidity), technical indicators (RSI/MACD/BB/EMA/SMA/ATR/Stochastic/ADX), momentum score, trust score, and overall signal (bullish/bearish/neutral). This is the most comprehensive single-call analysis tool.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Coin ID (e.g. "bitcoin", "ethereum", "solana"). Use search_coins first if unsure of the ID.',
        },
        vs_currency: { type: 'string', description: 'Target currency (default: usd)' },
      },
      required: ['id'],
    },
    handler: handleAnalyzeCoin,
  },
]
