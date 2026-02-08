/**
 * @izan/mcp-servers-shared
 *
 * Shared handler factory and types for MCP servers.
 */

export { createHandler } from './handler.js'
export type { ServerInfo } from './handler.js'
export type {
  ToolDef,
  ToolHandlerContext,
  ToolHandlerResult,
  MCPToolContent,
  JsonRpcRequest,
  JsonRpcResponse,
  LambdaEvent,
  LambdaResponse,
} from './types.js'
