/**
 * @izan/mcp-client
 *
 * MCP (Model Context Protocol) client library for izan.io.
 * Built on top of the official @modelcontextprotocol/sdk.
 *
 * @example
 * ```ts
 * import { MCPServerRegistry } from '@izan/mcp-client'
 *
 * const registry = new MCPServerRegistry()
 *
 * await registry.addServer({
 *   id: 'web-search',
 *   name: 'Web Search',
 *   description: 'Search the web',
 *   url: 'https://mcp.example.com/mcp',
 *   category: 'web_search',
 * })
 *
 * const tools = registry.getAllTools()
 * const result = await registry.callTool('web-search', 'search', { query: 'hello' })
 * ```
 */

// Types
export type {
  MCPServerConfig,
  MCPServerSource,
  ServerCategory,
  ServerStatus,
  MCPToolInfo,
  MCPServerState,
  MCPToolCallResult,
  MCPToolContent,
} from './types.js'

// Client (single server connection)
export { IzanMCPClient } from './client.js'

// Registry (multi-server management)
export { MCPServerRegistry } from './registry.js'
export type { ServerStateChangeHandler } from './registry.js'

// Built-in server discovery (auto-generated)
export {
  BUILTIN_BACKEND_SERVERS,
  BUILTIN_CLIENT_SERVER,
  BUILTIN_CLIENT_SERVERS,
  BUILTIN_EXTENSION_SERVERS,
  BUILTIN_MCP_SERVER_METADATA,
} from './builtin-servers.generated.js'
export type { BuiltinServerMetadata } from './builtin-servers.generated.js'

import { BUILTIN_MCP_SERVER_METADATA } from './builtin-servers.generated.js'
import type { MCPServerConfig } from './types.js'

/**
 * Build full MCPServerConfig[] from built-in metadata with resolved URLs.
 * @param mcpBaseUrl - Base URL for backend MCP (e.g. https://example.com/api or /api)
 */
export function getBuiltinMCPServerConfigs(mcpBaseUrl: string): MCPServerConfig[] {
  const base = mcpBaseUrl.replace(/\/$/, '')
  return BUILTIN_MCP_SERVER_METADATA.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    category: m.category,
    url: (m.urlType === 'client' || m.urlType === 'extension') ? m.url! : `${base}/${m.id}/mcp`,
    source: 'builtin' as const,
  }))
}
