import { useEffect } from 'react'
import { Info, AlertTriangle, X } from 'lucide-react'
import { getAgentChatBanner } from '~/lib/agent-display'
import { useTranslation } from 'react-i18next'
import { useChatBannerStore } from '~/store'
import type { Agent } from '~/lib/db/schema'

export function AgentChatBanner({ agent, className }: { agent: Agent | null; className?: string }) {
  const { t } = useTranslation('common')
  const { initialize, isDismissed, dismissBanner } = useChatBannerStore()

  useEffect(() => {
    void initialize()
  }, [initialize])

  const banner = getAgentChatBanner(agent, t)
  if (!banner || !agent || isDismissed(agent.id)) return null

  const isWarning = banner.type === 'warning'

  const handleDismiss = () => {
    void dismissBanner(agent.id)
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 flex-shrink-0 ${
        isWarning
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40'
          : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40'
      } ${className ?? ''}`}
    >
      {isWarning ? (
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      ) : (
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      )}
      <p
        className={`text-sm flex-1 min-w-0 ${
          isWarning ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'
        }`}
      >
        {banner.message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className={`flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${
          isWarning ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'
        }`}
        aria-label={t('chat.dismissBanner')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
