/**
 * @izan/mcp-servers-namecheap - Namecheap domain check tool
 */

import { z } from 'zod'
import type { ToolDef } from '@izan/mcp-servers-shared'
import { NamecheapClient } from './namecheap-client.js'
import { bulkCheckRDAP } from './rdap-helper.js'

const checkDomainSchema = z.object({
  domain: z.string().describe("The domain name to check (e.g., 'example.com')"),
})

const client = new NamecheapClient()

async function handleCheckDomain(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { domain } = checkDomainSchema.parse(args)

  if (!domain.includes('.')) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Invalid domain format. Please include a TLD (e.g., example.com)',
        },
      ],
    }
  }

  const result = await client.checkDomain(domain)

  if (result.error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to check availability for domain: ${domain}. ${result.error}`,
        },
      ],
    }
  }

  const statusEmoji = result.available ? '✅' : '❌'
  const status = result.available ? 'AVAILABLE' : 'NOT AVAILABLE'
  const premiumInfo =
    result.isPremium && result.premiumRegistrationPrice
      ? `\nPremium: $${result.premiumRegistrationPrice.toFixed(2)}`
      : ''

  const resultText = `${statusEmoji} Domain: ${result.domain ?? domain}
Status: ${status}${premiumInfo}

Register at Namecheap: https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`

  return {
    content: [
      {
        type: 'text' as const,
        text: resultText,
      },
    ],
  }
}

const getDomainPrice: ToolDef = {
  name: 'get_domain_price',
  description:
    'Get Namecheap registration price for a domain. Use ONLY after confirming availability with check_domains_availability (domain-check-client). Returns availability, price, and premium status.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: "The domain name to get price for (e.g., 'example.com')",
      },
    },
    required: ['domain'],
  },
  handler: handleCheckDomain,
}

const suggestDomainsSchema = z.object({
  keyword: z
    .string()
    .describe(
      "Keyword or phrase to get domain suggestions for (e.g., 'tech startup', 'coffee shop')",
    ),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of suggestions (default: 20, max: 50)'),
})

async function handleSuggestDomains(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { keyword, limit } = suggestDomainsSchema.parse(args)
  const maxResults = Math.min(limit ?? 10, 20)

  const slug = keyword
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ąćęłńóśźżığüöşç]/g, (c) => {
      const map: Record<string, string> = {
        ą: 'a',
        ć: 'c',
        ę: 'e',
        ł: 'l',
        ń: 'n',
        ó: 'o',
        ś: 's',
        ź: 'z',
        ż: 'z',
        ı: 'i',
        ğ: 'g',
        ü: 'u',
        ö: 'o',
        ş: 's',
        ç: 'c',
      }
      return map[c] ?? c
    })
    .replace(/[^a-z0-9-]/g, '')

  if (!slug) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Could not generate domains for "${keyword}". Use letters/numbers only.`,
        },
      ],
    }
  }

  const tlds = ['com', 'io', 'net', 'co', 'app']
  const domainsToCheck = tlds.slice(0, maxResults).map((tld) => `${slug}.${tld}`)

  // 1. RDAP ile müsaitlik kontrolü (hızlı, API key gerektirmez)
  const rdapResults = await bulkCheckRDAP(domainsToCheck, 4)
  const rdapAvailableDomains = rdapResults
    .filter((r) => r.available)
    .map((r) => r.domain)

  // 2. Sadece müsait domainler için Namecheap fiyat sorgusu
  const namecheapResults =
    rdapAvailableDomains.length > 0 ? await client.checkDomainsBulk(rdapAvailableDomains) : []

  // 3. Sonuçları birleştir
  const namecheapByDomain = new Map(
    namecheapResults.map((r) => [r.domain.toLowerCase(), r]),
  )
  const results: Array<{
    domain: string
    available: boolean
    isPremium?: boolean
    premiumRegistrationPrice?: number
    error?: string
  }> = domainsToCheck.map((domain) => {
    const rdap = rdapResults.find((r) => r.domain === domain)
    if (!rdap?.available) {
      // RDAP'te müsait değil
      return {
        domain,
        available: false,
        error: rdap?.error,
      }
    }
    // RDAP'te müsait - Namecheap fiyatını kontrol et
    const nc = namecheapByDomain.get(domain.toLowerCase())
    return {
      domain,
      available: nc?.available ?? true, // RDAP'te müsait ama Namecheap'ta kontrol edilemediyse müsait say
      isPremium: nc?.isPremium,
      premiumRegistrationPrice: nc?.premiumRegistrationPrice,
      error: nc?.error,
    }
  })

  const availableDomains = results
    .filter((r) => r.available)
    .map((r) => {
      const premium =
        'isPremium' in r && r.isPremium && 'premiumRegistrationPrice' in r && r.premiumRegistrationPrice
          ? ` (premium $${r.premiumRegistrationPrice.toFixed(2)})`
          : ''
      return `✅ ${r.domain}${premium}`
    })
  const unavailableDomains = results
    .filter((r) => !r.available && !r.error)
    .map((r) => `❌ ${r.domain}`)
  const withErrors = results.filter((r) => r.error)

  let responseText = `Domains for "${keyword}" (${slug}.*):\n\n`
  if (availableDomains.length > 0) {
    responseText += `Available (${availableDomains.length}):\n${availableDomains.join('\n')}\n\n`
  }
  if (unavailableDomains.length > 0) {
    responseText += `Not Available (${unavailableDomains.length}):\n${unavailableDomains.join('\n')}\n\n`
  }
  if (availableDomains.length > 0 || unavailableDomains.length > 0) {
    responseText += `Register at Namecheap: https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(slug)}`
  }
  if (availableDomains.length === 0 && unavailableDomains.length === 0) {
    const errMsg = withErrors[0]?.error ?? 'Unknown error'
    const domainsList = domainsToCheck.slice(0, 10).join(', ')
    responseText = `Got ${domainsToCheck.length} domains (e.g. ${domainsList}) but could not check availability: ${errMsg}. Ensure NAMECHEAP_API_USER, NAMECHEAP_API_KEY, and NAMECHEAP_CLIENT_IP (whitelisted IP) are set.`
  }

  return {
    content: [{ type: 'text' as const, text: responseText.trim() }],
  }
}

