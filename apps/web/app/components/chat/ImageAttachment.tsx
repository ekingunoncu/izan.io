import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Maximize2 } from 'lucide-react'
import type { MessageAttachment } from '~/lib/db/schema'
import { ImageModal } from './ImageModal'

interface ImageAttachmentProps {
  attachment: MessageAttachment
}

export function ImageAttachment({ attachment }: ImageAttachmentProps) {
  const { t } = useTranslation('common')
  const [modalOpen, setModalOpen] = useState(false)
  const src = `data:${attachment.mimeType};base64,${attachment.data}`

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = src
    link.download = `image-${attachment.id.slice(0, 8)}.${attachment.mimeType.split('/')[1] || 'png'}`
    link.click()
  }

  return (
    <>
      <div className="group relative inline-block rounded-xl overflow-hidden border border-border/60 cursor-pointer max-w-sm" onClick={() => setModalOpen(true)}>
        <img
          src={src}
          alt={t('chat.imageGenerated')}
          className="max-w-full max-h-80 object-contain bg-muted/30"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-background/80 hover:bg-background text-foreground transition-colors"
            aria-label={t('chat.downloadImage')}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
            className="p-1.5 rounded-lg bg-background/80 hover:bg-background text-foreground transition-colors ml-1"
            aria-label={t('chat.expandImage')}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {modalOpen && (
        <ImageModal
          src={src}
          mimeType={attachment.mimeType}
          attachmentId={attachment.id}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
