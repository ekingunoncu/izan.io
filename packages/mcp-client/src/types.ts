/**
 * @izan/mcp-client - Type definitions
 *
 * Core types for MCP server configuration and connection management.
 */

/** Category for grouping MCP servers and their tools */
export type ServerCategory =
  | 'general'
  | 'web_search'
  | 'code_assistant'
  | 'calendar'
  | 'email'
  | 'database'
  | 'api_connector'
  | 'file_manager'
  | 'custom'

/** Where the MCP server config originates from */
export type MCPServerSource = 'builtin' | 'user'

/** Configuration for registering an MCP server */
export interface MCPServerConfig {
  /** Unique identifier for the server */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this server does */
  description: string
  /** HTTP endpoint URL (e.g. "https://mcp.example.com/mcp") */
  url: string
  /** Category for agent routing */
  category: ServerCategory
  /** Whether this is a built-in or user-added server */
  source: MCPServerSource
  /** Optional custom headers to send with every request */
  headers?: Record<string, string>
}

/** Connection status of an MCP server */
export type ServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/** Represents a discovered tool from an MCP server */
export interface MCPToolInfo {
  /** Tool name */
  name: string
  /** Tool description */
  description?: string
  /** JSON Schema for the tool's input parameters */
  inputSchema: Record<string, unknown>
  /** ID of the server this tool belongs to */
  serverId: string
}

/** Runtime state of a registered MCP server */
export interface MCPServerState {
  /** Server configuration */
  config: MCPServerConfig
  /** Current connection status */
  status: ServerStatus
  /** Discovered tools (populated after connection) */
  tools: MCPToolInfo[]
  /** Error message if status is 'error' */
  error?: string
}

/** Result from calling an MCP tool */
export interface MCPToolCallResult {
  /** Whether the call succeeded */
  success: boolean
  /** Content returned by the tool */
  content: MCPToolContent[]
  /** Error message if the call failed */
  error?: string
}

/** A piece of content returned by a tool call */
export type MCPToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; uri: string; text?: string }
