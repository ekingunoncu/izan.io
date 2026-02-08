/**
 * @izan/mcp-servers-shared - Type definitions
 *
 * Core types for MCP server tools and handler factory.
 */

/** MCP tool content returned by tool handlers */
export type MCPToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; uri: string; text?: string }

/** Tool handler return type - string or MCP content array */
export type ToolHandlerResult = string | { content: MCPToolContent[] }

/** Context passed to tool handlers (e.g. request headers for API keys) */
export interface ToolHandlerContext {
  headers?: Record<string, string>
}

/** Tool definition shape used by MCP servers */
export interface ToolDef {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  handler: (args: Record<string, unknown>, context?: ToolHandlerContext) => Promise<ToolHandlerResult>
}

/** JSON-RPC request */
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

/** JSON-RPC response */
export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id?: string | number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

/** Allowed CORS origins (localhost + izan.io) */
export const ALLOWED_ORIGINS = [
  'https://izan.io',
  'https://www.izan.io',
] as const

/** Check if origin is allowed (localhost/127.0.0.1 any port, or izan.io) */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin || !origin.startsWith('http')) return false
  if (ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number])) return true
  // Allow any localhost/127.0.0.1 for dev
  try {
    const u = new URL(origin)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** Lambda event shape (API Gateway HTTP API) */
export interface LambdaEvent {
  requestContext?: { http?: { method?: string } }
  httpMethod?: string
  headers?: Record<string, string>
  body?: string | null
  isBase64Encoded?: boolean
}

/** Lambda response shape */
export interface LambdaResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
}
