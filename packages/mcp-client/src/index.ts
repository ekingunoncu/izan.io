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
