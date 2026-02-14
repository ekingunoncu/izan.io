import { flushSync } from 'react-dom'
import { create } from 'zustand'
import i18n from '~/i18n'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  LLMGenerationOptions,
  TokenUsage,
} from '~/lib/services/interfaces'
import { storageService, llmService } from '~/lib/services'
import { LLMApiError, LLMNetworkError } from '~/lib/services/llm.service'
import type { Chat, Message, Agent, TaskStatus, UsageRecord } from '~/lib/db'
import { PROVIDERS } from '~/lib/providers'
import { useMCPStore } from './mcp.store'
import { useAgentStore } from './agent.store'
import type { MCPToolInfo } from '@izan/mcp-client'

/** Background task tracking info */
export interface BackgroundTask {
  status: TaskStatus
  currentStep: number
  totalSteps: number
  agentId: string
}

/**
 * ChatState - State interface for chat management
 */
interface ChatState {
  chats: Chat[]
  currentChatId: string | null
  currentChat: Chat | null
  messages: Message[]
  isGenerating: boolean
  isLoadingChats: boolean
  isLoadingMessages: boolean
  sessionTokens: { input: number; output: number }
  /** Background task status keyed by chatId */
  backgroundTasks: Record<string, BackgroundTask>
  /** Chat IDs where a long task has been auto-detected (3+ tool rounds) */
  longTaskDetectedChats: Record<string, boolean>
  /** Foreground progress during tool-calling loop */
  currentProgress: { current: number; total: number } | null
  /** Timestamp when long task was first detected (for elapsed time display) */
  longTaskStartedAt: Record<string, number>
  /** Per-chat token/cost usage aggregates */
  chatUsage: Record<string, { tokens: number; cost: number }>

  loadChats: (agentId: string) => Promise<void>
  loadChatUsage: (chatIds: string[]) => Promise<void>
  createChat: (agentId: string, title?: string) => Promise<Chat>
  selectChat: (chatId: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  updateChatTitle: (chatId: string, title: string) => Promise<void>
  sendMessage: (content: string, agentId: string, options?: { deepTask?: boolean }) => Promise<void>
  stopGenerating: () => void
  clearCurrentChat: () => void
  clearAllChats: () => Promise<void>
  clearAgentChats: (agentId: string) => Promise<void>
  clearMultipleAgentChats: (agentIds: string[]) => Promise<void>
  addTokenUsage: (usage: TokenUsage) => void
  resetSessionTokens: () => void
  moveToBackground: (chatId: string) => void
  clearTaskStatus: (chatId: string) => void
  enableNotifyOnCompletion: (chatId: string) => void
}

function generateChatTitle(content: string): string {
  const maxLength = 50
  const trimmed = content.trim()
  return trimmed.length <= maxLength ? trimmed : trimmed.substring(0, maxLength - 3) + '...'
}

/** Convert MCP tool info to OpenAI ChatCompletionTool format */
function mcpToolToOpenAI(tool: MCPToolInfo): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: tool.inputSchema,
    },
  }
}

/** Build linked agent tools for multi-agent orchestration */
function buildLinkedAgentTools(agent: Agent): ChatCompletionTool[] {
  const agentStore = useAgentStore.getState()
  const tools: ChatCompletionTool[] = []

  for (const linkedId of agent.linkedAgentIds) {
    const linkedAgent = agentStore.getAgentById(linkedId)
    if (!linkedAgent || !linkedAgent.enabled) continue

    tools.push({
      type: 'function',
      function: {
        name: `ask_agent_${linkedId}`,
        description: i18n.t('chat.talkToAgent', { name: linkedAgent.name, desc: linkedAgent.description }),
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: i18n.t('chat.questionForAgent'),
            },
          },
          required: ['question'],
        },
      },
    })
  }

  return tools
}

/** Default max tool-calling rounds to prevent runaway tool chains */
const DEFAULT_MAX_ITERATIONS = 25

/** Chat IDs currently running in background (module-level so the running promise can check) */
const backgroundChatIds = new Set<string>()

/** Chat IDs that should fire a browser notification on completion (foreground or background) */
const notifyOnCompletionChatIds = new Set<string>()

/** Chat ID of the currently running foreground task (for auto-background on chat switch) */
let currentRunningChatId: string | null = null

/** LLM options - only send params user explicitly set. Omit for provider defaults to avoid API errors. */
function getAgentGenerationOptions(agent: Agent | null | undefined): LLMGenerationOptions {
  const opts: LLMGenerationOptions = {}
  if (!agent) return opts
  if (agent.isEdited) {
    if (agent.temperature != null) opts.temperature = agent.temperature
    if (agent.maxTokens != null) opts.max_tokens = agent.maxTokens
    if (agent.topP != null) opts.top_p = agent.topP
  }
  return opts
}

/** Max depth for linked agent calls (A->B->C) */
const MAX_AGENT_DEPTH = 3

