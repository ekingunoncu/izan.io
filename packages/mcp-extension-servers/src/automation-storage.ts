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

export interface AutomationLane {
  name: string
  steps: AutomationActionStep[]
}

export interface AutomationTool {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  parameters: AutomationToolParameter[]
  steps: AutomationActionStep[]
  lanes?: AutomationLane[]
  /** Viewport dimensions captured at recording time - used to emulate the same resolution during replay */
  viewport?: { width: number; height: number }
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
  lanes?: AutomationLane[]
  viewport?: { width: number; height: number }
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
    ...(input.lanes && input.lanes.length > 1 ? { lanes: input.lanes } : {}),
    ...(input.viewport ? { viewport: input.viewport } : {}),
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
    lanes?: AutomationLane[]
    parameters?: AutomationToolParameter[]
    viewport?: { width: number; height: number }
  },
): Promise<AutomationTool | null> {
  const data = await getData()
  const tool = data.tools.find((t) => t.id === toolId)
  if (!tool) return null
  if (updates.name !== undefined) tool.name = updates.name
  if (updates.displayName !== undefined) tool.displayName = updates.displayName
  if (updates.description !== undefined) tool.description = updates.description
  if (updates.steps !== undefined) tool.steps = updates.steps
  if (updates.lanes !== undefined) {
    if (updates.lanes.length > 1) tool.lanes = updates.lanes
    else delete tool.lanes
  }
  if (updates.parameters !== undefined) tool.parameters = updates.parameters
  if (updates.viewport !== undefined) tool.viewport = updates.viewport
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

// ─── Export / Import ──────────────────────────────────────────────────────────

/**
 * Get a server and all its tools for JSON export.
 */
export async function getServerExport(serverId: string): Promise<{
  server: AutomationServer
  tools: AutomationTool[]
} | null> {
  const data = await getData()
  const server = data.servers.find((s) => s.id === serverId)
  if (!server) return null
  const tools = data.tools.filter((t) => t.serverId === serverId)
  return { server, tools }
}

/**
 * Import a server and its tools from an export JSON.
 * Creates new IDs to avoid conflicts with existing data.
 */
export async function importServerData(input: {
  server: { name: string; description: string; category?: string }
  tools: Array<{
    name: string
    displayName?: string
    description?: string
    version?: string
    parameters?: AutomationToolParameter[]
    steps?: AutomationActionStep[]
    lanes?: AutomationLane[]
  }>
}): Promise<AutomationServer> {
  const data = await getData()
  const now = Date.now()

  // Create server with new ID
  const server: AutomationServer = {
    id: `ext-user-${slugify(input.server.name)}-${generateId().slice(0, 8)}`,
    name: input.server.name,
    description: input.server.description || '',
    category: input.server.category || 'custom',
    toolIds: [],
    createdAt: now,
    updatedAt: now,
  }

  // Create tools with new IDs
  for (const t of input.tools) {
    const tool: AutomationTool = {
      id: generateId(),
      name: t.name,
      displayName: t.displayName || t.name,
      description: t.description || '',
      version: t.version || '1.0.0',
      parameters: t.parameters || [],
      steps: t.steps || [],
      ...(t.lanes && t.lanes.length > 1 ? { lanes: t.lanes } : {}),
      serverId: server.id,
      createdAt: now,
      updatedAt: now,
    }
    data.tools.push(tool)
    server.toolIds.push(tool.id)
  }

  data.servers.push(server)
  data.version++
  await setData(data)
  return server
}

/**
 * Import a single tool from an export JSON into an existing server.
 */
export async function importToolData(
  serverId: string,
  input: {
    name: string
    displayName?: string
    description?: string
    version?: string
    parameters?: AutomationToolParameter[]
    steps?: AutomationActionStep[]
    lanes?: AutomationLane[]
  },
): Promise<AutomationTool> {
  return createTool({
    serverId,
    name: input.name,
    displayName: input.displayName,
    description: input.description,
    parameters: input.parameters,
    steps: input.steps,
    lanes: input.lanes,
    version: input.version,
  })
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
