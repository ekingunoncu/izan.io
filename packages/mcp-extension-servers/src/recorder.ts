/**
 * Action Recorder
 *
 * Captures user actions (click, type, scroll, navigate) on a target page
 * and builds a steps[] array matching the ActionStep schema.
 *
 * Runs inside a content script injected into the recording target tab.
 * Communicates recorded steps back to the main izan.io content script
 * via chrome.runtime messaging, which then dispatches events to the web app.
 *
 * Selector strategy (robust, in priority order):
 *   1. [data-testid="..."]
 *   2. #id
 *   3. [aria-label="..."]
 *   4. [name="..."] (for inputs)
 *   5. tag[type="..."][placeholder="..."] (for inputs)
 *   6. Nth-child path (fallback, most generic)
 */

import type { ActionStep } from './tool-schema.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecorderState {
  isRecording: boolean
  steps: ActionStep[]
  /** The tab being recorded */
  targetTabId: number | null
}

type StepCallback = (step: ActionStep, index: number) => void

// ─── Selector Generation ─────────────────────────────────────────────────────

/**
 * Generate a robust CSS selector for a DOM element.
 * Prioritizes stable attributes over fragile class names.
 */
export function generateSelector(el: Element): string {
  // 1. data-testid
  const testId = el.getAttribute('data-testid')
  if (testId) return `[data-testid="${testId}"]`

  // 2. ID (must be unique on the page)
  if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    return `#${CSS.escape(el.id)}`
  }

  // 3. aria-label
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) {
    const sel = `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`
    if (document.querySelectorAll(sel).length === 1) return sel
  }

  // 4. name attribute (for form elements)
  const name = el.getAttribute('name')
  if (name) {
    const sel = `${el.tagName.toLowerCase()}[name="${name}"]`
    if (document.querySelectorAll(sel).length === 1) return sel
  }

  // 5. type + placeholder (for inputs)
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const type = el.getAttribute('type') || 'text'
    const placeholder = el.getAttribute('placeholder')
    if (placeholder) {
      const sel = `${el.tagName.toLowerCase()}[type="${type}"][placeholder="${placeholder}"]`
      if (document.querySelectorAll(sel).length === 1) return sel
    }
  }

  // 6. Nth-child path (fallback)
  return buildNthChildPath(el)
}

/**
 * Build a selector using nth-child from root to element.
 * This is the most generic but also most fragile approach.
 */
function buildNthChildPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el

  while (current && current !== document.documentElement) {
    const parent = current.parentElement
    if (!parent) break

    const tag = current.tagName.toLowerCase()
    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === current!.tagName,
    )

    if (siblings.length === 1) {
      parts.unshift(tag)
    } else {
      const index = siblings.indexOf(current) + 1
      parts.unshift(`${tag}:nth-of-type(${index})`)
    }

    current = parent

    // Stop at body to keep selectors reasonable
    if (current === document.body) {
      parts.unshift('body')
      break
    }
  }

  return parts.join(' > ')
}

/**
 * Generate an XPath for an element as an alternative selector.
 */
export function generateXPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement

    if (!parent) {
      parts.unshift(`/${tag}`)
      break
    }

    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === current!.tagName,
    )

    if (siblings.length === 1) {
      parts.unshift(`/${tag}`)
    } else {
      const index = siblings.indexOf(current) + 1
      parts.unshift(`/${tag}[${index}]`)
    }

    current = parent
  }

  return parts.join('')
}

// ─── Recorder Class ──────────────────────────────────────────────────────────

export class ActionRecorder {
  private steps: ActionStep[] = []
  private recording = false
  private onStep: StepCallback | null = null

  // Bound handlers for proper removal
  private boundClick: (e: MouseEvent) => void
  private boundInput: (e: Event) => void
  private boundScroll: () => void
  private boundBeforeUnload: () => void

  // Debounce state
  private scrollTimer: ReturnType<typeof setTimeout> | null = null
  private lastScrollY = 0
  private inputDebounceTimers = new Map<Element, ReturnType<typeof setTimeout>>()

  constructor() {
    this.boundClick = this.handleClick.bind(this)
    this.boundInput = this.handleInput.bind(this)
    this.boundScroll = this.handleScroll.bind(this)
    this.boundBeforeUnload = this.handleBeforeUnload.bind(this)
  }

  /**
   * Start recording user actions.
   */
  start(onStep?: StepCallback): void {
    if (this.recording) return
    this.recording = true
    this.steps = []
    this.onStep = onStep ?? null
    this.lastScrollY = window.scrollY

    // Add a navigate step for the current page
    this.addStep({
      action: 'navigate',
      url: window.location.origin + window.location.pathname,
      urlParams: Object.fromEntries(new URLSearchParams(window.location.search)),
    })

    this.attachListeners()
  }

