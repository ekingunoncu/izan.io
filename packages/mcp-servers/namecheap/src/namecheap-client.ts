/**
 * Namecheap Domains API client for domain availability check.
 *
 * Requires NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP.
 * Sandbox: https://api.sandbox.namecheap.com
 * Production: https://api.namecheap.com
 *
 * ClientIp must be a whitelisted IPv4 in your Namecheap account.
 * For Lambda: use NAT Gateway Elastic IP and whitelist it.
 */

const BASE_URL =
  (process.env.NAMECHEAP_API_URL ?? 'https://api.namecheap.com').replace(/\/xml\.response\/?$/, '')

export interface DomainAvailabilityResult {
  available?: boolean
  domain?: string
  price?: number
  isPremium?: boolean
  premiumRegistrationPrice?: number
  error?: string
}

export interface DomainSuggestion {
  domain: string
}

export interface SuggestDomainsResult {
  suggestions: DomainSuggestion[]
  error?: string
}

function parseFloatAttr(part: string, attr: string): number | undefined {
  const m = part.match(new RegExp(`${attr}="([^"]+)"`))
  if (!m) return undefined
  const n = parseFloat(m[1])
  return Number.isFinite(n) ? n : undefined
}

/** Parse DomainCheckResult from Namecheap XML response */
function parseDomainCheckXml(
  xml: string,
): Array<{
  domain: string
  available: boolean
  isPremium?: boolean
  premiumRegistrationPrice?: number
}> {
  const results: Array<{
    domain: string
    available: boolean
    isPremium?: boolean
    premiumRegistrationPrice?: number
  }> = []
  const parts = xml.split(/<DomainCheckResult\s/)
  for (const part of parts.slice(1)) {
    const domainMatch = part.match(/Domain="([^"]+)"/)
    const availableMatch = part.match(/Available="([^"]+)"/)
    if (domainMatch && availableMatch) {
      const isPremium = part.match(/IsPremiumName="([^"]+)"/)?.[1]?.toLowerCase() === 'true'
      const premiumPrice = parseFloatAttr(part, 'PremiumRegistrationPrice')
      results.push({
        domain: domainMatch[1],
        available: availableMatch[1].toLowerCase() === 'true',
        isPremium: isPremium || undefined,
        premiumRegistrationPrice: premiumPrice,
      })
    }
  }
  return results
}

/** Check for API error in XML response */
function parseApiError(xml: string): string | null {
  const statusMatch = xml.match(/ApiResponse[^>]*Status="([^"]+)"/)
  if (statusMatch && statusMatch[1].toUpperCase() !== 'OK') {
    const errMatch = xml.match(/ErrorMessage="([^"]*)"/)
    return errMatch ? errMatch[1] : statusMatch[1]
  }
  return null
}

export class NamecheapClient {
  private readonly apiUser: string
  private readonly apiKey: string
  private readonly clientIp: string

  constructor(apiUser?: string, apiKey?: string, clientIp?: string) {
    this.apiUser = apiUser ?? process.env.NAMECHEAP_API_USER ?? ''
    this.apiKey = apiKey ?? process.env.NAMECHEAP_API_KEY ?? ''
    this.clientIp = clientIp ?? process.env.NAMECHEAP_CLIENT_IP ?? ''
  }

  private buildParams(command: string, extra: Record<string, string> = {}): URLSearchParams {
    const params = new URLSearchParams({
      ApiUser: this.apiUser,
      ApiKey: this.apiKey,
      UserName: this.apiUser,
      ClientIp: this.clientIp,
      Command: command,
      ...extra,
    })
    return params
  }