/** Module-level AbortController so stopGenerating can signal sendMessage */
let currentAbortController: AbortController | null = null

/** Execute a tool call (MCP or linked agent) during chat */
async function executeToolCall(
  fnName: string,
  fnArgs: Record<string, unknown>,
  mcpTools: MCPToolInfo[],
  mcpStore: ReturnType<typeof useMCPStore.getState>,
  onLinkedAgentChunk?: (chunk: string) => void,
): Promise<string> {
  if (fnName.startsWith('ask_agent_')) {
    const targetAgentId = fnName.replace('ask_agent_', '')
    const question = (fnArgs.question as string) || ''
    return executeLinkedAgentCall(targetAgentId, question, 0, onLinkedAgentChunk)
  }
  const toolInfo = mcpTools.find(t => t.name === fnName)
  if (!toolInfo) {
    return i18n.t('chat.toolNotFound', { name: fnName, available: mcpTools.map(t => t.name).join(', ') || i18n.t('chat.noTools') })
  }
  if (import.meta.env?.DEV) {
    console.log('[chat] MCP tool call:', toolInfo.serverId, fnName, fnArgs)
  }
  const toolResult = await mcpStore.callTool(toolInfo.serverId, fnName, fnArgs)
  const resultText = toolResult.success
    ? toolResult.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n')
    : i18n.t('chat.errorWithMessage', { message: toolResult.error ?? i18n.t('chat.unknownError') })

  if (import.meta.env?.DEV) {
    if (!toolResult.success) {
      console.error('[chat] MCP tool error:', toolInfo.serverId, fnName, toolResult.error)
    } else if (fnName === 'fetch_url') {
      console.log('[chat] fetch_url result preview:', resultText.slice(0, 200) + (resultText.length > 200 ? '...' : ''))
    } else if (!resultText && toolInfo.serverId.startsWith('ext-')) {
      console.warn('[chat] Extension tool returned empty. Raw content:', toolResult.content)
    }
  }
  return resultText
}

/** Stream a plain chat response (no tools) and persist to storage */
async function streamPlainChat(
  chatMessages: ChatCompletionMessageParam[],
  updateAssistantMsg: (content: string) => void,
  persistMessage: (content: string) => Promise<void>,
  isAborted: () => boolean,
  options?: LLMGenerationOptions,
): Promise<TokenUsage | null> {
  let fullContent = ''
  const usage = await llmService.streamChat(chatMessages, async (chunk) => {
    if (isAborted()) return
    fullContent += chunk
    updateAssistantMsg(fullContent)
    // Yield to browser so streamed content can paint before next chunk
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
  }, options)
  if (fullContent) {
    await persistMessage(fullContent)
  }
  return usage
}

