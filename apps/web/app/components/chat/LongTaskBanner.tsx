import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Bell, BellOff, X } from 'lucide-react'

interface LongTaskBannerProps {
  onNotifyToggle: () => void
  notifyEnabled: boolean
  onDismiss: () => void
  currentStep?: number
  totalSteps?: number
  startedAt?: number
  className?: string
}

function useElapsedSeconds(startedAt?: number) {
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0
  )
  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])
  return elapsed
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export function LongTaskBanner({ onNotifyToggle, notifyEnabled, onDismiss, currentStep, totalSteps, startedAt, className }: LongTaskBannerProps) {
  const { t } = useTranslation('common')
  const elapsed = useElapsedSeconds(startedAt)

  const hasProgress = currentStep != null && totalSteps != null

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex-shrink-0 ${className ?? ''}`}
    >
      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <p className="text-sm flex-1 min-w-0 text-amber-800 dark:text-amber-200">
        {hasProgress
          ? `${t('longTask.stepProgress', { current: currentStep, total: totalSteps })} · ${formatElapsed(elapsed)}`
          : t('longTask.bannerMessage')
        }
      </p>
      <button
        type="button"
        onClick={onNotifyToggle}
        className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
          notifyEnabled
            ? 'text-green-700 dark:text-green-400'
            : 'text-amber-700 dark:text-amber-300 hover:underline'
        }`}
        title={notifyEnabled ? t('longTask.notifyEnabled') : t('longTask.notifyWhenDone')}
      >
        {notifyEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {notifyEnabled ? t('longTask.notifyEnabled') : t('longTask.notifyWhenDone')}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-amber-700 dark:text-amber-300"
        aria-label={t('chat.dismissBanner')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
