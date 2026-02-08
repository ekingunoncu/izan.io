import { create } from 'zustand'
import { storageService } from '~/lib/services'

interface ChatBannerState {
  dismissedByAgentId: Record<string, boolean>
  isInitialized: boolean

  initialize: () => Promise<void>
  isDismissed: (agentId: string) => boolean
  dismissBanner: (agentId: string) => Promise<void>
}

export const useChatBannerStore = create<ChatBannerState>((set, get) => ({
  dismissedByAgentId: {},
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return
    try {
      const prefs = await storageService.getPreferences()
      const raw = prefs.dismissedChatBannerAgentIds
      // Migrate legacy array format to Record
      const map: Record<string, boolean> =
        Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [id, true])) : raw ?? {}
      set({
        dismissedByAgentId: map,
        isInitialized: true,
      })
    } catch {
      set({ isInitialized: true })
    }
  },

  isDismissed: (agentId: string) => {
    return Boolean(get().dismissedByAgentId[agentId])
  },

  dismissBanner: async (agentId: string) => {
    const { dismissedByAgentId } = get()
    if (dismissedByAgentId[agentId]) return
    const next = { ...dismissedByAgentId, [agentId]: true }
    set({ dismissedByAgentId: next })
    await storageService.updatePreferences({ dismissedChatBannerAgentIds: next })
  },
}))
