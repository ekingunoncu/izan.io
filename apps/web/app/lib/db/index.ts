import Dexie, { type EntityTable } from 'dexie'
import {
  type Agent,
  type Chat,
  type Message,
  type UserPreferences,
  type UserMCPServer,
  type AutomationTool,
  type AutomationServer,
  type UsageRecord,
  type ScheduledPlan,
  type PlanExecution,
  DEFAULT_AGENTS,
  DEFAULT_PREFERENCES,
  slugify,
} from './schema'

/**
 * IzanDB - IndexedDB database for izan.io
 * Uses Dexie.js for type-safe IndexedDB operations
 */
export class IzanDB extends Dexie {
  chats!: EntityTable<Chat, 'id'>
  messages!: EntityTable<Message, 'id'>
  preferences!: EntityTable<UserPreferences, 'id'>
  mcpServers!: EntityTable<UserMCPServer, 'id'>
  agents!: EntityTable<Agent, 'id'>
  automationTools!: EntityTable<AutomationTool, 'id'>
  automationServers!: EntityTable<AutomationServer, 'id'>
  usageRecords!: EntityTable<UsageRecord, 'id'>
  scheduledPlans!: EntityTable<ScheduledPlan, 'id'>
  planExecutions!: EntityTable<PlanExecution, 'id'>

  constructor() {
    super('izan-db')
    
    this.version(1).stores({
      chats: 'id, agentId, updatedAt',
      messages: 'id, chatId, timestamp',
      preferences: 'id',
    })

    this.version(2).stores({
      chats: 'id, agentId, updatedAt',
      messages: 'id, chatId, timestamp',
      preferences: 'id',
      mcpServers: 'id',
    })

    this.version(3).stores({
      chats: 'id, agentId, updatedAt',
      messages: 'id, chatId, timestamp',
      preferences: 'id',
      mcpServers: 'id',
      agents: 'id, source, category, enabled',
    })

    this.version(4).stores({
      chats: 'id, agentId, updatedAt',
      messages: 'id, chatId, timestamp',
      preferences: 'id',
      mcpServers: 'id',
      agents: 'id, source, category, enabled',
      automationTools: 'id, name, serverId, updatedAt',
      automationServers: 'id, updatedAt',
    })

    this.version(5).stores({
      chats: 'id, agentId, updatedAt, [agentId+updatedAt]',
      messages: 'id, chatId, timestamp, [chatId+timestamp]',
      preferences: 'id',
      mcpServers: 'id',
      agents: 'id, source, category, enabled',
      automationTools: 'id, name, serverId, updatedAt',
      automationServers: 'id, updatedAt',
    })

    this.version(6).stores({
      chats: 'id, agentId, updatedAt, [agentId+updatedAt]',
      messages: 'id, chatId, timestamp, [chatId+timestamp]',
      preferences: 'id',
      mcpServers: 'id',
      agents: 'id, source, category, enabled',
      automationTools: 'id, name, serverId, updatedAt',
      automationServers: 'id, updatedAt',
      usageRecords: 'id, chatId, agentId, modelId, providerId, timestamp',
    })

    this.version(7).stores({
      chats: 'id, agentId, updatedAt, [agentId+updatedAt]',
      messages: 'id, chatId, timestamp, [chatId+timestamp]',
      preferences: 'id',
      mcpServers: 'id',
      agents: 'id, source, category, enabled',
      automationTools: 'id, name, serverId, updatedAt',
      automationServers: 'id, updatedAt',
      usageRecords: 'id, chatId, agentId, modelId, providerId, timestamp',
      scheduledPlans: 'id, agentId, status, nextRunAt',
      planExecutions: 'id, planId, chatId, startedAt',
    })

    // Note: Chat also has optional taskStatus/taskCurrentStep/taskTotalSteps fields
    // (unindexed, so no schema version bump needed)
  }
}

// Singleton database instance
export const db = new IzanDB()

