/**
 * @izan/mcp-browser-servers - CoinPaprika API fallback
 *
 * Used when CoinGecko returns 429. Free tier: 20,000 calls/month (~666/day).
 * No API key, CORS supported. OHLC historical limited to 24h on free tier - not used for indicators.
 */

const BASE_URL = 'https://api.coinpaprika.com/v1'

/** CoinGecko ID -> CoinPaprika ID (top coins) */
export const COINGECKO_TO_COINPAPRIKA: Record<string, string> = {
  bitcoin: 'btc-bitcoin',
  ethereum: 'eth-ethereum',
  tether: 'usdt-tether',
  solana: 'sol-solana',
  'usd-coin': 'usdc-usd-coin',
  'binancecoin': 'bnb-binance-coin',
  xrp: 'xrp-xrp',
  ripple: 'xrp-xrp',
  'cardano': 'ada-cardano',
  'avalanche-2': 'avax-avalanche',
  dogecoin: 'doge-dogecoin',
  'chainlink': 'link-chainlink',
  polkadot: 'dot-polkadot',
  tron: 'tron-tron',
  'matic-network': 'matic-polygon',
  polygon: 'matic-polygon',
  'litecoin': 'ltc-litecoin',
  'uniswap': 'uni-uniswap',
  'bitcoin-cash': 'bch-bitcoin-cash',
  'stellar': 'xlm-stellar',
  'cosmos': 'atom-cosmos',
  'aptos': 'apt-aptos',
  'arbitrum': 'arb-arbitrum',
  'optimism': 'op-optimism',
  'near': 'near-protocol',
  'filecoin': 'fil-filecoin',
  'internet-computer': 'icp-internet-computer',
  'hedera-hashgraph': 'hbar-hedera',
  'immutable-x': 'imx-immutable-x',
  'vechain': 'vet-vechain',
  'maker': 'mkr-maker',
  'aave': 'aave-aave',
  'the-graph': 'grt-the-graph',
  'algorand': 'algo-algorand',
  'render-token': 'rndr-render-token',
  'sui': 'sui-sui',
  'sei-network': 'sei-sei',
  'injective-protocol': 'inj-injective-protocol',
  'pepe': 'pepe-pepe',
  'bonk': 'bonk-bonk',
  'wrapped-bitcoin': 'wbtc-wrapped-bitcoin',
  'shiba-inu': 'shib-shiba-inu',
  'dai': 'dai-dai',
  'leo-token': 'leo-leo-token',
  'true-usd': 'tusd-true-usd',
  'monero': 'xmr-monero',
  'ethereum-classic': 'etc-ethereum-classic',
  'theta-token': 'theta-theta-network',
}

function toCoinPaprikaId(geckoId: string): string | null {
  return COINGECKO_TO_COINPAPRIKA[geckoId.toLowerCase()] ?? null
}

async function cpFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`CoinPaprika API error ${response.status}: ${await response.text()}`)
  }
  return response.json() as Promise<T>
}

/** Global market data - CoinPaprika format */
export interface CPGlobal {
  market_cap_usd: number
  volume_24h_usd: number
  bitcoin_dominance_percentage: number
  cryptocurrencies_number: number
  market_cap_change_24h: number
  last_updated: number
}

export async function getCPGlobal(): Promise<CPGlobal> {
  return cpFetch<CPGlobal>('/global')
}

/** Convert CP global to CoinGecko GlobalMarketData.data shape */
export function mapCPGlobalToGecko(cp: CPGlobal) {
  return {
    active_cryptocurrencies: cp.cryptocurrencies_number,
    upcoming_icos: 0,
    ongoing_icos: 0,
    ended_icos: 0,
    markets: 0,
    total_market_cap: { usd: cp.market_cap_usd },
    total_volume: { usd: cp.volume_24h_usd },
    market_cap_percentage: { btc: cp.bitcoin_dominance_percentage, eth: 0 },
    market_cap_change_percentage_24h_usd: cp.market_cap_change_24h,
    updated_at: cp.last_updated,
  }
}

/** Ticker - price, market cap, volume etc */
export interface CPTicker {
  id: string
  name: string
  symbol: string
  rank: number
  quotes: {
    USD: {
      price: number
      volume_24h: number
      market_cap: number
      percent_change_24h: number
      percent_change_7d: number
    }
  }
}

export async function getCPTicker(cpId: string): Promise<CPTicker | null> {
  try {
    return await cpFetch<CPTicker>(`/tickers/${cpId}`)
  } catch {
    return null
  }
}

/** Get simple price for multiple coins (fallback) - returns CoinGecko-like shape */
export async function getCPSimplePrice(
  geckoIds: string[],
): Promise<Record<string, { usd: number; usd_market_cap?: number; usd_24h_vol?: number; usd_24h_change?: number }>> {
  const result: Record<string, { usd: number; usd_market_cap?: number; usd_24h_vol?: number; usd_24h_change?: number }> = {}
  for (const id of geckoIds) {
    const cpId = toCoinPaprikaId(id)
    if (!cpId) continue
    const ticker = await getCPTicker(cpId)
    if (ticker?.quotes?.USD) {
      const q = ticker.quotes.USD
      result[id] = {
        usd: q.price,
        usd_market_cap: q.market_cap,
        usd_24h_vol: q.volume_24h,
        usd_24h_change: q.percent_change_24h,
      }
    }
  }
  return result
}
