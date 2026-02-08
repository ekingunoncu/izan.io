import { create } from 'zustand'

/**
 * UIState - State interface for UI state management
 */
interface UIState {
  // Sidebar state
  isSidebarOpen: boolean
  isSidebarCollapsed: boolean
  
  // Model selector modal
  isModelSelectorOpen: boolean

  // Agent selector panel
  isAgentSelectorOpen: boolean

  // Agent edit panel (right drawer)
  isAgentEditOpen: boolean
  /** When set, AgentEditPanel will expand this section and focus the first input (e.g. 'api-keys') */
  agentEditExpandSection: string | null

  // Create agent dialog
  isCreateAgentOpen: boolean

  // Mobile sidebar overlay
  isMobileSidebarOpen: boolean
  
  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  openModelSelector: () => void
  closeModelSelector: () => void
  openAgentSelector: () => void
  closeAgentSelector: () => void
  toggleAgentSelector: () => void
  openAgentEdit: (options?: { expandSection?: string }) => void
  closeAgentEdit: () => void
  clearAgentEditExpandSection: () => void
  openCreateAgent: () => void
  closeCreateAgent: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
}

/**
 * useUIStore - Zustand store for UI state
 */
export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  isModelSelectorOpen: false,
  isAgentSelectorOpen: false,
  isAgentEditOpen: false,
  agentEditExpandSection: null,
  isCreateAgentOpen: false,
  isMobileSidebarOpen: false,

  toggleSidebar: () => {
    set(state => ({ isSidebarOpen: !state.isSidebarOpen }))
  },

  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open })
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed })
  },

  openModelSelector: () => {
    set({ isModelSelectorOpen: true })
  },

  closeModelSelector: () => {
    set({ isModelSelectorOpen: false })
  },

  openAgentSelector: () => {
    set({ isAgentSelectorOpen: true })
  },

  closeAgentSelector: () => {
    set({ isAgentSelectorOpen: false })
  },

  toggleAgentSelector: () => {
    set(state => ({ isAgentSelectorOpen: !state.isAgentSelectorOpen }))
  },

  openAgentEdit: (options?: { expandSection?: string }) => {
    set({
      isAgentEditOpen: true,
      agentEditExpandSection: options?.expandSection ?? null,
    })
  },

  closeAgentEdit: () => {
    set({ isAgentEditOpen: false, agentEditExpandSection: null })
  },

  clearAgentEditExpandSection: () => {
    set({ agentEditExpandSection: null })
  },

  openCreateAgent: () => {
    set({ isCreateAgentOpen: true })
  },

  closeCreateAgent: () => {
    set({ isCreateAgentOpen: false })
  },

  openMobileSidebar: () => {
    set({ isMobileSidebarOpen: true })
  },

  closeMobileSidebar: () => {
    set({ isMobileSidebarOpen: false })
  },
}))
