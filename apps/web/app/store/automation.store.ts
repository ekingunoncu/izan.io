/**
 * Automation Store
 *
 * Manages automation tools and servers (no-code MCP tools created via recording).
 * Handles CRUD operations, IndexedDB persistence, extension sync,
 * and JSON export/import.
 */

import { create } from 'zustand'
import { db, type AutomationTool, type AutomationServer } from '~/lib/db'
import {
  syncToolDefinitions,
  notifyToolAdded,
  notifyToolRemoved,
  syncAutomationToExtension,
  startRecording as bridgeStartRecording,
  stopRecording as bridgeStopRecording,
  onRecordingStep,
  onRecordingComplete,
  isExtensionAvailable,
} from '~/lib/mcp/extension-bridge'
import type { AutomationActionStep, AutomationToolParameter } from '~/lib/db/schema'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AutomationState {
  /** All automation servers */
  servers: AutomationServer[]
  /** All automation tools */
  tools: AutomationTool[]
  /** Whether the store has been initialized */
  initialized: boolean
  /** Whether a recording is in progress */
  isRecording: boolean
  /** Steps captured during current recording */
  recordingSteps: AutomationActionStep[]
  /** Parameters from extension recording (URL params etc.) */
  recordingParameters: AutomationToolParameter[]
  /** When set, open save dialog with this server pre-selected (from extension Tamamla) */
  pendingRecordingServerId: string | null
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
}

interface AutomationActions {
  // ─── Initialization ───────────────────────────────────────────
  initialize: () => Promise<void>

  // ─── Server CRUD ──────────────────────────────────────────────
  createServer: (name: string, description: string, category?: string) => Promise<AutomationServer>
  updateServer: (id: string, updates: Partial<Pick<AutomationServer, 'name' | 'description' | 'category' | 'disabled'>>) => Promise<void>
  deleteServer: (id: string) => Promise<void>

  // ─── Tool CRUD ────────────────────────────────────────────────
  createTool: (tool: Omit<AutomationTool, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AutomationTool>
  updateTool: (id: string, updates: Partial<Pick<AutomationTool, 'name' | 'displayName' | 'description' | 'parameters' | 'steps' | 'lanes'>>) => Promise<void>
  deleteTool: (id: string) => Promise<void>

  // ─── Recording ────────────────────────────────────────────────
  startRecording: () => void
  stopRecording: () => void
  clearRecording: () => void
  clearPendingRecordingServerId: () => void
  saveRecordingAsTool: (
    serverId: string,
    name: string,
    displayName: string,
    description: string,
    parameters: AutomationToolParameter[],
  ) => Promise<AutomationTool>

  // ─── Extension Sync ───────────────────────────────────────────
  syncToExtension: () => void
  mergeFromExtension: (servers: unknown[], tools: unknown[]) => Promise<void>

  // ─── Export / Import ──────────────────────────────────────────
  exportTool: (toolId: string) => AutomationTool | null
  exportServer: (serverId: string) => { server: AutomationServer; tools: AutomationTool[] } | null
  importTool: (json: unknown, serverId: string) => Promise<AutomationTool>
  importServer: (json: unknown) => Promise<AutomationServer>

  // ─── Helpers ──────────────────────────────────────────────────
  getToolsByServer: (serverId: string) => AutomationTool[]
  getToolDefinitionsForExtension: () => unknown[]
}

type AutomationStore = AutomationState & AutomationActions

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID()
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-z0-9_]/g, '')
    .replaceAll(/_+/g, '_')
    .replaceAll(/(?:^_)|(?:_$)/g, '') || 'tool'
}

/**
 * Convert an AutomationTool to the ToolDefinition format expected by the extension.
 */
