import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, User, Wrench, Loader2, Code } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, stripThinkTags } from '~/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface MessageListProps {
  messages: ChatMessage[]
}

/** Parse tool call and agent call lines from message content (strips <think> tags for display) */
function parseContent(content: string): {
  toolCalls: string[]
  agentCalls: string[]
  text: string
  isLoading: boolean
  loadingText?: string
} {
  const cleaned = stripThinkTags(content)
  const lines = cleaned.split('\n')
  const toolCalls: string[] = []
  const agentCalls: string[] = []
  const textLines: string[] = []
  let isLoading = false
  let loadingText: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[🔧')) {
      // Extract tool info: [🔧 tool_name({...})]
      const match = trimmed.match(/\[🔧\s*(.+?)\((.+)\)\]/)
      if (match) {
        toolCalls.push(`${match[1]}(${match[2]})`)
      } else {
        toolCalls.push(trimmed.replace(/^\[🔧\s*/, '').replace(/\]$/, ''))
      }
    } else if (trimmed.startsWith('[🤖')) {
      // Agent call: [🤖 agent_id] or legacy [🤖 agent_id({...})] – extract agent id only
      const match = trimmed.match(/\[🤖\s*([a-z0-9_-]+)/)
      agentCalls.push(match ? match[1] : trimmed.replace(/^\[🤖\s*/, '').replace(/\]$/, '').replace(/\(.+\)$/, ''))
    } else if (trimmed.startsWith('⏳')) {
      isLoading = true
      loadingText = trimmed.replace(/^⏳\s*/, '').trim() || undefined
    } else if (trimmed) {
      textLines.push(line)
    }
  }

  return { toolCalls, agentCalls, text: textLines.join('\n').trim(), isLoading, loadingText }
}

function ToolCallBadge({ call }: { call: string }) {
  const { t } = useTranslation('common')
  // Parse: "tool_name({...})"
  const match = call.match(/^(.+?)\((.+)\)$/)
  const rawToolName = match ? match[1] : call
  const toolName = t(`chat.toolNames.${rawToolName}`) !== `chat.toolNames.${rawToolName}`
    ? t(`chat.toolNames.${rawToolName}`)
    : rawToolName
  let args = ''
  if (match) {
    try {
      const parsed = JSON.parse(match[2]) as Record<string, unknown>
      // User-friendly: key names (e.g. domain, query) -> short values
      args = Object.entries(parsed)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    } catch {
      args = match[2]
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-200/90 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-xs">
      <Wrench className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 flex-shrink-0" />
      <span className="font-medium text-blue-900 dark:text-blue-300">{toolName}</span>
      {args && (
        <span className="text-blue-700 dark:text-blue-400 truncate max-w-[min(12rem,90vw)]" title={args}>
          {args}
        </span>
      )}
    </div>
  )
}

function AgentCallBadge({ agentId }: { agentId: string }) {
  const { t } = useTranslation('common')
  const displayName = t(`agents.builtin.${agentId}.name`) !== `agents.builtin.${agentId}.name`
    ? t(`agents.builtin.${agentId}.name`)
    : agentId
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-200/90 dark:bg-violet-950 border border-violet-300 dark:border-violet-800 text-xs">
      <Bot className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400 flex-shrink-0" />
      <span className="font-medium text-violet-900 dark:text-violet-300">{displayName}</span>
    </div>
  )
}

function ToolLoadingIndicator({ loadingText }: { loadingText?: string }) {
  const { t } = useTranslation('common')
  const text = loadingText ?? t('chat.toolRunning')
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{text}</span>
    </div>
  )
}

function MarkdownMessage({
  text,
  messageId,
  rawModeIds,
  onToggleRaw,
}: {
  text: string
  messageId: string
  rawModeIds: Set<string>
  onToggleRaw: (id: string) => void
}) {
  const { t } = useTranslation('common')
  const isRaw = rawModeIds.has(messageId)

  return (
    <div className="rounded-2xl px-3 py-2 sm:px-4 bg-muted group relative">
      <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onToggleRaw(messageId)}
          className="p-1.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
          title={isRaw ? t('chat.viewRendered') : t('chat.viewRaw')}
          aria-label={isRaw ? t('chat.viewRendered') : t('chat.viewRaw')}
        >
          <Code className="h-3.5 w-3.5" />
        </button>
      </div>
      {isRaw ? (
        <pre className="font-mono text-sm sm:text-base whitespace-pre-wrap break-words overflow-x-auto p-3 rounded-lg bg-muted-foreground/10 mt-1">
          <code className="block">{text}</code>
        </pre>
      ) : (
        <div className="markdown-content text-sm sm:text-base [&_p]:my-1 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_ul]:my-1 [&_ol]:my-1 [&_li]:ml-4 [&_pre]:my-2 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:bg-muted-foreground/10 [&_pre]:overflow-x-auto [&_code]:bg-muted-foreground/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:underline [&_a]:text-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  rawModeIds,
  onToggleRaw,
}: {
  message: ChatMessage
  rawModeIds: Set<string>
  onToggleRaw: (id: string) => void
}) {
  const isUser = message.role === 'user'

  // For assistant messages, parse tool calls
  const parsed = !isUser ? parseContent(message.content) : null

  return (
    <div
      className={cn(
        'flex gap-2 sm:gap-3 max-w-full sm:max-w-3xl',
        isUser ? 'ml-auto flex-row-reverse' : ''
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4 sm:h-5 sm:w-5" /> : <Bot className="h-4 w-4 sm:h-5 sm:w-5" />}
      </div>

      {isUser ? (
        <div className="rounded-2xl px-3 py-2 sm:px-4 max-w-[85%] sm:max-w-[80%] min-w-0 bg-primary text-primary-foreground">
          <p className="whitespace-pre-wrap break-words text-sm sm:text-base">{message.content}</p>
        </div>
      ) : (
        <div className="max-w-[85%] sm:max-w-[80%] min-w-0 space-y-2">
          {/* Agent call badges (linked agent – no raw args) */}
          {parsed && parsed.agentCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsed.agentCalls.map((agentId, i) => (
                <AgentCallBadge key={i} agentId={agentId} />
              ))}
            </div>
          )}
          {/* Tool call badges */}
          {parsed && parsed.toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsed.toolCalls.map((call, i) => (
                <ToolCallBadge key={i} call={call} />
              ))}
            </div>
          )}

          {/* Loading indicator - shows actual status (model responding vs tool running) */}
          {parsed?.isLoading && !parsed.text && (
            <ToolLoadingIndicator loadingText={parsed.loadingText} />
          )}

          {/* Text content */}
          {parsed && parsed.text ? (
            <MarkdownMessage
              text={parsed.text}
              messageId={message.id}
              rawModeIds={rawModeIds}
              onToggleRaw={onToggleRaw}
            />
          ) : !parsed?.isLoading && !parsed?.toolCalls.length && !parsed?.agentCalls.length ? (
            /* Empty assistant message (still generating) */
            <div className="rounded-2xl px-3 py-2 sm:px-4 bg-muted">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function MessageList({ messages }: MessageListProps) {
  const { t } = useTranslation('common')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [rawModeIds, setRawModeIds] = useState<Set<string>>(new Set())

  const handleToggleRaw = (id: string) => {
    setRawModeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
        <div className="text-center px-4">
          <Bot className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-base sm:text-lg">{t('chat.noMessages')}</p>
          <p className="text-sm">{t('chat.startTyping')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          rawModeIds={rawModeIds}
          onToggleRaw={handleToggleRaw}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
