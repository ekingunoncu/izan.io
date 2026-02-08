/**
 * Default MCP server configuration
 *
 * Convention: {serverId}/mcp under base (e.g. general → /api/general/mcp)
 * In production: CloudFront at /api/{serverId}/mcp
 * In development: localhost:3100/api/{serverId}/mcp
 *
 * Built-in servers are auto-discovered from @izan/mcp-client (packages/mcp-servers + mcp-browser-servers).
 */
import { IMPLICIT_AGENT_SERVERS } from '@izan/agents'
import { getBuiltinMCPServerConfigs, type MCPServerConfig } from '@izan/mcp-client'

/** Resolve MCP base URL (absolute, no trailing slash) - required for new URL() in MCP client */
export function getMcpBaseUrl(): string {
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

/**
 * All built-in MCP servers.
 * Auto-discovered from packages/mcp-servers and mcp-browser-servers via @izan/mcp-client.
 */
export const DEFAULT_MCP_SERVERS = getBuiltinMCPServerConfigs(getMcpBaseUrl())

/**
 * Mapping from agent ID → built-in MCP server IDs.
 * Source: @izan/agents (auto-discovered from packages/agents)
 */
export { IMPLICIT_AGENT_SERVERS }

/**
 * Get the built-in MCP server configs for a given agent ID.
 */
export function getImplicitServersForAgent(agentId: string): MCPServerConfig[] {
  const serverIds = IMPLICIT_AGENT_SERVERS[agentId] ?? []
  return DEFAULT_MCP_SERVERS.filter((s) => serverIds.includes(s.id))
}

/** Proxy MCP URL (fallback when direct fails / CORS) */
export function getProxyMcpUrl(): string {
  return getMcpBaseUrl() + '/proxy/mcp'
}
