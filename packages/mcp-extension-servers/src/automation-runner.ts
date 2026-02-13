/**
 * Automation Runner
 *
 * Executes a JSON action-step sequence using BrowserWindow.
 * Resolves {{param}} placeholders from tool-call arguments,
 * delegates each step to the appropriate BrowserWindow method,
 * and collects extraction results into a merged output.
 *
 * Supports parallel lanes: when a tool has multiple lanes,
 * each lane runs concurrently in its own BrowserWindow (separate tab in a shared window).
 */

import { BrowserWindow } from './browser-window.js'
import type { ActionStep, ForEachItemStep, ToolDefinition, ExtractionField, WaitUntil } from './tool-schema.js'
import { resolveTemplate } from './tool-schema.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LaneSummary {
  name: string
  success: boolean
  data: Record<string, unknown>
  stepCount: number
  error?: string
  /** URL of the page at the time of last extraction */
  sourceUrl?: string
}

export interface RunnerResult {
  /** Whether the entire execution succeeded */
  success: boolean
  /** Merged extraction results keyed by extract step name */
  data: Record<string, unknown>
  /** Per-step execution log */
  log: StepLog[]
  /** Top-level error message, if any */
  error?: string
  /** Per-lane summaries (only present for multi-lane execution) */
  laneSummaries?: LaneSummary[]
  /** URL of the page at the time of last extraction (single-lane only) */
  sourceUrl?: string
}

