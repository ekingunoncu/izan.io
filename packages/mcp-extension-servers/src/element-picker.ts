/**
 * Element Picker
 *
 * Interactive overlay for selecting DOM elements for data extraction.
 *
 * **List mode** (automatic):
 *   1. Scans for repeating groups (≥ 3 siblings with same tag + shared class).
 *   2. Injects CSS outline + a "Select · 1/24" badge INTO each item.
 *   3. User clicks a badge → auto-detects ALL extractable fields from the
 *      first item → immediately finalizes the extract step. No manual field
 *      picking required.
 *
 * **Single mode** (manual):
 *   Hover highlight → click container → manually pick fields → finalize.
 */

import { generateSelector } from './recorder.js'
import type { ActionStep, ExtractionField } from './tool-schema.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PickerMode = 'container' | 'field'

export interface PickerResult {
  step: Extract<ActionStep, { action: 'extract' }>
  preview: Record<string, unknown>[] | Record<string, unknown>
  previewHtml: string[]
}

type PickerCallback = (result: PickerResult) => void

interface ListCandidate {
  parent: Element
  selector: string
  items: Element[]
}

// ─── CSS class names injected into the page ──────────────────────────────────

const CLS_CANDIDATE = 'izan-pick-candidate'
const CLS_BADGE = 'izan-pick-badge'
const CLS_SELECTED = 'izan-pick-selected'
const STYLE_ID = 'izan-picker-styles'

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .${CLS_CANDIDATE} {
      outline: 2px dashed hsla(220, 90%, 56%, 0.45) !important;
      outline-offset: -2px !important;
      position: relative !important;
    }
    .${CLS_BADGE} {
      position: absolute !important;
      top: 4px !important;
      right: 4px !important;
      z-index: 2147483647 !important;
      background: hsl(220 90% 56%) !important;
      color: #fff !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      font-family: system-ui, sans-serif !important;
      padding: 2px 8px !important;
      border-radius: 5px !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
      line-height: 1.4 !important;
      white-space: nowrap !important;
      transition: background 0.15s, transform 0.1s !important;
    }
    .${CLS_BADGE}:hover {
      background: hsl(220 90% 48%) !important;
      transform: scale(1.06) !important;
    }
    .${CLS_SELECTED} {
      outline: 2px dashed hsla(160, 70%, 50%, 0.5) !important;
      outline-offset: -2px !important;
    }
  `
  document.head.appendChild(style)
}

function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove()
}

// ─── Element Picker Class ────────────────────────────────────────────────────

export class ElementPicker {
  private active = false
  private mode: PickerMode = 'container'
  private extractionMode: 'single' | 'list' = 'list'
  private onComplete: PickerCallback | null = null
  private onCancelCb: (() => void) | null = null

  private containerSelector = ''
  private containerElement: Element | null = null
  private fields: ExtractionField[] = []

  private listCandidates: ListCandidate[] = []

  private highlightBox: HTMLDivElement | null = null
  private infoPanelHost: HTMLDivElement | null = null
  private infoPanel: HTMLDivElement | null = null

  private boundMouseMove: (e: MouseEvent) => void
  private boundClick: (e: MouseEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void

  constructor() {
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundClick = this.handleClick.bind(this)
    this.boundKeyDown = this.handleKeyDown.bind(this)
  }

  start(onComplete: PickerCallback, mode: 'single' | 'list' = 'list', onCancel?: () => void): void {
    if (this.active) this.cancel()
    this.active = true
    this.mode = 'container'
    this.extractionMode = mode
    this.onComplete = onComplete
    this.onCancelCb = onCancel ?? null
    this.containerSelector = ''
    this.containerElement = null
    this.fields = []
    this.listCandidates = []

    injectStyles()
    this.createInfoPanel()
    if (mode === 'list') this.detectListCandidates()
    if (mode === 'single') this.createHighlightBox()
    this.attachListeners()
    this.updateInfoPanel()
  }

  cancel(): void {
    const cb = this.onCancelCb
    this.active = false
    this.detachListeners()
    this.cleanup()
    this.onComplete = null
    this.onCancelCb = null
    cb?.()
  }

  isActive(): boolean { return this.active }

  // ══════════════════════════════════════════════════════════════════
  // List candidate detection - injects CSS outlines + badges into DOM
  // ══════════════════════════════════════════════════════════════════

  private detectListCandidates(): void {
    const minItems = 3
    const seen = new Set<Element>()
    const MAX_PARENTS = 200
    const MAX_GROUPS = 15
    let checked = 0

    for (const parent of document.querySelectorAll('body *')) {
      if (checked >= MAX_PARENTS || this.listCandidates.length >= MAX_GROUPS) break
      if (parent.children.length < minItems || seen.has(parent)) continue
      checked++

      const tagGroups = new Map<string, Element[]>()
      for (const child of parent.children) {
        const g = tagGroups.get(child.tagName)
        if (g) g.push(child); else tagGroups.set(child.tagName, [child])
      }

      for (const [, items] of tagGroups) {
        if (items.length < minItems) continue
        const sharedClass = this.findSharedClass(items)
        if (!sharedClass && items.length < 5) continue

        // Scope selector to the parent element to avoid overly broad matches
        const parentSel = generateSelector(parent)
        const childTag = items[0].tagName.toLowerCase()
        const selector = sharedClass
          ? `${parentSel} > ${childTag}.${CSS.escape(sharedClass)}`
          : `${parentSel} > ${childTag}`
        if (this.listCandidates.some(c => c.selector === selector)) continue

        // Only keep items that are visible (batch read rects)
        const visible = items.filter(el => {
          const h = el as HTMLElement
          return h.offsetWidth > 30 && h.offsetHeight > 20
        })
        if (visible.length < minItems) continue

        seen.add(parent)

        this.injectCandidateBadges(visible, items.length, selector)
        this.listCandidates.push({ parent, selector, items: visible })
      }
    }

    // ── Table auto-detection (crawl4ai-inspired scoring) ──
    const tables = document.querySelectorAll('table')
    for (let ti = 0; ti < tables.length; ti++) {
      if (this.listCandidates.length >= MAX_GROUPS) break
      const table = tables[ti]
      let score = 0
      if (table.querySelector('thead')) score += 2
      if (table.querySelector('tbody')) score += 2
      const ths = table.querySelectorAll('th')
      if (ths.length > 0) score += 2
      const rows = table.querySelectorAll('tr')
      if (rows.length >= 3) score += 1
      if (rows.length >= 10) score += 1
      // Nested table penalty
      if (table.querySelector('table')) score -= 3
      // Caption bonus
      if (table.querySelector('caption')) score += 1

      if (score < 5) continue

      const sel = generateSelector(table)
      const hasTbody = !!table.querySelector('tbody')
      const rowSelector = hasTbody
        ? `${sel} > tbody > tr`
        : `${sel} > tr`
      if (this.listCandidates.some(c => c.selector === rowSelector)) continue

      const allRows = table.querySelectorAll(hasTbody ? 'tbody > tr' : 'tr')
      const dataRows: Element[] = []
      for (let ri = 0; ri < allRows.length; ri++) {
        const r = allRows[ri] as HTMLElement
        if (r.offsetWidth > 30 && r.offsetHeight > 10) dataRows.push(r)
      }
      if (dataRows.length < minItems) continue

      this.injectCandidateBadges(dataRows, dataRows.length, rowSelector)
      this.listCandidates.push({ parent: table, selector: rowSelector, items: dataRows })
    }
  }

  /** Inject outline + badge on each visible item for a candidate group */
  private injectCandidateBadges(visible: Element[], totalCount: number, selector: string): void {
    visible.forEach((item, idx) => {
      item.classList.add(CLS_CANDIDATE)

      // Ensure element has relative/absolute/fixed positioning for badge
      const computed = globalThis.getComputedStyle(item)
      if (computed.position === 'static') {
        (item as HTMLElement).style.position = 'relative'
        item.setAttribute('data-izan-was-static', 'true')
      }

      const badge = document.createElement('div')
      badge.className = CLS_BADGE
      badge.setAttribute('data-izan-recorder', 'true')
      badge.textContent = `Select · ${idx + 1}/${totalCount}`
      badge.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.selectCandidateGroup(selector, item)
      })
      item.appendChild(badge)
    })
  }

  private findSharedClass(items: Element[]): string | null {
    if (items.length === 0) return null
    for (const cls of items[0].classList) {
      if (this.isDynamicClass(cls)) continue
      if (items.every(el => el.classList.contains(cls))) return cls
    }
    return null
  }

  /** Returns true for classes that are likely dynamic/generated and should be skipped */
  private isDynamicClass(cls: string): boolean {
    if (cls.length < 3) return true
    // Short prefix patterns (e.g. "a-", "b-")
    if (/^[a-z]{1,2}-/.test(cls)) return true
    // CSS-modules hash-like: short prefix + CamelCase suffix (e.g. "abcDeFgHij")
    if (/^[a-zA-Z]{1,3}[A-Z][a-zA-Z]{4,}$/.test(cls)) return true
    // Tailwind-like utility classes
    if (/^(bg|text|flex|grid|p|m|w|h)-/.test(cls)) return true
    return false
  }

  /** Remove all injected outlines and badges from the DOM */
  private cleanupCandidates(): void {
    document.querySelectorAll(`.${CLS_CANDIDATE}`).forEach(el => {
      el.classList.remove(CLS_CANDIDATE)
      if (el.getAttribute('data-izan-was-static') === 'true') {
        (el as HTMLElement).style.position = ''
        el.removeAttribute('data-izan-was-static')
      }
    })
    document.querySelectorAll(`.${CLS_BADGE}`).forEach(el => el.remove())
    document.querySelectorAll(`.${CLS_SELECTED}`).forEach(el => el.classList.remove(CLS_SELECTED))
  }

  private selectCandidateGroup(selector: string, clickedItem?: Element): void {
    const candidate = this.listCandidates.find(c => c.selector === selector)
    if (!candidate) return

    this.containerSelector = selector
    this.containerElement = clickedItem || candidate.items[0]

    // Use the clicked item for field detection so selectors match the preview items.
    // Items[0] may have a different DOM structure (e.g. promoted vs regular listings).
    const fieldSource = this.containerElement
    if (fieldSource.tagName === 'TR') {
      // For table rows, prefer a data row (with TDs) over header rows
      const dataRow = fieldSource.querySelector('td') ? fieldSource
        : (candidate.items.find(r => r.querySelector('td')) || fieldSource)
      this.fields = this.autoDetectTableFields(dataRow)
    } else {
      this.fields = this.autoDetectFields(fieldSource)
    }

    if (this.fields.length === 0) {
      // Fallback: extract full text of each item
      this.fields = [{ key: 'text', selector: '*', type: 'text' }]
    }
    this.finalize()
  }

  /**
   * Auto-detect fields from a table row by reading <th> headers for key names
   * and generating td:nth-child(n) selectors.
   * Detects links, images, and other rich content within cells.
   */
  private autoDetectTableFields(row: Element): ExtractionField[] {
    const fields: ExtractionField[] = []
    const usedKeys = new Set<string>()

    const uniqueKey = (base: string): string => {
      let key = base; let i = 2
      while (usedKeys.has(key)) { key = `${base}_${i}`; i++ }
      usedKeys.add(key)
      return key
    }

    // Try to find header row from the same table
    const table = row.closest('table')
    const headers: string[] = []
    if (table) {
      const ths = table.querySelectorAll('thead th, tr:first-child th')
      ths.forEach(th => headers.push((th.textContent || '').trim()))
    }

    // Use direct children to get correct nth-child index; support both TD and TH
    const children = Array.from(row.children)
    children.forEach((cell, childIdx) => {
      if (cell.tagName !== 'TD' && cell.tagName !== 'TH') return
      // Skip hidden cells (e.g. responsive small-screen duplicates)
      const h = cell as HTMLElement
      if (!h.offsetWidth && !h.offsetHeight) return

      const headerText = headers[childIdx]
      const baseKey = headerText ? this.slugify(headerText) : `col_${childIdx + 1}`
      const tag = cell.tagName.toLowerCase()
      const nthSel = `${tag}:nth-child(${childIdx + 1})`

      // Always extract text content of the cell first
      fields.push({ key: uniqueKey(baseKey), selector: nthSel, type: 'text' })

      // Additionally extract link URL if present
      const link = cell.querySelector('a[href]')
      if (link && (link.textContent || '').trim()) {
        fields.push({ key: uniqueKey(baseKey + '_url'), selector: `${nthSel} a`, type: 'attribute', attribute: 'href' })
      }

      // Additionally extract image src if present
      const img = cell.querySelector('img[src]')
      if (img) {
        fields.push({ key: uniqueKey(baseKey + '_img'), selector: `${nthSel} img`, type: 'attribute', attribute: 'src' })
      }
    })

    return fields
  }

  /**
   * Auto-detect extractable fields from a representative list item.
   * Walks the DOM tree and picks up text, links, and images.
   */
  private autoDetectFields(item: Element): ExtractionField[] {
    const fields: ExtractionField[] = []
    const usedKeys = new Set<string>()

    const uniqueKey = (base: string): string => {
      let key = base
      let i = 2
      while (usedKeys.has(key)) { key = `${base}_${i}`; i++ }
      usedKeys.add(key)
      return key
    }

    // Collect all leaf-ish elements with content
    const candidates: { el: Element; depth: number }[] = []
    const seen = new Set<Element>()
    const MAX_DEPTH = 15
    const MAX_CANDIDATES = 20

    const walk = (el: Element, depth: number) => {
      if (depth > MAX_DEPTH || candidates.length >= MAX_CANDIDATES || seen.has(el)) return
      seen.add(el)

      // Skip injected picker elements (badges, overlays)
      if (el.hasAttribute('data-izan-recorder')) return

      // Skip hidden elements (offsetWidth/Height avoids creating DOMRect objects)
      const h = el as HTMLElement
      if (!h.offsetWidth && !h.offsetHeight) return

      const tag = el.tagName
      // Links and images are always interesting
      if (tag === 'A' && el.getAttribute('href')) {
        candidates.push({ el, depth })
        // Don't recurse into links - we capture href + text from the <a> itself
        return
      }
      if (tag === 'IMG' && el.getAttribute('src')) {
        candidates.push({ el, depth })
        return
      }
      // Time elements
      if (tag === 'TIME') {
        candidates.push({ el, depth })
        return
      }
      // Input-like elements
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        candidates.push({ el, depth })
        return
      }

      // Leaf check: element has meaningful text and no child elements with their own text
      const hasChildren = el.children.length > 0
      const text = (el.textContent || '').trim()
      if (!hasChildren && text.length > 0) {
        candidates.push({ el, depth })
        return
      }

      // Check if children collectively have text - if so, recurse
      if (hasChildren) {
        // If this is a small leaf-ish node with little nesting, capture it directly
        const childEls = Array.from(el.children)
        const hasDeepChildren = childEls.some(c => c.children.length > 0)
        if (!hasDeepChildren && text.length > 0 && text.length < 200 && childEls.length <= 3) {
          candidates.push({ el, depth })
          return
        }
        // Recurse into all children
        childEls.forEach(c => walk(c, depth + 1))
      }
    }

    Array.from(item.children).forEach(c => walk(c, 0))

    // If no candidates found from children, try direct text
    if (candidates.length === 0 && (item.textContent || '').trim()) {
      return [{ key: 'text', selector: '*', type: 'text' }]
    }

    for (const { el } of candidates) {
      // Use structural-only selectors so they work across sibling items
      const selector = this.generateRelativeSelector(el, item, true)
      const type = this.inferExtractionType(el)
      const baseKey = this.generateFieldKey(el, fields.length)
      const key = uniqueKey(baseKey)

      const field: ExtractionField = { key, selector, type }
      if (type === 'attribute') {
        field.attribute = el.tagName === 'A' ? 'href' : 'src'
      }
      // For links, also capture text
      if (el.tagName === 'A' && (el.textContent || '').trim()) {
        fields.push({ key: uniqueKey(baseKey + '_text'), selector, type: 'text' })
      }
      fields.push(field)
    }

    return fields
  }

  // ══════════════════════════════════════════════════════════════════
  // Overlay (hover highlight for field picking + single mode)
  // ══════════════════════════════════════════════════════════════════

  private createHighlightBox(): void {
    if (this.highlightBox) return
    this.highlightBox = document.createElement('div')
    this.highlightBox.setAttribute('data-izan-recorder', 'true')
    Object.assign(this.highlightBox.style, {
      position: 'fixed', border: '2px solid hsl(160 70% 50%)',
      backgroundColor: 'hsla(160,70%,50%,0.08)', pointerEvents: 'none',
      zIndex: '2147483646', transition: 'all 0.1s ease', display: 'none', borderRadius: '3px',
    })
    document.body.appendChild(this.highlightBox)
  }

  private createInfoPanel(): void {
    // Use Shadow DOM to isolate from page CSS
    this.infoPanelHost = document.createElement('div')
    this.infoPanelHost.setAttribute('data-izan-recorder', 'true')
    Object.assign(this.infoPanelHost.style, {
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647', pointerEvents: 'auto',
    })
    const shadow = this.infoPanelHost.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; line-height: 1.4; color: #1a1a1a; }
      .panel { background: #fff; padding: 7px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06); max-width: 520px; }
      .msg { flex: 1; }
      .msg b { font-weight: 600; }
      .done { background: hsl(220 90% 56%); color: #fff; border: none; padding: 3px 10px; border-radius: 5px;
        cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; line-height: 1.4; font-family: inherit; }
      .done:hover { background: hsl(220 90% 48%); }
      .esc { opacity: 0.35; font-size: 11px; white-space: nowrap; }
    </style><div class="panel"></div>`
    this.infoPanel = shadow.querySelector('.panel')!
    document.body.appendChild(this.infoPanelHost)
  }

  private cleanup(): void {
    this.cleanupCandidates()
    this.highlightBox?.remove(); this.highlightBox = null
    this.infoPanelHost?.remove(); this.infoPanelHost = null; this.infoPanel = null
    removeStyles()
    this.listCandidates = []
  }

  private updateHighlight(el: Element): void {
    if (!this.highlightBox) return
    const r = el.getBoundingClientRect()
    Object.assign(this.highlightBox.style, {
      display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    })
  }

  private updateInfoPanel(): void {
    if (!this.infoPanel) return
    if (this.mode === 'container') {
      const n = this.listCandidates.length
      const msg = this.extractionMode === 'list'
        ? n > 0 ? `${n} list${n !== 1 ? 's' : ''} detected - click <b>Select</b> on an item` : `Click on a repeating element`
        : `Click on the element to extract`
      this.infoPanel.innerHTML = `<span class="msg">${msg}</span><span class="esc">ESC cancel</span>`
    } else {
      this.infoPanel.innerHTML = `
        <span class="msg">${this.fields.length} field${this.fields.length !== 1 ? 's' : ''} selected</span>
        <button class="done">Done</button>
        <span class="esc">ESC</span>`
      this.infoPanel.querySelector('button')?.addEventListener('click', () => this.finalize())
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Events
  // ══════════════════════════════════════════════════════════════════

  private attachListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove, { capture: true })
    document.addEventListener('click', this.boundClick, { capture: true })
    document.addEventListener('keydown', this.boundKeyDown, { capture: true })
  }
  private detachListeners(): void {
    document.removeEventListener('mousemove', this.boundMouseMove, { capture: true })
    document.removeEventListener('click', this.boundClick, { capture: true })
    document.removeEventListener('keydown', this.boundKeyDown, { capture: true })
  }

  private handleMouseMove(e: MouseEvent): void {
    // Hover highlight only in single mode's field picking phase
    if (!this.active || this.extractionMode === 'list' || this.mode === 'container') return
    const target = e.target as Element
    if (!target || target.closest('[data-izan-recorder]')) return
    this.updateHighlight(target)
  }

  private handleClick(e: MouseEvent): void {
    if (!this.active) return
    const target = e.target as Element
    if (!target || target.closest('[data-izan-recorder]')) return
    e.preventDefault(); e.stopPropagation()

    if (this.mode === 'container') this.selectContainer(target)
    else this.selectField(target)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.active) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.cancel() }
  }

  // ══════════════════════════════════════════════════════════════════
  // Container selection (click fallback when user doesn't use badge)
  // ══════════════════════════════════════════════════════════════════

  private selectContainer(el: Element): void {
    if (this.extractionMode === 'list') {
      // Check if click landed inside a detected candidate group
      const matched = this.listCandidates.find(c => c.items.some(item => item.contains(el)))
      if (matched) { this.selectCandidateGroup(matched.selector); return }

      // Fallback: try to find a repeating container from the clicked element
      const container = this.findRepeatingContainer(el)
      if (container) {
        this.containerSelector = generateSelector(container)
        this.containerElement = container
      } else {
        this.containerSelector = generateSelector(el)
        this.containerElement = el
      }

      // Auto-detect fields and finalize immediately (same as badge click)
      if (this.containerElement.tagName === 'TR') {
        this.fields = this.autoDetectTableFields(this.containerElement)
      } else {
        this.fields = this.autoDetectFields(this.containerElement)
      }
      if (this.fields.length === 0) {
        this.fields = [{ key: 'text', selector: '*', type: 'text' }]
      }
      this.finalize()
      return
    }

    // Single mode: auto-detect fields then enter field picking for optional refinement
    this.containerSelector = generateSelector(el)
    this.containerElement = el

    // Auto-detect fields so "Done" works immediately
    if (el.tagName === 'TR') {
      this.fields = this.autoDetectTableFields(el)
    } else {
      this.fields = this.autoDetectFields(el)
    }
    if (this.fields.length === 0) {
      this.fields = [{ key: 'text', selector: '*', type: 'text' }]
    }

    this.createHighlightBox()
    this.mode = 'field'
    this.updateInfoPanel()
  }

  private findRepeatingContainer(el: Element): Element | null {
    let cur: Element | null = el
    for (let d = 0; cur && d < 6; d++) {
      const p = cur.parentElement; if (!p) break
      if (Array.from(p.children).filter(c => c.tagName === cur!.tagName).length >= 2) return cur
      cur = p
    }
    return null
  }

  private getSiblings(el: Element): Element[] {
    return el.parentElement ? Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName) : [el]
  }

  // ══════════════════════════════════════════════════════════════════
  // Field selection
  // ══════════════════════════════════════════════════════════════════

  private selectField(el: Element): void {
    if (!this.containerElement) return
    const fieldSelector = this.containerElement.contains(el)
      ? this.generateRelativeSelector(el, this.containerElement)
      : generateSelector(el)
    const extractType = this.inferExtractionType(el)
    const key = this.generateFieldKey(el, this.fields.length)
    const field: ExtractionField = { key, selector: fieldSelector, type: extractType }
    if (extractType === 'attribute') field.attribute = el.tagName === 'A' ? 'href' : 'src'
    this.fields.push(field)
    this.updateInfoPanel()
    this.flashElement(el)
  }

  /**
   * Build a CSS selector for `el` relative to `container`.
   * When `structuralOnly` is true (used for list extraction), avoids
   * class-based shortcuts so the selector works across sibling items
   * that share DOM structure but have different dynamic class names.
   */
  private generateRelativeSelector(el: Element, container: Element, structuralOnly = false): string {
    const parts: string[] = []; let cur: Element | null = el
    while (cur && cur !== container) {
      const p = cur.parentElement; if (!p) break
      const tag = cur.tagName.toLowerCase()
      if (!structuralOnly) {
        const cls = this.getUniqueClassName(cur, p)
        if (cls) { parts.unshift(`.${CSS.escape(cls)}`); break }
      }
      const sibs = Array.from(p.children).filter(c => c.tagName === cur!.tagName)
      parts.unshift(sibs.length === 1 ? tag : `${tag}:nth-of-type(${sibs.indexOf(cur) + 1})`)
      cur = p
    }
    return parts.join(' > ') || '*'
  }

  private getUniqueClassName(el: Element, p: Element): string | null {
    for (const cls of el.classList) {
      if (this.isDynamicClass(cls) || cls.startsWith('izan-')) continue
      if (p.querySelectorAll(`.${CSS.escape(cls)}`).length === 1) return cls
    }
    return null
  }

  private inferExtractionType(el: Element): 'text' | 'html' | 'attribute' | 'value' {
    const t = el.tagName
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return 'value'
    if (t === 'A' || t === 'IMG') return 'attribute'
    return 'text'
  }

  private generateFieldKey(el: Element, idx: number): string {
    const tag = el.tagName

    // Semantic keys from element type
    if (tag === 'TIME') return 'date'
    if (tag === 'A') return 'link'
    if (tag === 'IMG') return 'image'

    // data-* attributes often have meaningful names
    for (const attr of el.getAttributeNames()) {
      if (attr.startsWith('data-') && attr !== 'data-izan-recorder' && attr !== 'data-izan-was-static') {
        const key = attr.slice(5) // strip "data-"
        if (key.length >= 3 && key.length <= 20) return this.slugify(key)
      }
    }

    for (const a of ['aria-label', 'name']) { const v = el.getAttribute(a); if (v) return this.slugify(v) }
    const cn = el.className?.toString()
    if (cn) { const m = cn.split(/\s+/).find(c => c.length > 3 && !this.isDynamicClass(c) && !c.startsWith('izan-')); if (m) return this.slugify(m) }
    const txt = (el.textContent || '').trim().slice(0, 20)
    if (txt) return this.slugify(txt)
    return `field_${idx}`
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'field'
  }

  private flashElement(el: Element): void {
    const prev = (el as HTMLElement).style.outline
    ;(el as HTMLElement).style.outline = '2px solid hsl(160 70% 50%)'
    setTimeout(() => { (el as HTMLElement).style.outline = prev }, 600)
  }

  // ══════════════════════════════════════════════════════════════════
  // Finalize
  // ══════════════════════════════════════════════════════════════════

  private finalize(): void {
    if (this.fields.length === 0) { this.cancel(); return }
    const itemCount = this.extractionMode === 'list' && this.containerElement
      ? this.getSiblings(this.containerElement).length
      : undefined
    const step: Extract<ActionStep, { action: 'extract' }> = {
      action: 'extract',
      name: this.slugify(this.containerSelector.slice(0, 30)) || 'data',
      mode: this.extractionMode,
      containerSelector: this.containerSelector,
      fields: this.fields,
      itemCount,
      label: this.extractionMode === 'list'
        ? `${itemCount ?? '?'} items · ${this.fields.length} fields (list)`
        : `${this.fields.length} fields (single)`,
    }
    const preview = this.generatePreview()
    const previewHtml = this.capturePreviewHtml()
    const cb = this.onComplete
    // Clear onCancelCb before cancel() so it doesn't fire - this is a successful completion
    this.onCancelCb = null
    this.cancel()
    cb?.({ step, preview, previewHtml })
  }

  /** Capture outerHTML of preview items for live re-extraction in sidebar */
  private capturePreviewHtml(): string[] {
    if (!this.containerElement) return []
    const cleanHtml = (el: Element): string => {
      const clone = el.cloneNode(true) as Element
      // Remove injected badges and overlays
      clone.querySelectorAll('[data-izan-recorder]').forEach(n => n.remove())
      // Remove injected classes/attributes
      clone.classList.remove(CLS_CANDIDATE, CLS_SELECTED)
      clone.removeAttribute('data-izan-was-static')
      return clone.outerHTML
    }
    if (this.extractionMode === 'list') {
      const siblings = this.getSiblings(this.containerElement)
      const clickedIdx = siblings.indexOf(this.containerElement)
      const start = Math.max(0, Math.min(clickedIdx - 1, siblings.length - 3))
      return siblings.slice(start, start + 3).map(cleanHtml)
    }
    return [cleanHtml(this.containerElement)]
  }

  private generatePreview(): Record<string, unknown>[] | Record<string, unknown> {
    if (!this.containerElement) return {}
    if (this.extractionMode === 'list') {
      const siblings = this.getSiblings(this.containerElement)
      const clickedIdx = siblings.indexOf(this.containerElement)
      const start = Math.max(0, Math.min(clickedIdx - 1, siblings.length - 3))
      return siblings.slice(start, start + 3).map(item => {
        const row: Record<string, unknown> = {}
        for (const f of this.fields) { try { const el = item.querySelector(f.selector); row[f.key] = el ? this.extractValue(el, f) : null } catch { row[f.key] = null } }
        return row
      })
    }
    const row: Record<string, unknown> = {}
    for (const f of this.fields) {
      try { const el = this.containerElement.querySelector(f.selector) || (f.selector === '*' ? this.containerElement : null); row[f.key] = el ? this.extractValue(el, f) : null } catch { row[f.key] = null }
    }
    return row
  }

  private extractValue(el: Element, f: ExtractionField): unknown {
    switch (f.type) {
      case 'text': return this.applyTransform((el.textContent || '').trim(), f)
      case 'html': return el.innerHTML
      case 'value': return this.applyTransform((el as HTMLInputElement).value || '', f)
      case 'attribute': return this.applyTransform(el.getAttribute(f.attribute || '') || '', f)
      case 'regex': {
        const txt = (el.textContent || '').trim()
        const m = f.pattern ? txt.match(new RegExp(f.pattern)) : null
        const val = m ? (m[1] || m[0]) : null
        return val != null ? this.applyTransform(val, f) : (f.default ?? null)
      }
      case 'nested': {
        const nested = el.querySelector(f.selector)
        if (!nested || !f.fields) return f.default ?? {}
        const obj: Record<string, unknown> = {}
        for (const sf of f.fields) {
          try { const sel = nested.querySelector(sf.selector); obj[sf.key] = sel ? this.extractValue(sel, sf) : (sf.default ?? null) } catch { obj[sf.key] = null }
        }
        return obj
      }
      case 'nested_list': {
        const items = el.querySelectorAll(f.selector)
        return Array.from(items).map(item => {
          const obj: Record<string, unknown> = {}
          for (const sf of (f.fields || [])) {
            try { const sel = item.querySelector(sf.selector); obj[sf.key] = sel ? this.extractValue(sel, sf) : (sf.default ?? null) } catch { obj[sf.key] = null }
          }
          return obj
        })
      }
      default: return this.applyTransform((el.textContent || '').trim(), f)
    }
  }

  private applyTransform(val: string | null, f: ExtractionField): unknown {
    if (val == null || !f.transform) return val ?? f.default ?? null
    switch (f.transform) {
      case 'trim': return val.trim()
      case 'lowercase': return val.toLowerCase()
      case 'uppercase': return val.toUpperCase()
      case 'number': return parseFloat(val.replace(/[^\d.,-]/g, '')) || null
      default: return val
    }
  }
}
