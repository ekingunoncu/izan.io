/**
 * Sandbox Script
 *
 * Runs inside a sandboxed page (manifest sandbox.pages) where new Function()
 * is allowed. Cannot use chrome.* APIs - communicates with the offscreen
 * relay via window.postMessage.
 *
 * Messages IN (from offscreen parent):
 *   { type: 'exec-tool', execId, code, params, laneId }
 *   { type: 'browser-result', callId, success, data?, error? }
 *
 * Messages OUT (to offscreen parent):
 *   { type: 'browser-call', execId, callId, method, payload }
 *   { type: 'tool-result', execId, success, data?, error? }
 */

/** Pending browser.* RPC calls awaiting response from the offscreen relay */
const pendingCalls = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

let callCounter = 0

/** Handle incoming messages from the offscreen document (parent) */
window.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg || typeof msg.type !== 'string') return

  if (msg.type === 'exec-tool') {
    const { execId, code, params, laneId } = msg
    executeTool(execId, code, params, laneId)
    return
  }

  if (msg.type === 'browser-result') {
    const { callId, success, data, error } = msg
    const pending = pendingCalls.get(callId)
    if (pending) {
      pendingCalls.delete(callId)
      if (success) pending.resolve(data)
      else pending.reject(new Error(error ?? 'browser call failed'))
    }
    return
  }
})

/** Send a browser.* RPC to the offscreen relay and await the result */
function browserRpc(execId: string, method: string, payload: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const callId = `call_${++callCounter}`
    pendingCalls.set(callId, { resolve, reject })
    parent.postMessage({ type: 'browser-call', execId, callId, method, payload }, '*')
  })
}

/** Create a browser API proxy that mirrors BrowserWindow's interface */
function createBrowserProxy(execId: string, laneId: string, params: Record<string, unknown>) {
  let tabId: number | null = null

  const send = (action: string, extra: Record<string, unknown> = {}) =>
    browserRpc(execId, action, { tabId, laneId, ...extra })

  return {
    async open(url: string) {
      const r = (await send('open', { url })) as { tabId: number }
      tabId = r.tabId
    },
    async navigate(url: string) {
      if (tabId == null) {
        const r = (await send('open', { url })) as { tabId: number }
        tabId = r.tabId
      } else {
        await send('navigate', { url })
      }
    },
    async click(selector: string) { await send('click', { selector }) },
    async type(selector: string, text: string, opts?: { clear?: boolean }) {
      await send('type', { selector, text, clear: opts?.clear ?? true })
    },
    async getText(selector: string): Promise<string> {
      return (await send('getText', { selector })) as string
    },
    async getHtml(selector: string): Promise<string> {
      return (await send('getHtml', { selector })) as string
    },
    async getAttribute(selector: string, attr: string): Promise<string | null> {
      return (await send('getAttribute', { selector, attribute: attr })) as string | null
    },
    async getValue(selector: string): Promise<string> {
      return (await send('getValue', { selector })) as string
    },
    async exists(selector: string): Promise<boolean> {
      return (await send('exists', { selector })) as boolean
    },
    async select(selector: string, value: string) {
      await send('select', { selector, value })
    },
    async scroll(opts?: { selector?: string; direction?: string; amount?: number }) {
      await send('scroll', {
        selector: opts?.selector,
        direction: opts?.direction ?? 'down',
        amount: opts?.amount ?? 500,
      })
    },
    async evaluate<T = unknown>(expression: string): Promise<T> {
      // Inject params into page context so evaluate expressions can reference them
      const wrapped = `(function(params){${expression}})(${JSON.stringify(params)})`
      return (await send('evaluate', { expression: wrapped })) as T
    },
    async waitForSelector(selector: string, timeout?: number) {
      await send('waitForSelector', { selector, timeout: timeout ?? 10_000 })
    },
    async waitForUrl(pattern: string, timeout?: number) {
      await send('waitForUrl', { pattern, timeout: timeout ?? 10_000 })
    },
    async waitForLoad(timeout?: number) {
      await send('waitForLoad', { timeout: timeout ?? 15_000 })
    },
    async wait(ms: number) {
      await new Promise((r) => setTimeout(r, ms))
    },
    async snapshot(selector?: string): Promise<string> {
      return (await send('accessibilitySnapshot', { selector })) as string
    },
    async close() {
      if (tabId == null) return
      await send('close')
      tabId = null
    },
    async attachActiveTab() {
      const r = (await send('attachActiveTab', {})) as { tabId: number }
      tabId = r.tabId
    },
    async getUrl(): Promise<string> {
      return (await send('getUrl')) as string
    },
  }
}

/** Evaluate and run tool code */
async function executeTool(
  execId: string,
  code: string,
  params: Record<string, unknown>,
  laneId: string,
): Promise<void> {
  try {
    const browser = createBrowserProxy(execId, laneId, params)
    // Strip JSDoc preamble if present
    const normalized = code.trim().replace(/^\/\*\*\s*@type\s*\{[^}]*\}\s*\*\/\n?/, '')

    // eslint-disable-next-line no-new-func
    const fn = new Function('return (' + normalized + ')')()
    if (typeof fn !== 'function') {
      throw new Error('Tool code must be a function expression (e.g., async (params, browser) => { ... })')
    }

    const data = await fn(params, browser)
    parent.postMessage({ type: 'tool-result', execId, success: true, data }, '*')
  } catch (err) {
    parent.postMessage({
      type: 'tool-result',
      execId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, '*')
  }
}
