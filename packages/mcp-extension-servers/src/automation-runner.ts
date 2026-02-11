/**
 * Automation Runner
 *
 * Executes a JSON action-step sequence using BrowserWindow.
 * Resolves {{param}} placeholders from tool-call arguments,
 * delegates each step to the appropriate BrowserWindow method,
 * and collects extraction results into a merged output.
 *
 * Supports parallel lanes: when a tool has multiple lanes,
 * each lane runs concurrently in its own BrowserWindow (separate browser window).
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
  /**
   * Execute a full tool definition with the given arguments.
   * If the tool has multiple lanes, each lane runs in parallel in a separate
   * BrowserWindow. Otherwise, runs the steps sequentially in a single window.
   */
  async execute(
    tool: ToolDefinition,
    args: Record<string, unknown>,
  ): Promise<RunnerResult> {
    const hasParallelLanes = tool.lanes && tool.lanes.length > 1

    if (!hasParallelLanes) {
      // Single-lane execution
      const bw = BrowserWindow.forLane('main')
      try {
        return await this.executeLane(bw, tool.steps, args)
      } finally {
        // Close the tab when done (window stays open for reuse)
        await bw.close().catch(() => {})
        BrowserWindow.removeLane(bw.laneId)
      }
    }

    // ─── Parallel lane execution ─────────────────────────────────
    const laneSteps = tool.lanes!
    const laneWindows: BrowserWindow[] = []

    // Create a BrowserWindow per lane (each gets its own tab in the shared window)
    for (let i = 0; i < laneSteps.length; i++) {
      const laneId = `lane_${i}`
      laneWindows.push(BrowserWindow.forLane(laneId))
    }

    try {
      // Run all lanes concurrently (each in its own tab)
      const results = await Promise.allSettled(
        laneSteps.map((steps, i) => this.executeLane(laneWindows[i], steps, args)),
      )

      // Merge results from all lanes
      return this.mergeLaneResults(results)
    } finally {
      // Close all lane tabs (window stays open for reuse)
      for (const bw of laneWindows) {
        await bw.close().catch(() => {})
        BrowserWindow.removeLane(bw.laneId)
      }
    }
  }

  /**
   * Execute a single lane's step sequence on a specific BrowserWindow.
   */
  private async executeLane(
    bw: BrowserWindow,
    steps: ActionStep[],
    args: Record<string, unknown>,
  ): Promise<RunnerResult> {
    const data: Record<string, unknown> = {}
    const log: StepLog[] = []
    let hasError = false

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const t0 = Date.now()
      const entry: StepLog = {
        index: i,
        action: step.action,
        label: step.label,
        status: 'ok',
        durationMs: 0,
      }

      try {
        const result = await this.executeStep(bw, step, args)
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

  /**
   * Merge RunnerResult from all parallel lanes.
   * - data: merge all extraction results; prefix with lane_N_ on key conflicts
   * - log: concatenate with lane index prefix in labels
   * - success: true only if ALL lanes succeed
   */
  private mergeLaneResults(
    results: PromiseSettledResult<RunnerResult>[],
  ): RunnerResult {
    const mergedData: Record<string, unknown> = {}
    const mergedLog: StepLog[] = []
    let allSuccess = true
    const errors: string[] = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const lanePrefix = `lane_${i + 1}`

      if (result.status === 'rejected') {
        allSuccess = false
        errors.push(`${lanePrefix}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`)
        continue
      }

      const laneResult = result.value
      if (!laneResult.success) {
        allSuccess = false
        if (laneResult.error) errors.push(`${lanePrefix}: ${laneResult.error}`)
      }

      // Merge extraction data
      for (const [key, value] of Object.entries(laneResult.data)) {
        const finalKey = key in mergedData ? `${lanePrefix}_${key}` : key
        mergedData[finalKey] = value
      }

      // Merge logs with lane prefix
      for (const entry of laneResult.log) {
        mergedLog.push({
          ...entry,
          label: `[${lanePrefix}] ${entry.label ?? entry.action}`,
        })
      }
    }

    return {
      success: allSuccess,
      data: mergedData,
      log: mergedLog,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  }

  // ─── Step Dispatcher ─────────────────────────────────────────────

  private async executeStep(
    bw: BrowserWindow,
    step: ActionStep,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (step.action) {
      case 'navigate':
        return this.stepNavigate(bw, step, args)
      case 'click':
        return this.stepClick(bw, step, args)
      case 'type':
        return this.stepType(bw, step, args)
      case 'scroll':
        return this.stepScroll(bw, step)
      case 'select':
        return this.stepSelect(bw, step, args)
      case 'wait':
        return this.stepWait(bw, step)
      case 'waitForSelector':
        return this.stepWaitForSelector(bw, step)
      case 'waitForUrl':
        return this.stepWaitForUrl(bw, step)
      case 'waitForLoad':
        return this.stepWaitForLoad(bw, step)
      case 'extract':
        return this.stepExtract(bw, step)
      default:
        throw new Error(`Unknown action: ${(step as { action: string }).action}`)
    }
  }

  // ─── Step Implementations ────────────────────────────────────────

  private async stepNavigate(
    bw: BrowserWindow,
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

    // Open window if not already open (foreground so user sees it), then never force focus on navigate
    if (!bw.isOpen()) {
      await bw.open(url, { background: false })
    } else {
      await bw.navigate(url)
    }
    await bw.waitForLoad()
  }

  private async stepClick(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'click' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    const selector = resolveTemplate(step.selector, args)
    await bw.click(selector)
  }

  private async stepType(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'type' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    const selector = resolveTemplate(step.selector, args)
    const text = resolveTemplate(step.text, args)
    await bw.type(selector, text, { clear: step.clear })
  }

  private async stepScroll(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'scroll' }>,
  ): Promise<void> {
    await bw.scroll({
      selector: step.selector,
      direction: step.direction,
      amount: step.amount,
    })
  }

  private async stepSelect(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'select' }>,
    args: Record<string, unknown>,
  ): Promise<void> {
    const selector = resolveTemplate(step.selector, args)
    const value = resolveTemplate(step.value, args)
    await bw.select(selector, value)
  }

  private async stepWait(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'wait' }>,
  ): Promise<void> {
    await bw.wait(step.ms)
  }

  private async stepWaitForSelector(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'waitForSelector' }>,
  ): Promise<void> {
    await bw.waitForSelector(step.selector, step.timeout)
  }

  private async stepWaitForUrl(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'waitForUrl' }>,
  ): Promise<void> {
    await bw.waitForUrl(step.pattern, step.timeout)
  }

  private async stepWaitForLoad(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'waitForLoad' }>,
  ): Promise<void> {
    await bw.waitForLoad(step.timeout)
  }

  private async stepExtract(
    bw: BrowserWindow,
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
      return bw.extractList(step.containerSelector, fields)
    } else {
      return bw.extractSingle(step.containerSelector, fields)
    }
  }
}
