/**
 * Shared step/lane/param management utilities for the sidepanel.
 *
 * These pure-logic helpers eliminate duplication between
 * record mode and edit mode in App.tsx.
 */

import type { Dispatch, SetStateAction } from 'react'

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

// ─── Build Final Data ───────────────────────────────────────────────────────

interface ToolParameter {
  name: string
  type: string
  description: string
  required: boolean
  source: string
  sourceKey: string
}

export function applyParamMap(
  steps: Step[],
  paramMap: ParamMap,
): { finalSteps: Step[]; parameters: ToolParameter[] } {
  const finalSteps = steps.map((s, i) => {
    const meta = paramMap.get(i)
    if (!meta || s.action !== 'navigate') return s
    const newParams: Record<string, string> = { ...(s.urlParams ?? {}) }
    for (const [k, m] of meta) {
      newParams[k] = m.enabled ? `{{${k}}}` : m.originalValue
    }
    return { ...s, urlParams: newParams }
  })

  const parameters: ToolParameter[] = []
  for (const [, meta] of paramMap) {
    for (const [k, m] of meta) {
      if (m.enabled) {
        parameters.push({ name: k, type: 'string', description: m.description || k, required: true, source: 'urlParam', sourceKey: k })
      }
    }
  }

  return { finalSteps, parameters }
}
