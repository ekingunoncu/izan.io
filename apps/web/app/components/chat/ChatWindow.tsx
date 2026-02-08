import { useTranslation } from 'react-i18next'
import { Bot, MessageSquare, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { MissingApiKeyBanner } from '~/components/agents/MissingApiKeyBanner'
import { useChatStore, useModelStore, useAgentStore } from '~/store'
import { useProvidersWithModels } from '~/lib/use-providers-with-models'
import { getAgentDisplayName } from '~/lib/agent-display'
import { modelDisplayName } from '~/lib/utils'
import type { Message } from '~/lib/db'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

function messageToChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
  }
}

interface EmptyStateProps {
  onNewChat: () => void
  agentName: string
}

function EmptyState({ onNewChat, agentName }: EmptyStateProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">
          {t('chat.chatWithAgent', { agent: agentName })}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('chat.startNewChat')}
        </p>
        <Button onClick={onNewChat} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('chat.newChat')}
        </Button>
      </div>
    </div>
  )
}

export function ChatWindow() {
  const { t } = useTranslation('common')
  const { providers } = useProvidersWithModels()
  const { selectedProvider, selectedModel, isConfigured } = useModelStore()
  const { currentAgentId, currentAgent } = useAgentStore()
  const { 
    currentChatId, 
    messages, 
    isGenerating, 
    isLoadingMessages,
    createChat,
    sendMessage,
    stopGenerating,
  } = useChatStore()

  const currentProvider = providers.find(p => p.id === selectedProvider)
  const modelInfo = selectedProvider && selectedModel && currentProvider
    ? currentProvider.models.find(m => m.id === selectedModel)
    : null
  const configured = isConfigured()
  const hasActiveChat = currentChatId !== null

  const handleNewChat = async () => {
    if (!currentAgentId) return
    await createChat(currentAgentId)
  }

  const handleSendMessage = async (content: string) => {
    if (!currentAgentId) return
    try {
      await sendMessage(content, currentAgentId)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const chatMessages: ChatMessage[] = messages.map(messageToChatMessage)

  if (isLoadingMessages) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">{t('chat.loadingMessages')}</p>
        </div>
      </div>
    )
  }

  if (!hasActiveChat) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <MissingApiKeyBanner agent={currentAgent} className="px-4 pt-2" />
        <EmptyState 
          onNewChat={handleNewChat} 
          agentName={getAgentDisplayName(currentAgent, t) || 'Agent'} 
        />
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <MissingApiKeyBanner agent={currentAgent} className="px-4 pt-2" />
      <MessageList messages={chatMessages} isGenerating={isGenerating} />

      <div className="border-t bg-background/80 backdrop-blur-sm p-4 sm:p-6 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <MessageInput
          onSend={handleSendMessage}
          onStop={stopGenerating}
          isGenerating={isGenerating}
          disabled={!configured}
          placeholder={
            !configured 
              ? t('chat.selectProviderFirst')
              : t('chat.chatWith', { model: modelInfo ? modelDisplayName(modelInfo.name, t('provider.reasoning')) : (selectedModel ?? '') })
          }
        />
        {!configured && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            {t('chat.selectProviderHint')}
          </p>
        )}
      </div>
    </div>
  )
}
