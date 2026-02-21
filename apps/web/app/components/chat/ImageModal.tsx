import { useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download } from 'lucide-react'

interface ImageModalProps {
  src: string
  mimeType: string
  attachmentId: string
  onClose: () => void
}

export function ImageModal({ src, mimeType, attachmentId, onClose }: ImageModalProps) {
  const { t } = useTranslation('common')

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = `image-${attachmentId.slice(0, 8)}.${mimeType.split('/')[1] || 'png'}`
    link.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDownload() }}
          className="p-2 rounded-lg bg-background/80 hover:bg-background text-foreground transition-colors cursor-pointer"
          aria-label={t('chat.downloadImage')}
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-background/80 hover:bg-background text-foreground transition-colors cursor-pointer"
          aria-label={t('chat.closeModal')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <img
        src={src}
        alt={t('chat.imageGenerated')}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
