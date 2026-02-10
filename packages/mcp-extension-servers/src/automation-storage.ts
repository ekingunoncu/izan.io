/**
 * Automation Storage
 *
 * CRUD layer over chrome.storage.local for automation servers and tools.
 * Allows the side panel to work independently of an open izan.io tab.
 */

// ─── Types (mirrors web app's schema.ts) ─────────────────────────────────────

export interface AutomationToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
  enum?: string[]
  default?: string | number | boolean
  source?: 'urlParam' | 'input'
  sourceKey?: string
}

export interface AutomationActionStep {
  action: string
  label?: string
  continueOnError?: boolean
  [key: string]: unknown
}

export interface AutomationTool {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  parameters: AutomationToolParameter[]
  steps: AutomationActionStep[]
  serverId: string
  createdAt: number
  updatedAt: number
}

export interface AutomationServer {
  id: string
  name: string
  description: string
  category: string
  toolIds: string[]
  disabled?: boolean
  createdAt: number
  updatedAt: number
}

export interface AutomationData {
  servers: AutomationServer[]
  tools: AutomationTool[]
  version: number
}

// ─── Storage Key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'izan_automation'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'server'
}

function generateId(): string {
  return crypto.randomUUID()
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getData(): Promise<AutomationData> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data = result[STORAGE_KEY] as AutomationData | undefined
  return data ?? { servers: [], tools: [], version: 0 }
}

async function setData(data: AutomationData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data })
}

export async function createServer(
  name: string,
  description: string,
  category = 'custom',
): Promise<AutomationServer> {
  const data = await getData()
  const now = Date.now()
  const server: AutomationServer = {
    id: `ext-user-${slugify(name)}-${generateId().slice(0, 8)}`,
    name,
    description,
    category,
    toolIds: [],
    createdAt: now,
    updatedAt: now,
  }
  data.servers.push(server)
  data.version++
  await setData(data)
  return server
}

export async function deleteServer(serverId: string): Promise<void> {
  const data = await getData()
  data.tools = data.tools.filter((t) => t.serverId !== serverId)
  data.servers = data.servers.filter((s) => s.id !== serverId)
  data.version++
  await setData(data)
}

export async function createTool(input: {
  serverId: string
  name: string
  displayName?: string
  description?: string
  parameters?: AutomationToolParameter[]
  steps?: AutomationActionStep[]
  version?: string
}): Promise<AutomationTool> {
  const data = await getData()
  const now = Date.now()
  const tool: AutomationTool = {
    id: generateId(),
    name: input.name,
    displayName: input.displayName || input.name,
    description: input.description || '',
    version: input.version || '1.0.0',
    parameters: input.parameters || [],
    steps: input.steps || [],
    serverId: input.serverId,
    createdAt: now,
    updatedAt: now,
  }
  data.tools.push(tool)

  // Update parent server's toolIds
  const server = data.servers.find((s) => s.id === input.serverId)
  if (server) {
    server.toolIds.push(tool.id)
    server.updatedAt = now
  }

  data.version++
  await setData(data)
  return tool
}

export async function updateServer(
  serverId: string,
  updates: { name?: string; description?: string },
): Promise<AutomationServer | null> {
  const data = await getData()
  const server = data.servers.find((s) => s.id === serverId)
  if (!server) return null
  if (updates.name !== undefined) server.name = updates.name
  if (updates.description !== undefined) server.description = updates.description
  server.updatedAt = Date.now()
  data.version++
  await setData(data)
  return server
}

export async function updateTool(
  toolId: string,
  updates: {
    name?: string
    displayName?: string
    description?: string
    steps?: AutomationActionStep[]
    parameters?: AutomationToolParameter[]
  },
): Promise<AutomationTool | null> {
  const data = await getData()
  const tool = data.tools.find((t) => t.id === toolId)
  if (!tool) return null
  if (updates.name !== undefined) tool.name = updates.name
  if (updates.displayName !== undefined) tool.displayName = updates.displayName
  if (updates.description !== undefined) tool.description = updates.description
  if (updates.steps !== undefined) tool.steps = updates.steps
  if (updates.parameters !== undefined) tool.parameters = updates.parameters
  tool.updatedAt = Date.now()
  data.version++
  await setData(data)
  return tool
}

export async function getTool(toolId: string): Promise<AutomationTool | null> {
  const data = await getData()
  return data.tools.find((t) => t.id === toolId) ?? null
}

export async function deleteTool(toolId: string): Promise<void> {
  const data = await getData()
  const tool = data.tools.find((t) => t.id === toolId)
  if (!tool) return

  data.tools = data.tools.filter((t) => t.id !== toolId)

  // Update parent server's toolIds
  const server = data.servers.find((s) => s.id === tool.serverId)
  if (server) {
    server.toolIds = server.toolIds.filter((id) => id !== toolId)
    server.updatedAt = Date.now()
  }

  data.version++
  await setData(data)
}

/**
 * Replace the entire automation dataset (used for sync from web app).
 */
export async function replaceData(
  servers: AutomationServer[],
  tools: AutomationTool[],
): Promise<void> {
  const data = await getData()
  data.servers = servers
  data.tools = tools
  data.version++
  await setData(data)
}
