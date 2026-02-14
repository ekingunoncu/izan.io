import { useState, useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, MessageSquare, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { LongTaskBanner } from './LongTaskBanner'
import { AgentChatBanner } from '~/components/agents/AgentChatBanner'
import { ExtensionPrompt } from '~/components/ExtensionPrompt'
import { RecordingControls } from '~/components/automation/RecordingControls'
import { useChatStore, useModelStore, useAgentStore } from '~/store'
import { useProvidersWithModels } from '~/lib/use-providers-with-models'
import { getAgentDisplayName } from '~/lib/agent-display'
import { modelDisplayName } from '~/lib/utils'
import type { ModelInfo } from '~/lib/providers'
import type { Message } from '~/lib/db'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function calculateCost(tokens: { input: number; output: number }, model: ModelInfo | null): number {
  if (!model) return 0
  return (tokens.input * model.costIn + tokens.output * model.costOut) / 1_000_000
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

function messageToChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
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

interface ChatWindowProps {
  initialPrompt?: string
}

export function ChatWindow({ initialPrompt }: ChatWindowProps = {}) {
  const { t } = useTranslation('common')
  const { providers } = useProvidersWithModels()
  const { selectedProvider, selectedModel, isConfigured } = useModelStore()
  const { currentAgentId, currentAgent } = useAgentStore()
  const {
    currentChatId,
    messages,
    isGenerating,
    isLoadingMessages,
    sessionTokens,
    createChat,
    sendMessage,
    stopGenerating,
    enableNotifyOnCompletion,
    longTaskDetectedChats,
    currentProgress,
    longTaskStartedAt,
  } = useChatStore()

  const currentProvider = providers.find(p => p.id === selectedProvider)
  const modelInfo = selectedProvider && selectedModel && currentProvider
    ? currentProvider.models.find(m => m.id === selectedModel)
    : null
  const configured = isConfigured()
  const hasActiveChat = currentChatId !== null

  // Long task banner - dismiss/notify state per chatId, auto-resets on switch
  type BannerState = { chatId: string | null; dismissed: boolean; notifyEnabled: boolean }
  type BannerAction =
    | { type: 'dismiss'; chatId: string }
    | { type: 'notify'; chatId: string }
    | { type: 'reset'; chatId: string | null }
  const [banner, bannerDispatch] = useReducer(
    (state: BannerState, action: BannerAction): BannerState => {
      if (action.type === 'reset') return { chatId: action.chatId, dismissed: false, notifyEnabled: false }
      if (action.chatId !== state.chatId) return state
      switch (action.type) {
        case 'dismiss': return { ...state, dismissed: true }
        case 'notify': return { ...state, notifyEnabled: true }
        default: return state
      }
    },
    { chatId: null, dismissed: false, notifyEnabled: false },
  )

  // Reset banner state when chat changes
  useEffect(() => { bannerDispatch({ type: 'reset', chatId: currentChatId }) }, [currentChatId])

  // Show banner when deep task is active (set immediately on send)
  const longTaskDetected = !!(currentChatId && longTaskDetectedChats[currentChatId])
  const showLongTaskBanner = longTaskDetected && isGenerating && !banner.dismissed

  const handleNewChat = async () => {
    if (!currentAgentId) return
    await createChat(currentAgentId)
  }

  const [deepTask, setDeepTask] = useState(false)

  const handleSendMessage = async (content: string) => {
    if (!currentAgentId) return
    try {
      await sendMessage(content, currentAgentId, { deepTask })
      setDeepTask(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const chatMessages: ChatMessage[] = messages.map(messageToChatMessage)

  // Auto-create chat when navigating with initialPrompt (e.g. from "Try this prompt" on agent detail)
  useEffect(() => {
    if (initialPrompt && !currentChatId && currentAgentId) {
      void createChat(currentAgentId)
    }
  }, [initialPrompt, currentChatId, currentAgentId, createChat])

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
        <AgentChatBanner agent={currentAgent} className="px-4 pt-2" />
        <ExtensionPrompt className="mx-4 mt-2" />
        <EmptyState 
          onNewChat={handleNewChat} 
          agentName={getAgentDisplayName(currentAgent, t) || 'Agent'} 
        />
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <AgentChatBanner agent={currentAgent} className="px-4 pt-2" />
      <ExtensionPrompt className="mx-4 mt-2" />
      {showLongTaskBanner && (
        <LongTaskBanner
          className="mx-4 mt-2"
          currentStep={currentProgress?.current}
          startedAt={currentChatId ? longTaskStartedAt[currentChatId] : undefined}
          onNotifyToggle={() => {
            if (currentChatId && !banner.notifyEnabled) {
              enableNotifyOnCompletion(currentChatId)
              bannerDispatch({ type: 'notify', chatId: currentChatId })
            }
          }}
          notifyEnabled={banner.notifyEnabled || longTaskDetected}
          onDismiss={() => { if (currentChatId) bannerDispatch({ type: 'dismiss', chatId: currentChatId }) }}
        />
      )}
      <MessageList messages={chatMessages} isGenerating={isGenerating} />
      <RecordingControls />

      <div className="border-t bg-background/80 backdrop-blur-sm p-4 sm:p-6 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <MessageInput
          initialPrompt={initialPrompt}
          onSend={handleSendMessage}
          onStop={stopGenerating}
          isGenerating={isGenerating}
          disabled={!configured}
          placeholder={
            !configured
              ? t('chat.selectProviderFirst')
              : t('chat.chatWith', { model: modelInfo ? modelDisplayName(modelInfo.name, t('provider.reasoning')) : (selectedModel ?? '') })
          }
          deepTask={deepTask}
          onDeepTaskToggle={() => setDeepTask(prev => !prev)}
        />
        {!configured && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            {t('chat.selectProviderHint')}
          </p>
        )}
        {hasActiveChat && sessionTokens.input + sessionTokens.output > 0 && (
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{formatTokens(sessionTokens.input + sessionTokens.output)} tokens</span>
            <span>~${calculateCost(sessionTokens, modelInfo ?? null).toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
