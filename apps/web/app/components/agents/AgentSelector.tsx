import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Plus,
  Bot,
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
  Check,
  X,
  Star,
  TrendingUp,
  MapPin,
  Briefcase,
  Store,
} from 'lucide-react'
import {
  JiraIcon,
  SlackIcon,
  GitHubIcon,
  NotionIcon,
  WhatsAppIcon,
  TrelloIcon,
  XIcon,
  DiscordIcon,
  LinkedInIcon,
  RedditIcon,
  GoogleMapsIcon,
  TelegramIcon,
  GoogleSheetsIcon,
  YouTubeIcon,
  SpotifyIcon,
  AirtableIcon,
  FigmaIcon,
} from '~/components/ui/platform-icons'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useAgentStore, useUIStore, useMCPStore } from '~/store'
import { cn } from '~/lib/utils'
import { getAgentDisplayName, getAgentDisplayDescription } from '~/lib/agent-display'
import type { Agent } from '~/lib/db/schema'

// Icon mapping
const agentIconMap: Record<string, typeof Bot> = {
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
  'trending-up': TrendingUp,
  'briefcase': Briefcase,
  'map-pin': MapPin,
  'twitter': XIcon,
  'jira': JiraIcon,
  'slack': SlackIcon,
  'github': GitHubIcon,
  'notion': NotionIcon,
  'whatsapp': WhatsAppIcon,
  'trello': TrelloIcon,
  'discord': DiscordIcon,
  'linkedin': LinkedInIcon,
  'reddit': RedditIcon,
  'google-maps': GoogleMapsIcon,
  'telegram': TelegramIcon,
  'google-sheets': GoogleSheetsIcon,
  'youtube': YouTubeIcon,
  'spotify': SpotifyIcon,
  'airtable': AirtableIcon,
  'figma': FigmaIcon,
  'store': Store,
}

export function getAgentIcon(iconId: string) {
  return agentIconMap[iconId] || Bot
}

interface AgentSelectorProps {
  onClose: () => void
}

export function AgentSelector({ onClose }: AgentSelectorProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { agents, currentAgentId, favoriteAgentIds, selectAgent, searchAgents, getAgentSlug, toggleFavoriteAgent } = useAgentStore()
  const { openCreateAgent } = useUIStore()

  const filtered = search.trim() ? searchAgents(search) : agents.filter(a => a.enabled)

  const handleSelect = async (agentId: string) => {
    const agent = useAgentStore.getState().getAgentById(agentId)
    await selectAgent(agentId)
    if (agent) {
      navigate(`/chat/${getAgentSlug(agent)}`, { replace: true })
      useMCPStore.getState().activateAgentMCPs(agent)
    }
    onClose()
  }

  const handleCreateNew = () => {
    openCreateAgent()
    onClose()
  }

  // Favorites first (in user's order), then builtin, then user
  const favoriteAgents = filtered
    .filter(a => favoriteAgentIds.includes(a.id))
    .sort((a, b) => {
      const ia = favoriteAgentIds.indexOf(a.id)
      const ib = favoriteAgentIds.indexOf(b.id)
      return ia - ib
    })
  const builtinAgents = filtered
    .filter(a => a.source === 'builtin' && !favoriteAgentIds.includes(a.id))
    .sort((a, b) => (a.id === 'general' ? -1 : b.id === 'general' ? 1 : 0))
  const userAgents = filtered.filter(a => a.source === 'user' && !favoriteAgentIds.includes(a.id))

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{t('agents.switchAgent')}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('agents.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('agents.searchNoResults')}
          </p>
        )}

        {favoriteAgents.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground px-2 pt-1 pb-1 font-medium">{t('agents.favorites')}</p>
            {favoriteAgents.map(agent => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={currentAgentId === agent.id}
                isFavorite
                onSelect={() => handleSelect(agent.id)}
                onToggleFavorite={(e) => {
                  e.stopPropagation()
                  toggleFavoriteAgent(agent.id)
                }}
              />
            ))}
          </>
        )}

        {builtinAgents.length > 0 && (
          <>
            <p className={cn(
              'text-xs text-muted-foreground px-2 pb-1 font-medium',
              favoriteAgents.length > 0 ? 'pt-3' : 'pt-1'
            )}>{t('agents.builtinLabel')}</p>
            {builtinAgents.map(agent => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={currentAgentId === agent.id}
                isFavorite={false}
                onSelect={() => handleSelect(agent.id)}
                onToggleFavorite={(e) => {
                  e.stopPropagation()
                  toggleFavoriteAgent(agent.id)
                }}
              />
            ))}
          </>
        )}

        {userAgents.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground px-2 pt-3 pb-1 font-medium">{t('agents.userCreated')}</p>
            {userAgents.map(agent => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={currentAgentId === agent.id}
                isFavorite={false}
                onSelect={() => handleSelect(agent.id)}
                onToggleFavorite={(e) => {
                  e.stopPropagation()
                  toggleFavoriteAgent(agent.id)
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Create New */}
      <div className="p-3 border-t">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleCreateNew}>
          <Plus className="h-4 w-4" />
          {t('agents.create')}
        </Button>
      </div>
    </div>
  )
}

function AgentListItem({
  agent,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  agent: Agent
  isSelected: boolean
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
}) {
  const { t } = useTranslation('common')
  // getAgentIcon returns a component from a fixed map, not created during render
  const Icon = getAgentIcon(agent.icon)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={cn(
        'w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors text-left cursor-pointer',
        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      )}
    >
      <div className={cn(
        'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
        isSelected ? 'bg-primary/20' : 'bg-muted'
      )}>
        {/* eslint-disable-next-line react-hooks/static-components -- Icon from fixed map, not created during render */}
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{getAgentDisplayName(agent, t)}</span>
          {agent.isEdited && agent.source === 'builtin' && (
            <span className="text-[10px] bg-amber-400/90 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
              {t('agents.edited')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{getAgentDisplayDescription(agent, t)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? t('agents.removeFromFavorites') : t('agents.addToFavorites')}
      >
        <Star className={cn('h-4 w-4', isFavorite ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground')} />
      </Button>
      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
    </div>
  )
}
