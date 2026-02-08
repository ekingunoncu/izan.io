/**
 * @izan/mcp-servers-shared - Handler factory
 *
 * Creates a Lambda handler for MCP JSON-RPC protocol.
 * Tool handlers can return string or { content: MCPToolContent[] }.
 */

import type {
  ToolDef,
  JsonRpcRequest,
  JsonRpcResponse,
  MCPToolContent,
  LambdaEvent,
  LambdaResponse,
} from './types.js'
import { isOriginAllowed } from './types.js'

// ─── CORS Headers ───────────────────────────────────────────────────────────

function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = isOriginAllowed(origin)
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-SerpApi-Key',
  }
  if (allowed && origin) base['Access-Control-Allow-Origin'] = origin
  return base
}

// ─── Normalize tool result to MCP content ───────────────────────────────────

function normalizeContent(result: unknown): MCPToolContent[] {
  if (typeof result === 'string') {
    return [{ type: 'text', text: result }]
  }
  if (typeof result === 'object' && result !== null && 'content' in result) {
    const content = (result as { content: MCPToolContent[] }).content
    if (Array.isArray(content)) {
      return content
    }
  }
  return [{ type: 'text', text: String(result) }]
}

// ─── Create handler ─────────────────────────────────────────────────────────

export interface ServerInfo {
  name: string
  version: string
}

/**
 * Creates an MCP Lambda handler for the given tools and server info.
 */
export function createHandler(
  tools: ToolDef[],
  serverInfo: ServerInfo,
): (event: LambdaEvent) => Promise<LambdaResponse> {
  const SERVER_CAPABILITIES = { tools: {} }

  function handleInitialize(req: JsonRpcRequest): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: req.id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: SERVER_CAPABILITIES,
        serverInfo,
      },
    }
  }

  function handleToolsList(req: JsonRpcRequest): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: req.id,
      result: {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    }
  }

  async function handleToolsCall(req: JsonRpcRequest, event: LambdaEvent): Promise<JsonRpcResponse> {
    const params = req.params as { name?: string; arguments?: Record<string, unknown> } | undefined
    const toolName = params?.name
    const toolArgs = params?.arguments ?? {}

    const tool = tools.find((t) => t.name === toolName)
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32602,
          message: `Tool not found: ${toolName}`,
        },
      }
    }

    const context = { headers: event.headers ?? {} }

    try {
      const result = await tool.handler(toolArgs, context)
      const content = normalizeContent(result)
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          content,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        },
      }
    }
  }

  async function handleRequest(req: JsonRpcRequest, event: LambdaEvent): Promise<JsonRpcResponse> {
    switch (req.method) {
      case 'initialize':
        return handleInitialize(req)

      case 'notifications/initialized':
        return { jsonrpc: '2.0', id: req.id, result: {} }

      case 'tools/list':
        return handleToolsList(req)

      case 'tools/call':
        return handleToolsCall(req, event)

      case 'ping':
        return { jsonrpc: '2.0', id: req.id, result: {} }

      default:
        return {
          jsonrpc: '2.0',
          id: req.id,
          error: {
            code: -32601,
            message: `Method not found: ${req.method}`,
          },
        }
    }
  }

  return async function handler(event: LambdaEvent): Promise<LambdaResponse> {
    const h = event.headers ?? {}
    const origin = h['origin'] ?? h['Origin'] ?? null
    const cors = getCorsHeaders(origin)
    const jsonHeaders = { ...cors, 'Content-Type': 'application/json' }

    const method =
      event.requestContext?.http?.method ?? event.httpMethod ?? 'POST'

    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: cors, body: '' }
    }

    if (method !== 'POST') {
      return {
        statusCode: 405,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Method not allowed' }),
      }
    }

    try {
      const rawBody =
        event.isBase64Encoded && event.body
          ? Buffer.from(event.body, 'base64').toString('utf-8')
          : event.body

      if (!rawBody) {
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'Request body is required' }),
        }
      }

      const rpcRequest: JsonRpcRequest = JSON.parse(rawBody)

      if (
        rpcRequest.id === undefined &&
        rpcRequest.method.startsWith('notifications/')
      ) {
        return { statusCode: 202, headers: jsonHeaders, body: '' }
      }

      const rpcResponse = await handleRequest(rpcRequest, event)

      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(rpcResponse),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[mcp-server] Error:', message)
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message },
        }),
      }
    }
  }
}