/**
 * Initialize database with default data if empty.
 * Seeds default agents on first run, preserves user edits on subsequent runs.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if preferences exist
    const prefs = await db.preferences.get('default')
    if (!prefs) {
      await db.preferences.add(DEFAULT_PREFERENCES)
    }

    // Seed default agents if they don't exist yet
    const existingAgentCount = await db.agents.count()
    if (existingAgentCount === 0) {
      await db.agents.bulkAdd(DEFAULT_AGENTS)
    } else {
      // Ensure any new builtin agents are added (don't overwrite existing edited ones)
      const existingIds = new Set((await db.agents.toArray()).map(a => a.id))
      const newBuiltins = DEFAULT_AGENTS.filter(a => !existingIds.has(a.id))
      if (newBuiltins.length > 0) {
        await db.agents.bulkAdd(newBuiltins)
      }
    }

    // Migrations (run after seed)
    {
      const allAgents = await db.agents.toArray()
      for (const agent of allAgents) {
        const a = agent as { basePrompt?: string; systemPrompt?: string }
        if (!a.basePrompt && a.systemPrompt) {
          await db.agents.update(agent.id, {
            basePrompt: a.systemPrompt,
            updatedAt: Date.now(),
          })
        }
        // Migration: add extensionMCPIds if missing
        const ag = agent as { extensionMCPIds?: string[] }
        if (!Array.isArray(ag.extensionMCPIds)) {
          await db.agents.update(agent.id, {
            extensionMCPIds: [],
            updatedAt: Date.now(),
          })
        }
        // Migration: add automationServerIds if missing
        const agAuto = agent as { automationServerIds?: string[] }
        if (!Array.isArray(agAuto.automationServerIds)) {
          await db.agents.update(agent.id, {
            automationServerIds: [],
            updatedAt: Date.now(),
          })
        }
      }

      // Migration: backfill slug for agents missing it
      const usedSlugs = new Set(allAgents.map(a => (a as Agent & { slug?: string }).slug).filter(Boolean))
      for (const agent of allAgents) {
        const a = agent as Agent & { slug?: string }
        if (!a.slug) {
          const slug = agent.source === 'builtin'
            ? agent.id
            : (() => {
                const base = slugify(agent.name)
                let candidate = base
                let n = 1
                while (usedSlugs.has(candidate)) candidate = `${base}-${++n}`
                usedSlugs.add(candidate)
                return candidate
              })()
          await db.agents.update(agent.id, {
            slug,
            updatedAt: Date.now(),
          })
        }
      }

      // Migration: sync builtin agents from DEFAULT_AGENTS when not user-edited
      for (const defaultAgent of DEFAULT_AGENTS) {
        const existing = allAgents.find(a => a.id === defaultAgent.id && a.source === 'builtin')
        if (existing && !existing.isEdited) {
          const defaultExt = (defaultAgent as { extensionMCPIds?: string[] }).extensionMCPIds ?? []
          const existingExt = (existing as { extensionMCPIds?: string[] }).extensionMCPIds ?? []
          const defaultAuto = (defaultAgent as { automationServerIds?: string[] }).automationServerIds ?? []
          const existingAuto = (existing as { automationServerIds?: string[] }).automationServerIds ?? []
          const needsSync =
            existing.implicitMCPIds.length !== defaultAgent.implicitMCPIds.length ||
            existing.implicitMCPIds.some((id, i) => id !== defaultAgent.implicitMCPIds[i]) ||
            existingExt.length !== defaultExt.length ||
            existingExt.some((id, i) => id !== defaultExt[i]) ||
            existingAuto.length !== defaultAuto.length ||
            existingAuto.some((id, i) => id !== defaultAuto[i]) ||
            existing.basePrompt !== defaultAgent.basePrompt ||
            existing.temperature !== defaultAgent.temperature ||
            existing.maxTokens !== defaultAgent.maxTokens ||
            existing.topP !== defaultAgent.topP
          if (needsSync) {
            await db.agents.update(defaultAgent.id, {
              implicitMCPIds: defaultAgent.implicitMCPIds,
              extensionMCPIds: defaultExt,
              automationServerIds: defaultAuto,
              basePrompt: defaultAgent.basePrompt,
              temperature: defaultAgent.temperature,
              maxTokens: defaultAgent.maxTokens,
              topP: defaultAgent.topP,
              updatedAt: Date.now(),
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

/**
 * Clear all data from the database (for testing/reset)
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', [db.chats, db.messages, db.preferences, db.mcpServers, db.agents, db.automationTools, db.automationServers, db.usageRecords, db.scheduledPlans, db.planExecutions], async () => {
    await db.chats.clear()
    await db.messages.clear()
    await db.preferences.clear()
    await db.mcpServers.clear()
    await db.agents.clear()
    await db.automationTools.clear()
    await db.automationServers.clear()
    await db.usageRecords.clear()
    await db.scheduledPlans.clear()
    await db.planExecutions.clear()
  })
}

// Re-export types
export type { Agent, Chat, Message, TaskStatus, UserPreferences, UserMCPServer, AutomationTool, AutomationServer, UsageRecord, ScheduledPlan, PlanExecution, PlanScheduleType, PlanStatus } from './schema'
export { DEFAULT_AGENTS, DEFAULT_PREFERENCES, slugify } from './schema'