  /**
   * Stop recording and return the captured steps.
   */
  stop(): ActionStep[] {
    if (!this.recording) return this.steps
    this.recording = false

    this.detachListeners()

    if (this.scrollTimer) clearTimeout(this.scrollTimer)
    this.inputDebounceTimers.forEach((timer) => clearTimeout(timer))
    this.inputDebounceTimers.clear()

    return [...this.steps]
  }

  /**
   * Temporarily detach event listeners (e.g. while the element picker is active).
   * Steps and recording state are preserved.
   */
  pause(): void {
    if (!this.recording) return
    this.detachListeners()
  }

  /**
   * Re-attach event listeners after a pause.
   */
  resume(): void {
    if (!this.recording) return
    this.attachListeners()
  }

  private attachListeners(): void {
    document.addEventListener('click', this.boundClick, { capture: true })
    document.addEventListener('input', this.boundInput, { capture: true })
    document.addEventListener('change', this.boundInput, { capture: true })
    window.addEventListener('scroll', this.boundScroll, { passive: true })
    window.addEventListener('beforeunload', this.boundBeforeUnload)
  }

  private detachListeners(): void {
    document.removeEventListener('click', this.boundClick, { capture: true })
    document.removeEventListener('input', this.boundInput, { capture: true })
    document.removeEventListener('change', this.boundInput, { capture: true })
    window.removeEventListener('scroll', this.boundScroll)
    window.removeEventListener('beforeunload', this.boundBeforeUnload)
  }

  /**
   * Get current recorded steps (while still recording).
   */
  getSteps(): ActionStep[] {
    return [...this.steps]
  }

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return this.recording
  }

  // ─── Event Handlers ─────────────────────────────────────────────

  private handleClick(e: MouseEvent): void {
    const target = e.target as Element
    if (!target || !this.recording) return

    // Ignore clicks on the recorder UI itself
    if (target.closest('[data-izan-recorder]')) return

    // For select elements, we'll handle via 'change' event instead
    if (target.tagName === 'SELECT') return

    const selector = generateSelector(target)
    this.addStep({
      action: 'click',
      selector,
      label: this.describeElement(target),
    })
  }

  private handleInput(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    if (!target || !this.recording) return
    if (target.closest('[data-izan-recorder]')) return

    const selector = generateSelector(target)

    if (target.tagName === 'SELECT') {
      this.addStep({
        action: 'select',
        selector,
        value: (target as HTMLSelectElement).value,
        label: `Select: ${(target as HTMLSelectElement).value}`,
      })
      return
    }

    // Debounce text input to capture final value
    const existing = this.inputDebounceTimers.get(target)
    if (existing) clearTimeout(existing)

    this.inputDebounceTimers.set(
      target,
      setTimeout(() => {
        this.inputDebounceTimers.delete(target)
        if (!this.recording) return

        // Remove previous type step for same element if it's the last step
        const lastStep = this.steps[this.steps.length - 1]
        if (
          lastStep?.action === 'type' &&
          lastStep.selector === selector
        ) {
          this.steps.pop()
        }

        this.addStep({
          action: 'type',
          selector,
          text: (target as HTMLInputElement).value,
          clear: true,
          label: `Type into ${this.describeElement(target)}`,
        })
      }, 500),
    )
  }

  private handleScroll(): void {
    if (!this.recording) return

    // Debounce scroll events
    if (this.scrollTimer) clearTimeout(this.scrollTimer)
    this.scrollTimer = setTimeout(() => {
      const deltaY = window.scrollY - this.lastScrollY
      if (Math.abs(deltaY) < 50) return // Ignore tiny scrolls

      this.addStep({
        action: 'scroll',
        direction: deltaY > 0 ? 'down' : 'up',
        amount: Math.abs(Math.round(deltaY)),
        label: `Scroll ${deltaY > 0 ? 'down' : 'up'} ${Math.abs(Math.round(deltaY))}px`,
      })

      this.lastScrollY = window.scrollY
    }, 300)
  }

  private handleBeforeUnload(): void {
    // Navigation is happening — the new page will need a new recorder start
    // We don't record this as a step since the new URL will be captured on start
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private addStep(step: ActionStep): void {
    this.steps.push(step)
    this.onStep?.(step, this.steps.length - 1)
  }

  /**
   * Generate a human-readable label for an element.
   */
  private describeElement(el: Element): string {
    const tag = el.tagName.toLowerCase()
    const text = (el.textContent || '').trim().slice(0, 30)
    const ariaLabel = el.getAttribute('aria-label')
    const placeholder = el.getAttribute('placeholder')
    const name = el.getAttribute('name')

    if (ariaLabel) return `${tag} "${ariaLabel}"`
    if (placeholder) return `${tag} "${placeholder}"`
    if (name) return `${tag} [name=${name}]`
    if (text) return `${tag} "${text}"`
    return tag
  }
}