/** Run the tool-calling loop: call LLM with tools, execute tools, repeat until done */
async function runToolCallingLoop(
  chatMessages: ChatCompletionMessageParam[],
  allOpenAITools: ChatCompletionTool[],
  mcpTools: MCPToolInfo[],
  mcpStore: ReturnType<typeof useMCPStore.getState>,
  updateAssistantMsg: (content: string) => void,
  persistMessage: (content: string) => Promise<void>,
  isAborted: () => boolean,
  options?: LLMGenerationOptions,
  onUsage?: (usage: TokenUsage, toolCallNames: string[]) => void,
  getMaxRounds: () => number = () => DEFAULT_MAX_ITERATIONS,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  let rounds = 0
  const statusParts: string[] = []
  // Track nudges: consecutive text rounds (no tools) AND total nudges sent across the whole task
  let consecutiveTextRounds = 0
  let totalNudgesSent = 0
  const MAX_CONSECUTIVE_TEXT = 2  // accept as done after 2 text-only rounds in a row
  const MAX_TOTAL_NUDGES = 3     // stop nudging after 3 total nudges across the task
  // Track nudge message indices so we can remove them when model resumes tool calling
  let nudgeMessageIndices: number[] = []

  while (rounds < getMaxRounds()) {
    if (isAborted()) break
    rounds++
    if (onProgress) onProgress(rounds, getMaxRounds())

    updateAssistantMsg(
      statusParts.join('\n') + (statusParts.length ? '\n\n' : '') + '⏳ ' + i18n.t('chat.modelResponding'),
    )

    const prefix = statusParts.length > 0 ? statusParts.join('\n') + '\n\n' : ''
    let fullContent = ''
    const result = await llmService.streamChatWithTools(chatMessages, allOpenAITools, async (chunk) => {
      if (isAborted()) return
      fullContent += chunk
      updateAssistantMsg(prefix + fullContent)
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
    }, options)

    // Collect tool names from THIS round's response (before executing them)
    const roundToolNames = result.toolCalls?.map(tc => tc.function.name) ?? []
    if (result.usage && onUsage) onUsage(result.usage, roundToolNames)

    if (isAborted()) break

    if (result.toolCalls && result.toolCalls.length > 0) {
      consecutiveTextRounds = 0 // model is actively working, reset counter
      // Remove synthetic nudge messages to keep context clean
      if (nudgeMessageIndices.length > 0) {
        for (let i = nudgeMessageIndices.length - 1; i >= 0; i--) {
          chatMessages.splice(nudgeMessageIndices[i], 1)
        }
        nudgeMessageIndices = []
      }
      chatMessages.push({
        role: 'assistant',
        content: result.content ?? '',
        tool_calls: result.toolCalls,
      })

      for (const tc of result.toolCalls) {
        if (isAborted()) break

        const fnName = tc.function.name
        let fnArgs: Record<string, unknown> = {}
        try {
          fnArgs = JSON.parse(tc.function.arguments)
        } catch {
          fnArgs = { raw: tc.function.arguments }
        }

        const isLinkedAgent = fnName.startsWith('ask_agent_')
        const label = isLinkedAgent ? `🤖 ${fnName.replace('ask_agent_', '')}` : `🔧 ${fnName}`
        // Linked agent: show only agent id (no raw JSON for user)
        statusParts.push(isLinkedAgent ? `[${label}]` : `[${label}(${JSON.stringify(fnArgs)})]`)
        updateAssistantMsg(
          statusParts.join('\n') + '\n\n⏳ ' + (isLinkedAgent ? i18n.t('chat.agentResponding') : i18n.t('chat.toolRunning')),
        )

        // For linked agents, stream their response to the UI in real-time (with markers for collapsible UI)
        const statusPrefix = statusParts.join('\n') + '\n'
        let linkedAgentStreamed = ''
        const onLinkedAgentChunk = isLinkedAgent ? (chunk: string) => {
          linkedAgentStreamed += chunk
          updateAssistantMsg(statusPrefix + `[agent-response]\n${linkedAgentStreamed}\n[/agent-response]`)
        } : undefined

        const toolResultText = await executeToolCall(fnName, fnArgs, mcpTools, mcpStore, onLinkedAgentChunk)

        // Keep linked agent's response visible in the message (wrapped in markers for collapsible UI)
        if (isLinkedAgent && toolResultText) {
          statusParts.push(`[agent-response]\n${toolResultText}\n[/agent-response]`)
        }

        chatMessages.push({
          role: 'tool',
          content: toolResultText,
          tool_call_id: tc.id,
        })
      }

      if (isAborted()) break
      continue
    }

    // Model gave a text response with no tool calls
    // Continuation check: if this is a long task (3+ rounds done), nudge the model to keep using tools
    if (rounds >= 3 && consecutiveTextRounds < MAX_CONSECUTIVE_TEXT && totalNudgesSent < MAX_TOTAL_NUDGES && rounds < getMaxRounds()) {
      consecutiveTextRounds++
      totalNudgesSent++

      // Do NOT put the model's text in chatMessages - when the model sees its own
      // "shall I continue?" text, it anchors to it and keeps generating text.
      // Instead, push a short continuation-oriented assistant message so the model's
      // last context is tool results + "continue" instruction → resumes tool calling.
      //
      // Count actual tool calls made so far to give the model concrete context.
      const toolCallCount = statusParts.filter(s => s.startsWith('[🔧')).length
      nudgeMessageIndices.push(chatMessages.length) // track for later cleanup
      chatMessages.push({
        role: 'assistant',
        content: `I have made ${toolCallCount} tool calls so far. Continuing with more tool calls.`,
      })
      nudgeMessageIndices.push(chatMessages.length)
      chatMessages.push({
        role: 'user',
        content: `You stopped too early - you only made ${toolCallCount} tool calls. Keep making tool calls to complete the task. Do not list results without tool calls, do not ask whether to continue. Call the next tool now.`,
      })

      // But DO show the model's text in UI so user sees it
      if (result.content) {
        statusParts.push(result.content)
      }
      statusParts.push('🔄 ' + i18n.t('chat.continuationCheck'))
      updateAssistantMsg(
        statusParts.join('\n') + '\n\n⏳ ' + i18n.t('chat.modelResponding'),
      )
      continue
    }

    // Final text response (content was already streamed to UI)
    const finalContent = prefix + (result.content ?? '')
    await persistMessage(finalContent)
    return
  }

  if (!isAborted()) {
    const finalContent = statusParts.join('\n') + '\n\n' + i18n.t('chat.maxStepsReached')
    updateAssistantMsg(finalContent)
    await persistMessage(finalContent)
  }
}

/**
 * Execute a linked agent call.
 * Sends a question to another agent with its own system prompt and tools.
 */
