import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Square, Zap } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

interface MessageInputProps {
  initialPrompt?: string
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  placeholder?: string
  deepTask?: boolean
  onDeepTaskToggle?: () => void
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
}: MessageInputProps) {
  const { t } = useTranslation('common')
  const placeholder = placeholderProp ?? t('chat.placeholder')
  const [message, setMessage] = useState(initialPrompt ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
    if (!trimmed || disabled || isGenerating) return
    
    onSend(trimmed)
    setMessage('')

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

  const canSend = !disabled && !isGenerating && message.trim().length > 0

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto">
      <div className="flex gap-2 items-end rounded-2xl border border-input bg-card/50 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
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
