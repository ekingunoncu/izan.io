import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Square, Zap, Brain, Mic, MicOff, ImagePlus, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import type { ThinkingLevel } from '~/lib/services/interfaces'
import type { MessageAttachment } from '~/lib/db/schema'

interface MessageInputProps {
  initialPrompt?: string
  onSend: (message: string, attachments?: MessageAttachment[]) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  placeholder?: string
  deepTask?: boolean
  onDeepTaskToggle?: () => void
  thinkingLevel?: ThinkingLevel
  onThinkingLevelChange?: (level: ThinkingLevel) => void
  showThinking?: boolean
  sttSupported?: boolean
  sttListening?: boolean
  onSttToggle?: () => void
  sttTranscript?: string
  supportsVision?: boolean
}

const THINKING_LEVELS: ThinkingLevel[] = ['off', 'low', 'medium', 'high']

const THINKING_COLORS: Record<ThinkingLevel, string> = {
  off: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  low: 'text-amber-500 bg-amber-500/10',
  medium: 'text-purple-500 bg-purple-500/10',
  high: 'text-primary bg-primary/10',
}

/** Convert a File to a MessageAttachment */
async function fileToAttachment(file: File): Promise<MessageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:xxx;base64, prefix
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to read file'))
        return
      }
      resolve({
        id: crypto.randomUUID(),
        type: 'image',
        mimeType: file.type || 'image/png',
        data: base64,
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function MessageInput({
  initialPrompt,
  onSend,
  onStop,
  disabled = false,
  isGenerating = false,
  placeholder: placeholderProp,
  deepTask = false,
  onDeepTaskToggle,
  thinkingLevel = 'off',
  onThinkingLevelChange,
  showThinking = false,
  sttSupported = false,
  sttListening = false,
  onSttToggle,
  sttTranscript,
  supportsVision = false,
}: MessageInputProps) {
  const { t } = useTranslation('common')
  const placeholder = placeholderProp ?? t('chat.placeholder')
  const [message, setMessage] = useState(initialPrompt ?? '')
  const [imageAttachments, setImageAttachments] = useState<MessageAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [prevTranscript, setPrevTranscript] = useState('')

  // Sync STT transcript: adjust state from props (React pattern)
  if (sttTranscript && sttTranscript !== prevTranscript) {
    setPrevTranscript(sttTranscript)
    setMessage(sttTranscript)
  }

  const handleFocus = () => {
    // On mobile, scroll input into view when virtual keyboard opens
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSend = () => {
    const trimmed = message.trim()
    if ((!trimmed && imageAttachments.length === 0) || disabled || isGenerating) return

    onSend(trimmed || t('chat.describeImage'), imageAttachments.length > 0 ? imageAttachments : undefined)
    setMessage('')
    setImageAttachments([])

    // Re-focus the textarea after sending
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStopOrSend = () => {
    if (isGenerating) {
      onStop?.()
    } else {
      handleSend()
    }
  }

  const addImageFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const newAttachments = await Promise.all(imageFiles.map(fileToAttachment))
    setImageAttachments(prev => [...prev, ...newAttachments])
  }, [])

  const handlePaste = useCallback(async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()
    const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f !== null)
    await addImageFiles(files)
  }, [addImageFiles])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await addImageFiles(e.target.files)
      e.target.value = '' // Reset so same file can be selected again
    }
  }, [addImageFiles])

  const removeAttachment = (id: string) => {
    setImageAttachments(prev => prev.filter(a => a.id !== id))
  }

  const canSend = !disabled && !isGenerating && (message.trim().length > 0 || imageAttachments.length > 0)

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto">
      {/* Image preview strip */}
      {imageAttachments.length > 0 && (
        <div className="flex gap-2 mb-2 px-1 overflow-x-auto pb-1">
          {imageAttachments.map(att => (
            <div key={att.id} className="relative group flex-shrink-0">
              <img
                src={`data:${att.mimeType};base64,${att.data}`}
                alt=""
                className="h-16 w-16 object-cover rounded-lg border border-border/60"
              />
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label={t('chat.removeImage')}
              >
                <X className="h-3 w-3" />
              </button>
              {!supportsVision && (
                <div className="absolute inset-0 bg-destructive/20 rounded-lg flex items-center justify-center">
                  <span className="text-[8px] font-medium text-destructive-foreground bg-destructive/80 px-1 rounded">
                    !
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Vision not supported warning */}
      {imageAttachments.length > 0 && !supportsVision && (
        <p className="text-xs text-destructive mb-1 px-1">{t('chat.visionNotSupported')}</p>
      )}
      <div className="flex gap-2 items-end rounded-2xl border border-input bg-card/50 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {/* Image attach button */}
        {!isGenerating && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer mb-2.5 ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t('chat.attachImage')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled || isGenerating}
          className="min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-base placeholder:text-muted-foreground/70"
          rows={1}
        />
        {onDeepTaskToggle && !isGenerating && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onDeepTaskToggle}
                  className={`flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer mb-2.5 ${
                    deepTask
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Zap className={`h-4 w-4 ${deepTask ? 'fill-primary' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t('chat.deepTaskTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {showThinking && onThinkingLevelChange && !isGenerating && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    const idx = THINKING_LEVELS.indexOf(thinkingLevel)
                    onThinkingLevelChange(THINKING_LEVELS[(idx + 1) % THINKING_LEVELS.length])
                  }}
                  className={`flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer mb-2.5 ${THINKING_COLORS[thinkingLevel]}`}
                >
                  <Brain className={`h-4 w-4 ${thinkingLevel !== 'off' ? 'fill-current' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t(`chat.thinking${thinkingLevel.charAt(0).toUpperCase() + thinkingLevel.slice(1)}`)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {sttSupported && !isGenerating && onSttToggle && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSttToggle}
                  className={`flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer mb-2.5 ${
                    sttListening
                      ? 'animate-pulse text-destructive bg-destructive/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {sttListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{sttListening ? t('chat.voiceStopListening') : t('chat.voiceStartListening')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button
          onClick={handleStopOrSend}
          disabled={!canSend && !isGenerating}
          size="icon"
          className={`flex-shrink-0 h-11 w-11 min-h-[44px] min-w-[44px] m-1.5 rounded-xl transition-all ${
            isGenerating
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary'
          }`}
        >
          {isGenerating ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
