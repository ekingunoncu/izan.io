import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { useChatStore, useAgentStore } from '~/store'
import type { Chat } from '~/store'
import { cn } from '~/lib/utils'

interface ChatListItemProps {
  chat: Chat
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Az önce'
  if (minutes < 60) return `${minutes} dk önce`
  if (hours < 24) return `${hours} saat önce`
  if (days < 7) return `${days} gün önce`
  
  return new Date(timestamp).toLocaleDateString('tr-TR')
}

function ChatListItem({ chat, isSelected, onSelect, onDelete }: ChatListItemProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
        isSelected 
          ? 'bg-primary/5 border-primary/20' 
          : 'border-transparent hover:bg-muted/50 hover:border-muted'
      )}
      onClick={onSelect}
    >
      <div className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
        isSelected ? 'bg-primary/10' : 'bg-muted'
      )}>
        <MessageSquare className={cn(
          'h-4 w-4',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{chat.title}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(chat.updatedAt)}</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  )
}

interface ChatListProps {
  className?: string
}

export function ChatList({ className }: ChatListProps) {
  const { t } = useTranslation('common')
  const { chats, currentChatId, isLoadingChats, createChat, selectChat, deleteChat } = useChatStore()
  const { currentAgentId } = useAgentStore()

  const handleNewChat = async () => {
    if (!currentAgentId) return
    await createChat(currentAgentId)
  }

  const handleSelectChat = async (chatId: string) => {
    await selectChat(chatId)
  }

  const handleDeleteChat = async (chatId: string) => {
    {
      await deleteChat(chatId)
    }
  }

  if (isLoadingChats) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="text-muted-foreground text-sm">{t('settings.mcpLoading')}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Sohbet Geçmişi</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="h-7 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni
        </Button>
      </div>

      {/* Chat List */}
      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-sm mb-1">Henüz sohbet yok</h4>
          <p className="text-muted-foreground text-xs mb-4">
            Bu agent ile ilk sohbetinizi başlatın
          </p>
          <Button size="sm" onClick={handleNewChat} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('chat.newChat')}
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {chats.map(chat => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isSelected={currentChatId === chat.id}
              onSelect={() => handleSelectChat(chat.id)}
              onDelete={() => handleDeleteChat(chat.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
