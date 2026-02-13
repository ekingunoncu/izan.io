import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  X,
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
  Link2,
  Unlink,
  RotateCcw,
  Server,
  ChevronDown,
  ChevronRight,
  Cog,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useAgentStore, useUIStore, useMCPStore } from '~/store'
import { useAutomationStore } from '~/store/automation.store'
import { DEFAULT_MCP_SERVERS } from '~/lib/mcp/config'
import { getAgentDisplayName, getAgentDisplayDescription } from '~/lib/agent-display'
import { cn } from '~/lib/utils'

const AVAILABLE_ICONS = [
  { id: 'bot', icon: Bot },
  { id: 'search', icon: Search },
  { id: 'code', icon: Code },
  { id: 'calendar', icon: Calendar },
  { id: 'mail', icon: Mail },
  { id: 'database', icon: Database },
  { id: 'globe', icon: Globe },
  { id: 'file-text', icon: FileText },
  { id: 'puzzle', icon: Puzzle },
  { id: 'zap', icon: Zap },
  { id: 'shield', icon: Shield },
  { id: 'message-square', icon: MessageSquare },
  { id: 'lightbulb', icon: Lightbulb },
]

const agentIconMap: Record<string, typeof Bot> = Object.fromEntries(
  AVAILABLE_ICONS.map(({ id, icon }) => [id, icon])
)

function getIcon(iconId: string) {
  return agentIconMap[iconId] || Bot
}