async function executeLinkedAgentCall(
  targetAgentId: string,
  question: string,
  depth: number,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  if (depth >= MAX_AGENT_DEPTH) {
    return i18n.t('chat.maxAgentDepth')
  }

  const agentStore = useAgentStore.getState()
  const mcpStore = useMCPStore.getState()
  const targetAgent = agentStore.getAgentById(targetAgentId)

  if (!targetAgent) {
    return i18n.t('chat.agentNotFound', { id: targetAgentId })
  }

  // Ensure target agent's MCPs are connected (additive - don't disconnect parent's MCPs)
  await mcpStore.ensureAgentMCPsConnected(targetAgent)

  // Get target agent's tools (MCP + linked agents)
  const mcpTools = mcpStore.getToolsForAgent(targetAgent)
  const linkedTools = buildLinkedAgentTools(targetAgent)
  const allTools = [...mcpTools.map(mcpToolToOpenAI), ...linkedTools]

  const systemContent = (targetAgent.basePrompt || 'You are a helpful AI assistant.') + '\n\nRespond in the same language the user writes in.'
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: question },
  ]

  const linkedOptions = getAgentGenerationOptions(targetAgent)

  const isDev = import.meta.env?.DEV
  if (isDev) {
    console.log('[linked-agent] Call:', targetAgentId, 'depth:', depth, 'tools:', allTools.length, 'mcpTools:', mcpTools.map(t => t.name))
  }

  try {
    if (allTools.length > 0) {
      // Tool-calling loop for the linked agent (streaming)
      let rounds = 0
      while (rounds < DEFAULT_MAX_ITERATIONS) {
        rounds++
        if (isDev) console.log('[linked-agent] Round', rounds, 'messages:', messages.length)
        const t0 = performance.now()

        let streamedContent = ''
        const result = await llmService.streamChatWithTools(messages, allTools, (chunk) => {
          streamedContent += chunk
          if (onChunk) onChunk(chunk)
        }, linkedOptions)

        if (isDev) console.log('[linked-agent] Round', rounds, 'LLM responded in', Math.round(performance.now() - t0), 'ms - content:', result.content?.slice(0, 200), 'toolCalls:', result.toolCalls?.length ?? 0, 'finishReason:', result.finishReason)

        if (result.toolCalls && result.toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            content: result.content ?? '',
            tool_calls: result.toolCalls,
          })

          for (const tc of result.toolCalls) {
            const fnName = tc.function.name
            let fnArgs: Record<string, unknown> = {}
            try { fnArgs = JSON.parse(tc.function.arguments) } catch { fnArgs = { raw: tc.function.arguments } }

            if (isDev) console.log('[linked-agent] Executing tool:', fnName, fnArgs)
            const toolResultText = await executeToolCall(fnName, fnArgs, mcpTools, mcpStore)
            if (isDev) console.log('[linked-agent] Tool result:', fnName, '→', toolResultText.slice(0, 300) + (toolResultText.length > 300 ? '...' : ''), `(${toolResultText.length} chars)`)

            messages.push({
              role: 'tool',
              content: toolResultText,
              tool_call_id: tc.id,
            })
          }
          continue
        }

        // Final text response (already streamed to UI via onChunk)
        const finalResponse = result.content ?? streamedContent
        if (isDev) console.log('[linked-agent] Final response:', finalResponse.slice(0, 300) + (finalResponse.length > 300 ? '...' : ''), `(${finalResponse.length} chars)`)
        return finalResponse
      }
      if (isDev) console.warn('[linked-agent] Hit DEFAULT_MAX_ITERATIONS:', DEFAULT_MAX_ITERATIONS)
      return i18n.t('chat.maxStepsReached')
    } else {
      // No tools, just a simple chat
      let response = ''
      await llmService.streamChat(messages, (chunk) => {
        response += chunk
      }, linkedOptions)
      if (isDev) console.log('[linked-agent] Plain chat response:', response.slice(0, 300), `(${response.length} chars)`)
      return response
    }
  } catch (error) {
    if (isDev) console.error('[linked-agent] Error:', error)
    return i18n.t('chat.agentResponseFailed', { message: error instanceof Error ? error.message : String(error) })
  }
}

/** Persist a usage record to IndexedDB for analytics */
function persistUsageRecord(
  usage: TokenUsage,
  chatId: string,
  agentId: string,
  toolCallNames: string[],
  providerId: string,
  modelId: string,
): void {

  // Look up cost from provider registry
  let costIn = 0
  let costOut = 0
  const provider = PROVIDERS.find(p => p.id === providerId)
  if (provider) {
    const model = provider.models.find(m => m.id === modelId)
    if (model) {
      costIn = model.costIn
      costOut = model.costOut
    }
  }

  const cost =
    (usage.inputTokens / 1_000_000) * costIn +
    (usage.outputTokens / 1_000_000) * costOut

  const record: UsageRecord = {
    id: crypto.randomUUID(),
    chatId,
    agentId,
    modelId,
    providerId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cost,
    toolCalls: toolCallNames,
    timestamp: Date.now(),
  }

  // Fire-and-forget: don't block the chat flow
  storageService.createUsageRecord(record).catch((err) => {
    if (import.meta.env?.DEV) console.warn('[analytics] Failed to persist usage record:', err)
  })
}

