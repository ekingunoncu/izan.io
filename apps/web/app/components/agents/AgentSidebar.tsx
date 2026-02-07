import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  Search,
  Code,
  Calendar,
  Mail,
  Database,
  Globe,
  FileText,
  Puzzle,
  Zap,
  Shield,
  MessageSquare,
  Lightbulb,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useAgentStore, useChatStore, useUIStore, useMCPStore } from '~/store'
import type { Chat } from '~/store'
import { cn } from '~/lib/utils'
import { getAgentDisplayName, getAgentDisplayDescription } from '~/lib/agent-display'
import { AgentSelector } from './AgentSelector'

// Icon mapping for agents
const agentIcons: Record<string, typeof Bot> = {
  'bot': Bot,
  'search': Search,
  'code': Code,
  'calendar': Calendar,
  'mail': Mail,
  'database': Database,
  'globe': Globe,
  'file-text': FileText,
  'puzzle': Puzzle,
  'zap': Zap,
  'shield': Shield,
  'message-square': MessageSquare,
  'lightbulb': Lightbulb,
}

function ChatItem({ chat, isSelected, onSelect, onDelete }: {
  chat: Chat
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm truncate">{chat.title}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3 w-3 sm:h-3 sm:w-3" />
      </Button>
    </div>
  )
}

export function AgentSidebar() {
  const { t } = useTranslation('common')
  const { currentAgentId, currentAgent, initialize: initAgent } = useAgentStore()
  const { chats, currentChatId, loadChats, createChat, selectChat, deleteChat } = useChatStore()
  const {
    isSidebarCollapsed,
    setSidebarCollapsed,
    isAgentSelectorOpen,
    openAgentSelector,
    closeAgentSelector,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useUIStore()

  const selectorRef = useRef<HTMLDivElement>(null)

  // Initialize agent store
  useEffect(() => {
    initAgent()
  }, [initAgent])

  // Load chats and activate MCPs when agent changes
  useEffect(() => {
    if (currentAgentId) {
      loadChats(currentAgentId)
      const agent = useAgentStore.getState().getAgentById(currentAgentId)
      if (agent) {
        useMCPStore.getState().activateAgentMCPs(agent)
      }
    }
  }, [currentAgentId, loadChats])

  const handleNewChat = async () => {
    if (!currentAgentId) return
    await createChat(currentAgentId)
  }

  const handleChatSelect = async (chatId: string) => {
    await selectChat(chatId)
    closeMobileSidebar()
  }

  const handleChatDelete = async (chatId: string) => {
    await deleteChat(chatId)
  }

  const AgentIcon = currentAgent ? (agentIcons[currentAgent.icon] || Bot) : Bot

  const sidebarContent = (
    <>
      {/* Agent Header - shows current agent with switch button */}
      <div className="p-3 border-b">
        {!isSidebarCollapsed ? (
          <div className="relative" ref={selectorRef}>
            <button
              onClick={() => isAgentSelectorOpen ? closeAgentSelector() : openAgentSelector()}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AgentIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{getAgentDisplayName(currentAgent, t) || 'Agent'}</div>
                <div className="text-xs text-muted-foreground truncate">{getAgentDisplayDescription(currentAgent, t)}</div>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform',
                isAgentSelectorOpen && 'rotate-180'
              )} />
            </button>

            {/* Agent selector dropdown */}
            {isAgentSelectorOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeAgentSelector} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-40 overflow-hidden">
                  <AgentSelector onClose={closeAgentSelector} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => isAgentSelectorOpen ? closeAgentSelector() : openAgentSelector()}
              className="relative w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              title={getAgentDisplayName(currentAgent, t)}
            >
              <AgentIcon className="h-5 w-5 text-primary" />
            </button>
            {/* Collapsed agent selector (desktop only - collapse button hidden on mobile) */}
            {isAgentSelectorOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeAgentSelector} />
                <div className="absolute left-14 top-3 w-72 bg-popover border rounded-lg shadow-lg z-40 overflow-hidden">
                  <AgentSelector onClose={closeAgentSelector} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="px-2 py-1.5 flex items-center justify-between border-b">
        {!isSidebarCollapsed && (
          <span className="text-xs font-medium text-muted-foreground px-1">
            {t('agents.chats')}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {!isSidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
              onClick={handleNewChat}
              title={t('chat.newChat')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 hidden sm:flex"
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Chat List */}
      {!isSidebarCollapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('agents.noChats')}</p>
              <Button
                variant="link"
                size="sm"
                onClick={handleNewChat}
                className="mt-2"
              >
                {t('chat.newChat')}
              </Button>
            </div>
          ) : (
            chats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isSelected={currentChatId === chat.id}
                onSelect={() => handleChatSelect(chat.id)}
                onDelete={() => handleChatDelete(chat.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Collapsed new chat button */}
      {isSidebarCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-2 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-11 h-11 min-h-[44px] min-w-[44px] sm:w-10 sm:h-10 sm:min-h-0 sm:min-w-0"
            onClick={handleNewChat}
            title={t('chat.newChat')}
          >
            <Plus className="h-5 w-5" />
          </Button>
          {/* Show chat icons in collapsed mode */}
            {chats.slice(0, 8).map(chat => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                currentChatId === chat.id ? 'bg-muted' : 'hover:bg-muted/50'
              )}
              title={chat.title}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'h-full border-r bg-muted/30 flex-col transition-all duration-200 hidden sm:flex',
          isSidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 sm:hidden" onClick={closeMobileSidebar} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-background border-r shadow-xl z-40 flex flex-col sm:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
