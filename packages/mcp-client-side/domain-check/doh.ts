/**
 * DNS over HTTPS (DoH) helper for quick domain rejection
 * Uses Cloudflare 1.1.1.1 DoH API
 */

export interface DNSResult {
  hasRecords: boolean
  error?: string
}

/**
 * Check if domain has DNS records via Cloudflare DoH
 * If Answer array exists, domain has DNS records (likely taken)
 */
export async function checkDNS(domain: string): Promise<DNSResult> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/dns-json',
      },
      signal: AbortSignal.timeout(2000),
    })

    if (!res.ok) {
      return { hasRecords: false, error: `DoH request failed: ${res.status}` }
    }

    const data = (await res.json()) as {
      Answer?: Array<{ name: string; type: number; data: string }>
      Status?: number
    }

    // If Answer array exists and has entries, domain has DNS records
    const hasRecords = Array.isArray(data.Answer) && data.Answer.length > 0
    return { hasRecords }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Timeout or network error - assume no records (don't reject)
    return { hasRecords: false, error: message }
  }
}
