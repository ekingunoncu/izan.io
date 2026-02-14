/**
 * Shared step/lane/param management utilities for the sidepanel.
 *
 * These pure-logic helpers eliminate duplication between
 * record mode and edit mode in App.tsx.
 */

import type { Dispatch, SetStateAction } from 'react'
import { toSnakeCase } from '../tool-schema.js'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Step {
  action: string
  url?: string
  urlParams?: Record<string, string>
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
  [k: string]: unknown
}

interface ParamMeta {
  enabled: boolean
  description: string
  originalValue: string
  /** Custom parameter name (used for path segments and type inputs) */
  paramName?: string
}

interface Lane {
  name: string
  steps: Step[]
}

type SetState<T> = Dispatch<SetStateAction<T>>
type ParamMap = Map<number, Map<string, ParamMeta>>

// ─── Step Operations ────────────────────────────────────────────────────────

export function addStepToLane(
  setSteps: SetState<Step[]>,
  setLanes: SetState<Lane[]>,
  activeLane: number,
  step: Step,
): void {
  setSteps(prev => [...prev, step])
  setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: [...l.steps, step] } : l))
}

export function deleteStepAt(
  setSteps: SetState<Step[]>,
  setLanes: SetState<Lane[]>,
  setParamMap: SetState<ParamMap>,
  activeLane: number,
  idx: number,
): void {
  setSteps(prev => prev.filter((_, i) => i !== idx))
  setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: l.steps.filter((_, j) => j !== idx) } : l))
  setParamMap(prev => {
    const next = new Map<number, Map<string, ParamMeta>>()
    for (const [k, v] of prev) {
      if (k < idx) next.set(k, v)
      else if (k > idx) next.set(k - 1, v)
    }
    return next
  })
}

export function moveStepAt(
  setSteps: SetState<Step[]>,
  setLanes: SetState<Lane[]>,
  setParamMap: SetState<ParamMap>,
  activeLane: number,
  from: number,
  to: number,
  totalSteps: number,
): void {
  if (to < 0 || to >= totalSteps) return
  const reorder = (arr: Step[]) => {
    const next = [...arr]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }
  setSteps(reorder)
  setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: reorder(l.steps) } : l))
  setParamMap(prev => {
    const next = new Map<number, Map<string, ParamMeta>>()
    for (const [k, v] of prev) {
      let newK = k
      if (k === from) newK = to
      else if (from < to && k > from && k <= to) newK = k - 1
      else if (from > to && k >= to && k < from) newK = k + 1
      next.set(newK, v)
    }
    return next
  })
}

// ─── Param Operations ───────────────────────────────────────────────────────

export function toggleParamAt(
  setParamMap: SetState<ParamMap>,
  stepIdx: number,
  key: string,
  originalValue: string,
): void {
  setParamMap(prev => {
    const next = new Map(prev)
    const stepMeta = new Map(next.get(stepIdx) ?? [])
    const existing = stepMeta.get(key)
    if (existing?.enabled) {
      stepMeta.set(key, { ...existing, enabled: false })
    } else {
      stepMeta.set(key, { enabled: true, description: existing?.description ?? '', originalValue })
    }
    next.set(stepIdx, stepMeta)
    return next
  })
}

export function updateParamDescAt(
  setParamMap: SetState<ParamMap>,
  stepIdx: number,
  key: string,
  description: string,
): void {
  setParamMap(prev => {
    const next = new Map(prev)
    const stepMeta = new Map(next.get(stepIdx) ?? [])
    const existing = stepMeta.get(key)
    if (existing) stepMeta.set(key, { ...existing, description })
    next.set(stepIdx, stepMeta)
    return next
  })
}

export function updateParamNameAt(
  setParamMap: SetState<ParamMap>,
  stepIdx: number,
  key: string,
  paramName: string,
): void {
  setParamMap(prev => {
    const next = new Map(prev)
    const stepMeta = new Map(next.get(stepIdx) ?? [])
    const existing = stepMeta.get(key)
    if (existing) stepMeta.set(key, { ...existing, paramName })
    next.set(stepIdx, stepMeta)
    return next
  })
}

// ─── WaitUntil ──────────────────────────────────────────────────────────────

export function updateStepWaitUntilAt(
  setSteps: SetState<Step[]>,
  setLanes: SetState<Lane[]>,
  activeLane: number,
  idx: number,
  value: Step['waitUntil'],
): void {
  const update = (arr: Step[]) => arr.map((s, i) => i === idx ? { ...s, waitUntil: value } : s)
  setSteps(update)
  setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: update(l.steps) } : l))
}

// ─── Fields ──────────────────────────────────────────────────────────────────

export function updateStepFieldsAt(
  setSteps: SetState<Step[]>,
  setLanes: SetState<Lane[]>,
  activeLane: number,
  idx: number,
  fields: unknown[],
): void {
  const update = (arr: Step[]) => arr.map((s, i) => i === idx ? { ...s, fields } : s)
  setSteps(update)
  setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: update(l.steps) } : l))
}

// ─── Generic Step Update ─────────────────────────────────────────────────

export function updateStepPropsAt(
  setSteps: SetState<Step[]>,
  setLanes: SetState<Lane[]>,
  activeLane: number,
  idx: number,
  props: Partial<Step>,
): void {
  const update = (arr: Step[]) => arr.map((s, i) => i === idx ? { ...s, ...props } : s)
  setSteps(update)
  setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: update(l.steps) } : l))
}

// ─── Build Final Data ───────────────────────────────────────────────────────

interface ToolParameter {
  name: string
  type: string
  description: string
  required: boolean
  source: string
  sourceKey: string
  default?: string | number | boolean
}

