import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Key,
  Gift,
  Eye,
  EyeOff,
  ExternalLink,
  Brain,
  MessageSquare,
  Sparkles,
  Zap,
  Bot,
  Globe,
  Wind,
  Layers,
  Flame,
  Search,
  Cpu,
  Server,
  Terminal,
  Moon,
  Minimize,
  HardDrive,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Input } from '~/components/ui/input'
import { type ProviderInfo, type ModelInfo } from '~/lib/providers'
import { useProvidersWithModels } from '~/lib/use-providers-with-models'
import { modelDisplayName } from '~/lib/utils'
import { useModelStore } from '~/store'

const PROVIDER_ICONS: Record<string, typeof Brain> = {
  brain: Brain,
  'message-square': MessageSquare,
  sparkles: Sparkles,
  zap: Zap,
  bot: Bot,
  globe: Globe,
  wind: Wind,
  layers: Layers,
  flame: Flame,
  search: Search,
  cpu: Cpu,
  server: Server,
  terminal: Terminal,
  moon: Moon,
  minimize: Minimize,
  'hard-drive': HardDrive,
}

function ProviderCard({
  provider,
  isSelected,
  hasKey,
  onSelect,
}: {
  provider: ProviderInfo
  isSelected: boolean
  hasKey: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation('common')
  const Icon = PROVIDER_ICONS[provider.icon] || Brain

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">{provider.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {provider.hasFreeTier && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs bg-emerald-400/90 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help">
                    <Gift className="h-3 w-3" />
                    {t('provider.freeTier')}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {t(`provider.freeTierHint.${provider.id}`)}
                </TooltipContent>
              </Tooltip>
            )}
            {hasKey && (
              <span className="text-xs bg-green-400/90 text-green-950 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Key className="h-3 w-3" />
                {t('settings.connected')}
              </span>
            )}
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
        </div>
        <CardDescription className="text-xs">{provider.description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function ModelCard({
  model,
  isSelected,
  onSelect,
}: {
  model: ModelInfo
  isSelected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation('common')
  const reasoningLabel = t('provider.reasoning')
  const displayName = modelDisplayName(model.name, reasoningLabel)

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{displayName}</span>
          {model.canReason && (
            <span className="text-xs bg-purple-300/90 text-purple-900 dark:bg-purple-900 dark:text-purple-300 px-1.5 py-0.5 rounded">
              {reasoningLabel}
            </span>
          )}
          {model.supportsTools && (
            <span className="text-xs bg-blue-300/90 text-blue-900 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded">
              {t('provider.tools')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          ${model.costIn}/1M in, ${model.costOut}/1M out
        </p>
      </div>
      {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
    </div>
  )
}

function ApiKeyInput({
  provider,
  currentKey,
  onSave,
}: {
  provider: ProviderInfo
  currentKey: string | null
  onSave: (key: string) => void
}) {
  const { t } = useTranslation('common')
  const [key, setKey] = useState(currentKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(!!currentKey)

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{provider.name} API Key</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false) }}
            placeholder={`${provider.envHint}...`}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button onClick={handleSave} size="sm" disabled={!key.trim()}>
          {saved ? <Check className="h-4 w-4" /> : t('settings.save')}
        </Button>
      </div>
      <a
        href={provider.apiKeyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        {t('settings.getApiKey')} <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

interface ModelSelectorProps {
  onModelLoaded?: () => void
}

export function ModelSelector({ onModelLoaded }: ModelSelectorProps) {
  const { t } = useTranslation('common')
  const [providerSearch, setProviderSearch] = useState('')
  const {
    providers,
    isLoading,
    filterProviders: doFilter,
  } = useProvidersWithModels()
  const {
    selectedProvider,
    selectedModel,
    providerKeys,
    setProvider,
    setModel,
    setApiKey,
    isConfigured,
  } = useModelStore()

  const currentProvider = providers.find(p => p.id === selectedProvider)
  const filteredProviders = doFilter(providerSearch)

  const handleSelectProvider = async (providerId: string) => {
    await setProvider(providerId)
  }

  const handleSelectModel = async (modelId: string) => {
    await setModel(modelId)
    if (isConfigured()) {
      onModelLoaded?.()
    }
  }

  const handleSaveKey = async (providerId: string, apiKey: string) => {
    await setApiKey(providerId, apiKey)
    if (isConfigured()) {
      onModelLoaded?.()
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-1">{t('provider.selectTitle')}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('provider.selectDesc')}
        </p>
      </div>

      {/* Provider search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('settings.providerSearchPlaceholder')}
          value={providerSearch}
          onChange={(e) => setProviderSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Provider grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {isLoading ? (
          <p className="col-span-2 text-sm text-muted-foreground py-4 text-center">
            {t('provider.loadingModels')}
          </p>
        ) : filteredProviders.length === 0 ? (
          <p className="col-span-2 text-sm text-muted-foreground py-4 text-center">
            {t('settings.providerSearchNoResults')}
          </p>
        ) : (
          filteredProviders.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isSelected={selectedProvider === provider.id}
              hasKey={!!providerKeys[provider.id]}
              onSelect={() => handleSelectProvider(provider.id)}
            />
          ))
        )}
      </div>

      {/* API key input for selected provider */}
      {currentProvider && (
        <Card>
          <CardContent className="pt-4">
            <ApiKeyInput
              provider={currentProvider}
              currentKey={providerKeys[currentProvider.id] ?? null}
              onSave={(key) => handleSaveKey(currentProvider.id, key)}
            />
          </CardContent>
        </Card>
      )}

      {/* Model selector for selected provider */}
      {currentProvider && (
        <div>
          <h3 className="text-sm font-medium mb-2">
            {t('provider.models', { provider: currentProvider.name })}
          </h3>
          <div className="grid gap-2">
            {currentProvider.models.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedModel === model.id}
                onSelect={() => handleSelectModel(model.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {isConfigured() && (
        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-400 font-medium">
          <Check className="h-4 w-4" />
          {t('provider.ready')}
        </div>
      )}
    </div>
  )
}