function toToolDefinition(tool: AutomationTool): unknown {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    version: tool.version,
    parameters: tool.parameters,
    steps: tool.steps,
    ...(tool.lanes && tool.lanes.length > 1 ? { lanes: tool.lanes } : {}),
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAutomationStore = create<AutomationStore>((set, get) => ({
  // ─── State ──────────────────────────────────────────────────────
  servers: [],
  tools: [],
  initialized: false,
  isRecording: false,
  recordingSteps: [],
  recordingParameters: [],
  pendingRecordingServerId: null,
  loading: false,
  error: null,

  // ─── Initialization ────────────────────────────────────────────

  initialize: async () => {
    if (get().initialized) return

    try {
      set({ loading: true, error: null })

      const [servers, tools] = await Promise.all([
        db.automationServers.toArray(),
        db.automationTools.toArray(),
      ])

      set({
        servers,
        tools,
        initialized: true,
        loading: false,
      })

      // Set up recording listeners
      let unsubStep: (() => void) | null = null
      let unsubComplete: (() => void) | null = null

      unsubStep = onRecordingStep((step) => {
        set((state) => ({
          recordingSteps: [...state.recordingSteps, step as AutomationActionStep],
        }))
      })

      unsubComplete = onRecordingComplete((detail) => {
        set({
          recordingSteps: detail.steps as AutomationActionStep[],
          recordingParameters: (detail.parameters as AutomationToolParameter[]) ?? [],
          pendingRecordingServerId: detail.serverId ?? null,
          isRecording: false,
        })
      })

      // Store cleanup references (will be cleaned up when the page unloads)
      window.addEventListener('beforeunload', () => {
        unsubStep?.()
        unsubComplete?.()
      })

      // Sync existing tools to extension if available
      if (isExtensionAvailable() && tools.length > 0) {
        get().syncToExtension()
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to initialize automation store',
        loading: false,
      })
    }
  },

  // ─── Server CRUD ───────────────────────────────────────────────

  createServer: async (name, description, category = 'custom') => {
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

    await db.automationServers.add(server)
    set((state) => ({ servers: [...state.servers, server] }))
    if (isExtensionAvailable()) get().syncToExtension()
    return server
  },

  updateServer: async (id, updates) => {
    await db.automationServers.update(id, { ...updates, updatedAt: Date.now() })
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s,
      ),
    }))
    if ('disabled' in updates && isExtensionAvailable()) get().syncToExtension()
  },

  deleteServer: async (id) => {
    // Delete all tools belonging to this server
    const tools = get().tools.filter((t) => t.serverId === id)
    for (const tool of tools) {
      await db.automationTools.delete(tool.id)
      notifyToolRemoved(tool.name)
    }

    await db.automationServers.delete(id)
    set((state) => ({
      servers: state.servers.filter((s) => s.id !== id),
      tools: state.tools.filter((t) => t.serverId !== id),
    }))
    if (isExtensionAvailable()) get().syncToExtension()
  },

  // ─── Tool CRUD ─────────────────────────────────────────────────

  createTool: async (toolInput) => {
    const now = Date.now()
    const tool: AutomationTool = {
      ...toolInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }

    await db.automationTools.add(tool)

    // Add tool ID to server
    const server = get().servers.find((s) => s.id === tool.serverId)
    if (server) {
      const updatedToolIds = [...server.toolIds, tool.id]
      await db.automationServers.update(server.id, { toolIds: updatedToolIds, updatedAt: now })
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === server.id ? { ...s, toolIds: updatedToolIds, updatedAt: now } : s,
        ),
      }))
    }

    set((state) => ({ tools: [...state.tools, tool] }))

    // Notify extension
    notifyToolAdded(toToolDefinition(tool))
    if (isExtensionAvailable()) get().syncToExtension()

    return tool
  },

  updateTool: async (id, updates) => {
    const now = Date.now()
    await db.automationTools.update(id, { ...updates, updatedAt: now })

    set((state) => ({
      tools: state.tools.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: now } : t,
      ),
    }))

    // Re-sync to extension (tool name might have changed)
    get().syncToExtension()
  },

  deleteTool: async (id) => {
    const tool = get().tools.find((t) => t.id === id)
    if (!tool) return

    await db.automationTools.delete(id)

    // Remove from server
    const server = get().servers.find((s) => s.id === tool.serverId)
    if (server) {
      const updatedToolIds = server.toolIds.filter((tid) => tid !== id)
      await db.automationServers.update(server.id, { toolIds: updatedToolIds, updatedAt: Date.now() })
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === server.id ? { ...s, toolIds: updatedToolIds, updatedAt: Date.now() } : s,
        ),
      }))
    }

    set((state) => ({ tools: state.tools.filter((t) => t.id !== id) }))

    // Notify extension
    notifyToolRemoved(tool.name)
    if (isExtensionAvailable()) get().syncToExtension()
  },

  // ─── Recording ─────────────────────────────────────────────────

  startRecording: () => {
    set({ isRecording: true, recordingSteps: [] })
    bridgeStartRecording()
  },

  stopRecording: () => {
    bridgeStopRecording()
    set({ isRecording: false })
  },

  clearRecording: () => {
    set({ recordingSteps: [], recordingParameters: [], pendingRecordingServerId: null, isRecording: false })
  },

  clearPendingRecordingServerId: () => {
    set({ pendingRecordingServerId: null })
  },

  saveRecordingAsTool: async (serverId, name, displayName, description, parameters) => {
    const steps = get().recordingSteps
    if (steps.length === 0) throw new Error('No recorded steps to save')

    const tool = await get().createTool({
      name: slugify(name),
      displayName,
      description,
      version: '1.0.0',
      parameters: parameters.length > 0 ? parameters : get().recordingParameters,
      steps,
      serverId,
    })

    set({ recordingSteps: [], recordingParameters: [], pendingRecordingServerId: null, isRecording: false })
    return tool
  },

  // ─── Extension Sync ────────────────────────────────────────────

  syncToExtension: () => {
    const { tools, servers } = get()
    const disabledIds = new Set(servers.filter((s) => s.disabled).map((s) => s.id))
    const enabledTools = tools.filter((t) => !disabledIds.has(t.serverId))
    if (enabledTools.length > 0) {
      const definitions = enabledTools.map(toToolDefinition)
      syncToolDefinitions(definitions)
    }
    // Also push full server+tool data so extension can persist in chrome.storage
    syncAutomationToExtension(servers, tools)
  },

  mergeFromExtension: async (incomingServers, incomingTools) => {
    const rawServers = incomingServers as AutomationServer[]
    const rawTools = incomingTools as AutomationTool[]
    if (!rawServers.length && !rawTools.length) return

    let changed = false

    // Merge servers
    for (const incoming of rawServers) {
      const existing = await db.automationServers.get(incoming.id)
      if (!existing) {
        await db.automationServers.add(incoming)
        changed = true
      } else if (incoming.updatedAt > existing.updatedAt) {
        await db.automationServers.put(incoming)
        changed = true
      }
    }

    // Merge tools
    for (const incoming of rawTools) {
      const existing = await db.automationTools.get(incoming.id)
      if (!existing) {
        await db.automationTools.add(incoming)
        changed = true
      } else if (incoming.updatedAt > existing.updatedAt) {
        await db.automationTools.put(incoming)
        changed = true
      }
    }

    if (changed) {
      const [servers, tools] = await Promise.all([
        db.automationServers.toArray(),
        db.automationTools.toArray(),
      ])
      set({ servers, tools })
      get().syncToExtension()
    }
  },

  // ─── Export / Import ───────────────────────────────────────────

  exportTool: (toolId) => {
    return get().tools.find((t) => t.id === toolId) ?? null
  },

  exportServer: (serverId) => {
    const server = get().servers.find((s) => s.id === serverId)
    if (!server) return null
    const tools = get().tools.filter((t) => t.serverId === serverId)
    return { server, tools }
  },

  importTool: async (json, serverId) => {
    const raw = json as Record<string, unknown>
    const tool = await get().createTool({
      name: (raw.name as string) || slugify(raw.displayName as string || 'imported_tool'),
      displayName: (raw.displayName as string) || (raw.name as string) || 'Imported Tool',
      description: (raw.description as string) || '',
      version: (raw.version as string) || '1.0.0',
      parameters: (raw.parameters as AutomationToolParameter[]) || [],
      steps: (raw.steps as AutomationActionStep[]) || [],
      serverId,
    })
    return tool
  },

  importServer: async (json) => {
    const raw = json as { server?: Record<string, unknown>; tools?: unknown[] }
    const serverData = raw.server || raw as Record<string, unknown>

    const server = await get().createServer(
      (serverData.name as string) || 'Imported Server',
      (serverData.description as string) || '',
      (serverData.category as string) || 'custom',
    )

    if (raw.tools && Array.isArray(raw.tools)) {
      for (const toolJson of raw.tools) {
        await get().importTool(toolJson, server.id)
      }
    }

    return server
  },

  // ─── Helpers ───────────────────────────────────────────────────

  getToolsByServer: (serverId) => {
    return get().tools.filter((t) => t.serverId === serverId)
  },

  getToolDefinitionsForExtension: () => {
    return get().tools.map(toToolDefinition)
  },
}))
