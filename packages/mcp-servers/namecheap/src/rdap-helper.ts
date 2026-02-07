/**
 * RDAP helper for Namecheap Lambda
 * Checks domain availability via RDAP before querying Namecheap for pricing
 */

export interface RDAPResult {
  available: boolean
  error?: string
}

/**
 * Check domain availability via RDAP
 * 404 = available, 200 = taken (registered)
 */
export async function checkRDAP(domain: string): Promise<RDAPResult> {
  try {
    // Use rdap.org as bootstrap proxy - it redirects to the correct RDAP server
    const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })

    // 404 = domain not found = available
    if (res.status === 404) {
      return { available: true }
    }

    // 200 = domain found = taken
    if (res.status === 200) {
      return { available: false }
    }

    // Other status codes - assume taken (conservative)
    return {
      available: false,
      error: `Unexpected RDAP status: ${res.status}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Network error or timeout - assume taken (conservative)
    return {
      available: false,
      error: message,
    }
  }
}

/**
 * Bulk RDAP check with concurrency control
 */
export async function bulkCheckRDAP(
  domains: string[],
  concurrency = 4,
): Promise<Array<{ domain: string; available: boolean; error?: string }>> {
  const results: Array<{ domain: string; available: boolean; error?: string }> = []
  let index = 0

  async function worker() {
    while (index < domains.length) {
      const domain = domains[index++]
      const result = await checkRDAP(domain)
      results.push({ domain, ...result })
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}
