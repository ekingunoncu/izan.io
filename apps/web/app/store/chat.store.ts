import { flushSync } from 'react-dom'
import { create } from 'zustand'
import i18n from '~/i18n'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  LLMGenerationOptions,
} from '~/lib/services/interfaces'
import { storageService, llmService } from '~/lib/services'
import type { Chat, Message, Agent } from '~/lib/db'
import { useMCPStore } from './mcp.store'
import { useAgentStore } from './agent.store'
import type { MCPToolInfo } from '@izan/mcp-client'

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

  loadChats: (agentId: string) => Promise<void>
  createChat: (agentId: string, title?: string) => Promise<Chat>
  selectChat: (chatId: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  updateChatTitle: (chatId: string, title: string) => Promise<void>
  sendMessage: (content: string, agentId: string) => Promise<void>
  stopGenerating: () => void
  clearCurrentChat: () => void
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
        description: `Bu agent ile konuş: ${linkedAgent.name} - ${linkedAgent.description}`,
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: "Agent'a sorulacak soru",
            },
          },
          required: ['question'],
        },
      },
    })
  }

  return tools
}

/** Max tool-calling rounds to prevent runaway tool chains */
const MAX_TOOL_ROUNDS = 5

/** LLM options - only send params user explicitly set. Omit for provider defaults to avoid API errors. */
function getAgentGenerationOptions(agent: Agent | null): LLMGenerationOptions {
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

/** CoinGecko dashboard URL - shown when 429 rate limit hit */
const COINGECKO_DASHBOARD_URL = 'https://www.coingecko.com/en/developers/dashboard'

/** Module-level AbortController so stopGenerating can signal sendMessage */
let currentAbortController: AbortController | null = null

/** Execute a tool call (MCP or linked agent) during chat */
async function executeToolCall(
  fnName: string,
  fnArgs: Record<string, unknown>,
  mcpTools: MCPToolInfo[],
  mcpStore: ReturnType<typeof useMCPStore.getState>,
): Promise<string> {
  if (fnName.startsWith('ask_agent_')) {
    const targetAgentId = fnName.replace('ask_agent_', '')
    const question = (fnArgs.question as string) || ''
    return executeLinkedAgentCall(targetAgentId, question, 0)
  }
  const toolInfo = mcpTools.find(t => t.name === fnName)
  if (!toolInfo) {
    return `Hata: Tool bulunamadı: ${fnName}. Mevcut araçlar: ${mcpTools.map(t => t.name).join(', ') || 'yok'}`
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
    : `Hata: ${toolResult.error ?? 'Bilinmeyen hata'}`

  // CoinGecko 429: warn user and redirect to dashboard for API key
  if (
    !toolResult.success &&
    toolInfo.serverId === 'crypto-analysis-client' &&
    typeof toolResult.error === 'string' &&
    (toolResult.error.includes('rate limit') || toolResult.error.includes('429'))
  ) {
    if (typeof window !== 'undefined') {
      window.open(COINGECKO_DASHBOARD_URL, '_blank', 'noopener')
    }
  }

  if (import.meta.env?.DEV) {
    if (!toolResult.success) {
      console.error('[chat] MCP tool error:', toolInfo.serverId, fnName, toolResult.error)
    } else if (fnName === 'fetch_url') {
      console.log('[chat] fetch_url result preview:', resultText.slice(0, 200) + (resultText.length > 200 ? '...' : ''))
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
): Promise<void> {
  let fullContent = ''
  await llmService.streamChat(chatMessages, async (chunk) => {
    if (isAborted()) return
    fullContent += chunk
    updateAssistantMsg(fullContent)
    // Yield to browser so streamed content can paint before next chunk
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
  }, options)
  if (fullContent) {
    await persistMessage(fullContent)
  }
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
): Promise<void> {
  let rounds = 0
  const statusParts: string[] = []

  while (rounds < MAX_TOOL_ROUNDS) {
    if (isAborted()) break
    rounds++

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

    if (isAborted()) break

    if (result.toolCalls && result.toolCalls.length > 0) {
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

        const toolResultText = await executeToolCall(fnName, fnArgs, mcpTools, mcpStore)

        chatMessages.push({
          role: 'tool',
          content: toolResultText,
          tool_call_id: tc.id,
        })
      }

      if (isAborted()) break
      continue
    }

    // Final text response (content was already streamed to UI)
    const finalContent = prefix + (result.content ?? '')
    await persistMessage(finalContent)
    return
  }

  if (!isAborted()) {
    const finalContent = statusParts.join('\n') + '\n\nMaksimum adım sayısına ulaşıldı.'
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
): Promise<string> {
  if (depth >= MAX_AGENT_DEPTH) {
    return 'Maksimum agent derinliği aşıldı. Daha fazla agent çağrısı yapılamaz.'
  }

  const agentStore = useAgentStore.getState()
  const mcpStore = useMCPStore.getState()
  const targetAgent = agentStore.getAgentById(targetAgentId)

  if (!targetAgent) {
    return `Hata: Agent bulunamadı: ${targetAgentId}`
  }

  // Activate target agent's MCPs if needed
  await mcpStore.activateAgentMCPs(targetAgent)

  // Get target agent's tools (MCP + linked agents)
  const mcpTools = mcpStore.getToolsForAgent(targetAgent)
  const linkedTools = buildLinkedAgentTools(targetAgent)
  const allTools = [...mcpTools.map(mcpToolToOpenAI), ...linkedTools]

  const basePrompt =
    (targetAgent as { basePrompt?: string; systemPrompt?: string }).basePrompt ??
    (targetAgent as { systemPrompt?: string }).systemPrompt ??
    'You are a helpful AI assistant.'
  const systemContent = basePrompt + '\n\nRespond in the same language the user writes in.'
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: question },
  ]

  const linkedOptions = getAgentGenerationOptions(targetAgent)

  try {
    if (allTools.length > 0) {
      // Tool-calling loop for the linked agent
      let rounds = 0
      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++
        const result = await llmService.chatWithTools(messages, allTools, linkedOptions)

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

            let toolResult: string

            // Check if it's a linked agent call
            if (fnName.startsWith('ask_agent_')) {
              const nestedAgentId = fnName.replace('ask_agent_', '')
              const nestedQuestion = (fnArgs.question as string) || ''
              toolResult = await executeLinkedAgentCall(nestedAgentId, nestedQuestion, depth + 1)
            } else {
              // Regular MCP tool call
              const toolInfo = mcpTools.find(t => t.name === fnName)
              if (toolInfo) {
                const r = await mcpStore.callTool(toolInfo.serverId, fnName, fnArgs)
                toolResult = r.success
                  ? r.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map(c => c.text).join('\n')
                  : `Hata: ${r.error ?? 'Bilinmeyen hata'}`
                // CoinGecko 429: redirect to dashboard
                if (
                  !r.success &&
                  toolInfo.serverId === 'crypto-analysis-client' &&
                  typeof r.error === 'string' &&
                  (r.error.includes('rate limit') || r.error.includes('429'))
                ) {
                  if (typeof window !== 'undefined') {
                    window.open(COINGECKO_DASHBOARD_URL, '_blank', 'noopener')
                  }
                }
              } else {
                toolResult = `Hata: Tool bulunamadı: ${fnName}`
              }
            }

            messages.push({
              role: 'tool',
              content: toolResult,
              tool_call_id: tc.id,
            })
          }
          continue
        }

        // Final text response
        return result.content ?? ''
      }
      return 'Maksimum adım sayısına ulaşıldı.'
    } else {
      // No tools, just a simple chat
      let response = ''
      await llmService.streamChat(messages, (chunk) => {
        response += chunk
      }, linkedOptions)
      return response
    }
  } catch (error) {
    return `Hata: Agent yanıt veremedi: ${error instanceof Error ? error.message : String(error)}`
  }
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

  loadChats: async (agentId: string) => {
    set({ isLoadingChats: true })
    try {
      const chats = await storageService.getChats(agentId)
      set({ chats, isLoadingChats: false })
    } catch (error) {
      console.error('Failed to load chats:', error)
      set({ chats: [], isLoadingChats: false })
    }
  },

  createChat: async (agentId: string, title?: string) => {
    const chat = await storageService.createChat({
      agentId,
      title: title || 'Yeni Sohbet',
    })
    set(state => ({
      chats: [chat, ...state.chats],
      currentChatId: chat.id,
      currentChat: chat,
      messages: [],
    }))
    await storageService.updatePreferences({ lastChatId: chat.id })
    return chat
  },

  selectChat: async (chatId: string) => {
    set({ isLoadingMessages: true, currentChatId: chatId })
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

  sendMessage: async (content: string, agentId: string) => {
    const { currentChatId, currentChat, messages } = get()

    if (!llmService.isConfigured()) {
      throw new Error('LLM yapılandırılmadı. Ayarlardan bir provider ve model seçin.')
    }

    currentAbortController?.abort()
    const abortController = new AbortController()
    currentAbortController = abortController

    let activeChatId = currentChatId
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

    if (isFirstMessage || currentChat?.title === 'Yeni Sohbet') {
      await get().updateChatTitle(activeChatId, generateChatTitle(content))
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
      const basePrompt = (agent as { basePrompt?: string; systemPrompt?: string } | null)?.basePrompt ?? (agent as { systemPrompt?: string })?.systemPrompt ?? 'You are a helpful AI assistant.'
      const systemContent = basePrompt + '\n\nRespond in the same language the user writes in.'

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
          .filter(msg => msg.role !== 'system') // Remove system messages (already sent)
          .map(msg => ({
            role: normalizeRole(msg.role),
            content: msg.content,
          })),
      ]

      const isAborted = () => abortController.signal.aborted

      const updateAssistantMsg = (newContent: string) => {
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

      // Execute
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
          )
        } catch {
          if (isAborted()) return
          await streamPlainChat(chatMessages, updateAssistantMsg, persistMessage, isAborted, llmOptions)
        }
      } else {
        await streamPlainChat(chatMessages, updateAssistantMsg, persistMessage, isAborted, llmOptions)
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
      const apiMessage = error instanceof Error ? error.message : String(error)
      const errorContent = '\n\n[' + i18n.t('chat.apiError', { message: apiMessage }) + ']'
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
      set({ isGenerating: false })
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
}))
