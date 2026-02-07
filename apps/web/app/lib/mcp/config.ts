/**
 * Default MCP server configuration
 *
 * Convention: {serverId}/mcp under base (e.g. general → /api/general/mcp)
 * In production: CloudFront at /api/{serverId}/mcp
 * In development: localhost:3100/api/{serverId}/mcp
 */
import type { MCPServerConfig } from '@izan/mcp-client'

/** Resolve MCP base URL (absolute, no trailing slash) - required for new URL() in MCP client */
function getMcpBaseUrl(): string {
  const pathBase = '/api'
  // Dev: use same-origin so Vite proxy handles /api -> localhost:3100 (no CORS)
  if (import.meta.env?.DEV) {
    if (typeof window !== 'undefined') {
      return window.location.origin + pathBase
    }
    return pathBase
  }
  // Production: check env override first
  const envUrl =
    (import.meta.env?.VITE_MCP_BASE_URL as string) ||
    (import.meta.env?.VITE_MCP_URL as string)
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '')
  }
  if (globalThis.window && (globalThis as Record<string, unknown>).__IZAN_MCP_URL__) {
    const url = (globalThis as Record<string, unknown>).__IZAN_MCP_URL__ as string
    return url.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin + pathBase
  }
  return pathBase
}

const MCP_BASE = getMcpBaseUrl()

/**
 * All built-in MCP servers.
 * Convention: {base}/{serverId}/mcp (e.g. /api/general/mcp)
 */
export const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General MCP server (get_time, random_number, uuid, calculate, generate_password)',
    url: `${MCP_BASE}/general/mcp`,
    category: 'general',
    source: 'builtin',
  },
  {
    id: 'bing',
    name: 'Bing Search',
    description: 'Search the web using Bing',
    url: `${MCP_BASE}/bing/mcp`,
    category: 'web_search',
    source: 'builtin',
  },
  {
    id: 'google',
    name: 'Google Search',
    description: 'Search the web using Google',
    url: `${MCP_BASE}/google/mcp`,
    category: 'web_search',
    source: 'builtin',
  },
  {
    id: 'namecheap',
    name: 'Namecheap Domain',
    description: 'Check domain availability and get suggestions',
    url: `${MCP_BASE}/namecheap/mcp`,
    category: 'custom',
    source: 'builtin',
  },
]

/**
 * Mapping from agent ID → built-in MCP server IDs.
 *
 * Each agent listed here will always have the specified servers
 * attached implicitly (not removable by the user).
 * Agents not listed here still receive tools from their category match.
 */
export const IMPLICIT_AGENT_SERVERS: Record<string, string[]> = {
  'general': ['general'],
  'web-search': ['bing', 'google'],
  'domain-expert': ['namecheap'],
}

/**
 * Get the built-in MCP server configs for a given agent ID.
 */
export function getImplicitServersForAgent(agentId: string): MCPServerConfig[] {
  const serverIds = IMPLICIT_AGENT_SERVERS[agentId] ?? []
  return DEFAULT_MCP_SERVERS.filter((s) => serverIds.includes(s.id))
}
