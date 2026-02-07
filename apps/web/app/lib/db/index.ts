import Dexie, { type EntityTable } from 'dexie'
import { 
  type Agent,
  type Chat, 
  type Message, 
  type UserPreferences,
  type UserMCPServer,
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
          } as Record<string, unknown>)
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
          } as Record<string, unknown>)
        }
      }

      // Migration: sync builtin agents from DEFAULT_AGENTS when not user-edited
      for (const defaultAgent of DEFAULT_AGENTS) {
        const existing = allAgents.find(a => a.id === defaultAgent.id && a.source === 'builtin')
        if (existing && !existing.isEdited) {
          const needsSync =
            existing.implicitMCPIds.length !== defaultAgent.implicitMCPIds.length ||
            existing.implicitMCPIds.some((id, i) => id !== defaultAgent.implicitMCPIds[i]) ||
            existing.basePrompt !== defaultAgent.basePrompt
          if (needsSync) {
            await db.agents.update(defaultAgent.id, {
              implicitMCPIds: defaultAgent.implicitMCPIds,
              basePrompt: defaultAgent.basePrompt,
              updatedAt: Date.now(),
            } as Record<string, unknown>)
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
  await db.transaction('rw', [db.chats, db.messages, db.preferences, db.mcpServers, db.agents], async () => {
    await db.chats.clear()
    await db.messages.clear()
    await db.preferences.clear()
    await db.mcpServers.clear()
    await db.agents.clear()
  })
}

// Re-export types
export type { Agent, Chat, Message, UserPreferences, UserMCPServer } from './schema'
export { DEFAULT_AGENTS, DEFAULT_PREFERENCES, slugify } from './schema'
