/**
 * @izan/mcp-browser-servers - MCP Server for browser-based cryptocurrency analysis
 * Uses TabServerTransport from @mcp-b/transports
 */

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import {
  handleGetTrendingCoins,
  handleSearchCoins,
  handleGetCoinMarkets,
  handleGetSimplePrice,
  handleGetCoinDetails,
  handleGetCoinOHLC,
  handleGetCoinMarketChart,
  handleGetGlobalMarketData,
  handleGetCoinCategories,
  handleCalculateTechnicalIndicators,
  handleAnalyzeCoin,
} from './tools.js'

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null

/**
 * Start the crypto-analysis MCP server
 * Returns true if started successfully, false if already running
 */
export async function startCryptoAnalysisServer(): Promise<boolean> {
  if (serverInstance) {
    return false // Already running
  }

  const server = new McpServer(
    {
      name: 'izan-crypto-analysis',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register tools using McpServer high-level API
  server.registerTool('get_trending_coins', {
    description:
      'Get currently trending cryptocurrency coins by search volume on CoinGecko. Returns top trending coins with their names, symbols, market cap ranks, and BTC prices. Use this to discover what coins are gaining attention.',
    inputSchema: {},
  }, async () => {
    const result = await handleGetTrendingCoins({})
    return result
  })

  server.registerTool('search_coins', {
    description:
      'Search for cryptocurrency coins by name or symbol. Returns matching coins with IDs needed for other tools. Use this first to find the CoinGecko ID for a coin.',
    inputSchema: {
      query: z.string().describe('Search query (coin name or symbol, e.g. "bitcoin", "ETH", "solana")'),
    },
  }, async ({ query }) => {
    const result = await handleSearchCoins({ query })
    return result
  })

  server.registerTool('get_coin_markets', {
    description:
      'Get market data for multiple coins: price, volume, market cap, price changes (1h/24h/7d), ATH, supply info. Can filter by specific coin IDs or return top coins by market cap.',
    inputSchema: {
      ids: z.string().optional().describe('Comma-separated coin IDs (e.g. "bitcoin,ethereum,solana"). Leave empty for top coins by market cap.'),
      vs_currency: z.string().optional().describe('Target currency (default: usd)'),
      per_page: z.number().optional().describe('Results per page (max 250, default 20)'),
      page: z.number().optional().describe('Page number (default 1)'),
      price_change_percentage: z.string().optional().describe('Include % change for periods (e.g. "1h,24h,7d")'),
    },
  }, async (args) => {
    const result = await handleGetCoinMarkets(args)
    return result
  })

  server.registerTool('get_simple_price', {
    description:
      'Quick price lookup for multiple coins. Returns current price, market cap, 24h volume, and 24h change. Faster than get_coin_markets for simple price checks.',
    inputSchema: {
      ids: z.string().describe('Comma-separated coin IDs (e.g. "bitcoin,ethereum,solana")'),
      vs_currencies: z.string().optional().describe('Target currencies (default: usd)'),
      include_market_cap: z.boolean().optional().describe('Include market cap (default: true)'),
      include_24hr_vol: z.boolean().optional().describe('Include 24h volume (default: true)'),
      include_24hr_change: z.boolean().optional().describe('Include 24h price change (default: true)'),
    },
  }, async (args) => {
    const result = await handleGetSimplePrice(args)
    return result
  })

  server.registerTool('get_coin_details', {
    description:
      'Get deep fundamental data for a single coin: description, genesis date, developer score, community score, liquidity score, market data, links. Use for fundamental analysis and trustworthiness assessment.',
    inputSchema: {
      id: z.string().describe('Coin ID (e.g. "bitcoin", "ethereum"). Use search_coins to find IDs.'),
    },
  }, async ({ id }) => {
    const result = await handleGetCoinDetails({ id })
    return result
  })

  server.registerTool('get_coin_ohlc', {
    description:
      'Get OHLC (Open/High/Low/Close) candlestick data for a coin. Use for chart analysis and as input for technical indicators.',
    inputSchema: {
      id: z.string().describe('Coin ID (e.g. "bitcoin")'),
      days: z.string().optional().describe('Data range: "1", "7", "14", "30", "90", "180", "365", or "max" (default: "7")'),
      vs_currency: z.string().optional().describe('Target currency (default: usd)'),
    },
  }, async (args) => {
    const result = await handleGetCoinOHLC(args)
    return result
  })

  server.registerTool('get_coin_market_chart', {
    description:
      'Get historical price, volume, and market cap data with automatic granularity (5min for 1 day, hourly for 2-90 days, daily for 90+ days). More detailed than OHLC for price trends.',
    inputSchema: {
      id: z.string().describe('Coin ID (e.g. "bitcoin")'),
      days: z.string().optional().describe('Data range in days: "1", "7", "14", "30", "90", "180", "365", "max" (default: "7")'),
      vs_currency: z.string().optional().describe('Target currency (default: usd)'),
    },
  }, async (args) => {
    const result = await handleGetCoinMarketChart(args)
    return result
  })

  server.registerTool('get_global_market_data', {
    description:
      'Get global cryptocurrency market statistics: total market cap, BTC/ETH dominance, number of active coins and exchanges, 24h market cap change. Use for overall market sentiment.',
    inputSchema: {},
  }, async () => {
    const result = await handleGetGlobalMarketData({})
    return result
  })

  server.registerTool('get_coin_categories', {
    description:
      'Get cryptocurrency categories with market data (DeFi, Layer 1, Layer 2, Gaming, Meme, etc.). Shows category market caps, 24h changes, volumes, and top coins per category.',
    inputSchema: {
      order: z.string().optional().describe('Sort: market_cap_desc, market_cap_asc, name_desc, name_asc, market_cap_change_24h_desc, market_cap_change_24h_asc (default: market_cap_desc)'),
    },
  }, async (args) => {
    const result = await handleGetCoinCategories(args)
    return result
  })

  server.registerTool('calculate_technical_indicators', {
    description:
      'Calculate technical analysis indicators for a coin: RSI, MACD, Bollinger Bands, EMA (9/21/50), SMA (20/50/200), ATR, Stochastic, ADX. Fetches OHLC data and computes all indicators with buy/sell signals. Use 30+ days for reliable indicators.',
    inputSchema: {
      id: z.string().describe('Coin ID (e.g. "bitcoin")'),
      days: z.string().optional().describe('OHLC data range: "14", "30", "90", "180", "365" (default: "30"). More days = more accurate long-term indicators.'),
      vs_currency: z.string().optional().describe('Target currency (default: usd)'),
    },
  }, async (args) => {
    const result = await handleCalculateTechnicalIndicators(args)
    return result
  })

  server.registerTool('analyze_coin', {
    description:
      'Full analysis report for a coin: combines market data, fundamental scores (developer/community/liquidity), technical indicators (RSI/MACD/BB/EMA/SMA/ATR/Stochastic/ADX), momentum score, trust score, and overall signal (bullish/bearish/neutral). This is the most comprehensive single-call analysis tool.',
    inputSchema: {
      id: z.string().describe('Coin ID (e.g. "bitcoin", "ethereum", "solana"). Use search_coins first if unsure of the ID.'),
      vs_currency: z.string().optional().describe('Target currency (default: usd)'),
    },
  }, async (args) => {
    const result = await handleAnalyzeCoin(args)
    return result
  })

  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId: 'izan-crypto-analysis',
  })
  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  return true
}

/**
 * Stop the crypto-analysis MCP server
 */
export async function stopCryptoAnalysisServer(): Promise<void> {
  if (serverInstance) {
    try {
      await serverInstance.close()
    } catch {
      // Ignore close errors
    }
    serverInstance = null
  }
  if (transportInstance) {
    try {
      await transportInstance.close()
    } catch {
      // Ignore close errors
    }
    transportInstance = null
  }
}

/**
 * Check if server is running
 */
export function isCryptoAnalysisServerRunning(): boolean {
  return serverInstance !== null
}

export { setCoinGeckoApiKey } from './coingecko.js'
