/**
 * External API key definitions for MCP tools that require user-provided keys.
 * Keys are stored globally and shared across agents that use the same key id.
 */

export interface ExternalApiKeyDefinition {
  id: string
  name: string
  placeholder: string
  url: string
  descriptionKey: string
  /** Optional: link to pricing page (e.g. for CoinGecko) */
  pricingUrl?: string
}

export const EXTERNAL_API_KEY_DEFINITIONS: ExternalApiKeyDefinition[] = [
  {
    id: 'serp_api',
    name: 'Serp API',
    placeholder: 'your apikey here',
    url: 'https://serpapi.com/dashboard',
    descriptionKey: 'settings.serpApiDesc',
    pricingUrl: 'https://serpapi.com/pricing',
  },
  {
    id: 'coingecko_api',
    name: 'CoinGecko API',
    placeholder: 'CG-...',
    url: 'https://www.coingecko.com/en/developers/dashboard',
    descriptionKey: 'settings.coingeckoApiDesc',
    pricingUrl: 'https://www.coingecko.com/en/api/pricing',
  },
]
