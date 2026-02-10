/**
 * Recorder UI
 *
 * Floating overlay injected into the recording target page.
 * Built with vanilla DOM (no framework dependency in content script).
 *
 * Features:
 *   - Toolbar: Record / Pause / Stop / Extract Mode buttons
 *   - Step list: shows recorded steps (deletable)
 *   - URL parameter panel: toggle which URL params become tool parameters
 *   - Preview panel: shows sample extraction results
 *
 * Communicates with the web app via custom events dispatched on globalThis.
 */

import { ActionRecorder } from './recorder.js'
import { ElementPicker, type PickerResult } from './element-picker.js'
import type { ActionStep } from './tool-schema.js'
import {
  EXTENSION_EVENT_RECORDING_START,
  EXTENSION_EVENT_RECORDING_STOP,
  EXTENSION_EVENT_RECORDING_STEP,
  EXTENSION_EVENT_RECORDING_COMPLETE,
} from './protocol.js'

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  .izan-recorder-root {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 340px;
    max-height: calc(100vh - 32px);
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .izan-recorder-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    cursor: grab;
    user-select: none;
  }

  .izan-recorder-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .izan-recorder-toolbar {
    display: flex;
    gap: 6px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-wrap: wrap;
  }

  .izan-recorder-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    background: rgba(255,255,255,0.05);
    color: #e2e8f0;
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: all 0.15s;
  }

  .izan-recorder-btn:hover {
    background: rgba(255,255,255,0.1);
  }

  .izan-recorder-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .izan-recorder-btn.danger {
    border-color: #ef4444;
    color: #ef4444;
  }

  .izan-recorder-btn.danger:hover {
    background: rgba(239,68,68,0.15);
  }

  .izan-recorder-btn.success {
    background: #10b981;
    border-color: #10b981;
    color: white;
  }

  .izan-recorder-steps {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    max-height: 300px;
  }

  .izan-recorder-step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    margin-bottom: 4px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    font-size: 12px;
  }

  .izan-recorder-step:hover {
    background: rgba(255,255,255,0.06);
  }

  .izan-recorder-step-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .izan-recorder-step-content {
    flex: 1;
    overflow: hidden;
  }

  .izan-recorder-step-action {
    font-weight: 500;
    color: #93c5fd;
  }

  .izan-recorder-step-detail {
    color: #94a3b8;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .izan-recorder-step-delete {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    flex-shrink: 0;
  }

  .izan-recorder-step-delete:hover {
    color: #ef4444;
    background: rgba(239,68,68,0.1);
  }

  .izan-recorder-empty {
    padding: 24px 16px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
  }

  .izan-recorder-preview {
    padding: 10px 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    max-height: 150px;
    overflow-y: auto;
  }

  .izan-recorder-preview h4 {
    margin: 0 0 6px 0;
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .izan-recorder-preview pre {
    margin: 0;
    font-size: 11px;
    color: #a5b4fc;
    background: rgba(0,0,0,0.2);
    padding: 8px;
    border-radius: 6px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .izan-recorder-status {
    padding: 8px 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    font-size: 11px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .izan-recorder-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ef4444;
    animation: izan-pulse 1.5s ease infinite;
  }

  @keyframes izan-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`

// ─── Step Icons ──────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, string> = {
  navigate: '🌐',
  click: '👆',
  type: '⌨️',
  scroll: '📜',
  select: '📋',
  wait: '⏱️',
  waitForSelector: '⏳',
  waitForUrl: '🔗',
  waitForLoad: '⏳',
  extract: '📊',
}

// ─── Recorder UI Class ───────────────────────────────────────────────────────

export class RecorderUI {
  private root: HTMLDivElement | null = null
  private styleEl: HTMLStyleElement | null = null
  private recorder: ActionRecorder
  private picker: ElementPicker
  private steps: ActionStep[] = []
  private previewData: unknown = null
  private isRecording = false

  constructor() {
    this.recorder = new ActionRecorder()
    this.picker = new ElementPicker()
  }

  /**
   * Mount the recorder overlay into the page.
   */
  mount(): void {
    if (this.root) return

    // Add styles
    this.styleEl = document.createElement('style')
    this.styleEl.textContent = STYLES
    document.head.appendChild(this.styleEl)

    // Create root
    this.root = document.createElement('div')
    this.root.setAttribute('data-izan-recorder', 'true')
    this.root.className = 'izan-recorder-root'
    document.body.appendChild(this.root)

    this.render()
    this.makeDraggable()
  }

  /**
   * Unmount the recorder overlay.
   */
  unmount(): void {
    if (this.isRecording) this.stopRecording()
    this.root?.remove()
    this.root = null
    this.styleEl?.remove()
    this.styleEl = null
  }

  /**
   * Check if mounted.
   */
  isMounted(): boolean {
    return this.root !== null
  }

  // ─── Recording Controls ─────────────────────────────────────────

  private startRecording(): void {
    this.isRecording = true
    this.steps = []
    this.previewData = null

    this.recorder.start((step, index) => {
      this.steps = this.recorder.getSteps()
      this.render()

      // Dispatch step event to web app
      globalThis.dispatchEvent(
        new CustomEvent(EXTENSION_EVENT_RECORDING_STEP, {
          detail: { step, index },
        }),
      )
    })

    this.render()
  }

  private stopRecording(): void {
    const steps = this.recorder.stop()
    this.isRecording = false
    this.steps = steps
    this.render()

    // Dispatch complete event to web app
    globalThis.dispatchEvent(
      new CustomEvent(EXTENSION_EVENT_RECORDING_COMPLETE, {
        detail: { steps },
      }),
    )
  }

  private startExtractMode(mode: 'single' | 'list'): void {
    this.picker.start((result: PickerResult) => {
      this.steps.push(result.step)
      this.previewData = result.preview
      this.render()

      // Dispatch the extract step
      globalThis.dispatchEvent(
        new CustomEvent(EXTENSION_EVENT_RECORDING_STEP, {
          detail: { step: result.step, index: this.steps.length - 1 },
        }),
      )
    }, mode)
  }

  private deleteStep(index: number): void {
    this.steps.splice(index, 1)
    this.render()
  }

  // ─── Rendering ──────────────────────────────────────────────────

  private render(): void {
    if (!this.root) return

    this.root.innerHTML = `
      ${this.renderHeader()}
      ${this.renderToolbar()}
      ${this.renderStepList()}
      ${this.previewData ? this.renderPreview() : ''}
      ${this.renderStatus()}
    `

    this.attachEventListeners()
  }

  private renderHeader(): string {
    return `
      <div class="izan-recorder-header">
        <h3>
          ${this.isRecording ? '<span class="izan-recorder-dot"></span>' : ''}
          Record MCP Tool
        </h3>
        <button class="izan-recorder-step-delete" data-action="close" title="Close">✕</button>
      </div>
    `
  }

  private renderToolbar(): string {
    const recordBtn = this.isRecording
      ? '<button class="izan-recorder-btn danger" data-action="stop">⏹ Stop</button>'
      : '<button class="izan-recorder-btn active" data-action="record">⏺ Record</button>'

    return `
      <div class="izan-recorder-toolbar">
        ${recordBtn}
        <button class="izan-recorder-btn" data-action="extract-list" ${this.isRecording ? '' : 'disabled'}>
          📋 Extract List
        </button>
        <button class="izan-recorder-btn" data-action="extract-single" ${this.isRecording ? '' : 'disabled'}>
          📄 Extract Single
        </button>
        <button class="izan-recorder-btn success" data-action="done" ${this.steps.length === 0 ? 'disabled' : ''}>
          ✓ Done
        </button>
      </div>
    `
  }

  private renderStepList(): string {
    if (this.steps.length === 0) {
      return `
        <div class="izan-recorder-steps">
          <div class="izan-recorder-empty">
            ${this.isRecording
              ? 'Interact with the page to record actions...'
              : 'Click Record to start capturing actions'}
          </div>
        </div>
      `
    }

    const items = this.steps.map((step, i) => `
      <div class="izan-recorder-step">
        <span class="izan-recorder-step-icon">${STEP_ICONS[step.action] || '❓'}</span>
        <div class="izan-recorder-step-content">
          <span class="izan-recorder-step-action">${step.action}</span>
          <div class="izan-recorder-step-detail">${this.getStepDetail(step)}</div>
        </div>
        <button class="izan-recorder-step-delete" data-action="delete-step" data-index="${i}" title="Remove step">✕</button>
      </div>
    `).join('')

    return `<div class="izan-recorder-steps">${items}</div>`
  }

  private renderPreview(): string {
    return `
      <div class="izan-recorder-preview">
        <h4>Extraction Preview</h4>
        <pre>${JSON.stringify(this.previewData, null, 2)}</pre>
      </div>
    `
  }

  private renderStatus(): string {
    const stepCount = this.steps.length
    const extractCount = this.steps.filter((s) => s.action === 'extract').length

    return `
      <div class="izan-recorder-status">
        ${this.isRecording ? '<span class="izan-recorder-dot"></span> Recording' : ''}
        ${stepCount} step${stepCount !== 1 ? 's' : ''}
        ${extractCount > 0 ? ` · ${extractCount} extraction${extractCount !== 1 ? 's' : ''}` : ''}
      </div>
    `
  }

  private getStepDetail(step: ActionStep): string {
    switch (step.action) {
      case 'navigate': {
        const url = new URL(step.url, window.location.origin).hostname
        return url
      }
      case 'click': return step.selector.slice(0, 50)
      case 'type': return `"${step.text.slice(0, 30)}" → ${step.selector.slice(0, 20)}`
      case 'scroll': return `${step.direction} ${step.amount}px`
      case 'select': return `${step.value} → ${step.selector.slice(0, 20)}`
      case 'wait': return `${step.ms}ms`
      case 'waitForSelector': return step.selector.slice(0, 50)
      case 'waitForUrl': return step.pattern.slice(0, 50)
      case 'waitForLoad': return `${step.timeout}ms timeout`
      case 'extract': return `${step.mode} · ${step.fields.length} field(s)`
      default: return ''
    }
  }

  // ─── Event Listeners ────────────────────────────────────────────

  private attachEventListeners(): void {
    if (!this.root) return

    this.root.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).getAttribute('data-action')
        switch (action) {
          case 'record':
            this.startRecording()
            break
          case 'stop':
            this.stopRecording()
            break
          case 'extract-list':
            this.startExtractMode('list')
            break
          case 'extract-single':
            this.startExtractMode('single')
            break
          case 'done':
            this.stopRecording()
            break
          case 'close':
            this.unmount()
            break
          case 'delete-step': {
            const index = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10)
            this.deleteStep(index)
            break
          }
        }
      })
    })
  }

  // ─── Dragging ───────────────────────────────────────────────────

  private makeDraggable(): void {
    if (!this.root) return

    const header = this.root.querySelector('.izan-recorder-header') as HTMLElement
    if (!header) return

    let isDragging = false
    let startX = 0
    let startY = 0
    let startLeft = 0
    let startTop = 0

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      isDragging = true
      const rect = this.root!.getBoundingClientRect()
      startX = e.clientX
      startY = e.clientY
      startLeft = rect.left
      startTop = rect.top
      header.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.root) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      this.root.style.left = `${startLeft + dx}px`
      this.root.style.top = `${startTop + dy}px`
      this.root.style.right = 'auto'
    }

    const onMouseUp = () => {
      isDragging = false
      header.style.cursor = 'grab'
    }

    header.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
}

// ─── Content Script Integration ──────────────────────────────────────────────

let recorderUI: RecorderUI | null = null

/**
 * Initialize the recorder UI system.
 * Listens for start/stop recording events from the web app.
 */
export function initRecorderUI(): void {
  globalThis.addEventListener(EXTENSION_EVENT_RECORDING_START, () => {
    if (!recorderUI) recorderUI = new RecorderUI()
    recorderUI.mount()
  })

  globalThis.addEventListener(EXTENSION_EVENT_RECORDING_STOP, () => {
    recorderUI?.unmount()
  })
}
