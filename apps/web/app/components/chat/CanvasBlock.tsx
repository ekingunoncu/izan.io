import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Monitor, Code, Maximize2, Minimize2, ExternalLink } from 'lucide-react'
import { cn } from '~/lib/utils'

interface CanvasBlockProps {
  html: string
  index: number
}

/** CSP meta tag injected into canvas iframes */
const CSP_META = '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\' data: blob:; connect-src *;">'

/** Prepare HTML for sandboxed iframe */
function prepareSrcDoc(html: string): string {
  // If the HTML already has a <head>, inject CSP into it
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${CSP_META}`)
  }
  // If it has <html> but no <head>, add one
  if (html.includes('<html>')) {
    return html.replace('<html>', `<html><head>${CSP_META}</head>`)
  }
  // Wrap bare HTML
  return `<!DOCTYPE html><html><head>${CSP_META}<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>${html}</body></html>`
}

export function CanvasBlock({ html, index }: CanvasBlockProps) {
  const { t } = useTranslation('common')
  const [mode, setMode] = useState<'preview' | 'code'>('preview')
  const [expanded, setExpanded] = useState(false)
  const [height, setHeight] = useState(400)
  const resizing = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const srcDoc = prepareSrcDoc(html)

  const handleOpenInTab = useCallback(() => {
    const blob = new Blob([srcDoc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Revoke after a delay so the tab has time to load
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [srcDoc])

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    resizing.current = true
    startY.current = e.clientY
    startHeight.current = height

    const handleMove = (me: PointerEvent) => {
      if (!resizing.current) return
      const delta = me.clientY - startY.current
      const newHeight = Math.max(200, Math.min(800, startHeight.current + delta))
      setHeight(newHeight)
    }

    const handleUp = () => {
      resizing.current = false
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }, [height])

  return (
    <div className={cn(
      'rounded-xl border border-border/60 overflow-hidden bg-background',
      expanded ? 'w-full max-w-none' : 'max-w-full',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          <span className="font-medium">{t('chat.canvasTitle')} {index + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Preview / Code toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === 'preview' ? 'code' : 'preview')}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          >
            {mode === 'preview' ? (
              <><Code className="h-3 w-3" /> {t('chat.canvasCode')}</>
            ) : (
              <><Monitor className="h-3 w-3" /> {t('chat.canvasPreview')}</>
            )}
          </button>
          {/* Expand */}
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
            title={expanded ? t('chat.canvasCollapse') : t('chat.canvasExpand')}
          >
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          {/* Open in new tab */}
          <button
            type="button"
            onClick={handleOpenInTab}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
            title={t('chat.canvasOpenTab')}
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'preview' ? (
        <div style={{ height: Math.min(height, window.innerHeight * 0.6) }}>
          <iframe
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
            title={`Canvas ${index + 1}`}
          />
        </div>
      ) : (
        <div style={{ height: Math.min(height, window.innerHeight * 0.6) }} className="overflow-auto">
          <pre className="p-3 text-xs sm:text-sm font-mono whitespace-pre-wrap break-words text-foreground/80">
            <code>{html}</code>
          </pre>
        </div>
      )}

      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        className="h-2 cursor-ns-resize bg-muted/30 hover:bg-muted/60 transition-colors flex items-center justify-center"
      >
        <div className="w-8 h-0.5 rounded-full bg-border" />
      </div>
    </div>
  )
}
