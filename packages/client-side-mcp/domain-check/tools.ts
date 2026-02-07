/**
 * @izan/client-side-mcp-domain-check - Domain availability check tools
 */

import { z } from 'zod'
import { checkDNS } from './doh.js'
import { checkRDAP } from './rdap.js'

export interface DomainAvailabilityResult {
  domain: string
  canBuy: boolean
  fastReject?: 'dns'
  timeout?: boolean
  error?: string
}

/**
 * Fast bulk domain availability check with parallel workers
 * 1. DNS quick reject (DoH) - if DNS exists, domain is taken
 * 2. RDAP check - 404 = available, 200 = taken
 */
export async function bulkCanBuyFast(
  domains: string[],
  concurrency = 4,
): Promise<DomainAvailabilityResult[]> {
  const results: DomainAvailabilityResult[] = []
  let index = 0

  async function worker() {
    while (index < domains.length) {
      const domain = domains[index++]

      // 1. DNS quick reject
      const dnsResult = await checkDNS(domain)
      if (dnsResult.hasRecords) {
        results.push({
          domain,
          canBuy: false,
          fastReject: 'dns',
        })
        continue
      }

      // 2. RDAP check
      try {
        const rdapResult = await checkRDAP(domain)
        results.push({
          domain,
          canBuy: rdapResult.available,
          error: rdapResult.error,
        })
      } catch {
        results.push({
          domain,
          canBuy: false,
          timeout: true,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return results
}

const checkDomainsAvailabilitySchema = z.object({
  domains: z
    .string()
    .describe(
      'Comma-separated list of domains to check (e.g. "example.com, test.io, myapp.net"). 1–15 domains.',
    ),
  concurrency: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(4)
    .describe('Number of parallel workers (1–10, default 4)'),
})

export async function handleCheckDomainsAvailability(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { domains, concurrency } = checkDomainsAvailabilitySchema.parse(args)
  const list = domains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.includes('.'))
  const unique = [...new Set(list)].slice(0, 15)

  if (unique.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Invalid input. Provide comma-separated domains (e.g. example.com, test.io). Max 15 domains.',
        },
      ],
    }
  }

  const results = await bulkCanBuyFast(unique, concurrency)

  const availableDomains = results.filter((r) => r.canBuy)
  const unavailableDomains = results.filter((r) => !r.canBuy && !r.timeout && !r.error)
  const withErrors = results.filter((r) => r.error || r.timeout)

  let responseText = `Bulk check (${unique.length} domains):\n\n`
  if (availableDomains.length > 0) {
    responseText += `Available (${availableDomains.length}):\n`
    responseText += availableDomains.map((r) => `✅ ${r.domain}`).join('\n') + '\n\n'
  }
  if (unavailableDomains.length > 0) {
    responseText += `Not Available (${unavailableDomains.length}):\n`
    responseText += unavailableDomains.map((r) => `❌ ${r.domain}`).join('\n') + '\n\n'
  }
  if (withErrors.length > 0) {
    responseText += `Errors/Timeouts (${withErrors.length}):\n`
    responseText +=
      withErrors
        .map((r) => `⚠️ ${r.domain}${r.error ? `: ${r.error}` : r.timeout ? ' (timeout)' : ''}`)
        .join('\n') + '\n\n'
  }
  responseText +=
    'For pricing on available domains, use get_domain_price or get_domains_price (Namecheap).'

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText.trim(),
      },
    ],
  }
}

export const TOOLS = [
  {
    name: 'check_domains_availability',
    description:
      'Fast bulk domain availability check via RDAP. No API key. 1–15 domains, parallel. Use BEFORE get_domain_price or get_domains_price (Namecheap) for pricing.',
    inputSchema: {
      type: 'object',
      properties: {
        domains: {
          type: 'string',
          description:
            'Comma-separated domains (e.g. "example.com, test.io, myapp.net"). Max 15.',
        },
        concurrency: {
          type: 'number',
          description: 'Number of parallel workers (1–10, default 4)',
        },
      },
      required: ['domains'],
    },
    handler: handleCheckDomainsAvailability,
  },
]
