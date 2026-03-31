/**
 * Code Tool Types
 *
 * Shared type definitions for the code-based tool system.
 */

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
  enum?: string[]
  default?: string | number | boolean
}

export interface CodeToolDefinition {
  id: string
  name: string
  description: string
  version: string
  parameters: ToolParameter[]
  /** JavaScript async function body: async (params, browser) => { ... } */
  code: string
  createdAt?: number
  updatedAt?: number
}

export interface CodeToolResult {
  success: boolean
  data?: unknown
  error?: string
}
