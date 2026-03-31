/**
 * Offscreen Document Script (Relay)
 *
 * Sits between the background service worker and the sandboxed iframe.
 * The background can't postMessage to the sandbox directly, and the sandbox
 * can't use chrome.runtime.* APIs. This relay bridges them.
 *
 * Background → (chrome.runtime.sendMessage) → Offscreen → (postMessage) → Sandbox
 * Sandbox → (postMessage) → Offscreen → (chrome.runtime.sendMessage) → Background
 */

let sandbox: HTMLIFrameElement | null = null
let sandboxReady = false
const pendingInit: Array<() => void> = []

/** Pending tool executions awaiting result from the sandbox */
const pendingExecs = new Map<string, (res: { success: boolean; data?: unknown; error?: string }) => void>()

let execCounter = 0

// Create the sandbox iframe on load
function initSandbox() {
  sandbox = document.getElementById('sandbox') as HTMLIFrameElement
  if (!sandbox) return

  // The sandbox iframe loads sandbox.html which is in manifest sandbox.pages
  // It takes a moment to load, so we wait for a ready signal
  sandbox.addEventListener('load', () => {
    sandboxReady = true
    // Flush any pending tool executions that arrived before sandbox was ready
    for (const fn of pendingInit) fn()
    pendingInit.length = 0
  })
}

/** Send a message to the sandbox iframe */
function sendToSandbox(msg: Record<string, unknown>) {
  if (!sandbox?.contentWindow) return
  sandbox.contentWindow.postMessage(msg, '*')
}

/** Wait until sandbox is ready, then execute callback */
function whenSandboxReady(fn: () => void) {
  if (sandboxReady) fn()
  else pendingInit.push(fn)
}

// Listen for messages FROM the sandbox (browser-call and tool-result)
window.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg || typeof msg.type !== 'string') return

  if (msg.type === 'browser-call') {
    // Sandbox wants to call browser.* - forward to background as bw-command
    const { callId, method, payload } = msg
    chrome.runtime.sendMessage(
      { type: 'bw-command', action: method, payload },
      (res) => {
        // Forward the response back to sandbox
        sendToSandbox({
          type: 'browser-result',
          callId,
          success: res?.success !== false,
          data: res?.data,
          error: res?.error,
        })
      },
    )
    return
  }

  if (msg.type === 'tool-result') {
    // Sandbox finished executing the tool - resolve the pending exec
    const { execId, success, data, error } = msg
    const resolve = pendingExecs.get(execId)
    if (resolve) {
      pendingExecs.delete(execId)
      resolve({ success, data, error })
    }
    return
  }
})

// Listen for messages FROM the background (exec-tool)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'exec-tool') return false

  const execId = `exec_${++execCounter}`
  const { code, params, laneId } = msg

  pendingExecs.set(execId, sendResponse)

  whenSandboxReady(() => {
    sendToSandbox({ type: 'exec-tool', execId, code, params, laneId })
  })

  return true // async response
})

// Init on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSandbox)
} else {
  initSandbox()
}
