import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, ZoomIn, ZoomOut, Maximize, Plus, ChevronLeft, ChevronDown, Search, Link } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { useUIStore } from '~/store/ui.store'
import { useAgentStore } from '~/store/agent.store'
import { useFlowStore } from '~/store/flow.store'
import { AgentIconDisplay } from '~/lib/agent-icons'
import { getAgentDisplayName } from '~/lib/agent-display'
import type { Agent } from '~/lib/db/schema'

interface FlowControlsProps {
  rootAgentId: string | null
  agents: Agent[]
  canDrillBack: boolean
  onRootAgentChange: (agentId: string) => void
  onDrillBack: () => void
  onAutoLayout: () => void
}

export function FlowControls({
  rootAgentId,
  agents,
  canDrillBack,
  onRootAgentChange,
  onDrillBack,
  onAutoLayout,
}: FlowControlsProps) {
  const { t } = useTranslation('common')
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const [rootDropdownOpen, setRootDropdownOpen] = useState(false)
  const [rootSearch, setRootSearch] = useState('')
  const rootDropdownRef = useRef<HTMLDivElement>(null)

  const [linkPickerOpen, setLinkPickerOpen] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const linkPickerRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on click-outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootDropdownRef.current && !rootDropdownRef.current.contains(e.target as Node)) {
        setRootDropdownOpen(false)
        setRootSearch('')
      }
      if (linkPickerRef.current && !linkPickerRef.current.contains(e.target as Node)) {
        setLinkPickerOpen(false)
        setLinkSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const enabledAgents = agents.filter(a => a.enabled)
  const rootAgent = agents.find(a => a.id === rootAgentId)

  const filteredRootAgents = rootSearch
    ? enabledAgents.filter(a => getAgentDisplayName(a, t).toLowerCase().includes(rootSearch.toLowerCase()))
    : enabledAgents

  // Agents available for linking (not already linked by root)
  const linkableAgents = rootAgent
    ? enabledAgents.filter(a => a.id !== rootAgentId && !rootAgent.linkedAgentIds.includes(a.id))
    : []
  const filteredLinkAgents = linkSearch
    ? linkableAgents.filter(a => getAgentDisplayName(a, t).toLowerCase().includes(linkSearch.toLowerCase()))
    : linkableAgents

  return (
    <div className="absolute top-3 left-3 right-3 sm:top-4 sm:right-4 sm:left-auto z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-xl border border-border p-1 shadow-sm">
      <TooltipProvider delayDuration={300}>
        {/* Back button */}
        {canDrillBack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onDrillBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('flow.drillBack')}</p></TooltipContent>
          </Tooltip>
        )}

        {/* Root Agent Dropdown */}
        <div className="relative min-w-0" ref={rootDropdownRef}>
          <Button
            variant="ghost"
            className="h-8 px-2 gap-1.5 min-w-0 max-w-full"
            onClick={() => setRootDropdownOpen(!rootDropdownOpen)}
          >
            {rootAgent ? (
              <>
                <AgentIconDisplay iconId={rootAgent.icon} className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm">{getAgentDisplayName(rootAgent, t)}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground truncate">{t('flow.selectRootAgent')}</span>
            )}
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          </Button>

          {rootDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={rootSearch}
                    onChange={(e) => setRootSearch(e.target.value)}
                    placeholder={t('flow.searchAgents')}
                    className="pl-8 h-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto pb-1">
                {filteredRootAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      onRootAgentChange(agent.id)
                      setRootDropdownOpen(false)
                      setRootSearch('')
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer ${agent.id === rootAgentId ? 'bg-muted/60 font-medium' : ''}`}
                  >
                    <AgentIconDisplay iconId={agent.icon} className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{getAgentDisplayName(agent, t)}</span>
                  </button>
                ))}
                {filteredRootAgents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">{t('agents.noSearchResults')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Link Agent button */}
        {rootAgent && (
          <div className="relative flex-shrink-0" ref={linkPickerRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLinkPickerOpen(!linkPickerOpen)}
                  disabled={linkableAgents.length === 0}
                >
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('flow.linkAgent')}</p></TooltipContent>
            </Tooltip>

            {linkPickerOpen && linkableAgents.length > 0 && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder={t('flow.searchAgents')}
                      className="pl-8 h-8 text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto pb-1">
                  {filteredLinkAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={async () => {
                        const agentStore = useAgentStore.getState()
                        await agentStore.linkAgent(rootAgentId!, agent.id)
                        // Explicitly refresh flow graph after linking
                        const updatedAgents = useAgentStore.getState().agents
                        useFlowStore.getState().refreshFromAgents(updatedAgents)
                        setLinkPickerOpen(false)
                        setLinkSearch('')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
                    >
                      <AgentIconDisplay iconId={agent.icon} className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{getAgentDisplayName(agent, t)}</span>
                    </button>
                  ))}
                  {filteredLinkAgents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">{t('agents.noSearchResults')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="w-px h-5 bg-border flex-shrink-0 hidden sm:block" />

        {/* Layout & View controls — desktop only */}
        <div className="hidden sm:flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAutoLayout}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('flow.autoLayout')}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fitView({ padding: 0.2 })}>
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('flow.fitView')}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('flow.zoomIn')}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('flow.zoomOut')}</p></TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-border" />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => useUIStore.getState().openCreateAgent()}>
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{t('flow.createAgent')}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
