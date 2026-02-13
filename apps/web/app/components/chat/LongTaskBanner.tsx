import { useTranslation } from 'react-i18next'
import { Clock, Bell, BellOff, X } from 'lucide-react'

interface LongTaskBannerProps {
  onRunInBackground: () => void
  onNotifyToggle: () => void
  notifyEnabled: boolean
  onDismiss: () => void
  className?: string
}

export function LongTaskBanner({ onRunInBackground, onNotifyToggle, notifyEnabled, onDismiss, className }: LongTaskBannerProps) {
  const { t } = useTranslation('common')

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex-shrink-0 ${className ?? ''}`}
    >
      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <p className="text-sm flex-1 min-w-0 text-amber-800 dark:text-amber-200">
        {t('longTask.bannerMessage')}
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
        onClick={onRunInBackground}
        className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap cursor-pointer"
      >
        {t('longTask.runInBackground')}
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
