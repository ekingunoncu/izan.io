/**
 * @izan/mcp-client - MCP Client wrapper
 *
 * Thin wrapper around the official MCP SDK Client + StreamableHTTPClientTransport.
 * Manages a single connection to one MCP server.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { MCPToolInfo, MCPToolCallResult, MCPToolContent } from './types.js'

/**
 * Custom fetch wrapper that returns 405 for GET requests to the MCP endpoint.
 * Some MCP servers don't support the optional GET SSE stream. The SDK treats
 * 405 as "SSE not supported" and skips it, but other error codes (like 400)
 * cause an infinite reconnect loop. This wrapper normalizes those to 405.
 */
function createMcpFetch(): typeof fetch {
  return async (input, init) => {
    const method = init?.method ?? 'GET'

    if (method === 'GET') {
      // Skip SSE stream entirely - return 405 so the SDK treats it
      // as "server does not offer SSE" and moves on.
      return new Response(null, { status: 405, statusText: 'Method Not Allowed' })
    }

    return fetch(input, init)
  }
}

export class IzanMCPClient {
  private client: Client | null = null
  private transport: StreamableHTTPClientTransport | null = null
  private _isConnected = false
  private readonly _serverId: string

  constructor(serverId: string) {
    this._serverId = serverId
  }

  /** Whether the client is currently connected */
  get isConnected(): boolean {
    return this._isConnected
  }

  /** The server ID this client is associated with */
  get serverId(): string {
    return this._serverId
  }

  /**
   * Connect to an MCP server via Streamable HTTP transport.
   * @param serverUrl - Full URL to the MCP endpoint (e.g. "https://example.com/mcp")
   * @param headers - Optional custom headers to include in every request
   */
  async connect(
    serverUrl: string,
    headers?: Record<string, string>,
  ): Promise<void> {
    if (this._isConnected) {
      await this.disconnect()
    }

    this.client = new Client(
      { name: 'izan-client', version: '0.1.0' },
      { capabilities: {} },
    )

    this.transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      fetch: createMcpFetch(),
      requestInit: headers ? { headers } : undefined,
    })

    this.client.onerror = (error) => {
      console.error(`[izan-mcp] Client error (${this._serverId}):`, error)
    }

    await this.client.connect(this.transport)
    this._isConnected = true
  }

  /**
   * Disconnect from the MCP server.
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close()
      } catch {
        // Ignore close errors
      }
    }
    this.client = null
    this.transport = null
    this._isConnected = false
  }

  /**
   * List all tools available on the connected server.
   */
  async listTools(): Promise<MCPToolInfo[]> {
    this.ensureConnected()

    const result = await this.client!.listTools()

    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
      serverId: this._serverId,
    }))
  }

  /**
   * Call a tool on the connected server.
   * @param toolName - Name of the tool to call
   * @param args - Arguments to pass to the tool
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolCallResult> {
    this.ensureConnected()

    try {
      const result = await this.client!.callTool({
        name: toolName,
        arguments: args,
      })

      const content: MCPToolContent[] = (
        result.content as Array<Record<string, unknown>>
      ).map((item) => {
        if (item.type === 'text') {
          return { type: 'text' as const, text: item.text as string }
        }
        if (item.type === 'image') {
          return {
            type: 'image' as const,
            data: item.data as string,
            mimeType: item.mimeType as string,
          }
        }
        return {
          type: 'resource' as const,
          uri: (item.resource as Record<string, unknown>)?.uri as string,
          text: (item.resource as Record<string, unknown>)?.text as string | undefined,
        }
      })

      return {
        success: !result.isError,
        content,
        error: result.isError
          ? content
            .filter((c): c is MCPToolContent & { type: 'text' } => c.type === 'text')
            .map((c) => c.text)
            .join('\n')
          : undefined,
      }
    } catch (error) {
      return {
        success: false,
        content: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private ensureConnected(): void {
    if (!this._isConnected || !this.client) {
      throw new Error(
        `MCP client not connected (server: ${this._serverId}). Call connect() first.`,
      )
    }
  }
}