const suggestDomains: ToolDef = {
  name: 'suggest_domains',
  description:
    'Get domain suggestions for a keyword: builds keyword.com, .io, .net, .co, .app. Uses RDAP for availability, then Namecheap for pricing on available domains. For custom domain lists, use check_domains_availability first, then get_domains_price.',
  inputSchema: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description:
          "Keyword or phrase to get domain suggestions for (e.g., 'tech startup', 'coffee shop')",
      },
      limit: {
        type: 'number',
        description: 'Maximum number of suggestions (default: 20, max: 50)',
      },
    },
    required: ['keyword'],
  },
  handler: handleSuggestDomains,
}

// ─── get_domains_price ─────────────────────────────────────────────────────

const checkDomainsBulkSchema = z.object({
  domains: z
    .string()
    .describe('Comma-separated list of domains to check (e.g. "example.com, test.io, myapp.net"). Max 50.'),
})

async function handleCheckDomainsBulk(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { domains } = checkDomainsBulkSchema.parse(args)
  const list = domains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.includes('.'))
  const unique = [...new Set(list)].slice(0, 50)

  if (unique.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Invalid input. Provide comma-separated domains (e.g. example.com, test.io). Max 50.',
        },
      ],
    }
  }

  const results = await client.checkDomainsBulk(unique)

  const availableDomains = results.filter((r) => r.available)
  const unavailableDomains = results.filter((r) => !r.available && !r.error)
  const withErrors = results.filter((r) => r.error)

  let responseText = `Bulk check (${unique.length} domains):\n\n`
  if (availableDomains.length > 0) {
    responseText += `Available (${availableDomains.length}):\n`
    responseText += availableDomains
      .map((r) => {
        const premium = r.isPremium && r.premiumRegistrationPrice ? ` (premium $${r.premiumRegistrationPrice.toFixed(2)})` : ''
        return `✅ ${r.domain}${premium}`
      })
      .join('\n') + '\n\n'
  }
  if (unavailableDomains.length > 0) {
    responseText += `Not Available (${unavailableDomains.length}):\n`
    responseText += unavailableDomains.map((r) => `❌ ${r.domain}`).join('\n') + '\n\n'
  }
  if (withErrors.length > 0) {
    responseText += `Errors: ${withErrors.map((r) => `${r.domain}: ${r.error}`).join('; ')}\n\n`
  }
  responseText += `Register at Namecheap: https://www.namecheap.com/domains/registration/results/`

  return {
    content: [{ type: 'text' as const, text: responseText.trim() }],
  }
}

const getDomainsPrice: ToolDef = {
  name: 'get_domains_price',
  description:
    'Get Namecheap registration prices for multiple domains. Use ONLY after confirming availability with check_domains_availability (domain-check-client). Comma-separated list, max 50 domains.',
  inputSchema: {
    type: 'object',
    properties: {
      domains: {
        type: 'string',
        description: 'Comma-separated domains to get prices for (e.g. "example.com, test.io, myapp.net")',
      },
    },
    required: ['domains'],
  },
  handler: handleCheckDomainsBulk,
}

// ─── list_tlds ─────────────────────────────────────────────────────────────

