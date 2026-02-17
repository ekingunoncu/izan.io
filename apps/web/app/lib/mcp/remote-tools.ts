/**
 * Remote Tool Definitions
 *
 * Fetches built-in automation tool definitions from the CDN (S3/CloudFront).
 * These are JSON files matching the ToolDefinition schema from tool-schema.ts.
 *
 * URL pattern: /mcp-tools/manifest.json
 *              /mcp-tools/tools/{serverId}/{toolName}.json
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Base URL for remote tool definitions */
function getBaseUrl(): string {
  // In production, served from the same domain via CloudFront
  if (globalThis.window !== undefined && globalThis.location.hostname === 'izan.io') {
    return 'https://izan.io/mcp-tools'
  }
  // In dev, fall back to local or use production CDN
  return '/mcp-tools'
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemoteManifest {
  version: string
  servers: {
    id: string
    name: string
    description: string
    category: string
    tools: string[]
  }[]
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let manifestCache: RemoteManifest | null = null
let manifestFetchedAt = 0
const MANIFEST_TTL_MS = 5 * 60 * 1000 // 5 minutes

const toolCache = new Map<string, unknown>()

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Synchronous getter for the cached manifest (null when not yet fetched).
 * Used by getToolsForAgent() to build tool→server mapping without async calls.
 */
export function getCachedManifest(): RemoteManifest | null {
  return manifestCache
}

/**
 * Fetch the remote tool manifest.
 * Cached for 5 minutes.
 */
export async function fetchManifest(): Promise<RemoteManifest> {
  if (manifestCache && Date.now() - manifestFetchedAt < MANIFEST_TTL_MS) {
    return manifestCache
  }

  const url = `${getBaseUrl()}/manifest.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch tool manifest: ${res.status}`)
  }

  manifestCache = await res.json() as RemoteManifest
  manifestFetchedAt = Date.now()
  return manifestCache
}

/**
 * Fetch tool definitions for the given server IDs.
 * Returns an array of tool definition JSON objects.
 */
export async function fetchRemoteToolDefinitions(serverIds: string[]): Promise<unknown[]> {
  const manifest = await fetchManifest()
  const results: unknown[] = []

  for (const serverId of serverIds) {
    const serverEntry = manifest.servers.find((s) => s.id === serverId)
    if (!serverEntry) continue

    for (const toolName of serverEntry.tools) {
      const cacheKey = `${serverId}/${toolName}`

      if (toolCache.has(cacheKey)) {
        results.push(toolCache.get(cacheKey))
        continue
      }

      try {
        const url = `${getBaseUrl()}/tools/${serverId}/${toolName}.json`
        const res = await fetch(url)
        if (!res.ok) continue

        const toolDef = await res.json()
        toolCache.set(cacheKey, toolDef)
        results.push(toolDef)
      } catch {
        // Skip failed fetches
        console.warn(`[remote-tools] Failed to fetch tool: ${cacheKey}`)
      }
    }
  }

  return results
}

/**
 * Clear the remote tool cache.
 */
export function clearRemoteToolCache(): void {
  manifestCache = null
  manifestFetchedAt = 0
  toolCache.clear()
  extensionRegistryCache = null
  extensionRegistryFetchedAt = 0
}

// ─── Extension Server Registry ──────────────────────────────────────────────

/** Base URL for extension server registry */
function getExtensionRegistryBaseUrl(): string {
  if (globalThis.window !== undefined && globalThis.location.hostname === 'izan.io') {
    return 'https://izan.io/mcp-extension-servers'
  }
  return '/mcp-extension-servers'
}

export interface ExtensionRegistryServer {
  id: string
  name: string
  description: string
  category: string
  type: 'static' | 'automation'
  tools: string[]
}

export interface ExtensionRegistryManifest {
  version: string
  servers: ExtensionRegistryServer[]
}

let extensionRegistryCache: ExtensionRegistryManifest | null = null
let extensionRegistryFetchedAt = 0

/**
 * Fetch the extension server registry manifest from S3/CloudFront.
 * Cached for 5 minutes.
 */
export async function fetchExtensionServerRegistry(): Promise<ExtensionRegistryManifest> {
  if (extensionRegistryCache && Date.now() - extensionRegistryFetchedAt < MANIFEST_TTL_MS) {
    return extensionRegistryCache
  }

  const url = `${getExtensionRegistryBaseUrl()}/manifest.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch extension server registry: ${res.status}`)
  }

  extensionRegistryCache = await res.json() as ExtensionRegistryManifest
  extensionRegistryFetchedAt = Date.now()
  return extensionRegistryCache
}
