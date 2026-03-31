/**
 * Code Tool Executor
 *
 * Executes code-based tools via an offscreen document.
 *
 * MV3 service workers can't use eval, new Function, or import(data:) due to
 * spec restrictions (ServiceWorkerGlobalScope). We work around this by
 * creating a Chrome offscreen document that CAN use new Function().
 *
 * Flow:
 *   1. Background receives tool call
 *   2. Ensures offscreen document is alive
 *   3. Sends { type: 'exec-tool', code, params, laneId } to offscreen
 *   4. Offscreen evaluates code with new Function(), runs it with a browser proxy
 *   5. browser.* calls are forwarded back to background via chrome.runtime.sendMessage
 *   6. Background handles bw-command as usual
 *   7. Offscreen returns result to background
 */

import type { CodeToolDefinition, CodeToolResult } from './code-tool-types.js'

/** Max time a tool can run before being killed */
const TOOL_TIMEOUT_MS = 120_000

const OFFSCREEN_URL = 'offscreen.html'

/** Track whether the offscreen document currently exists */
let offscreenReady = false

/** Ensure the offscreen document is created */
async function ensureOffscreen(): Promise<void> {
  if (offscreenReady) {
    // Verify it still exists (Chrome may have closed it)
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    })
    if (contexts.length > 0) return
    offscreenReady = false
  }

  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Execute user-defined tool code with new Function()',
    })
    offscreenReady = true
  } catch (err) {
    // Document may already exist from a previous call
    if (String(err).includes('already exists')) {
      offscreenReady = true
      return
    }
    throw err
  }
}

/**
 * Execute a code-based tool.
 *
 * Creates/reuses an offscreen document and sends the tool code there for execution.
 * The offscreen document handles eval and browser.* proxying.
 */
export async function executeCodeTool(
  tool: CodeToolDefinition,
  args: Record<string, unknown>,
): Promise<CodeToolResult> {
  const laneId = `tool_${tool.name}_${Date.now()}`

  try {
    await ensureOffscreen()

    const result = await new Promise<{ success: boolean; data?: unknown; error?: string }>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Tool "${tool.name}" timed out after ${TOOL_TIMEOUT_MS}ms`))
        }, TOOL_TIMEOUT_MS)

        chrome.runtime.sendMessage(
          { type: 'exec-tool', code: tool.code, params: args, laneId },
          (res) => {
            clearTimeout(timer)
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(res)
          },
        )
      },
    )

    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error ?? 'Tool execution failed' }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