async function handleListTlds(
  _args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { tlds, error } = await client.getTldList()

  if (error) {
    return {
      content: [{ type: 'text' as const, text: `Failed to get TLD list: ${error}` }],
    }
  }

  const popular = ['com', 'net', 'org', 'io', 'co', 'app', 'dev', 'ai', 'xyz']
  const popularList = popular.filter((t) => tlds.includes(t))
  const other = tlds.filter((t) => !popular.includes(t)).slice(0, 50)

  let responseText = `Available TLDs (${tlds.length} total):\n\n`
  responseText += `Popular: ${popularList.join(', ')}\n\n`
  responseText += `Sample: ${other.slice(0, 30).join(', ')}`

  return {
    content: [{ type: 'text' as const, text: responseText }],
  }
}

const listTlds: ToolDef = {
  name: 'list_tlds',
  description: 'List available top-level domains (TLDs) at Namecheap.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: handleListTlds,
}

// ─── get_domain_info (Namecheap account domains only) ──────────────────────

const getDomainInfoSchema = z.object({
  domain: z.string().describe("Domain in your Namecheap account (e.g. 'mydomain.com')"),
})

async function handleGetDomainInfo(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { domain } = getDomainInfoSchema.parse(args)

  if (!domain.includes('.')) {
    return {
      content: [{ type: 'text' as const, text: 'Invalid domain format. Include TLD (e.g. example.com)' }],
    }
  }

  const info = await client.getDomainInfo(domain)

  if (info.error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get domain info for ${domain}: ${info.error}\n\nNote: This only works for domains in your Namecheap account.`,
        },
      ],
    }
  }

  let text = `Domain: ${info.domain ?? domain}\n`
  text += `Status: ${info.status ?? 'Unknown'}\n`
  text += `Owner: ${info.ownerName ?? 'N/A'}\n`
  text += `Your domain: ${info.isOwner ? 'Yes' : 'No'}\n`
  if (info.createdDate) text += `Created: ${info.createdDate}\n`
  if (info.expiredDate) text += `Expires: ${info.expiredDate}\n`
  if (info.isPremium) text += `Premium: Yes\n`
  if (info.whoisguardEnabled) text += `WhoisGuard: Enabled\n`

  return { content: [{ type: 'text' as const, text }] }
}

const getDomainInfo: ToolDef = {
  name: 'get_domain_info',
  description:
    'Get details for a domain in your Namecheap account: owner, created/expiry dates, status. Only works for domains you own at Namecheap.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: "Domain in your account (e.g. 'mydomain.com')" },
    },
    required: ['domain'],
  },
  handler: handleGetDomainInfo,
}

// ─── whois_lookup (any domain - registrar, owner, dates) ────────────────────

const whoisLookupSchema = z.object({
  domain: z.string().describe("Any domain to lookup (e.g. 'example.com')"),
})

const WHOIS_API = 'https://whois.env.pm/api'

async function handleWhoisLookup(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { domain } = whoisLookupSchema.parse(args)

  if (!domain.includes('.')) {
    return {
      content: [{ type: 'text' as const, text: 'Invalid domain format. Include TLD (e.g. example.com)' }],
    }
  }

  try {
    const res = await fetch(`${WHOIS_API}?domain=${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return { content: [{ type: 'text' as const, text: `WHOIS lookup failed: HTTP ${res.status}` }] }
    }

    const data = (await res.json()) as {
      domain?: string
      available?: boolean
      registrar?: string
      creation_date?: string
      expiration_date?: string | null
      updated_date?: string
      name_servers?: string[]
      contacts?: {
        registrant?: { name?: string; email?: string; organization?: string }
      }
    }

    let text = `Domain: ${data.domain ?? domain}\n`
    text += `Available: ${data.available ? 'Yes' : 'No'}\n`
    if (data.registrar) text += `Registrar: ${data.registrar}\n`
    if (data.creation_date) text += `Created: ${data.creation_date}\n`
    if (data.expiration_date) text += `Expires: ${data.expiration_date}\n`
    if (data.updated_date) text += `Updated: ${data.updated_date}\n`
    if (data.contacts?.registrant?.name) text += `Registrant: ${data.contacts.registrant.name}\n`
    if (data.contacts?.registrant?.organization) text += `Organization: ${data.contacts.registrant.organization}\n`
    if (data.name_servers?.length) text += `Nameservers: ${data.name_servers.slice(0, 3).join(', ')}\n`

    return { content: [{ type: 'text' as const, text }] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text' as const, text: `WHOIS lookup failed: ${msg}` }] }
  }
}

const whoisLookup: ToolDef = {
  name: 'whois_lookup',
  description:
    'Look up WHOIS info for any domain: registrar, creation/expiry dates, registrant (owner), nameservers. Works for any domain.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: "Domain to lookup (e.g. 'example.com')" },
    },
    required: ['domain'],
  },
  handler: handleWhoisLookup,
}

export const TOOLS: ToolDef[] = [
  getDomainPrice,
  suggestDomains,
  getDomainsPrice,
  listTlds,
  getDomainInfo,
  whoisLookup,
]
