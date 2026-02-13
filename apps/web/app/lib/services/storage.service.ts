import { db, type Chat, type Message, type UserPreferences, DEFAULT_PREFERENCES } from '../db'
import type { IStorageService } from './interfaces'

/**
 * StorageService - IndexedDB operations implementation
 * Implements IStorageService interface
 * Single Responsibility: Only handles data persistence
 */
export class StorageService implements IStorageService {
  // ============ Chat Operations ============
  
  async getChats(agentId: string): Promise<Chat[]> {
    return db.chats
      .where('agentId')
      .equals(agentId)
      .reverse()
      .sortBy('updatedAt')
  }

  async getChatById(chatId: string): Promise<Chat | undefined> {
    return db.chats.get(chatId)
  }

  async createChat(chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
    const now = Date.now()
    const newChat: Chat = {
      ...chat,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    await db.chats.add(newChat)

    // Prune old chats if limit is set
    const prefs = await this.getPreferences()
    const limit = prefs.chatHistoryLimit ?? 0
    if (limit > 0) {
      await this.pruneChats(chat.agentId, limit)
    }

    return newChat
  }

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<void> {
    await db.chats.update(chatId, {
      ...updates,
      updatedAt: Date.now(),
    })
  }

  async deleteChat(chatId: string): Promise<void> {
    await db.transaction('rw', [db.chats, db.messages], async () => {
      // Delete all messages in the chat first
      await db.messages.where('chatId').equals(chatId).delete()
      // Then delete the chat
      await db.chats.delete(chatId)
    })
  }

  // ============ Message Operations ============

  async getMessages(chatId: string): Promise<Message[]> {
    return db.messages
      .where('chatId')
      .equals(chatId)
      .sortBy('timestamp')
  }

  async createMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    await db.messages.add(newMessage)

    // Update chat's updatedAt timestamp
    await db.chats.update(message.chatId, {
      updatedAt: Date.now(),
    })

    // Prune old messages if limit is set
    const prefs = await this.getPreferences()
    const limit = prefs.chatMessageLimit ?? 0
    if (limit > 0) {
      await this.pruneMessages(message.chatId, limit)
    }

    return newMessage
  }

  async updateMessage(messageId: string, content: string): Promise<void> {
    await db.messages.update(messageId, { content })
  }

  async deleteMessage(messageId: string): Promise<void> {
    await db.messages.delete(messageId)
  }

  async deleteMessagesByChatId(chatId: string): Promise<void> {
    await db.messages.where('chatId').equals(chatId).delete()
  }

  // ============ Pruning Operations ============

  /** Delete oldest non-system messages in a chat when count exceeds limit */
  private async pruneMessages(chatId: string, limit: number): Promise<void> {
    if (limit <= 0) return
    const total = await db.messages.where('chatId').equals(chatId).count()
    if (total <= limit) return

    // Get all messages sorted by timestamp, keep system messages
    const messages = await db.messages
      .where('[chatId+timestamp]')
      .between([chatId, 0], [chatId, Infinity])
      .sortBy('timestamp')

    const nonSystem = messages.filter(m => m.role !== 'system')
    const excess = nonSystem.length - limit
    if (excess <= 0) return

    const idsToDelete = nonSystem.slice(0, excess).map(m => m.id)
    await db.messages.bulkDelete(idsToDelete)
  }

  /** Delete oldest chats (and their messages) for an agent when count exceeds limit */
  private async pruneChats(agentId: string, limit: number): Promise<void> {
    if (limit <= 0) return
    const total = await db.chats.where('agentId').equals(agentId).count()
    if (total <= limit) return

    // Get chats sorted by updatedAt ascending (oldest first)
    const chats = await db.chats
      .where('[agentId+updatedAt]')
      .between([agentId, 0], [agentId, Infinity])
      .sortBy('updatedAt')

    const excess = chats.length - limit
    if (excess <= 0) return

    const chatsToDelete = chats.slice(0, excess)
    await db.transaction('rw', [db.chats, db.messages], async () => {
      for (const chat of chatsToDelete) {
        await db.messages.where('chatId').equals(chat.id).delete()
        await db.chats.delete(chat.id)
      }
    })
  }

  // ============ Preferences Operations ============

  async getPreferences(): Promise<UserPreferences> {
    const prefs = await db.preferences.get('default')
    if (!prefs) {
      // Initialize with defaults if not exists
      await db.preferences.add(DEFAULT_PREFERENCES)
      return DEFAULT_PREFERENCES
    }
    // Merge with defaults for backward compatibility (e.g. new fields like disabledBuiltinMCPIds)
    return {
      ...DEFAULT_PREFERENCES,
      ...prefs,
      disabledBuiltinMCPIds: prefs.disabledBuiltinMCPIds ?? DEFAULT_PREFERENCES.disabledBuiltinMCPIds,
      favoriteAgentIds: prefs.favoriteAgentIds ?? DEFAULT_PREFERENCES.favoriteAgentIds,
      externalApiKeys: prefs.externalApiKeys ?? DEFAULT_PREFERENCES.externalApiKeys,
      dismissedChatBannerAgentIds:
        prefs.dismissedChatBannerAgentIds ?? DEFAULT_PREFERENCES.dismissedChatBannerAgentIds,
    }
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    const exists = await db.preferences.get('default')
    if (!exists) {
      await db.preferences.add({
        ...DEFAULT_PREFERENCES,
        ...updates,
      })
    } else {
      await db.preferences.update('default', updates)
    }
  }
}

// Singleton instance
export const storageService = new StorageService()
