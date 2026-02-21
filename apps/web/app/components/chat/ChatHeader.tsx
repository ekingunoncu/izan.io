import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  Cpu,
  Check,
  Brain,
  Pencil,
  Menu,
  Minimize2,
  Loader2,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { useModelStore, useAgentStore, useUIStore } from '~/store'
import { useChatStore } from '~/store'
import { useProvidersWithModels } from '~/lib/use-providers-with-models'
import { getAgentDisplayName, getAgentDisplayDescription } from '~/lib/agent-display'
import { AgentIconDisplay } from '~/lib/agent-icons'
import { cn, modelDisplayName } from '~/lib/utils'

interface ModelQuickSelectProps {
  onClose: () => void
}

function ModelQuickSelect({ onClose }: ModelQuickSelectProps) {
  const { t } = useTranslation('common')
  const { providers } = useProvidersWithModels()
  const { selectedProvider, selectedModel, providerKeys, setProvider, setModel } = useModelStore()
  const reasoningLabel = t('provider.reasoning')

  const handleSelectProvider = async (providerId: string) => {
    await setProvider(providerId)
  }

  const handleSelectModel = async (modelId: string) => {
    await setModel(modelId)
    onClose()
  }

  const configuredProviders = providers.filter(p => !!providerKeys[p.id])
  const currentProviderObj = providers.find(p => p.id === selectedProvider)

  return (
    <div className="absolute top-full right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] min-w-0 sm:w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto overflow-x-hidden">
      <div className="p-2">
        {configuredProviders.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-2 px-1">
            {configuredProviders.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectProvider(p.id)}
                className={cn(
                  'text-xs px-2 py-1 rounded-md transition-colors cursor-pointer',
                  selectedProvider === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {currentProviderObj?.models.map(model => {
          const isSelected = selectedModel === model.id

          return (
            <button
              key={model.id}
              onClick={() => handleSelectModel(model.id)}
              className={cn(
                'w-full px-3 py-2 rounded-md flex items-center gap-3 transition-colors text-left cursor-pointer',
                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{modelDisplayName(model.name, reasoningLabel)}</span>
                  {model.canReason && (
                    <span className="text-xs text-purple-500">{reasoningLabel}</span>
                  )}
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  ${model.costIn}/1M in, ${model.costOut}/1M out
                </div>
              </div>
            </button>
          )
        })}

        {configuredProviders.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t('provider.selectFromSettings')}
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatHeader() {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const { providers } = useProvidersWithModels()
  const { selectedProvider, selectedModel, isConfigured } = useModelStore()
  const { currentAgent } = useAgentStore()
  const { openModelSelector, openAgentEdit, openMobileSidebar } = useUIStore()
  const { currentChatId, messages, isGenerating, isCompacting, compactChat } = useChatStore()
  const canCompact = currentChatId && messages.length > 6 && !isGenerating && !isCompacting

  const currentProvider = providers.find(p => p.id === selectedProvider)
  const modelInfo = selectedProvider && selectedModel && currentProvider
    ? currentProvider.models.find(m => m.id === selectedModel)
    : null
  const configured = isConfigured()

  const handleModelClick = () => {
    if (!configured) {
      openModelSelector()
    } else {
      setIsOpen(!isOpen)
    }
  }

  const agentIconId = currentAgent?.icon || 'bot'

  return (
    <header className="border-b px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between relative gap-2">
      {/* Left: Mobile menu + Agent info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 min-h-[44px] min-w-[44px] sm:hidden flex-shrink-0"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <AgentIconDisplay iconId={agentIconId} className="h-4 w-4 text-primary" emojiClassName="text-base leading-none" />
        </div>
        <div className="min-w-0">
          <h1 className="font-medium text-sm truncate">{getAgentDisplayName(currentAgent, t) || 'Agent'}</h1>
          <p className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">{getAgentDisplayDescription(currentAgent, t)}</p>
        </div>
      </div>

      {/* Right: Compact + Edit + Model selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Compact chat button */}
        {canCompact && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9"
                  onClick={() => {
                    if (currentChatId && confirm(t('chat.compactConfirm'))) {
                      compactChat(currentChatId)
                    }
                  }}
                  disabled={isCompacting}
                >
                  {isCompacting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Minimize2 className="h-4 w-4" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('chat.compactChat')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Edit agent button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9"
          onClick={openAgentEdit}
          title={t('agents.edit')}
        >
          <Pencil className="h-4 w-4" />
        </Button>

        {/* Model selector */}
        <div className="relative">
          <Button variant="outline" size="sm" onClick={handleModelClick} className="gap-1.5 h-11 min-h-[44px] sm:h-9">
            {modelInfo ? (
              <>
                <Brain className="h-3.5 w-3.5" />
                <span className="max-w-24 sm:max-w-32 truncate text-xs sm:text-sm">{modelDisplayName(modelInfo.name, t('provider.reasoning'))}</span>
                <ChevronDown className="h-3 w-3" />
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5" />
                <span className="text-xs sm:text-sm">{t('provider.selectProvider')}</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setIsOpen(false)} />
              <ModelQuickSelect onClose={() => setIsOpen(false)} />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
