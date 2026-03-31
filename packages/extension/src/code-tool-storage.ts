/**
 * Code Tool Storage
 *
 * Simple CRUD over chrome.storage.local for code-based tool definitions.
 * Replaces the old automation-storage.ts (servers + step-based tools).
 */

import type { CodeToolDefinition } from './code-tool-types.js'

const STORAGE_KEY = 'izan_tools'

export interface ToolStorageData {
  tools: CodeToolDefinition[]
  version: number
}

export async function getToolData(): Promise<ToolStorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data = result[STORAGE_KEY] as ToolStorageData | undefined
  return data ?? { tools: [], version: 0 }
}

async function setToolData(data: ToolStorageData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data })
}

export async function getAllTools(): Promise<CodeToolDefinition[]> {
  const data = await getToolData()
  return data.tools
}

export async function getTool(id: string): Promise<CodeToolDefinition | null> {
  const data = await getToolData()
  return data.tools.find(t => t.id === id) ?? null
}

export async function saveTool(tool: CodeToolDefinition): Promise<CodeToolDefinition> {
  const data = await getToolData()
  const now = Date.now()
  const existing = data.tools.findIndex(t => t.id === tool.id)

  if (existing >= 0) {
    data.tools[existing] = { ...tool, updatedAt: now }
  } else {
    data.tools.push({ ...tool, createdAt: now, updatedAt: now })
  }

  data.version++
  await setToolData(data)
  return existing >= 0 ? data.tools[existing] : data.tools[data.tools.length - 1]
}

export async function deleteTool(id: string): Promise<boolean> {
  const data = await getToolData()
  const before = data.tools.length
  data.tools = data.tools.filter(t => t.id !== id)
  if (data.tools.length === before) return false
  data.version++
  await setToolData(data)
  return true
}

export async function replaceAllTools(tools: CodeToolDefinition[]): Promise<void> {
  const data = await getToolData()
  data.tools = tools
  data.version++
  await setToolData(data)
}