  async checkDomain(domain: string): Promise<DomainAvailabilityResult> {
    if (!this.apiUser || !this.apiKey || !this.clientIp) {
      return {
        available: false,
        domain,
        error:
          'Namecheap API not configured. Set NAMECHEAP_API_USER, NAMECHEAP_API_KEY, and NAMECHEAP_CLIENT_IP (whitelisted IP).',
      }
    }

    try {
      const params = this.buildParams('namecheap.domains.check', {
        DomainList: domain,
      })
      const url = `${BASE_URL}/xml.response?${params.toString()}`
      const res = await fetch(url, { headers: { Accept: 'application/xml' } })
      const xml = await res.text()

      const apiError = parseApiError(xml)
      if (apiError) {
        console.warn('[namecheap] checkDomain failed:', { domain, apiError, xml: xml.slice(0, 200) })
        return { domain, error: apiError }
      }

      const results = parseDomainCheckXml(xml)
      const r = results.find((x) => x.domain.toLowerCase() === domain.toLowerCase())
      if (!r) {
        return { domain, error: 'No result in API response' }
      }

      console.log('[namecheap] checkDomain ok:', { domain, available: r.available })
      return {
        domain: r.domain,
        available: r.available,
        isPremium: r.isPremium,
        premiumRegistrationPrice: r.premiumRegistrationPrice,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[namecheap] checkDomain error:', { domain, err: message })
      return { domain, error: message }
    }
  }

  async checkDomainsBulk(
    domains: string[]
  ): Promise<Array<DomainAvailabilityResult & { domain: string }>> {
    if (!this.apiUser || !this.apiKey || !this.clientIp) {
      return domains.map((domain) => ({
        domain,
        available: false,
        error: 'Namecheap API not configured.',
      }))
    }

    if (domains.length === 0) return []

    try {
      const params = this.buildParams('namecheap.domains.check', {
        DomainList: domains.join(','),
      })
      const url = `${BASE_URL}/xml.response?${params.toString()}`
      const res = await fetch(url, { headers: { Accept: 'application/xml' } })
      const xml = await res.text()

      const apiError = parseApiError(xml)
      if (apiError) {
        console.warn('[namecheap] checkDomainsBulk failed:', {
          domainCount: domains.length,
          apiError,
          domains: domains.slice(0, 5),
        })
        return domains.map((domain) => ({ domain, available: false, error: apiError }))
      }

      const results = parseDomainCheckXml(xml)
      const byDomain = new Map(results.map((r) => [r.domain.toLowerCase(), r]))

      const output = domains.map((domain) => {
        const r = byDomain.get(domain.toLowerCase())
        return {
          domain,
          available: r?.available ?? false,
          isPremium: r?.isPremium,
          premiumRegistrationPrice: r?.premiumRegistrationPrice,
        }
      })
      console.log('[namecheap] checkDomainsBulk ok:', {
        requested: domains.length,
        returned: results.length,
      })
      return output
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return domains.map((domain) => ({ domain, available: false, error: message }))
    }
  }

  async getTldList(): Promise<{ tlds: string[]; error?: string }> {
    if (!this.apiUser || !this.apiKey || !this.clientIp) {
      return {
        tlds: [],
        error: 'Namecheap API not configured.',
      }
    }

    try {
      const params = this.buildParams('namecheap.domains.getTldList')
      const url = `${BASE_URL}/xml.response?${params.toString()}`
      const res = await fetch(url, { headers: { Accept: 'application/xml' } })
      const xml = await res.text()

      const apiError = parseApiError(xml)
      if (apiError) {
        return { tlds: [], error: apiError }
      }

      const tlds: string[] = []
      const tldParts = xml.split(/<Tld[\s>]/)
      for (const part of tldParts.slice(1)) {
        const nameMatch = part.match(/Name="([^"]+)"/) ?? part.match(/^([a-z0-9.]+)</)
        if (nameMatch) tlds.push(nameMatch[1])
      }
      console.log('[namecheap] getTldList ok:', { count: tlds.length })
      return { tlds }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { tlds: [], error: message }
    }
  }

  async getDomainInfo(domain: string): Promise<{
    domain?: string
    status?: string
    ownerName?: string
    isOwner?: boolean
    createdDate?: string
    expiredDate?: string
    isPremium?: boolean
    whoisguardEnabled?: boolean
    error?: string
  }> {
    if (!this.apiUser || !this.apiKey || !this.clientIp) {
      return { error: 'Namecheap API not configured.' }
    }

    try {
      const params = this.buildParams('namecheap.domains.getinfo', {
        DomainName: domain,
      })
      const url = `${BASE_URL}/xml.response?${params.toString()}`
      const res = await fetch(url, { headers: { Accept: 'application/xml' } })
      const xml = await res.text()

      const apiError = parseApiError(xml)
      if (apiError) {
        return { error: apiError }
      }

      const resultMatch = xml.match(/<DomainGetInfoResult\s([^>]+)>/)
      if (!resultMatch) return { error: 'No DomainGetInfoResult in response' }

      const part = resultMatch[1]
      const get = (attr: string) => part.match(new RegExp(`${attr}="([^"]*)"`))?.[1]

      const detailsMatch = xml.match(/<DomainDetails>[\s\S]*?<CreatedDate>([^<]*)<\/CreatedDate>[\s\S]*?<ExpiredDate>([^<]*)<\/ExpiredDate>/)
      const whoisMatch = xml.match(/WhoisguardEnabled="([^"]+)"/)

      return {
        domain: get('DomainName'),
        status: get('Status'),
        ownerName: get('OwnerName'),
        isOwner: get('IsOwner')?.toLowerCase() === 'true',
        isPremium: get('IsPremium')?.toLowerCase() === 'true',
        createdDate: detailsMatch?.[1],
        expiredDate: detailsMatch?.[2],
        whoisguardEnabled: whoisMatch?.[1]?.toLowerCase() === 'true',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: message }
    }
  }
}
