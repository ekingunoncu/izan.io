/**
 * @izan/agent-core - Tool Executor
 *
 * Executes tool calls via MCP server registry with retry support.
 */

import type { MCPServerRegistry } from '@izan/mcp-client'
import type { ToolCall, ToolResult } from './types.js'

export class ToolExecutor {
  private readonly registry: MCPServerRegistry

  constructor(registry: MCPServerRegistry) {
    this.registry = registry
  }

  /**
   * Execute a single tool call.
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const mcpResult = await this.registry.callTool(
      toolCall.serverId,
      toolCall.toolName,
      toolCall.arguments,
    )

    return {
      ...mcpResult,
      toolCall,
    }
  }

  /**
   * Execute a tool call with exponential backoff retry.
   * @param toolCall - The tool call to execute
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  async executeWithRetry(
    toolCall: ToolCall,
    maxRetries = 3,
  ): Promise<ToolResult> {
    let lastResult: ToolResult | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.execute(toolCall)

      if (result.success) {
        return result
      }

      lastResult = result

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        await this.delay(Math.pow(2, attempt) * 1000)
      }
    }

    // All retries exhausted - return last failed result
    return lastResult!
  }

  /**
   * Execute multiple tool calls in parallel.
   */
  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)))
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