/**
 * useChatStore - Zustand store for chat state
 * Supports multi-agent orchestration via linked agents
 */
export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChatId: null,
  currentChat: null,
  messages: [],
  isGenerating: false,
  isLoadingChats: false,
  isLoadingMessages: false,
  sessionTokens: { input: 0, output: 0 },
  backgroundTasks: {},
  longTaskDetectedChats: {},
  currentProgress: null,
  longTaskStartedAt: {},
  chatUsage: {},

  addTokenUsage: (usage: TokenUsage) => {
    set(state => ({
      sessionTokens: {
        input: state.sessionTokens.input + usage.inputTokens,
        output: state.sessionTokens.output + usage.outputTokens,
      },
    }))
  },

  resetSessionTokens: () => {
    set({ sessionTokens: { input: 0, output: 0 } })
  },

  loadChatUsage: async (chatIds: string[]) => {
    if (chatIds.length === 0) return
    try {
      const usage = await storageService.getUsageByChatIds(chatIds)
      set(state => ({ chatUsage: { ...state.chatUsage, ...usage } }))
    } catch (error) {
      if (import.meta.env?.DEV) console.warn('Failed to load chat usage:', error)
    }
  },

  loadChats: async (agentId: string) => {
    set({ isLoadingChats: true })
    try {
      const chats = await storageService.getChats(agentId)
      // Recovery: mark any 'running' tasks as 'failed' (promise was lost on page reload)
      const recoveredTasks: Record<string, BackgroundTask> = {}
      for (const chat of chats) {
        if (chat.taskStatus === 'running') {
          chat.taskStatus = 'failed'
          recoveredTasks[chat.id] = { status: 'failed', currentStep: chat.taskCurrentStep ?? 0, totalSteps: chat.taskTotalSteps ?? 0, agentId: chat.agentId }
          storageService.updateChat(chat.id, { taskStatus: 'failed' } as Partial<Chat>).catch(() => {})
        } else if (chat.taskStatus === 'completed' || chat.taskStatus === 'failed') {
          recoveredTasks[chat.id] = { status: chat.taskStatus, currentStep: chat.taskCurrentStep ?? 0, totalSteps: chat.taskTotalSteps ?? 0, agentId: chat.agentId }
        }
      }
      set(state => ({
        chats,
        isLoadingChats: false,
        backgroundTasks: { ...state.backgroundTasks, ...recoveredTasks },
      }))
      // Load usage data for all chats
      get().loadChatUsage(chats.map(c => c.id))
    } catch (error) {
      console.error('Failed to load chats:', error)
      set({ chats: [], isLoadingChats: false })
    }
  },

  createChat: async (agentId: string, title?: string) => {
    const chat = await storageService.createChat({
      agentId,
      title: title || i18n.t('chat.newChatTitle'),
    })
    set(state => ({
      chats: [chat, ...state.chats],
      currentChatId: chat.id,
      currentChat: chat,
      messages: [],
      sessionTokens: { input: 0, output: 0 },
    }))
    await storageService.updatePreferences({ lastChatId: chat.id })
    return chat
  },

  selectChat: async (chatId: string) => {
    set({ isLoadingMessages: true, currentChatId: chatId, sessionTokens: { input: 0, output: 0 } })
    try {
      const [chat, messages] = await Promise.all([
        storageService.getChatById(chatId),
        storageService.getMessages(chatId),
      ])
      if (chat) {
        set({ currentChat: chat, messages, isLoadingMessages: false })
        await storageService.updatePreferences({ lastChatId: chatId })
      } else {
        set({ currentChatId: null, currentChat: null, messages: [], isLoadingMessages: false })
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
      set({ currentChatId: null, currentChat: null, messages: [], isLoadingMessages: false })
    }
  },

  deleteChat: async (chatId: string) => {
    await storageService.deleteChat(chatId)
    const { currentChatId, chats } = get()
    set({
      chats: chats.filter(c => c.id !== chatId),
      ...(currentChatId === chatId ? { currentChatId: null, currentChat: null, messages: [] } : {}),
    })
  },

  updateChatTitle: async (chatId: string, title: string) => {
    await storageService.updateChat(chatId, { title })
    set(state => ({
      chats: state.chats.map(c => c.id === chatId ? { ...c, title } : c),
      currentChat: state.currentChat?.id === chatId
        ? { ...state.currentChat, title }
        : state.currentChat,
    }))
  },

  sendMessage: async (content: string, agentId: string, options?: { deepTask?: boolean }) => {
    const { currentChatId, currentChat, messages } = get()

    if (!llmService.isConfigured()) {
      throw new Error(i18n.t('chat.llmNotConfigured'))
    }

    // Auto-background running task instead of aborting when sending from a different chat
    if (currentAbortController && !backgroundChatIds.has(currentChatId ?? '')) {
      if (currentRunningChatId && currentRunningChatId !== currentChatId) {
        // Different chat - auto-background the running task
        get().moveToBackground(currentRunningChatId)
      } else {
        // Same chat - abort (user is sending a new message in the same conversation)
        currentAbortController.abort()
      }
    }
    const abortController = new AbortController()
    currentAbortController = abortController

    let activeChatId = currentChatId
    currentRunningChatId = currentChatId
    let isFirstMessage = false

    if (!activeChatId) {
      const chat = await get().createChat(agentId, generateChatTitle(content))
      activeChatId = chat.id
      isFirstMessage = true
    }

    const userMessage = await storageService.createMessage({
      chatId: activeChatId,
      role: 'user',
      content,
      modelId: llmService.getModel() || undefined,
    })

    set(state => ({ messages: [...state.messages, userMessage] }))

    if (isFirstMessage || currentChat?.title === i18n.t('chat.newChatTitle')) {
      await get().updateChatTitle(activeChatId, generateChatTitle(content))
    }

    // Deep task: immediately mark as long task, enable notification, show banner
    if (options?.deepTask) {
      set(state => ({
        longTaskDetectedChats: { ...state.longTaskDetectedChats, [activeChatId!]: true },
        longTaskStartedAt: { ...state.longTaskStartedAt, [activeChatId!]: Date.now() },
      }))
      notifyOnCompletionChatIds.add(activeChatId!)
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }

    const assistantMessage = await storageService.createMessage({
      chatId: activeChatId,
      role: 'assistant',
      content: '',
      modelId: llmService.getModel() || undefined,
    })

    set(state => ({
      messages: [...state.messages, assistantMessage],
      isGenerating: true,
    }))

    try {
      // Get agent from agent store (IndexedDB backed)
      const agentStore = useAgentStore.getState()
      const agent = agentStore.getAgentById(agentId)

      // Activate agent's MCPs (lazy loading)
      const mcpStore = useMCPStore.getState()
      if (agent) {
        await mcpStore.activateAgentMCPs(agent)
      }

      // Get MCP tools
      let mcpTools = agent ? mcpStore.getToolsForAgent(agent) : []
      if (import.meta.env?.DEV) {
        console.log('[chat] Agent:', agentId, 'MCP tools:', mcpTools.map(t => `${t.serverId}:${t.name}`), 'error:', mcpStore.error, 'initialized:', mcpStore.isInitialized)
      }

      if (mcpTools.length === 0 && agent && (mcpStore.error || !mcpStore.isInitialized)) {
        await useMCPStore.getState().reconnect()
        if (agent) {
          await useMCPStore.getState().activateAgentMCPs(agent)
          mcpTools = useMCPStore.getState().getToolsForAgent(agent)
        }
      }

      // Build linked agent tools
      const linkedAgentTools = agent ? buildLinkedAgentTools(agent) : []

      const allOpenAITools = [...mcpTools.map(mcpToolToOpenAI), ...linkedAgentTools]
      const hasTools = allOpenAITools.length > 0

      // Build system prompt (append instruction to respond in user's language)
      const basePrompt = agent?.basePrompt || 'You are a helpful AI assistant.'
      let systemContent = basePrompt + '\n\nRespond in the same language the user writes in.'
      if (hasTools) {
        systemContent += '\n\nWhen a task requires multiple operations, keep making tool calls until the task is fully complete. Do not stop partway and ask the user if you should continue - just keep going until done. Never present fabricated or unverified results - always use the available tools to obtain real data.'
      }

      // Build message history
      const allMessages = [...messages, userMessage]

      // Normalize role values and filter out system messages (already sent separately)
      const normalizeRole = (role: string): 'user' | 'assistant' => {
        const normalized = role.toLowerCase()
        if (normalized === 'assistant' || normalized === 'ai' || normalized === 'bot') {
          return 'assistant'
        }
        // Default to 'user' for 'user', 'human', 'system', or any other value
        return 'user'
      }

      const chatMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemContent },
        ...allMessages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: normalizeRole(msg.role),
            content: msg.content,
          })),
      ]

      const isAborted = () => abortController.signal.aborted

      const updateAssistantMsg = (newContent: string) => {
        if (backgroundChatIds.has(activeChatId!)) {
          // Background mode: just persist to DB, skip UI update
          storageService.updateMessage(assistantMessage.id, newContent).catch(() => {})
          return
        }
        flushSync(() => {
          set(state => ({
            messages: state.messages.map(m =>
              m.id === assistantMessage.id ? { ...m, content: newContent } : m
            ),
          }))
        })
      }

      const persistMessage = (content: string) =>
        storageService.updateMessage(assistantMessage.id, content)

      const llmOptions = getAgentGenerationOptions(agent)

      // Capture provider/model now so background tasks don't use stale values if user switches models
      const capturedProviderId = llmService.getProvider() || 'unknown'
      const capturedModelId = llmService.getModel() || 'unknown'

      const { addTokenUsage } = get()

      // Execute
      const isBackground = () => backgroundChatIds.has(activeChatId!)
      if (hasTools) {
        try {
          await runToolCallingLoop(
            chatMessages,
            allOpenAITools,
            mcpTools,
            mcpStore,
            updateAssistantMsg,
            persistMessage,
            isAborted,
            llmOptions,
            (usage, toolCallNames) => {
              addTokenUsage(usage)
              persistUsageRecord(usage, activeChatId!, agentId, toolCallNames, capturedProviderId, capturedModelId)
            },
            () => agent?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
            (current, total) => {
              // Update foreground progress
              if (!isBackground()) {
                set({ currentProgress: { current, total } })
              }
              if (isBackground()) {
                // Update background task progress
                set(state => ({
                  backgroundTasks: {
                    ...state.backgroundTasks,
                    [activeChatId!]: { ...state.backgroundTasks[activeChatId!], currentStep: current, totalSteps: total },
                  },
                }))
                storageService.updateChat(activeChatId!, { taskCurrentStep: current, taskTotalSteps: total } as Partial<Chat>).catch(() => {})
              }
            },
          )
        } catch (toolLoopError) {
          if (isAborted()) return
          if (import.meta.env?.DEV) {
            console.warn('[chat] Tool-calling loop failed, falling back to plain chat:', toolLoopError)
          }
          const usage = await streamPlainChat(chatMessages, updateAssistantMsg, persistMessage, isAborted, llmOptions)
          if (usage) {
            addTokenUsage(usage)
            persistUsageRecord(usage, activeChatId!, agentId, [], capturedProviderId, capturedModelId)
          }
        }
      } else {
        const usage = await streamPlainChat(chatMessages, updateAssistantMsg, persistMessage, isAborted, llmOptions)
        if (usage) {
          addTokenUsage(usage)
          persistUsageRecord(usage, activeChatId!, agentId, [], capturedProviderId, capturedModelId)
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        const currentMessages = get().messages
        const partialMessage = currentMessages.find(m => m.id === assistantMessage.id)
        if (partialMessage?.content) {
          await storageService.updateMessage(assistantMessage.id, partialMessage.content)
        }
        return
      }
      let errorContent: string
      if (error instanceof LLMNetworkError) {
        errorContent = '\n\n[' + i18n.t('chat.networkError') + ']'
      } else if (error instanceof LLMApiError) {
        if (error.status === 401 || error.status === 403) {
          errorContent = '\n\n[' + i18n.t('chat.authError') + ']'
        } else if (error.status === 429) {
          errorContent = '\n\n[' + i18n.t('chat.rateLimitError') + ']'
        } else if (error.status >= 500) {
          errorContent = '\n\n[' + i18n.t('chat.serverError') + ']'
        } else {
          const apiMessage = error.message
          errorContent = '\n\n[' + i18n.t('chat.apiError', { message: apiMessage }) + ']'
        }
      } else {
        const apiMessage = error instanceof Error ? error.message : String(error)
        errorContent = '\n\n[' + i18n.t('chat.apiError', { message: apiMessage }) + ']'
      }
      await storageService.updateMessage(assistantMessage.id, errorContent)
      set(state => ({
        messages: state.messages.map(m =>
          m.id === assistantMessage.id ? { ...m, content: errorContent } : m
        ),
      }))
      throw error
    } finally {
      if (currentAbortController === abortController) {
        currentAbortController = null
      }
      if (currentRunningChatId === activeChatId) {
        currentRunningChatId = null
      }

      if (activeChatId) {

      const wasBackground = backgroundChatIds.has(activeChatId)
      const wantsNotify = notifyOnCompletionChatIds.has(activeChatId)
      if (wasBackground) {
        backgroundChatIds.delete(activeChatId)
        const failed = abortController.signal.aborted
        const finalStatus: TaskStatus = failed ? 'failed' : 'completed'
        set(state => ({
          backgroundTasks: {
            ...state.backgroundTasks,
            [activeChatId]: { ...state.backgroundTasks[activeChatId], status: finalStatus },
          },
        }))
        storageService.updateChat(activeChatId, { taskStatus: finalStatus } as Partial<Chat>).catch(() => {})
      }

      // Fire notification for long tasks or background tasks - only if THIS run was long
      const isLongTask = !!(get().longTaskDetectedChats[activeChatId])
      if (wasBackground || wantsNotify || isLongTask) {
        notifyOnCompletionChatIds.delete(activeChatId)
        // Clear long task flag so future short messages in this chat don't re-trigger
        if (isLongTask) {
          set(state => {
            const { [activeChatId]: _, ...restDetected } = state.longTaskDetectedChats
            const { [activeChatId]: __, ...restStarted } = state.longTaskStartedAt
            return { longTaskDetectedChats: restDetected, longTaskStartedAt: restStarted }
          })
        }
        const failed = abortController.signal.aborted
        const chatTitle = get().chats.find(c => c.id === activeChatId)?.title ?? ''
        const notifKey = failed ? 'longTask.notificationFailed' : 'longTask.notificationDone'
        const notifText = i18n.t(notifKey, { title: chatTitle })

        // Always fire browser notification for long/background task completion
        if (typeof Notification !== 'undefined') {
          let perm = Notification.permission
          if (perm === 'default') {
            perm = await Notification.requestPermission()
          }
          console.log('[notification] permission:', perm, 'text:', notifText)
          if (perm === 'granted') {
            const notification = new Notification('izan.io', {
              body: notifText,
              icon: '/notification-icon.png',
              tag: `izan-task-${activeChatId}`,
              silent: false,
            })
            notification.onclick = () => {
              window.focus()
              notification.close()
            }
            setTimeout(() => notification.close(), 10000)
          }
        }

        // Title flash when tab is hidden
        if (document.hidden) {
          const originalTitle = document.title
          const flashTitle = failed ? `❌ ${chatTitle}` : `✅ ${chatTitle}`
          let flashing = true
          const flashInterval = setInterval(() => {
            document.title = document.title === originalTitle ? flashTitle : originalTitle
          }, 1000)
          const stopFlash = () => {
            if (!flashing) return
            flashing = false
            clearInterval(flashInterval)
            document.title = originalTitle
            window.removeEventListener('focus', stopFlash)
          }
          window.addEventListener('focus', stopFlash)
          setTimeout(stopFlash, 30000)
        }
      }

      // Refresh usage for this chat so sidebar shows updated cost
      get().loadChatUsage([activeChatId])

      } // end if (activeChatId)

      set({ isGenerating: false, currentProgress: null })
    }
  },

  moveToBackground: (chatId: string) => {
    backgroundChatIds.add(chatId)
    const agentId = get().currentChat?.agentId ?? ''
    const agentStore = useAgentStore.getState()
    const agent = agentStore.getAgentById(agentId)
    const maxIter = agent?.maxIterations ?? DEFAULT_MAX_ITERATIONS
    // Mark as running in DB
    storageService.updateChat(chatId, { taskStatus: 'running', taskCurrentStep: 0, taskTotalSteps: maxIter } as Partial<Chat>).catch(() => {})
    set(state => ({
      // The async sendMessage promise continues running uninterrupted
      isGenerating: false,
      currentProgress: null,
      backgroundTasks: {
        ...state.backgroundTasks,
        [chatId]: { status: 'running', currentStep: 0, totalSteps: maxIter, agentId },
      },
    }))
    // Request notification permission proactively
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  },

  clearTaskStatus: (chatId: string) => {
    set(state => {
      const { [chatId]: _, ...rest } = state.backgroundTasks
      return { backgroundTasks: rest }
    })
    storageService.updateChat(chatId, { taskStatus: undefined, taskCurrentStep: undefined, taskTotalSteps: undefined } as Partial<Chat>).catch(() => {})
  },

  enableNotifyOnCompletion: (chatId: string) => {
    notifyOnCompletionChatIds.add(chatId)
    // Request notification permission if needed
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  },

  stopGenerating: () => {
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
    }
    llmService.abort()
    set({ isGenerating: false })
  },

  clearCurrentChat: () => {
    set({ currentChatId: null, currentChat: null, messages: [] })
  },

  clearAllChats: async () => {
    await storageService.clearAllChats()
    set({ chats: [], currentChatId: null, currentChat: null, messages: [], chatUsage: {} })
  },

  clearAgentChats: async (agentId: string) => {
    await storageService.clearAgentChats(agentId)
    const { currentChat } = get()
    if (currentChat?.agentId === agentId) {
      set({ chats: [], currentChatId: null, currentChat: null, messages: [], chatUsage: {} })
    } else {
      set(state => ({
        chats: state.chats.filter(c => c.agentId !== agentId),
      }))
    }
  },

  clearMultipleAgentChats: async (agentIds: string[]) => {
    for (const agentId of agentIds) {
      await storageService.clearAgentChats(agentId)
    }
    const { currentChat } = get()
    const affectedSet = new Set(agentIds)
    if (currentChat && affectedSet.has(currentChat.agentId)) {
      set(state => ({
        chats: state.chats.filter(c => !affectedSet.has(c.agentId)),
        currentChatId: null,
        currentChat: null,
        messages: [],
      }))
    } else {
      set(state => ({
        chats: state.chats.filter(c => !affectedSet.has(c.agentId)),
      }))
    }
  },
}))
