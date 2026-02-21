import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { Wrench, Link2, Cog } from 'lucide-react'
import type { Agent } from '~/lib/db/schema'
import { getAgentDisplayName } from '~/lib/agent-display'
import { AgentIconDisplay } from '~/lib/agent-icons'

interface AgentNodeData {
  agent: Agent
  isRoot: boolean
  mcpCount: number
  linkedCount: number
  macroCount: number
  [key: string]: unknown
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'border-blue-400/50 bg-blue-50 dark:bg-blue-950/30',
  web_search: 'border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30',
  code_assistant: 'border-purple-400/50 bg-purple-50 dark:bg-purple-950/30',
  custom: 'border-orange-400/50 bg-orange-50 dark:bg-orange-950/30',
}

function AgentNodeComponent({ data }: NodeProps) {
  const { t } = useTranslation('common')
  const { agent, isRoot, mcpCount, linkedCount, macroCount } = data as AgentNodeData
  const colorClass = CATEGORY_COLORS[agent.category] ?? CATEGORY_COLORS.custom

  return (
    <div
      className={[
        'rounded-xl shadow-sm px-3 py-2.5',
        isRoot
          ? 'border-3 ring-2 ring-primary/20 shadow-md min-w-[280px] max-w-[320px]'
          : 'border-2 min-w-[200px] max-w-[260px] cursor-pointer',
        colorClass,
        !agent.enabled ? 'opacity-40' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />

      <div className="flex items-center gap-2 mb-1.5">
        <div className={`rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ${isRoot ? 'w-9 h-9' : 'w-7 h-7'}`}>
          <AgentIconDisplay iconId={agent.icon} className={`${isRoot ? 'h-5 w-5' : 'h-4 w-4'} text-primary`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={`font-semibold truncate ${isRoot ? 'text-base' : 'text-sm'}`}>{getAgentDisplayName(agent, t)}</p>
            {isRoot && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">
                {t('flow.rootBadge')}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate capitalize">{agent.category.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {mcpCount > 0 && (
          <span className="flex items-center gap-0.5" title={t('flow.mcpServers')}>
            <Cog className="h-3 w-3" /> {mcpCount}
          </span>
        )}
        {(macroCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5" title={t('flow.macros')}>
            <Wrench className="h-3 w-3" /> {macroCount}
          </span>
        )}
        {linkedCount > 0 && (
          <span className="flex items-center gap-0.5" title={t('flow.linkedAgents')}>
            <Link2 className="h-3 w-3" /> {linkedCount}
          </span>
        )}
        {agent.source === 'user' && (
          <span className="px-1 py-0.5 rounded bg-muted text-[9px] font-medium">{t('flow.custom')}</span>
        )}
      </div>
    </div>
  )
}

export const AgentNode = memo(AgentNodeComponent)
