/**
 * Automation Runner
 *
 * Executes a JSON action-step sequence using BrowserWindow.
 * Resolves {{param}} placeholders from tool-call arguments,
 * delegates each step to the appropriate BrowserWindow method,
 * and collects extraction results into a merged output.
 */

import { BrowserWindow } from './browser-window.js'
import type { ActionStep, ToolDefinition, ExtractionField } from './tool-schema.js'
import { resolveTemplate } from './tool-schema.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RunnerResult {
  /** Whether the entire execution succeeded */
  success: boolean
  /** Merged extraction results keyed by extract step name */
  data: Record<string, unknown>
  /** Per-step execution log */
  log: StepLog[]
  /** Top-level error message, if any */
  error?: string
}

export interface StepLog {
  index: number
  action: string
  label?: string
  status: 'ok' | 'error' | 'skipped'
  durationMs: number
  error?: string
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export class AutomationRunner {
  private bw: BrowserWindow

  constructor() {
    this.bw = BrowserWindow.getInstance()
  }

  /**
   * Execute a full tool definition with the given arguments.
   * Opens a BrowserWindow if not already open, runs steps in order,
   * and returns merged extraction data.
   */
  async execute(
    tool: ToolDefinition,
    args: Record<string, unknown>,
  ): Promise<RunnerResult> {
    const data: Record<string, unknown> = {}
    const log: StepLog[] = []
    let hasError = false

    for (let i = 0; i < tool.steps.length; i++) {
      const step = tool.steps[i]
      const t0 = Date.now()
      const entry: StepLog = {
        index: i,
        action: step.action,
        label: step.label,
        status: 'ok',
        durationMs: 0,
      }

      try {
        const result = await this.executeStep(step, args)
        if (result !== undefined && step.action === 'extract') {
          const extractStep = step as { name: string }
          data[extractStep.name] = result
        }
      } catch (err) {
        entry.status = 'error'
        entry.error = err instanceof Error ? err.message : String(err)

        if (step.continueOnError) {
          // Continue to next step
        } else {
          hasError = true
          entry.durationMs = Date.now() - t0
          log.push(entry)
          break
        }
      }

      entry.durationMs = Date.now() - t0
      log.push(entry)
    }

    return {
      success: !hasError,
      data,
      log,
      error: hasError ? log.find((l) => l.status === 'error')?.error : undefined,
    }
  }

  // ─── Step Dispatcher ─────────────────────────────────────────────

  private async executeStep(
    step: ActionStep,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (step.action) {
      case 'navigate':
        return this.stepNavigate(step, args)
      case 'click':
        return this.stepClick(step, args)
      case 'type':
        return this.stepType(step, args)
      case 'scroll':
        return this.stepScroll(step)
      case 'select':
        return this.stepSelect(step, args)
      case 'wait':
        return this.stepWait(step)
      case 'waitForSelector':
        return this.stepWaitForSelector(step)
      case 'waitForUrl':
        return this.stepWaitForUrl(step)
      case 'waitForLoad':
        return this.stepWaitForLoad(step)
      case 'extract':
        return this.stepExtract(step)
      default:
        throw new Error(`Unknown action: ${(step as { action: string }).action}`)
    }
  }

  // ─── Step Implementations ────────────────────────────────────────

  private async stepNavigate(
    step: Extract<ActionStep, { action: 'navigate' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    let url = resolveTemplate(step.url, args)

    // Build query string from urlParams
    if (step.urlParams) {
      const params = new URLSearchParams()
      for (const [key, valueTpl] of Object.entries(step.urlParams)) {
        const resolved = resolveTemplate(valueTpl, args)
        if (resolved) params.set(key, resolved)
      }
      const qs = params.toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }

    // Open window if not already open, otherwise navigate
    if (!this.bw.isOpen()) {
      await this.bw.open(url, { background: true })
    } else {
      await this.bw.navigate(url)
    }
    await this.bw.waitForLoad()
  }

  private async stepClick(
    step: Extract<ActionStep, { action: 'click' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    const selector = resolveTemplate(step.selector, args)
    await this.bw.click(selector)
  }

  private async stepType(
    step: Extract<ActionStep, { action: 'type' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    const selector = resolveTemplate(step.selector, args)
    const text = resolveTemplate(step.text, args)
    await this.bw.type(selector, text, { clear: step.clear })
  }

  private async stepScroll(
    step: Extract<ActionStep, { action: 'scroll' }>,
  ): Promise<void> {
    await this.bw.scroll({
      selector: step.selector,
      direction: step.direction,
      amount: step.amount,
    })
  }

  private async stepSelect(
    step: Extract<ActionStep, { action: 'select' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    const selector = resolveTemplate(step.selector, args)
    const value = resolveTemplate(step.value, args)
    await this.bw.select(selector, value)
  }

  private async stepWait(
    step: Extract<ActionStep, { action: 'wait' }>,
  ): Promise<void> {
    await this.bw.wait(step.ms)
  }

  private async stepWaitForSelector(
    step: Extract<ActionStep, { action: 'waitForSelector' }>,
  ): Promise<void> {
    await this.bw.waitForSelector(step.selector, step.timeout)
  }

  private async stepWaitForUrl(
    step: Extract<ActionStep, { action: 'waitForUrl' }>,
  ): Promise<void> {
    await this.bw.waitForUrl(step.pattern, step.timeout)
  }

  private async stepWaitForLoad(
    step: Extract<ActionStep, { action: 'waitForLoad' }>,
  ): Promise<void> {
    await this.bw.waitForLoad(step.timeout)
  }

  private async stepExtract(
    step: Extract<ActionStep, { action: 'extract' }>,
  ): Promise<unknown> {
    const fields: Array<{ key: string; selector: string; type?: string; attribute?: string }> =
      step.fields.map((f: ExtractionField) => ({
        key: f.key,
        selector: f.selector,
        type: f.type,
        attribute: f.attribute,
      }))

    if (step.mode === 'list') {
      return this.bw.extractList(step.containerSelector, fields)
    } else {
      return this.bw.extractSingle(step.containerSelector, fields)
    }
  }
}
