import { useParams, useNavigate, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Key, AlertTriangle } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { getAgentRequiredApiKeys } from '~/lib/agent-display'
import { useExternalApiKeysStore, useAgentStore, useMCPStore, useUIStore } from '~/store'
import type { Agent } from '~/lib/db/schema'

export function MissingApiKeyBanner({ agent, className }: { agent: Agent | null; className?: string }) {
  const { t } = useTranslation('common')
  const { lang } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const getExternalApiKey = useExternalApiKeysStore((s) => s.getExternalApiKey)
  const { selectAgent, getAgentSlug } = useAgentStore()
  const activateAgentMCPs = useMCPStore((s) => s.activateAgentMCPs)
  const openAgentEdit = useUIStore((s) => s.openAgentEdit)

  const requiredIds = getAgentRequiredApiKeys(agent)
  const missingIds = requiredIds.filter((id) => !getExternalApiKey(id))

  if (missingIds.length === 0 || !agent) return null

  const langPrefix = (lang || 'en').split('-')[0]
  const isOnAgentDetail = location.pathname.includes('/agents/') && !location.pathname.includes('/chat/')

  const handleAddKey = async () => {
    if (isOnAgentDetail) {
      navigate(`/${langPrefix}/settings#${missingIds[0]}`)
      return
    }
    await selectAgent(agent.id)
    await activateAgentMCPs(agent)
    openAgentEdit({ expandSection: 'api-keys' })
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex-shrink-0 ${className ?? ''}`}>
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800 dark:text-amber-200">{t('agents.missingApiKeysBanner')}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-amber-300 dark:border-amber-700"
        onClick={handleAddKey}
      >
        <Key className="h-3.5 w-3.5" />
        {t('agents.addApiKey')}
      </Button>
    </div>
  )
}
