/**
 * BrowserWindow - Controls a browser window for automation.
 *
 * Supports multiple instances via `laneId` for parallel lane execution.
 * First open() creates a real browser window (not popup). Subsequent open() calls
 * add new tabs to that window. Window supports normal browsing (new tabs, etc).
 * Runs in the ISOLATED world content script.
 * Sends commands to the background service worker via chrome.runtime.sendMessage.
 * All DOM interactions go through CDP (Runtime.evaluate) for CSP bypass.
 */

/** Cache of BrowserWindow instances by laneId */
const instanceCache = new Map<string, BrowserWindow>()

export class BrowserWindow {
  private tabId: number | null = null
  readonly laneId: string

  constructor(laneId = 'main') {
    this.laneId = laneId
  }

  /**
   * Get or create a BrowserWindow for a specific lane.
   * The default lane is 'main' (backward compatible with old singleton usage).
   */
  static forLane(laneId = 'main'): BrowserWindow {
    let instance = instanceCache.get(laneId)
    if (!instance) {
      instance = new BrowserWindow(laneId)
      instanceCache.set(laneId, instance)
    }
    return instance
  }

  /** Backward-compatible singleton accessor (uses 'main' lane). */
  static getInstance(): BrowserWindow {
    return BrowserWindow.forLane('main')
  }

  /** Remove a lane from the cache (call after closing). */
  static removeLane(laneId: string): void {
    instanceCache.delete(laneId)
  }

  // ─── Transport ──────────────────────────────────────────────────

  private send(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false
      const done = (fn: () => void) => { if (!settled) { settled = true; fn() } }
      console.log(`[izan-ext] BrowserWindow.send: action="${action}" tabId=${this.tabId} laneId=${this.laneId}`)
      chrome.runtime.sendMessage(
        { type: 'bw-command', action, payload: { ...payload, tabId: this.tabId, laneId: this.laneId } },
        (res: { success?: boolean; data?: unknown; error?: string }) => {
          done(() => {
            if (chrome.runtime.lastError) {
              console.error(`[izan-ext] BrowserWindow.send: action="${action}" chrome.runtime error: ${chrome.runtime.lastError.message}`)
              return reject(new Error(chrome.runtime.lastError.message))
            }
            if (res?.success === false) {
              console.error(`[izan-ext] BrowserWindow.send: action="${action}" failed: ${res.error}`)
              return reject(new Error(res.error ?? 'BrowserWindow error'))
            }
            const preview = res?.data == null ? 'null' : Array.isArray(res.data) ? `array(${res.data.length})` : typeof res.data === 'object' ? `object(${Object.keys(res.data as Record<string, unknown>).length})` : String(res.data).slice(0, 80)
            console.log(`[izan-ext] BrowserWindow.send: action="${action}" OK → ${preview}`)
            resolve(res?.data)
          })
        },
      )
      setTimeout(() => done(() => {
        console.error(`[izan-ext] BrowserWindow.send: action="${action}" TIMEOUT (30s)`)
        reject(new Error(`BrowserWindow.${action} timed out (30s)`))
      }), 30_000)
    })
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  async open(url: string, opts: { background?: boolean; viewport?: { width: number; height: number } } = {}): Promise<number> {
    const r = await this.send('open', { url, background: opts.background ?? true, viewport: opts.viewport }) as { tabId: number }
    this.tabId = r.tabId
    return this.tabId
  }

  /** Attach CDP to the currently active tab without creating a new window/tab. */
  async attachActiveTab(): Promise<number> {
    const r = await this.send('attachActiveTab', {}) as { tabId: number }
    this.tabId = r.tabId
    return this.tabId
  }

  async close(): Promise<void> {
    if (!this.tabId) return
    await this.send('close')
    this.tabId = null
  }

  async navigate(url: string): Promise<void> { await this.send('navigate', { url }) }
  async getUrl(): Promise<string> { return (await this.send('getUrl')) as string }
  isOpen(): boolean { return this.tabId !== null }
  getTabId(): number | null { return this.tabId }

  // ─── DOM ────────────────────────────────────────────────────────

  async click(selector: string): Promise<void> { await this.send('click', { selector }) }
  async type(sel: string, text: string, opts: { clear?: boolean } = {}): Promise<void> {
    await this.send('type', { selector: sel, text, clear: opts.clear ?? true })
  }
  async getText(sel: string): Promise<string> { return (await this.send('getText', { selector: sel })) as string }
  async getAttribute(sel: string, attr: string): Promise<string | null> { return (await this.send('getAttribute', { selector: sel, attribute: attr })) as string | null }
  async getValue(sel: string): Promise<string> { return (await this.send('getValue', { selector: sel })) as string }
  async exists(sel: string): Promise<boolean> { return (await this.send('exists', { selector: sel })) as boolean }
  async getHtml(sel: string): Promise<string> { return (await this.send('getHtml', { selector: sel })) as string }
  async select(sel: string, value: string): Promise<void> { await this.send('select', { selector: sel, value }) }
  async scroll(opts: { selector?: string; direction?: string; amount?: number } = {}): Promise<void> {
    await this.send('scroll', { selector: opts.selector, direction: opts.direction ?? 'down', amount: opts.amount ?? 500 })
  }

  // ─── Extraction ─────────────────────────────────────────────────

  async extractList(containerSelector: string, fields: Array<Record<string, unknown>>): Promise<Record<string, unknown>[]> {
    return (await this.send('extractList', { containerSelector, fields })) as Record<string, unknown>[]
  }
  async extractSingle(containerSelector: string, fields: Array<Record<string, unknown>>, opts?: { continueOnError?: boolean }): Promise<Record<string, unknown>> {
    return (await this.send('extractSingle', { containerSelector, fields, continueOnError: opts?.continueOnError })) as Record<string, unknown>
  }
  async extractByRole(roles: string[], name: string, includeChildren: boolean, fields: Array<Record<string, unknown>>): Promise<Record<string, unknown>[]> {
    return (await this.send('extractByRole', { roles, name, includeChildren, fields })) as Record<string, unknown>[]
  }
  async accessibilitySnapshot(selector?: string): Promise<string> {
    return (await this.send('accessibilitySnapshot', { selector })) as string
  }

  // ─── Waiting ────────────────────────────────────────────────────

  async wait(ms: number): Promise<void> { await new Promise((r) => setTimeout(r, ms)) }
  async waitForSelector(sel: string, timeout = 10_000): Promise<void> { await this.send('waitForSelector', { selector: sel, timeout }) }
  async waitForUrl(pattern: string, timeout = 10_000): Promise<void> { await this.send('waitForUrl', { pattern, timeout }) }
  async waitForLoad(timeout = 15_000): Promise<void> { await this.send('waitForLoad', { timeout }) }
  async waitForDOMContentLoaded(timeout = 15_000): Promise<void> { await this.send('waitForDOMContentLoaded', { timeout }) }
  async waitForNetworkIdle(timeout = 30_000, idleTime = 500): Promise<void> { await this.send('waitForNetworkIdle', { timeout, idleTime }) }

  // ─── Evaluate ───────────────────────────────────────────────────

  /** Run arbitrary JS in the popup via CDP Runtime.evaluate. Bypasses CSP. */
  async evaluate<T = unknown>(expression: string): Promise<T> {
    return (await this.send('evaluate', { expression })) as T
  }
}