export interface StepLog {
  index: number
  action: string
  label?: string
  status: 'ok' | 'error' | 'skipped'
  durationMs: number
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize lanes from a ToolDefinition, handling both new named format
 * and legacy unnamed format (ActionStep[][]) for backward compatibility.
 */
function normalizeLanes(tool: ToolDefinition): Array<{ name: string; steps: ActionStep[] }> | null {
  if (!tool.lanes || tool.lanes.length <= 1) return null

  // Check if lanes are in new named format (objects with .name and .steps)
  const first = tool.lanes[0]
  if (first && typeof first === 'object' && 'name' in first && 'steps' in first) {
    // New format: Array<{ name, steps }>
    return tool.lanes as Array<{ name: string; steps: ActionStep[] }>
  }

  // Legacy format: ActionStep[][] - auto-wrap with default names
  return (tool.lanes as unknown as ActionStep[][]).map((steps, i) => ({
    name: `Lane ${i + 1}`,
    steps,
  }))
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export class AutomationRunner {
  /**
   * Execute a full tool definition with the given arguments.
   * If the tool has multiple lanes, each lane runs in parallel in a separate
   * tab (within a shared window). Otherwise, runs the steps sequentially in a single tab.
   */
  async execute(
    tool: ToolDefinition,
    args: Record<string, unknown>,
  ): Promise<RunnerResult> {
    console.log(`[izan-ext] runner.execute: tool="${tool.name}" args=${JSON.stringify(args)} steps=${tool.steps.length} lanes=${tool.lanes?.length ?? 0} viewport=${tool.viewport ? `${tool.viewport.width}x${tool.viewport.height}` : 'none'}`)
    const namedLanes = normalizeLanes(tool)
    const viewport = tool.viewport

    if (!namedLanes) {
      // Single-lane execution
      console.log('[izan-ext] runner.execute: single-lane mode')
      const bw = BrowserWindow.forLane('main')
      try {
        const result = await this.executeLane(bw, tool.steps, args, viewport)
        console.log(`[izan-ext] runner.execute: done success=${result.success} dataKeys=[${Object.keys(result.data).join(',')}] logEntries=${result.log.length}`)
        for (const [k, v] of Object.entries(result.data)) {
          const preview = Array.isArray(v) ? `array(${v.length})` : typeof v === 'object' && v ? `object(${Object.keys(v).length})` : String(v).slice(0, 80)
          console.log(`[izan-ext] runner.execute: data["${k}"] = ${preview}`)
        }
        return result
      } finally {
        // Close the tab when done (window stays open for reuse)
        await bw.close().catch(() => {})
        BrowserWindow.removeLane(bw.laneId)
      }
    }

    // ─── Parallel lane execution ─────────────────────────────────
    const laneWindows: BrowserWindow[] = []

    // Create a BrowserWindow per lane (each gets its own tab in the shared window)
    for (let i = 0; i < namedLanes.length; i++) {
      const laneId = `lane_${i}`
      laneWindows.push(BrowserWindow.forLane(laneId))
    }

    try {
      // Run all lanes concurrently (each in its own tab)
      const results = await Promise.allSettled(
        namedLanes.map((lane, i) => this.executeLane(laneWindows[i], lane.steps, args, viewport)),
      )

      const laneNames = namedLanes.map(l => l.name)
      return this.mergeLaneResults(results, laneNames)
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
    viewport?: { width: number; height: number },
  ): Promise<RunnerResult> {
    const data: Record<string, unknown> = {}
    const log: StepLog[] = []
    let hasError = false
    let sourceUrl: string | undefined

    // If the first step isn't navigate and we have no open tab, attach to the active tab
    if (steps.length > 0 && steps[0].action !== 'navigate' && !bw.isOpen()) {
      await bw.attachActiveTab()
    }

    console.log(`[izan-ext] executeLane: ${steps.length} steps, bw.open=${bw.isOpen()}`)

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const t0 = Date.now()
      const extra = step.action === 'extract' ? ` method=${(step as Record<string, unknown>).extractionMethod ?? 'css'}` : ''
      console.log(`[izan-ext] executeLane[${i}/${steps.length}]: ${step.action}${extra} label="${step.label ?? ''}"`)

      const entry: StepLog = {
        index: i,
        action: step.action,
        label: step.label,
        status: 'ok',
        durationMs: 0,
      }

      try {
        if (step.action === 'forEachItem') {
          const result = await this.stepForEachItem(step as ForEachItemStep, args, data, bw, viewport)
          if (result !== undefined) {
            data[(step as ForEachItemStep).sourceExtract] = result
            console.log(`[izan-ext] executeLane[${i}]: forEachItem → data["${(step as ForEachItemStep).sourceExtract}"] = array(${Array.isArray(result) ? result.length : '?'})`)
          }
        } else {
          const result = await this.executeStep(bw, step, args, viewport)
          if (result !== undefined && step.action === 'extract') {
            data[step.name] = result
            const preview = Array.isArray(result) ? `array(${result.length})` : typeof result === 'object' && result ? `object(${Object.keys(result).length})` : String(result).slice(0, 100)
            console.log(`[izan-ext] executeLane[${i}]: extract "${step.name}" → ${preview}`)
            // Capture source URL at extraction time
            try { sourceUrl = await bw.getUrl() } catch { /* tab may have closed */ }
          } else if (step.action === 'extract') {
            console.log(`[izan-ext] executeLane[${i}]: extract "${step.name}" → undefined (no data)`)
          }
        }
      } catch (err) {
        entry.status = 'error'
        entry.error = err instanceof Error ? err.message : String(err)
        console.error(`[izan-ext] executeLane[${i}]: ERROR ${entry.error}`)

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
      sourceUrl,
    }
  }

  /**
   * Merge RunnerResult from all parallel lanes.
   * - data: merge all extraction results; prefix with lane name on key conflicts
   * - log: concatenate with lane name prefix in labels
   * - success: true only if ALL lanes succeed
   * - laneSummaries: per-lane summary for structured LLM responses
   */
  private mergeLaneResults(
    results: PromiseSettledResult<RunnerResult>[],
    laneNames: string[],
  ): RunnerResult {
    const mergedData: Record<string, unknown> = {}
    const mergedLog: StepLog[] = []
    let allSuccess = true
    const errors: string[] = []
    const laneSummaries: LaneSummary[] = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const laneName = laneNames[i] ?? `Lane ${i + 1}`

      if (result.status === 'rejected') {
        allSuccess = false
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        errors.push(`${laneName}: ${errorMsg}`)
        laneSummaries.push({
          name: laneName,
          success: false,
          data: {},
          stepCount: 0,
          error: errorMsg,
        })
        continue
      }

      const laneResult = result.value
      if (!laneResult.success) {
        allSuccess = false
        if (laneResult.error) errors.push(`${laneName}: ${laneResult.error}`)
      }

      laneSummaries.push({
        name: laneName,
        success: laneResult.success,
        data: laneResult.data,
        stepCount: laneResult.log.length,
        error: laneResult.error,
        sourceUrl: laneResult.sourceUrl,
      })

      // Merge extraction data
      for (const [key, value] of Object.entries(laneResult.data)) {
        const slugName = laneName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        const finalKey = key in mergedData ? `${slugName}_${key}` : key
        mergedData[finalKey] = value
      }

      // Merge logs with lane name prefix
      for (const entry of laneResult.log) {
        mergedLog.push({
          ...entry,
          label: `[${laneName}] ${entry.label ?? entry.action}`,
        })
      }
    }

    return {
      success: allSuccess,
      data: mergedData,
      log: mergedLog,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      laneSummaries,
    }
  }

  // ─── Step Dispatcher ─────────────────────────────────────────────

  private async executeStep(
    bw: BrowserWindow,
    step: ActionStep,
    args: Record<string, unknown>,
    viewport?: { width: number; height: number },
  ): Promise<unknown> {
    switch (step.action) {
      case 'navigate':
        return this.stepNavigate(bw, step, args, viewport)
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
      case 'forEachItem':
        throw new Error('forEachItem is handled by executeLane, not executeStep')
      default:
        throw new Error(`Unknown action: ${(step as { action: string }).action}`)
    }
  }

  // ─── Step Implementations ────────────────────────────────────────

  private async stepNavigate(
    bw: BrowserWindow,
    step: Extract<ActionStep, { action: 'navigate' }>,
    args: Record<string, unknown>,
    viewport?: { width: number; height: number },
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

    // Open tab if not already open, then navigate
    if (!bw.isOpen()) {
      await bw.open(url, { background: false, viewport })
    } else {
      await bw.navigate(url)
    }

    // Wait according to configured strategy (default: 'load' - safest)
    const waitUntil = step.waitUntil ?? 'load'
    switch (waitUntil) {
      case 'domcontentloaded':
        await bw.waitForDOMContentLoaded()
        break
      case 'networkidle':
        await bw.waitForNetworkIdle()
        break
      case 'load':
      default:
        await bw.waitForLoad()
        break
    }
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
    const method = step.extractionMethod ?? 'css'
    console.log(`[izan-ext] stepExtract: name="${step.name}" mode=${step.mode} method=${method} container="${step.containerSelector?.slice(0, 60)}"`)

    // Full accessibility snapshot — returns compact AX tree text
    if (method === 'snapshot') {
      console.log('[izan-ext] stepExtract: returning full accessibility snapshot')
      return bw.accessibilitySnapshot()
    }

    const mapField = (f: ExtractionField): Record<string, unknown> => ({
      key: f.key, selector: f.selector, type: f.type,
      ...(f.attribute && { attribute: f.attribute }),
      ...(f.pattern && { pattern: f.pattern }),
      ...(f.default !== undefined && { default: f.default }),
      ...(f.transform && { transform: f.transform }),
      ...(f.fields && { fields: f.fields.map(mapField) }),
    })
    const fields = step.fields.map(mapField)

    if (method === 'role' && step.roles?.length) {
      console.log(`[izan-ext] stepExtract: role extraction, roles=[${step.roles.join(',')}] name="${step.roleName ?? ''}" includeChildren=${step.roleIncludeChildren ?? true} fields=${fields.length}`)
      console.log(`[izan-ext] stepExtract: fields=${JSON.stringify(fields).slice(0, 300)}`)
      try {
        const result = await bw.extractByRole(step.roles, step.roleName || '', step.roleIncludeChildren ?? true, fields)
        const preview = Array.isArray(result) ? `array(${result.length})` : typeof result
        console.log(`[izan-ext] stepExtract: role extraction returned ${preview}`)
        if (Array.isArray(result) && result.length > 0) {
          console.log(`[izan-ext] stepExtract: first item keys=[${Object.keys(result[0] as Record<string, unknown>).join(',')}]`)
          console.log(`[izan-ext] stepExtract: first item=${JSON.stringify(result[0]).slice(0, 300)}`)
        }
        return result
      } catch (err) {
        console.error(`[izan-ext] stepExtract: role extraction FAILED: ${err instanceof Error ? err.message : String(err)}`)
        throw err
      }
    }

    console.log(`[izan-ext] stepExtract: CSS extraction, mode=${step.mode} container="${step.containerSelector}" fields=${fields.length}`)
    console.log(`[izan-ext] stepExtract: fields=${JSON.stringify(fields).slice(0, 300)}`)
    const cssResult = step.mode === 'list'
      ? await bw.extractList(step.containerSelector, fields)
      : await bw.extractSingle(step.containerSelector, fields, { continueOnError: step.continueOnError })
    const cssPreview = Array.isArray(cssResult) ? `array(${cssResult.length})` : typeof cssResult === 'object' && cssResult ? `object(${Object.keys(cssResult).length})` : String(cssResult).slice(0, 100)
    console.log(`[izan-ext] stepExtract: CSS extraction returned ${cssPreview}`)
    return cssResult
  }

  // ─── ForEachItem ──────────────────────────────────────────────

  /**
   * Process each item in a previously extracted list:
   * open its detail page, run detail steps, merge results back.
   */
  private async stepForEachItem(
    step: ForEachItemStep,
    args: Record<string, unknown>,
    data: Record<string, unknown>,
    parentBw: BrowserWindow,
    viewport?: { width: number; height: number },
  ): Promise<unknown[]> {
    const source = data[step.sourceExtract]
    console.log(`[izan-ext] forEachItem: sourceExtract="${step.sourceExtract}" type=${typeof source} isArray=${Array.isArray(source)} length=${Array.isArray(source) ? source.length : '?'}`)
    if (!Array.isArray(source)) {
      throw new Error(`forEachItem: "${step.sourceExtract}" is not an array`)
    }
    if (source.length === 0) { console.log('[izan-ext] forEachItem: empty source, returning []'); return [] }

    let items = step.maxItems > 0 ? source.slice(0, step.maxItems) : [...source]
    console.log(`[izan-ext] forEachItem: ${items.length} items after maxItems=${step.maxItems}`)

    // Apply filters (AND logic — all must match)
    if (step.filters && step.filters.length > 0) {
      const beforeCount = items.length
      items = items.filter(raw => {
        const obj = raw as Record<string, unknown>
        return step.filters!.every(f => {
          const val = String(obj[f.field] ?? '')
          switch (f.op) {
            case 'contains': return val.includes(f.value)
            case 'not_contains': return !val.includes(f.value)
            case 'equals': return val === f.value
            case 'not_equals': return val !== f.value
            case 'starts_with': return val.startsWith(f.value)
            case 'ends_with': return val.endsWith(f.value)
            case 'regex': try { return new RegExp(f.value).test(val) } catch { return false }
            default: return true
          }
        })
      })
      console.log(`[izan-ext] forEachItem: ${items.length}/${beforeCount} items after ${step.filters.length} filter(s)`)
    }

    let baseUrl: string
    try { baseUrl = await parentBw.getUrl() } catch { baseUrl = '' }

    const concurrency = step.concurrency ?? 3
    const enriched: unknown[] = []
    console.log(`[izan-ext] forEachItem: processing ${items.length} items, concurrency=${concurrency}, baseUrl=${baseUrl.slice(0, 80)}`)

    // Process items in batches of `concurrency`
    for (let batchStart = 0; batchStart < items.length; batchStart += concurrency) {
      const batch = items.slice(batchStart, batchStart + concurrency)
      const results = await Promise.allSettled(
        batch.map((item, batchIdx) =>
          this.processForEachItem(
            step, args, item as Record<string, unknown>,
            batchStart + batchIdx, baseUrl, parentBw, viewport,
          ),
        ),
      )
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (r.status === 'fulfilled') {
          enriched.push(r.value)
        } else {
          console.error(`[izan-ext] forEachItem: item[${batchStart + i}] REJECTED: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`)
          // On failure, keep original item unchanged
          enriched.push(batch[i])
        }
      }
    }
    return enriched
  }

  /**
   * Resolve a URL string (absolute or relative) to an absolute http(s) URL.
   * Returns undefined if resolution fails.
   */
  private resolveUrl(raw: string, baseUrl: string): string | undefined {
    if (/^https?:\/\//.test(raw)) return raw
    if (baseUrl) {
      try { return new URL(raw, baseUrl).href } catch { /* invalid */ }
    }
    return undefined
  }

  /**
   * Open a single item's detail page, run detail steps, return enriched item.
   */
  private async processForEachItem(
    step: ForEachItemStep,
    args: Record<string, unknown>,
    item: Record<string, unknown>,
    itemIndex: number,
    baseUrl: string,
    parentBw: BrowserWindow,
    viewport?: { width: number; height: number },
  ): Promise<Record<string, unknown>> {
    const laneId = `forEach_${step.sourceExtract}_${itemIndex}`
    const bw = BrowserWindow.forLane(laneId)
    console.log(`[izan-ext] processForEachItem[${itemIndex}]: laneId=${laneId} openMethod=${step.openMethod} item=${JSON.stringify(item).slice(0, 200)}`)

    try {
      let url: string | undefined

      if (step.openMethod === 'url') {
        // ── URL method: read URL from item field ──
        const raw = item[step.urlField ?? '']
        console.log(`[izan-ext] processForEachItem[${itemIndex}]: urlField="${step.urlField}" raw="${String(raw).slice(0, 150)}"`)
        if (typeof raw !== 'string' || !raw) {
          console.warn(`[izan-ext] processForEachItem[${itemIndex}]: SKIP — no URL value in field "${step.urlField}"`)
          return item
        }
        url = this.resolveUrl(raw, baseUrl)
        if (!url || !/^https?:\/\//.test(url)) {
          console.warn(`[izan-ext] processForEachItem[${itemIndex}]: SKIP — invalid URL "${url}" (raw="${raw}")`)
          return item
        }
      } else {
        // ── Click method: find the clickable element in the parent page, read its href ──
        const containerSel = step.containerSelector ?? ''
        const clickSel = step.clickSelector ?? ''
        console.log(`[izan-ext] processForEachItem[${itemIndex}]: click method, container="${containerSel}" clickSel="${clickSel}"`)

        if (!containerSel || !clickSel) {
          console.warn(`[izan-ext] processForEachItem[${itemIndex}]: SKIP — click method missing containerSelector or clickSelector`)
          return item
        }

        // Read href from the n-th item's click target in the parent page
        try {
          const href = await parentBw.evaluate<string | null>(`(function(){
            var items = document.querySelectorAll(${JSON.stringify(containerSel)});
            if (!items || !items[${itemIndex}]) return null;
            var item = items[${itemIndex}];
            var target = item.querySelector(${JSON.stringify(clickSel)});
            if (!target) target = item.closest('a') || item.querySelector('a');
            if (!target) return null;
            return target.href || target.getAttribute('href') || null;
          })()`)
          console.log(`[izan-ext] processForEachItem[${itemIndex}]: click method extracted href="${href?.slice(0, 150)}"`)
          if (typeof href === 'string' && href) {
            url = this.resolveUrl(href, baseUrl)
          }
        } catch (err) {
          console.error(`[izan-ext] processForEachItem[${itemIndex}]: click method href extraction failed:`, err instanceof Error ? err.message : String(err))
        }

        if (!url || !/^https?:\/\//.test(url)) {
          console.warn(`[izan-ext] processForEachItem[${itemIndex}]: SKIP — could not resolve click target URL`)
          return item
        }
      }

      console.log(`[izan-ext] processForEachItem[${itemIndex}]: opening ${url.slice(0, 150)}`)
      await bw.open(url, { background: true, viewport })

      // Wait according to strategy
      const waitUntil: WaitUntil = step.waitUntil ?? 'load'
      console.log(`[izan-ext] processForEachItem[${itemIndex}]: waiting for ${waitUntil}`)
      switch (waitUntil) {
        case 'domcontentloaded': await bw.waitForDOMContentLoaded(); break
        case 'networkidle': await bw.waitForNetworkIdle(); break
        case 'load': default: await bw.waitForLoad(); break
      }

      // Run detail steps and collect extraction data
      console.log(`[izan-ext] processForEachItem[${itemIndex}]: running ${step.detailSteps.length} detail steps`)
      const result = await this.executeLane(bw, step.detailSteps as ActionStep[], args, viewport)

      const extractedKeys = Object.keys(result.data)
      console.log(`[izan-ext] processForEachItem[${itemIndex}]: done, success=${result.success} extractedKeys=[${extractedKeys.join(',')}]`)
      if (!result.success) {
        console.error(`[izan-ext] processForEachItem[${itemIndex}]: detail steps FAILED: ${result.error}`)
      }
      for (const k of extractedKeys) {
        const v = result.data[k]
        const preview = typeof v === 'string' ? `string(${v.length})` : Array.isArray(v) ? `array(${v.length})` : typeof v
        console.log(`[izan-ext] processForEachItem[${itemIndex}]: data["${k}"] = ${preview}`)
      }

      // Merge extracted data into original item
      return { ...item, ...result.data }
    } finally {
      await bw.close().catch(() => {})
      BrowserWindow.removeLane(laneId)
    }
  }
}
