/**
 * @izan/agent-core - Type definitions
 *
 * Core types for agent definitions, tool calls, and LLM integration.
 * LLM-agnostic: no dependency on WebLLM or any specific provider.
 */

import type { ServerCategory, MCPToolCallResult } from '@izan/mcp-client'

/** Agent category (re-exported from mcp-client for convenience) */
export type AgentCategory = ServerCategory

/**
 * Defines an AI agent with its capabilities and tool access.
 * This is the core type used by the framework — not tied to UI or storage.
 */
export interface AgentDefinition {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Short description of what this agent does */
  description: string
  /** Icon identifier (e.g. lucide icon name) */
  icon: string
  /** Agent category — also determines which MCP tools are available */
  category: AgentCategory
  /** System prompt sent to the LLM */
  systemPrompt: string
  /** Whether this agent is active */
  enabled: boolean
}

/**
 * A request to call a tool via MCP.
 */
export interface ToolCall {
  /** ID of the MCP server that owns the tool */
  serverId: string
  /** Name of the tool to execute */
  toolName: string
  /** Arguments to pass to the tool */
  arguments: Record<string, unknown>
}

/**
 * Result from executing a tool call.
 */
export interface ToolResult extends MCPToolCallResult {
  /** The original tool call that produced this result */
  toolCall: ToolCall
}

/**
 * Chat message format used by the agent framework.
 * Mirrors the OpenAI-style chat completion message shape
 * that WebLLM and other providers use.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Function type for LLM chat completion.
 * Accepts messages and returns the assistant's response text.
 * Injected via dependency injection so the framework stays LLM-agnostic.
 */
export type ChatFunction = (messages: ChatMessage[]) => Promise<string>
