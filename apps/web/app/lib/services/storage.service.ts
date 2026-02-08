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