export function applyParamMap(
  steps: Step[],
  paramMap: ParamMap,
): { finalSteps: Step[]; parameters: ToolParameter[] } {
  const finalSteps = steps.map((s, i) => {
    const meta = paramMap.get(i)
    if (!meta) return s

    // --- Navigate steps ---
    if (s.action === 'navigate') {
      // Full URL parameterization (replaces entire URL)
      const urlMeta = meta.get('__url')
      if (urlMeta?.enabled) {
        const name = toSnakeCase(urlMeta.paramName || 'url')
        return { ...s, url: `{{${name}}}`, urlParams: {} }
      }

      // Individual query params + path segments
      const newParams: Record<string, string> = { ...(s.urlParams ?? {}) }
      let newUrl = s.url ?? ''

      for (const [k, m] of meta) {
        if (!m.enabled) continue

        if (k === '__input' || k === '__url') continue

        if (k.startsWith('__path:')) {
          // Path segment parameterization
          const segIdx = parseInt(k.slice(7), 10)
          // Use snake_case name for the placeholder (must match parameter name)
          const name = toSnakeCase(m.paramName || `path_${segIdx}`)
          try {
            const parsed = new URL(newUrl, 'https://x')
            const segments = parsed.pathname.split('/')
            // segments[0] is '' (before leading /), real segments start at 1
            const realIdx = segIdx + 1
            if (realIdx < segments.length) {
              segments[realIdx] = `{{${name}}}`
              // Rebuild URL via string replacement instead of parsed.pathname setter
              // to avoid URL-encoding the {{...}} placeholder
              const newPath = segments.join('/')
              const oldPath = parsed.pathname
              newUrl = newUrl.replace(oldPath, newPath)
            }
          } catch { /* invalid URL, skip */ }
        } else {
          // Query param - use snake_case to match the parameter name
          newParams[k] = `{{${toSnakeCase(k)}}}`
        }
      }

      // Revert disabled query params to original values
      for (const [k, m] of meta) {
        if (!m.enabled && !k.startsWith('__path:') && k !== '__input' && k !== '__url') {
          newParams[k] = m.originalValue
        }
      }

      return { ...s, url: newUrl, urlParams: newParams }
    }

    // --- Type input parameterization ---
    if (s.action === 'type') {
      const inputMeta = meta.get('__input')
      if (inputMeta?.enabled) {
        const name = toSnakeCase(inputMeta.paramName || 'input_text')
        return { ...s, text: `{{${name}}}` }
      }
    }

    return s
  })

  const parameters: ToolParameter[] = []
  const seen = new Set<string>()
  for (const [, meta] of paramMap) {
    for (const [k, m] of meta) {
      if (!m.enabled) continue

      if (k === '__url') {
        const name = toSnakeCase(m.paramName || 'url')
        if (seen.has(name)) continue
        seen.add(name)
        parameters.push({ name, type: 'string', description: m.description || 'The full URL to navigate to', required: true, source: 'input', sourceKey: k })
      } else if (k.startsWith('__path:')) {
        const name = toSnakeCase(m.paramName || `path_${k.slice(7)}`)
        if (seen.has(name)) continue
        seen.add(name)
        parameters.push({ name, type: 'string', description: m.description || name, required: true, source: 'pathSegment', sourceKey: k })
      } else if (k === '__input') {
        const name = toSnakeCase(m.paramName || 'input_text')
        if (seen.has(name)) continue
        seen.add(name)
        parameters.push({ name, type: 'string', description: m.description || name, required: true, source: 'input', sourceKey: k })
      } else {
        const name = toSnakeCase(k)
        if (seen.has(name)) continue
        seen.add(name)
        parameters.push({ name, type: 'string', description: m.description || k, required: true, source: 'urlParam', sourceKey: k })
      }
    }
  }

  // Auto-detect {{param}} placeholders in forEachItem filter fields and generate parameters
  const placeholderRe = /\{\{(\w+)\}\}/g
  for (const step of finalSteps) {
    if (step.action !== 'forEachItem') continue
    const filters = step.filters as Array<{ field: string; op: string; value: string }> | undefined
    if (!filters?.length) continue
    for (const f of filters) {
      // Scan field name
      for (const m of f.field.matchAll(placeholderRe)) {
        const name = toSnakeCase(m[1])
        if (seen.has(name)) continue
        seen.add(name)
        parameters.push({ name, type: 'string', description: `Field name to filter by (${f.op})`, required: true, source: 'input', sourceKey: `filter:field` })
      }
      // Scan value
      for (const m of f.value.matchAll(placeholderRe)) {
        const name = toSnakeCase(m[1])
        if (seen.has(name)) continue
        seen.add(name)
        const desc = f.field && !f.field.includes('{{')
          ? `Filter value for "${f.field}" (${f.op})`
          : `Filter value (${f.op})`
        parameters.push({ name, type: 'string', description: desc, required: true, source: 'input', sourceKey: `filter:value` })
      }
    }
  }

  // Auto-detect {{param}} placeholders in code step bodies
  for (const step of finalSteps) {
    if (step.action !== 'code') continue
    const code = step.code as string | undefined
    if (!code) continue
    const codeParams = step._codeParams as Record<string, { description?: string; defaultValue?: string }> | undefined
    for (const m of code.matchAll(placeholderRe)) {
      const name = toSnakeCase(m[1])
      if (seen.has(name)) continue
      seen.add(name)
      const meta = codeParams?.[m[1]]
      parameters.push({
        name,
        type: 'string',
        description: meta?.description || 'Parameter used in code step',
        required: true,
        source: 'input',
        sourceKey: 'code',
        ...(meta?.defaultValue ? { default: meta.defaultValue } : {}),
      })
    }
  }

  return { finalSteps, parameters }
}
