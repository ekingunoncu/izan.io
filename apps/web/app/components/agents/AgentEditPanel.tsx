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
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useAgentStore, useUIStore, useMCPStore } from '~/store'
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
  const lang = (i18n.language || 'tr').split('-')[0] as string
  const { currentAgent, agents, updateAgent, resetAgent, deleteAgent } = useAgentStore()
  const { closeAgentEdit } = useUIStore()
  const { userServers } = useMCPStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('bot')
  const [basePrompt, setBasePrompt] = useState('')
  const [implicitMCPIds, setImplicitMCPIds] = useState<string[]>([])
  const [customMCPIds, setCustomMCPIds] = useState<string[]>([])
  const [linkedAgentIds, setLinkedAgentIds] = useState<string[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>('info')

  // Sync local state when current agent changes (e.g. user switches agent)
  useEffect(() => {
    if (!currentAgent) return;
    const t = setTimeout(() => {
      setName(currentAgent.name);
      setDescription(currentAgent.description);
      setSelectedIcon(currentAgent.icon);
      setBasePrompt((currentAgent as { basePrompt?: string; systemPrompt?: string }).basePrompt ?? (currentAgent as { systemPrompt?: string }).systemPrompt ?? "");
      setImplicitMCPIds(currentAgent.implicitMCPIds);
      setCustomMCPIds(currentAgent.customMCPIds);
      setLinkedAgentIds(currentAgent.linkedAgentIds);
    }, 0);
    return () => clearTimeout(t);
  }, [currentAgent]);

  if (!currentAgent) return null

  const handleSave = async () => {
    await updateAgent(currentAgent.id, {
      name: name.trim() || currentAgent.name,
      description: description.trim(),
      icon: selectedIcon,
      basePrompt: basePrompt.trim(),
      implicitMCPIds,
      customMCPIds,
      linkedAgentIds,
    })
    closeAgentEdit()
  }

  const handleReset = async () => {
    if (!confirm(t('agents.resetConfirm'))) return
    await resetAgent(currentAgent.id)
  }

  const handleDelete = async () => {
    if (!confirm(t('agents.deleteConfirm'))) return
    await deleteAgent(currentAgent.id)
    closeAgentEdit()
  }

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  // Available MCPs for adding (use local state)
  const availableImplicitMCPs = DEFAULT_MCP_SERVERS.filter(
    s => !implicitMCPIds.includes(s.id)
  )
  const availableCustomMCPs = userServers.filter(
    us => !customMCPIds.includes(us.id)
  )

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
              <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0" onClick={handleReset} title={t('agents.resetToDefault')}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {currentAgent.source === 'user' && (
              <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 text-destructive" onClick={handleDelete} title={t('agents.delete')}>
                <Trash2 className="h-4 w-4" />
              </Button>
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
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors border',
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
                      className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
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
                      className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{us.name}</span>
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
                        className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
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
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
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
