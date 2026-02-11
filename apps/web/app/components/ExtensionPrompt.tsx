/**
 * Extension Install Prompt
 *
 * A dismissible banner shown in the chat view when the current agent
 * requires MCP servers provided by the izan.io Chrome extension,
 * but the extension is not installed.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { Puzzle, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useMCPStore } from '~/store'

export function ExtensionPrompt({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation('common')
  const { lang } = useParams()
  const extensionRequired = useMCPStore((s) => s.extensionRequired)
  const isExtensionInstalled = useMCPStore((s) => s.isExtensionInstalled)
  const [dismissed, setDismissed] = useState(false)

  // Don't show if extension is installed, not required, or dismissed
  if (isExtensionInstalled || !extensionRequired || dismissed) {
    return null
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 flex-shrink-0 ${className ?? ''}`}
    >
      <Puzzle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('extension.requiredBanner')}
        </p>
      </div>
      <Link
        to={`/${lang || 'en'}/docs/chrome-extension`}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
      >
        {t('extension.installLink')}
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