export function AgentEditPanel() {
  const { t, i18n } = useTranslation('common')
  const location = useLocation()
  const lang = (i18n.language || 'en').split('-')[0] as string
  const { currentAgent, agents, updateAgent, resetAgent, deleteAgent } = useAgentStore()
  const { closeAgentEdit } = useUIStore()
  const { userServers } = useMCPStore()
  const automationServers = useAutomationStore(s => s.servers)
  const [enabled, setEnabled] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('bot')
  const [basePrompt, setBasePrompt] = useState('')
  const [implicitMCPIds, setImplicitMCPIds] = useState<string[]>([])
  const [customMCPIds, setCustomMCPIds] = useState<string[]>([])
  const [automationServerIds, setAutomationServerIds] = useState<string[]>([])
  const [linkedAgentIds, setLinkedAgentIds] = useState<string[]>([])
  const [temperature, setTemperature] = useState<number>(1)
  const [maxTokens, setMaxTokens] = useState<number>(4096)
  const [topP, setTopP] = useState<number>(1)
  const [useDefaultParams, setUseDefaultParams] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>('info')
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  // Sync local state when current agent changes (e.g. user switches agent)
  useEffect(() => {
    if (!currentAgent) return;
    const t = setTimeout(() => {
      setEnabled(currentAgent.enabled);
      setName(currentAgent.name);
      setDescription(currentAgent.description);
      setSelectedIcon(currentAgent.icon);
      setBasePrompt(currentAgent.basePrompt);
      setImplicitMCPIds(currentAgent.implicitMCPIds);
      setCustomMCPIds(currentAgent.customMCPIds);
      setAutomationServerIds(currentAgent.automationServerIds ?? []);
      setLinkedAgentIds(currentAgent.linkedAgentIds);
      const hasCustomParams = currentAgent.temperature != null || currentAgent.maxTokens != null || currentAgent.topP != null;
      setUseDefaultParams(!hasCustomParams);
      setTemperature(currentAgent.temperature ?? 1);
      setMaxTokens(currentAgent.maxTokens ?? 4096);
      setTopP(currentAgent.topP ?? 1);
    }, 0);
    return () => clearTimeout(t);
  }, [currentAgent]);


  if (!currentAgent) return null

  const handleSave = async () => {
    const updates: Parameters<typeof updateAgent>[1] = {
      enabled,
      name: name.trim() || currentAgent.name,
      description: description.trim(),
      icon: selectedIcon,
      basePrompt: basePrompt.trim(),
      implicitMCPIds,
      customMCPIds,
      automationServerIds: validAutomationServerIds,
      linkedAgentIds,
    }
    if (!useDefaultParams) {
      updates.temperature = temperature
      updates.maxTokens = maxTokens
      updates.topP = topP
    } else {
      updates.temperature = undefined
      updates.maxTokens = undefined
      updates.topP = undefined
    }
    await updateAgent(currentAgent.id, updates)
    closeAgentEdit()
  }

  const handleReset = async () => {
    setResetDialogOpen(true)
  }

  const handleResetConfirm = async () => {
    await resetAgent(currentAgent.id)
    setResetDialogOpen(false)
  }

  const handleDelete = async () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteDialogOpen(false)
    await deleteAgent(currentAgent.id)
    closeAgentEdit()
  }

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  // Available MCPs for adding (use local state)
  const availableImplicitMCPs = DEFAULT_MCP_SERVERS.filter(
    s => !implicitMCPIds.includes(s.id) && !s.id.startsWith('ext-')
  )
  const availableCustomMCPs = userServers.filter(
    us => !customMCPIds.includes(us.id)
  )
  // User-recorded macro servers from automation store
  const userMacroServers = automationServers.filter(s => !s.disabled)
  // Filter out stale IDs referencing deleted servers
  const validAutomationServerIds = automationServerIds.filter(id => automationServers.some(s => s.id === id))
  // All macros available for adding (not yet assigned)
  const allAvailableMacros = [
    ...userMacroServers.filter(s => !validAutomationServerIds.includes(s.id)).map(s => ({ id: s.id, name: s.name, description: s.description })),
  ]

  // Agents available for linking (exclude self and already linked)
  const availableAgentsForLinking = agents.filter(
    a => a.id !== currentAgent.id && a.enabled && !linkedAgentIds.includes(a.id)
  )
  const linkedAgentsList = agents.filter(
    a => linkedAgentIds.includes(a.id)
  )

  return (
    <>
      {/* Backdrop - only backdrop closes on click, not panel */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={closeAgentEdit}
        aria-hidden="true"
      />

      {/* Panel - stop propagation so clicks don't bubble to backdrop */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[60%] lg:w-[400px] max-w-full bg-background border-l shadow-xl z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">{t('agents.editTitle')}</h2>
          <div className="flex items-center gap-1">
            {currentAgent.source === 'builtin' && currentAgent.isEdited && (
              <>
                <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0" onClick={handleReset} title={t('agents.resetToDefault')}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('agents.resetToDefault')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('agents.resetConfirm')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('agents.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetConfirm}>{t('agents.resetToDefault')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {currentAgent.source === 'user' && (
              <>
                <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 text-destructive" onClick={handleDelete} title={t('agents.delete')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('agents.delete')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('agents.deleteConfirm')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('agents.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('agents.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0" onClick={closeAgentEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Agent Info Section */}
          <CollapsibleSection
            title={t('agents.agentInfo')}
            isOpen={expandedSection === 'info'}
            onToggle={() => toggleSection('info')}
          >
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium">{t('agents.enabled')}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-input accent-primary h-4 w-4"
                />
              </label>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('agents.name')}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('agents.namePlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('agents.descriptionLabel')}</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('agents.descriptionPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('agents.iconLabel')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ICONS.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedIcon(id)}
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors border cursor-pointer',
                        selectedIcon === id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-transparent'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* System Prompt Section */}
          <CollapsibleSection
            title={t('agents.basePrompt')}
            isOpen={expandedSection === 'prompt'}
            onToggle={() => toggleSection('prompt')}
          >
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder={t('agents.basePromptPlaceholder')}
              className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              rows={5}
            />
          </CollapsibleSection>

          {/* Model Parameters Section */}
          <CollapsibleSection
            title={t('agents.modelParams')}
            subtitle={t('agents.modelParamsDesc')}
            isOpen={expandedSection === 'modelParams'}
            onToggle={() => toggleSection('modelParams')}
          >
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDefaultParams}
                  onChange={(e) => setUseDefaultParams(e.target.checked)}
                  className="rounded border-input"
                />
                {t('agents.useDefault')}
              </label>
              {!useDefaultParams && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">{t('agents.temperature')}</label>
                      <span className="text-sm text-muted-foreground">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">{t('agents.temperatureDesc')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('agents.maxTokens')}</label>
                    <Input
                      type="number"
                      min={1}
                      max={128000}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Math.max(1, Math.min(128000, Number(e.target.value) || 4096)))}
                    />
                    <p className="text-xs text-muted-foreground">{t('agents.maxTokensDesc')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">{t('agents.topP')}</label>
                      <span className="text-sm text-muted-foreground">{topP}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={topP}
                      onChange={(e) => setTopP(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">{t('agents.topPDesc')}</p>
                  </div>
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* Implicit MCPs */}
          <CollapsibleSection
            title={t('agents.implicitMCPs')}
            subtitle={t('agents.implicitMCPsDesc')}
            isOpen={expandedSection === 'implicit-mcps'}
            onToggle={() => toggleSection('implicit-mcps')}
          >
            <div className="space-y-2">
              {/* Active implicit MCPs */}
              {implicitMCPIds.map(mcpId => {
                const config = DEFAULT_MCP_SERVERS.find(s => s.id === mcpId)
                return (
                  <div key={mcpId} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{config?.name || mcpId}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setImplicitMCPIds(prev => prev.filter(id => id !== mcpId))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}

              {/* Add implicit MCP */}
              {availableImplicitMCPs.length > 0 && (
                <div className="pt-1">
                  {availableImplicitMCPs.map(config => (
                    <button
                      key={config.id}
                      onClick={() => setImplicitMCPIds(prev => [...prev, config.id])}
                      className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{config.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {implicitMCPIds.length === 0 && availableImplicitMCPs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">{t('agents.noAvailableMCPs')}</p>
              )}
            </div>
          </CollapsibleSection>

          {/* Custom MCPs */}
          <CollapsibleSection
            title={t('agents.customMCPs')}
            subtitle={t('agents.customMCPsDesc')}
            isOpen={expandedSection === 'custom-mcps'}
            onToggle={() => toggleSection('custom-mcps')}
          >
            <div className="space-y-2">
              {customMCPIds.map(mcpId => {
                const us = userServers.find(s => s.id === mcpId)
                return (
                  <div key={mcpId} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm truncate block">{us?.name || mcpId}</span>
                        {us?.url && <span className="text-xs text-muted-foreground truncate block">{us.url}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setCustomMCPIds(prev => prev.filter(id => id !== mcpId))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}

              {customMCPIds.length === 0 && availableCustomMCPs.length === 0 && (
                <div className="text-center py-3 space-y-2">
                  <p className="text-sm text-muted-foreground">{t('agents.noAvailableMCPs')}</p>
                  <Link
                    to={`/${lang}/settings`}
                    state={{ from: location.pathname }}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    onClick={closeAgentEdit}
                  >
                    {t('settings.title')} →
                  </Link>
                </div>
              )}

              {customMCPIds.length === 0 && availableCustomMCPs.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">{t('agents.noCustomMCPs')}</p>
              )}

              {availableCustomMCPs.length > 0 && (
                <div className="pt-1 space-y-1">
                  {availableCustomMCPs.map(us => (
                    <button
                      key={us.id}
                      onClick={() => setCustomMCPIds(prev => [...prev, us.id])}
                      className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{us.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Macros */}
          <CollapsibleSection
            title={t('agents.macros')}
            subtitle={t('agents.macrosDesc')}
            isOpen={expandedSection === 'macros'}
            onToggle={() => toggleSection('macros')}
          >
            <div className="space-y-2">
              {/* Active macros (already assigned to this agent) */}
              {validAutomationServerIds.map(sId => {
                const userServer = userMacroServers.find(s => s.id === sId)
                const name = userServer?.name || sId
                const desc = userServer?.description
                return (
                  <div key={sId} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Cog className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm truncate block">{name}</span>
                        {desc && <span className="text-xs text-muted-foreground truncate block">{desc}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setAutomationServerIds(prev => prev.filter(id => id !== sId))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}

              {validAutomationServerIds.length === 0 && allAvailableMacros.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">{t('agents.noMacros')}</p>
              )}

              {validAutomationServerIds.length === 0 && allAvailableMacros.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">{t('agents.noMacrosAssigned')}</p>
              )}

              {/* Available macros to add */}
              {allAvailableMacros.length > 0 && (
                <div className="pt-1 space-y-1">
                  {allAvailableMacros.map(macro => (
                    <button
                      key={macro.id}
                      onClick={() => setAutomationServerIds(prev => [...prev, macro.id])}
                      className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{macro.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Linked Agents */}
          <CollapsibleSection
            title={t('agents.linkedAgents')}
            subtitle={t('agents.linkedAgentsDesc')}
            isOpen={expandedSection === 'linked-agents'}
            onToggle={() => toggleSection('linked-agents')}
          >
            <div className="space-y-2">
              {linkedAgentsList.map(linkedAgent => {
                const Icon = getIcon(linkedAgent.icon)
                return (
                  <div key={linkedAgent.id} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{getAgentDisplayName(linkedAgent, t)}</span>
                        <span className="text-xs text-muted-foreground truncate block">{getAgentDisplayDescription(linkedAgent, t)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setLinkedAgentIds(prev => prev.filter(id => id !== linkedAgent.id))}
                      title={t('agents.unlinkAgent')}
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}

              {linkedAgentsList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">{t('agents.noLinkedAgents')}</p>
              )}

              {availableAgentsForLinking.length > 0 && (
                <div className="pt-1 space-y-1">
                  {availableAgentsForLinking.map(agent => {
                    const Icon = getIcon(agent.icon)
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setLinkedAgentIds(prev => [...prev, agent.id])}
                        className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{getAgentDisplayName(agent, t)}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {availableAgentsForLinking.length === 0 && linkedAgentsList.length > 0 && (
                <p className="text-xs text-muted-foreground text-center pt-2">{t('agents.noAvailableAgents')}</p>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={closeAgentEdit}>
            {t('agents.cancel')}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t('agents.save')}
          </Button>
        </div>
      </div>
    </>
  )
}

/** Collapsible section component for the edit panel */
function CollapsibleSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{title}</span>
          {subtitle && !isOpen && (
            <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
          {children}
        </div>
      )}
    </div>
  )
}
