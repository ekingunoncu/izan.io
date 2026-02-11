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

    for (const parent of document.querySelectorAll('body *')) {
      if (parent.children.length < minItems || seen.has(parent)) continue

      const tagGroups = new Map<string, Element[]>()
      for (const child of parent.children) {
        const g = tagGroups.get(child.tagName)
        if (g) g.push(child); else tagGroups.set(child.tagName, [child])
      }

      for (const [, items] of tagGroups) {
        if (items.length < minItems) continue
        const sharedClass = this.findSharedClass(items)
        if (!sharedClass && items.length < 5) continue

        const selector = sharedClass
          ? `${items[0].tagName.toLowerCase()}.${CSS.escape(sharedClass)}`
          : `${parent.tagName.toLowerCase()} > ${items[0].tagName.toLowerCase()}`
        if (this.listCandidates.some(c => c.selector === selector)) continue

        // Only keep items that are visible
        const visible = items.filter(el => {
          const r = el.getBoundingClientRect()
          return r.width > 30 && r.height > 20
        })
        if (visible.length < minItems) continue

        seen.add(parent)

        // Inject outline + badge on each visible item
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
          badge.textContent = `Select · ${idx + 1}/${items.length}`
          badge.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.selectCandidateGroup(selector)
          })
          item.appendChild(badge)
        })

        this.listCandidates.push({ parent, selector, items: visible })
      }
    }
  }

  private findSharedClass(items: Element[]): string | null {
    if (items.length === 0) return null
    for (const cls of items[0].classList) {
      if (cls.length < 3 || /^[a-z]{1,2}-/.test(cls)) continue
      if (items.every(el => el.classList.contains(cls))) return cls
    }
    return null
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

  private selectCandidateGroup(selector: string): void {
    const candidate = this.listCandidates.find(c => c.selector === selector)
    if (!candidate) return

    this.containerSelector = selector
    this.containerElement = candidate.items[0]

    // Auto-detect fields from the first item and finalize immediately
    this.fields = this.autoDetectFields(candidate.items[0])
    if (this.fields.length === 0) {
      // Fallback: extract full text of each item
      this.fields = [{ key: 'text', selector: '*', type: 'text' }]
    }
    this.finalize()
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
    const walk = (el: Element, depth: number) => {
      // Skip hidden elements
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return

      const tag = el.tagName
      // Links and images are always interesting
      if (tag === 'A' && el.getAttribute('href')) {
        candidates.push({ el, depth })
      }
      if (tag === 'IMG' && el.getAttribute('src')) {
        candidates.push({ el, depth })
        return
      }
      // Input-like elements
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        candidates.push({ el, depth })
        return
      }
      // Leaf text nodes: elements that have text but no block-level children
      const hasBlockChild = Array.from(el.children).some(c =>
        ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'SECTION', 'ARTICLE'].includes(c.tagName),
      )
      if (!hasBlockChild && (el.textContent || '').trim().length > 0 && el.children.length <= 3) {
        // This is a leaf-ish text element
        if (tag !== 'A') { // A tags already captured above
          candidates.push({ el, depth })
        }
      }
      // Recurse into block children
      if (hasBlockChild) {
        Array.from(el.children).forEach(c => walk(c, depth + 1))
      }
    }

    Array.from(item.children).forEach(c => walk(c, 0))

    // If no candidates found from children, try direct text
    if (candidates.length === 0 && (item.textContent || '').trim()) {
      return [{ key: 'text', selector: '*', type: 'text' }]
    }

    for (const { el } of candidates) {
      const selector = this.generateRelativeSelector(el, item)
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
    this.infoPanel = document.createElement('div')
    this.infoPanel.setAttribute('data-izan-recorder', 'true')
    Object.assign(this.infoPanel.style, {
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: 'hsl(240 10% 3.9%)', color: 'hsl(0 0% 98%)',
      padding: '10px 18px', borderRadius: '10px', fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, sans-serif', zIndex: '2147483647',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
      gap: '10px', maxWidth: '600px', border: '1px solid hsl(240 3.7% 15.9%)',
    })
    document.body.appendChild(this.infoPanel)
  }

  private cleanup(): void {
    this.cleanupCandidates()
    this.highlightBox?.remove(); this.highlightBox = null
    this.infoPanel?.remove(); this.infoPanel = null
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
        ? n > 0 ? `${n} list(s) detected - click "Select" on an item` : `Click on a repeating element`
        : `Click on the element you want to extract data from`
      this.infoPanel.innerHTML = `<span>${msg}</span><span style="opacity:0.4;font-size:11px">ESC to cancel</span>`
    } else {
      this.infoPanel.innerHTML = `
        <span>Click fields to extract (${this.fields.length} selected)</span>
        <button data-izan-recorder="true" style="background:hsl(220 90% 56%);color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500">Done</button>
        <span style="opacity:0.4;font-size:11px">ESC to cancel</span>`
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
      this.fields = this.autoDetectFields(this.containerElement)
      if (this.fields.length === 0) {
        this.fields = [{ key: 'text', selector: '*', type: 'text' }]
      }
      this.finalize()
      return
    }

    // Single mode: enter field picking
    this.containerSelector = generateSelector(el)
    this.containerElement = el
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

  private generateRelativeSelector(el: Element, container: Element): string {
    const parts: string[] = []; let cur: Element | null = el
    while (cur && cur !== container) {
      const p = cur.parentElement; if (!p) break
      const tag = cur.tagName.toLowerCase()
      const cls = this.getUniqueClassName(cur, p)
      if (cls) { parts.unshift(`.${CSS.escape(cls)}`); break }
      const sibs = Array.from(p.children).filter(c => c.tagName === cur!.tagName)
      parts.unshift(sibs.length === 1 ? tag : `${tag}:nth-of-type(${sibs.indexOf(cur) + 1})`)
      cur = p
    }
    return parts.join(' > ') || '*'
  }

  private getUniqueClassName(el: Element, p: Element): string | null {
    for (const cls of el.classList) {
      if (cls.length < 3 || /^[a-z]{1,2}-/.test(cls) || cls.startsWith('izan-')) continue
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
    for (const a of ['aria-label', 'name']) { const v = el.getAttribute(a); if (v) return this.slugify(v) }
    const cn = el.className?.toString()
    if (cn) { const m = cn.split(/\s+/).find(c => c.length > 3 && !/^[a-z]{1,2}-/.test(c) && !c.startsWith('izan-')); if (m) return this.slugify(m) }
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
    const cb = this.onComplete
    // Clear onCancelCb before cancel() so it doesn't fire - this is a successful completion
    this.onCancelCb = null
    this.cancel()
    cb?.({ step, preview })
  }

  private generatePreview(): Record<string, unknown>[] | Record<string, unknown> {
    if (!this.containerElement) return {}
    if (this.extractionMode === 'list') {
      return this.getSiblings(this.containerElement).slice(0, 3).map(item => {
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

  private extractValue(el: Element, f: ExtractionField): string | null {
    switch (f.type) {
      case 'text': return (el.textContent || '').trim()
      case 'html': return el.innerHTML
      case 'value': return (el as HTMLInputElement).value || ''
      case 'attribute': return el.getAttribute(f.attribute || '') || ''
      default: return (el.textContent || '').trim()
    }
  }
}
