import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import {
  ArrowLeft, Server, Plus, Trash2, X, Circle, Square,
  List, FileText, Check, Globe, MousePointerClick,
  Keyboard, ArrowDownUp, ListFilter, Timer, Hourglass,
  Link, Database, Save, Wrench, Loader2, AlertTriangle, RefreshCw,
  GripVertical, ChevronUp, ChevronDown, Pencil, Columns,
  Download, Upload, Code, ScanEye, Layers,
} from 'lucide-react'
import { Button } from '~ui/button'
import { Input } from '~ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~ui/select'
import { cn } from '~lib/utils'
import {
  addStepToLane, deleteStepAt, moveStepAt,
  toggleParamAt, updateParamDescAt, updateParamNameAt, updateStepWaitUntilAt,
  updateStepFieldsAt, updateStepPropsAt, applyParamMap,
} from './step-utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  action: string
  url?: string
  urlParams?: Record<string, string>
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
  selector?: string
  text?: string
  direction?: string
  amount?: number
  value?: string
  ms?: number
  pattern?: string
  timeout?: number
  mode?: string
  fields?: unknown[]
  itemCount?: number
  [k: string]: unknown
}

interface ParamMeta {
  enabled: boolean
  description: string
  originalValue: string
  paramName?: string
}

interface AutomationServer { id: string; name: string; description?: string; toolIds?: string[] }
interface AutomationTool { id: string; name: string; displayName?: string; description?: string; serverId: string }

interface Lane {
  name: string
  steps: Step[]
}

interface AutomationToolFull extends AutomationTool {
  steps: Step[]
  lanes?: Lane[]
  parameters: Array<{ name: string; type: string; description: string; required: boolean; source?: string; sourceKey?: string }>
}

type View = 'list' | 'record' | 'save' | 'edit'

const STEP_ICONS: Record<string, typeof Globe> = {
  navigate: Globe, click: MousePointerClick, type: Keyboard, scroll: ArrowDownUp,
  select: ListFilter, wait: Timer, waitForSelector: Hourglass,
  waitForUrl: Link, waitForLoad: Hourglass, extract: Database,
  forEachItem: Layers,
}

function slugify(str: string): string {
  return str.toLowerCase().trim()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-z0-9_]/g, '')
    .replaceAll(/_+/g, '_')
    .replaceAll(/(?:^_)|(?:_$)/g, '') || 'tool'
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [view, setView] = useState<View>('list')
  const [servers, setServers] = useState<AutomationServer[]>([])
  const [tools, setTools] = useState<AutomationTool[]>([])
  const [serversLoading, setServersLoading] = useState(true)
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)

  // New server form
  const [showNewServerForm, setShowNewServerForm] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerDesc, setNewServerDesc] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  // Recording
  const [steps, setSteps] = useState<Step[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [paramMap, setParamMap] = useState<Map<number, Map<string, ParamMeta>>>(new Map())
  const [recordingViewport, setRecordingViewport] = useState<{ width: number; height: number } | null>(null)

  // Parallel lanes (record/edit)
  const [lanes, setLanes] = useState<Lane[]>([{ name: 'Lane 1', steps: [] }])
  const [activeLane, setActiveLane] = useState(0)
  const [editLanes, setEditLanes] = useState<Lane[]>([{ name: 'Lane 1', steps: [] }])

  // Manual wait step insertion
  const [showWaitInput, setShowWaitInput] = useState(false)
  const [waitSeconds, setWaitSeconds] = useState('1')

  // Connection
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Save dialog
  const [toolName, setToolName] = useState('')
  const [toolDesc, setToolDesc] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Server editing (inline)
  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [editServerName, setEditServerName] = useState('')
  const [editServerDesc, setEditServerDesc] = useState('')

  // Tool editing (full edit view)
  const [editTool, setEditTool] = useState<AutomationToolFull | null>(null)
  const [editSteps, setEditSteps] = useState<Step[]>([])
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editParamMap, setEditParamMap] = useState<Map<number, Map<string, ParamMeta>>>(new Map())
  const editDragIdxRef = useRef<number | null>(null)
  const [isEditRecording, setIsEditRecording] = useState(false)

  // Import/Export
  const importFileRef = useRef<HTMLInputElement>(null)
  const [importTarget, setImportTarget] = useState<{ type: 'server' } | { type: 'tool'; serverId: string } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [exportingToolId, setExportingToolId] = useState<string | null>(null)
  const exportingToolIdRef = useRef<string | null>(null)

  // Selector extract (manual CSS selector input)
  const [showSelectorInput, setShowSelectorInput] = useState(false)
  const [selectorValue, setSelectorValue] = useState('')
  const [selectorMode, setSelectorMode] = useState<'list' | 'single'>('list')
  const [selectorLoading, setSelectorLoading] = useState(false)
  const [selectorError, setSelectorError] = useState<string | null>(null)

  // Accessibility role extraction (separate A11y button)
  const [showAccessibilityInput, setShowAccessibilityInput] = useState(false)
  const [roleValues, setRoleValues] = useState<string[]>([])
  const [roleNameValue, setRoleNameValue] = useState('')
  const [roleIncludeChildren, setRoleIncludeChildren] = useState(true)
  const [axSnapshot, setAxSnapshot] = useState<string | null>(null)
  const [axSnapshotLoading, setAxSnapshotLoading] = useState(false)

  // ForEachItem sub-action recording flow
  const [subActionFlow, setSubActionFlow] = useState<{
    sourceExtractName: string
    sourceStep: Step
    phase: 'config' | 'recording'
    openMethod: 'url' | 'click'
    urlField: string
    clickSelector: string
    detailSteps: Step[]
    concurrency: number
    maxItems: number
    filters: Array<{ field: string; op: string; value: string }>
  } | null>(null)
  const subActionFlowRef = useRef(subActionFlow)
  useEffect(() => { subActionFlowRef.current = subActionFlow }, [subActionFlow])

  // Auto-scroll & drag state
  const stepsEndRef = useRef<HTMLDivElement>(null)
  const dragIdxRef = useRef<number | null>(null)
  const activeLaneRef = useRef(0)
  const viewRef = useRef<View>('list')

  const portRef = useRef<chrome.runtime.Port | null>(null)

  // ─── Chrome port ────────────────────────────────────────────────

  const connect = useCallback(() => {
    const port = chrome.runtime.connect({ name: 'sidepanel' })
    portRef.current = port

    port.onMessage.addListener((msg: Record<string, unknown>) => {
      const type = msg.type as string

      if (type === 'automationServers') {
        const data = (msg.data ?? {}) as { servers?: AutomationServer[]; tools?: AutomationTool[] }
        setServers(data.servers ?? [])
        setTools(data.tools ?? [])
        setServersLoading(false)
        setConnectionError(msg.error ? (msg.error as string) : null)
      } else if (type === 'createAutomationServerDone') {
        if (msg.error) {
          setCreateError(msg.error as string)
        } else {
          setShowNewServerForm(false)
          setNewServerName('')
          setNewServerDesc('')
          setCreateError(null)
          refreshServers(port)
        }
      } else if (type === 'updateAutomationServerDone') {
        // Optimistic update already applied in saveEditServer - just silently refresh without loading state
        if (!msg.error) port.postMessage({ type: 'getAutomationServers' })
      } else if (type === 'updateAutomationToolDone') {
        setEditSaving(false)
        if (!msg.error) {
          if (viewRef.current === 'edit') setIsEditRecording(false)
          refreshServers(port)
          setView('list')
        } else {
          setEditError(msg.error as string)
        }
      } else if (type === 'getAutomationToolDone') {
        if (msg.error) {
          setEditError(msg.error as string)
          setExportingToolId(null)
        } else {
          const tool = msg.data as AutomationToolFull

          // Check if this was an export request
          if (exportingToolIdRef.current === tool.id) {
            exportingToolIdRef.current = null
            setExportingToolId(null)
            const exportData = {
              name: tool.name,
              displayName: tool.displayName,
              description: tool.description,
              version: '1.0.0',
              parameters: tool.parameters ?? [],
              steps: tool.steps ?? [],
              ...(tool.lanes && tool.lanes.length > 1 ? { lanes: tool.lanes.map(l => ({ name: l.name, steps: l.steps })) } : {}),
            }
            downloadJson(exportData, `${slugify(tool.name)}-tool.json`)
            return
          }

          setEditTool(tool)
          setEditSteps(tool.steps ?? [])
          // Load lanes from tool or wrap steps as single lane
          // Handle both new named format and legacy Step[][] format
          let loadedLanes: Lane[]
          if (tool.lanes && tool.lanes.length > 1) {
            const first = tool.lanes[0]
            if (first && typeof first === 'object' && 'name' in first && 'steps' in first) {
              // New named format
              loadedLanes = tool.lanes as Lane[]
            } else {
              // Legacy Step[][] format - auto-wrap with default names
              loadedLanes = (tool.lanes as unknown as Step[][]).map((steps, i) => ({
                name: `Lane ${i + 1}`,
                steps,
              }))
            }
          } else {
            loadedLanes = [{ name: 'Lane 1', steps: tool.steps ?? [] }]
          }
          setEditLanes(loadedLanes)
          setActiveLane(0)
          setEditName(tool.displayName || tool.name)
          setEditDesc(tool.description ?? '')
          setEditError(null)

          // Rebuild paramMap from tool's existing parameters + steps
          const pMap = new Map<number, Map<string, ParamMeta>>()
          const toolSteps = tool.steps ?? []
          const toolParams = tool.parameters ?? []
          for (let si = 0; si < toolSteps.length; si++) {
            const s = toolSteps[si]
            const stepMeta = new Map<string, ParamMeta>()

            if (s.action === 'navigate') {
              // Query params
              const navParams = s.urlParams ? Object.entries(s.urlParams) : (() => {
                try { return Array.from(new URL(s.url ?? '', 'https://x').searchParams.entries()) } catch { return [] }
              })()
              for (const [k, v] of navParams) {
                const isParameterized = typeof v === 'string' && /^\{\{.+\}\}$/.test(v)
                const matchingParam = toolParams.find(p => p.sourceKey === k || p.name === k)
                stepMeta.set(k, {
                  enabled: isParameterized,
                  description: matchingParam?.description ?? '',
                  originalValue: isParameterized ? (matchingParam?.name ?? k) : v,
                })
              }

              // Path segments - detect {{...}} placeholders in the URL path
              if (s.url) {
                try {
                  const parsed = new URL(s.url, 'https://x')
                  const segments = parsed.pathname.split('/').slice(1)
                  for (let idx = 0; idx < segments.length; idx++) {
                    const seg = segments[idx]
                    const match = /^\{\{(.+)\}\}$/.exec(seg)
                    if (match) {
                      const paramName = match[1]
                      const key = `__path:${idx}`
                      const matchingParam = toolParams.find(p => p.sourceKey === key || p.name === paramName)
                      stepMeta.set(key, {
                        enabled: true,
                        description: matchingParam?.description ?? '',
                        originalValue: paramName,
                        paramName,
                      })
                    }
                  }
                } catch { /* invalid URL */ }
              }
            }

            // Type inputs - detect {{...}} placeholder in step.text
            if (s.action === 'type' && s.text) {
              const match = /^\{\{(.+)\}\}$/.exec(s.text)
              if (match) {
                const paramName = match[1]
                const key = '__input'
                const matchingParam = toolParams.find(p => p.sourceKey === key || p.name === paramName)
                stepMeta.set(key, {
                  enabled: true,
                  description: matchingParam?.description ?? '',
                  originalValue: paramName,
                  paramName,
                })
              }
            }

            if (stepMeta.size > 0) pMap.set(si, stepMeta)
          }
          setEditParamMap(pMap)
          setView('edit')
        }
      } else if (type === 'deleteAutomationServerDone' || type === 'deleteAutomationToolDone') {
        if (!msg.error) refreshServers(port)
      } else if (type === 'createAutomationToolDone') {
        setIsSaving(false)
        if (msg.error) {
          setSaveError(msg.error as string)
        } else {
          // Tool created - go back to list
          setSteps([])
          setParamMap(new Map())
          setToolName('')
          setToolDesc('')
          setSaveError(null)
          setView('list')
          refreshServers(port)
        }
      } else if (type === 'recording-started') {
        if (msg.viewport) setRecordingViewport(msg.viewport as { width: number; height: number })
      } else if (type === 'recording-step' && msg.step != null) {
        const newStep = msg.step as Step
        console.log(`[izan-ext] recording-step: action=${newStep.action} subRecording=${subActionFlowRef.current?.phase === 'recording'}`)
        if (subActionFlowRef.current?.phase === 'recording') {
          // Sub-recording: capture click as clickSelector for click method
          if (subActionFlowRef.current.openMethod === 'click'
              && !subActionFlowRef.current.clickSelector
              && newStep.action === 'click') {
            console.log('[izan-ext] sub-recording: captured clickSelector')
            setSubActionFlow(prev => prev ? { ...prev, clickSelector: newStep.selector ?? '' } : prev)
            return
          }
          // Skip navigate steps during sub-recording (auto-navigation)
          if (newStep.action === 'navigate') { console.log('[izan-ext] sub-recording: skip navigate'); return }
          console.log(`[izan-ext] sub-recording: added ${newStep.action} to detailSteps`)
          setSubActionFlow(prev => prev ? { ...prev, detailSteps: [...prev.detailSteps, newStep] } : prev)
          return
        }
        if (viewRef.current === 'edit') {
          addStepToLane(setEditSteps, setEditLanes, activeLaneRef.current, newStep)
        } else {
          addStepToLane(setSteps, setLanes, activeLaneRef.current, newStep)
        }
      } else if (type === 'recording-complete') {
        if (viewRef.current === 'edit') {
          setIsEditRecording(false)
        } else {
          setIsRecording(false)
        }
        if (msg.error) setRecordError(msg.error as string)
      } else if (type === 'extract-result' && msg.step != null && (msg.step as Step).action === 'extract') {
        const newStep = { ...(msg.step as Step), _preview: (msg as Record<string, unknown>).preview, _previewHtml: (msg as Record<string, unknown>).previewHtml as string[] | undefined }
        console.log(`[izan-ext] extract-result: mode=${newStep.mode} subRecording=${subActionFlowRef.current?.phase === 'recording'}`)
        if (subActionFlowRef.current?.phase === 'recording') {
          console.log('[izan-ext] sub-recording: added extract to detailSteps')
          setSubActionFlow(prev => prev ? { ...prev, detailSteps: [...prev.detailSteps, newStep] } : prev)
          return
        }
        if (viewRef.current === 'edit') {
          addStepToLane(setEditSteps, setEditLanes, activeLaneRef.current, newStep)
        } else {
          addStepToLane(setSteps, setLanes, activeLaneRef.current, newStep)
        }
      } else if (type === 'exportAutomationServerDone') {
        if (msg.error) {
          setImportError(msg.error as string)
        } else if (msg.data) {
          const raw = msg.data as {
            server: { name: string; description: string; category: string }
            tools: {
              name: string; displayName: string; description: string
              version?: string; parameters?: unknown[]; steps?: unknown[]
              lanes?: { name: string; steps: unknown[] }[]
            }[]
          }
          const exportData = {
            server: { name: raw.server.name, description: raw.server.description, category: raw.server.category },
            tools: raw.tools.map(t => ({
              name: t.name,
              displayName: t.displayName,
              description: t.description,
              version: t.version || '1.0.0',
              parameters: t.parameters ?? [],
              steps: t.steps ?? [],
              ...(t.lanes && t.lanes.length > 1 ? { lanes: t.lanes.map(l => ({ name: l.name, steps: l.steps })) } : {}),
            })),
          }
          downloadJson(exportData, `${slugify(raw.server.name)}-server.json`)
        }
      } else if (type === 'importAutomationServerDone' || type === 'importAutomationToolDone') {
        if (msg.error) {
          setImportError(msg.error as string)
        } else {
          setImportError(null)
          refreshServers(port)
        }
      } else if (type === 'selector-extract-result' && msg.step != null && (msg.step as Step).action === 'extract') {
        setSelectorLoading(false)
        setSelectorError(null)
        setShowSelectorInput(false)
        setShowAccessibilityInput(false)
        setSelectorValue('')
        const newStep = { ...(msg.step as Step), _preview: (msg as Record<string, unknown>).preview, _previewHtml: (msg as Record<string, unknown>).previewHtml as string[] | undefined }
        // Add role metadata when extracted via accessibility
        // Background now sends extractionMethod:'role' directly, but also check ref as fallback
        if (newStep.extractionMethod !== 'role' && newStep.extractionMethod !== 'snapshot' && showA11yRef.current) {
          newStep.extractionMethod = 'role'
          newStep.roles = roleValuesRef.current
          newStep.roleName = roleNameRef.current.trim()
          newStep.roleIncludeChildren = roleIncChildRef.current
        }
        setRoleValues([])
        setRoleNameValue('')
        console.log(`[izan-ext] selector-extract-result: mode=${newStep.mode} method=${newStep.extractionMethod ?? 'css'} subRecording=${subActionFlowRef.current?.phase === 'recording'}`)
        if (subActionFlowRef.current?.phase === 'recording') {
          console.log('[izan-ext] sub-recording: added selector-extract to detailSteps')
          setSubActionFlow(prev => prev ? { ...prev, detailSteps: [...prev.detailSteps, newStep] } : prev)
        } else if (viewRef.current === 'edit') {
          addStepToLane(setEditSteps, setEditLanes, activeLaneRef.current, newStep)
        } else {
          addStepToLane(setSteps, setLanes, activeLaneRef.current, newStep)
        }
      } else if (type === 'selector-extract-error') {
        setSelectorLoading(false)
        setSelectorError(msg.error as string)
      } else if (type === 'accessibility-snapshot-result') {
        setAxSnapshotLoading(false)
        setAxSnapshot(msg.data as string)
      } else if (type === 'accessibility-snapshot-error') {
        setAxSnapshotLoading(false)
        setSelectorError(msg.error as string)
      }
    })

    port.onDisconnect.addListener(() => { portRef.current = null; setTimeout(connect, 1000) })
    port.postMessage({ type: 'getAutomationServers' })
  }, [])

  function refreshServers(port: chrome.runtime.Port) {
    setServersLoading(true)
    port.postMessage({ type: 'getAutomationServers' })
  }

  useEffect(() => { connect() }, [connect])

  useEffect(() => {
    if (portRef.current && view === 'list') {
      refreshServers(portRef.current)
    }
  }, [view])

  // Keep refs in sync with state for use in callbacks
  const showA11yRef = useRef(false)
  const roleValuesRef = useRef<string[]>([])
  const roleNameRef = useRef('')
  const roleIncChildRef = useRef(true)
  useEffect(() => { activeLaneRef.current = activeLane }, [activeLane])
  useEffect(() => { exportingToolIdRef.current = exportingToolId }, [exportingToolId])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { showA11yRef.current = showAccessibilityInput }, [showAccessibilityInput])
  useEffect(() => { roleValuesRef.current = roleValues }, [roleValues])
  useEffect(() => { roleNameRef.current = roleNameValue }, [roleNameValue])
  useEffect(() => { roleIncChildRef.current = roleIncludeChildren }, [roleIncludeChildren])

  // Auto-scroll to bottom only when new steps are added (not on delete)
  const prevStepsLenRef = useRef(0)
  const prevEditStepsLenRef = useRef(0)
  useEffect(() => {
    if (steps.length > prevStepsLenRef.current || editSteps.length > prevEditStepsLenRef.current) {
      stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevStepsLenRef.current = steps.length
    prevEditStepsLenRef.current = editSteps.length
  }, [steps.length, editSteps.length])

  // ─── ForEachItem sub-action flow ─────────────────────────────────

  /** Apply filter rows to a list of preview items (AND logic) */
  function applyPreviewFilters(items: unknown[], filters: Array<{ field: string; op: string; value: string }>): unknown[] {
    if (!filters.length) return items
    return items.filter(raw => {
      const obj = raw as Record<string, unknown>
      return filters.every(f => {
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
  }

  function startSubActionRecording() {
    if (!subActionFlow || subActionFlow.phase !== 'config') return
    // Use functional update to capture the LATEST state (handles blur→click timing)
    setSubActionFlow(prev => {
      if (!prev || prev.phase !== 'config') return prev
      // Navigate after state update is committed
      if (prev.openMethod === 'url') {
        const sourceStep = prev.sourceStep
        const rawPreview = sourceStep._preview as unknown[]
        if (Array.isArray(rawPreview) && rawPreview.length > 0) {
          const filtered = applyPreviewFilters(rawPreview, prev.filters)
          const target = filtered.length > 0 ? filtered[0] : null
          if (target) {
            const url = (target as Record<string, unknown>)[prev.urlField] as string | undefined
            if (url && portRef.current) {
              // Delay navigation slightly to let React commit the phase change
              setTimeout(() => portRef.current?.postMessage({ type: 'navigateRecordingTab', url }), 50)
            }
          }
        }
      }
      return { ...prev, phase: 'recording' }
    })
  }

  function finishSubActionFlow() {
    if (!subActionFlow || subActionFlow.detailSteps.length === 0) return
    const forEachStep: Step = {
      action: 'forEachItem',
      label: `For each item in ${subActionFlow.sourceExtractName}`,
      sourceExtract: subActionFlow.sourceExtractName,
      openMethod: subActionFlow.openMethod,
      ...(subActionFlow.openMethod === 'url' && { urlField: subActionFlow.urlField }),
      ...(subActionFlow.openMethod === 'click' && {
        clickSelector: subActionFlow.clickSelector,
        containerSelector: subActionFlow.sourceStep.containerSelector as string,
      }),
      detailSteps: subActionFlow.detailSteps,
      concurrency: subActionFlow.concurrency,
      maxItems: subActionFlow.maxItems,
      waitUntil: 'load',
      ...(subActionFlow.filters.length > 0 && { filters: subActionFlow.filters }),
    }
    if (viewRef.current === 'edit') {
      addStepToLane(setEditSteps, setEditLanes, activeLaneRef.current, forEachStep)
    } else {
      addStepToLane(setSteps, setLanes, activeLaneRef.current, forEachStep)
    }
    setSubActionFlow(null)
  }

  // ─── Handlers ───────────────────────────────────────────────────

  const handleRecord = () => {
    setSteps([])
    setParamMap(new Map())
    setRecordError(null)
    setRecordingViewport(null)
    setIsRecording(true)
    // Reset only the active lane's steps (keep other lanes intact)
    setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: [] } : l))
    portRef.current?.postMessage({ type: 'startRecording' })
  }

  const handleStop = () => {
    portRef.current?.postMessage({ type: 'stopRecording' })
    setIsRecording(false)
  }

  const handleExtract = (mode: 'list' | 'single') => {
    portRef.current?.postMessage({ type: 'extract', mode })
  }

  // Edit-mode recording: append new steps to existing macro
  const handleEditRecord = () => {
    setRecordError(null)
    setIsEditRecording(true)
    portRef.current?.postMessage({ type: 'startRecording' })
  }

  const handleEditStop = () => {
    portRef.current?.postMessage({ type: 'stopRecording' })
    setIsEditRecording(false)
  }

  const handleEditExtract = (mode: 'list' | 'single') => {
    portRef.current?.postMessage({ type: 'extract', mode })
  }

  const handleSelectorExtract = () => {
    if (!selectorValue.trim()) return
    setSelectorLoading(true)
    setSelectorError(null)
    portRef.current?.postMessage({ type: 'selectorExtract', selector: selectorValue.trim(), mode: selectorMode })
  }

  const handleAccessibilityExtract = () => {
    if (roleValues.length === 0) return
    setSelectorLoading(true)
    setSelectorError(null)
    portRef.current?.postMessage({ type: 'roleExtract', roles: roleValues, name: roleNameValue.trim(), includeChildren: roleIncludeChildren })
  }

  const handleAccessibilitySnapshot = () => {
    setAxSnapshotLoading(true)
    setSelectorError(null)
    setAxSnapshot(null)
    portRef.current?.postMessage({ type: 'fullAccessibilitySnapshot' })
  }

  const handleSnapshotExtract = () => {
    const newStep: Step = {
      action: 'extract',
      name: 'accessibility_tree',
      mode: 'single',
      containerSelector: '',
      extractionMethod: 'snapshot',
      fields: [{ key: 'tree', selector: '', type: 'text' }],
      label: 'Extract full accessibility tree',
    }
    // If we already have a snapshot, attach it as preview
    if (axSnapshot) {
      (newStep as Record<string, unknown>)._preview = { tree: axSnapshot }
    }
    setShowAccessibilityInput(false)
    setAxSnapshot(null)
    if (subActionFlowRef.current?.phase === 'recording') {
      setSubActionFlow(prev => prev ? { ...prev, detailSteps: [...prev.detailSteps, newStep] } : prev)
    } else if (viewRef.current === 'edit') {
      addStepToLane(setEditSteps, setEditLanes, activeLaneRef.current, newStep)
    } else {
      addStepToLane(setSteps, setLanes, activeLaneRef.current, newStep)
    }
  }

  const buildFinalData = () => {
    const { finalSteps, parameters } = applyParamMap(steps, paramMap)
    const hasMultipleLanes = lanes.length > 1
    const finalLanes = hasMultipleLanes ? lanes.map(l => ({ name: l.name, steps: l.steps })) : undefined
    return { steps: finalSteps, parameters, lanes: finalLanes }
  }

  const handleDone = () => {
    // Save current steps into active lane before transitioning to save
    setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps } : l))
    setToolName('')
    setToolDesc('')
    setSaveError(null)
    setShowWaitInput(false)
    setWaitSeconds('1')
    setView('save')
  }

  const handleSaveTool = () => {
    if (!toolName.trim()) {
      setSaveError('Tool name is required')
      return
    }
    if (!selectedServerId) {
      setSaveError('No server selected')
      return
    }

    const { steps: finalSteps, parameters, lanes: finalLanes } = buildFinalData()
    setIsSaving(true)
    setSaveError(null)

    portRef.current?.postMessage({
      type: 'createAutomationTool',
      serverId: selectedServerId,
      name: slugify(toolName),
      displayName: toolName.trim(),
      description: toolDesc.trim(),
      parameters,
      steps: finalSteps,
      ...(finalLanes ? { lanes: finalLanes } : {}),
      ...(recordingViewport ? { viewport: recordingViewport } : {}),
      version: '1.0.0',
    })
  }

  const openRecordView = (serverId: string) => {
    setSelectedServerId(serverId)
    setSteps([])
    setParamMap(new Map())
    setRecordError(null)
    setLanes([{ name: 'Lane 1', steps: [] }])
    setActiveLane(0)
    setView('record')
  }

  const backToList = () => {
    setSelectedServerId(null)
    setShowWaitInput(false)
    setWaitSeconds('1')
    setView('list')
  }

  const getToolsForServer = (serverId: string) => tools.filter((t) => t.serverId === serverId)

  const handleCreateServer = () => {
    setCreateError(null)
    if (!newServerName.trim()) { setCreateError('Name is required'); return }
    portRef.current?.postMessage({ type: 'createAutomationServer', name: newServerName.trim(), description: newServerDesc.trim() })
  }

  const handleDeleteServer = (serverId: string, serverName: string) => {
    if (!globalThis.confirm(`Delete "${serverName}" and all its tools?`)) return
    portRef.current?.postMessage({ type: 'deleteAutomationServer', serverId })
  }

  const handleDeleteTool = (toolId: string, toolName: string) => {
    if (!globalThis.confirm(`Delete tool "${toolName}"?`)) return
    portRef.current?.postMessage({ type: 'deleteAutomationTool', toolId })
  }

  // ─── Export / Import ───────────────────────────────────────────

  const handleExportServer = (serverId: string) => {
    portRef.current?.postMessage({ type: 'exportAutomationServer', serverId })
  }

  const handleExportTool = (toolId: string) => {
    // Request full tool data, then download
    portRef.current?.postMessage({ type: 'getAutomationTool', toolId })
    // We intercept the response in getAutomationToolDone - but that opens edit view.
    // Instead, use a separate flag to trigger download instead of edit view.
    setExportingToolId(toolId)
  }

  const handleImportServer = () => {
    setImportTarget({ type: 'server' })
    setImportError(null)
    importFileRef.current?.click()
  }

  const handleImportTool = (serverId: string) => {
    setImportTarget({ type: 'tool', serverId })
    setImportError(null)
    importFileRef.current?.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !importTarget) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)

        if (importTarget.type === 'server') {
          // Expect { server: {...}, tools: [...] }
          if (!json.server || !json.tools) {
            setImportError('Invalid server JSON: expected { server, tools }')
            return
          }
          portRef.current?.postMessage({ type: 'importAutomationServer', data: json })
        } else {
          // Expect a single tool object: { name, steps, ... }
          if (!json.name || !json.steps) {
            setImportError('Invalid tool JSON: expected { name, steps, ... }')
            return
          }
          portRef.current?.postMessage({ type: 'importAutomationTool', serverId: importTarget.serverId, data: json })
        }
      } catch {
        setImportError('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)

    // Reset file input so re-selecting the same file works
    e.target.value = ''
  }

  const handleAddWaitStep = (isEditMode: boolean) => {
    const seconds = parseFloat(waitSeconds)
    if (isNaN(seconds) || seconds <= 0 || seconds > 30) return
    const waitStep: Step = { action: 'wait', ms: Math.round(seconds * 1000) }

    if (subActionFlowRef.current?.phase === 'recording') {
      setSubActionFlow(prev => prev ? { ...prev, detailSteps: [...prev.detailSteps, waitStep] } : prev)
    } else if (isEditMode) {
      addStepToLane(setEditSteps, setEditLanes, activeLane, waitStep)
    } else {
      addStepToLane(setSteps, setLanes, activeLane, waitStep)
    }

    setShowWaitInput(false)
    setWaitSeconds('1')
  }

  const handleClearAllSteps = (isEditMode: boolean) => {
    if (isEditMode) {
      setEditSteps([])
      setEditLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: [] } : l))
      setEditParamMap(new Map())
    } else {
      setSteps([])
      setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: [] } : l))
      setParamMap(new Map())
    }
  }

  const handleDeleteStep = (idx: number) => {
    deleteStepAt(setSteps, setLanes, setParamMap, activeLane, idx)
  }

  const handleMoveStep = (from: number, to: number) => {
    moveStepAt(setSteps, setLanes, setParamMap, activeLane, from, to, steps.length)
  }

  const handleDropStep = (dragFrom: number, dropTo: number) => {
    if (dragFrom === dropTo) return
    handleMoveStep(dragFrom, dropTo)
  }

  // ─── Edit handlers ──────────────────────────────────────────────

  const startEditServer = (s: AutomationServer) => {
    setEditingServerId(s.id)
    setEditServerName(s.name)
    setEditServerDesc(s.description ?? '')
  }

  const saveEditServer = () => {
    if (!editingServerId || !editServerName.trim()) return
    portRef.current?.postMessage({
      type: 'updateAutomationServer',
      serverId: editingServerId,
      name: editServerName.trim(),
      description: editServerDesc.trim(),
    })
    setEditingServerId(null)
    // Optimistic update
    setServers(prev => prev.map(s => s.id === editingServerId ? { ...s, name: editServerName.trim(), description: editServerDesc.trim() } : s))
  }

  const cancelEditServer = () => { setEditingServerId(null) }

  const openEditView = (toolId: string) => {
    setEditError(null)
    setEditSaving(false)
    portRef.current?.postMessage({ type: 'getAutomationTool', toolId })
  }

  const handleSaveEdit = () => {
    if (!editTool || !editName.trim()) return
    setEditSaving(true)
    setEditError(null)
    const hasMultipleLanes = editLanes.length > 1

    const { finalSteps, parameters } = applyParamMap(editSteps, editParamMap)

    portRef.current?.postMessage({
      type: 'updateAutomationTool',
      toolId: editTool.id,
      name: slugify(editName),
      displayName: editName.trim(),
      description: editDesc.trim(),
      steps: finalSteps,
      parameters,
      ...(hasMultipleLanes ? { lanes: editLanes.map(l => ({ name: l.name, steps: l.steps })) } : {}),
    })
  }

  const editMoveStep = (from: number, to: number) => {
    moveStepAt(setEditSteps, setEditLanes, setEditParamMap, activeLane, from, to, editSteps.length)
  }

  const editDeleteStep = (idx: number) => {
    deleteStepAt(setEditSteps, setEditLanes, setEditParamMap, activeLane, idx)
  }

  const editDropStep = (dragFrom: number, dropTo: number) => {
    if (dragFrom === dropTo) return
    editMoveStep(dragFrom, dropTo)
  }

  const editToggleParam = (stepIdx: number, key: string, originalValue: string) => {
    toggleParamAt(setEditParamMap, stepIdx, key, originalValue)
  }

  const editUpdateParamDescription = (stepIdx: number, key: string, description: string) => {
    updateParamDescAt(setEditParamMap, stepIdx, key, description)
  }

  const editUpdateParamName = (stepIdx: number, key: string, paramName: string) => {
    updateParamNameAt(setEditParamMap, stepIdx, key, paramName)
  }

  // ─── Lane management ────────────────────────────────────────────

  const switchLane = (index: number, isEditMode: boolean) => {
    if (isEditMode) {
      // Save current editSteps into current lane before switching
      setEditLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps: editSteps } : l))
      setEditSteps(editLanes[index]?.steps ?? [])
    } else {
      // Save current steps into current lane before switching
      setLanes(prev => prev.map((l, i) => i === activeLane ? { ...l, steps } : l))
      setSteps(lanes[index]?.steps ?? [])
      setParamMap(new Map()) // paramMap is per-lane, reset on switch
    }
    setActiveLane(index)
  }

  const addLane = (isEditMode: boolean) => {
    if (isEditMode) {
      const newName = `Lane ${editLanes.length + 1}`
      setEditLanes(prev => [...prev, { name: newName, steps: [] }])
      const newIdx = editLanes.length
      setActiveLane(newIdx)
      setEditSteps([])
    } else {
      const newName = `Lane ${lanes.length + 1}`
      // Save current steps into current lane before adding new one
      setLanes(prev => {
        const updated = prev.map((l, i) => i === activeLane ? { ...l, steps } : l)
        return [...updated, { name: newName, steps: [] }]
      })
      const newIdx = lanes.length
      setActiveLane(newIdx)
      setSteps([])
      setParamMap(new Map())
    }
  }

  const removeLane = (index: number, isEditMode: boolean) => {
    if (isEditMode) {
      if (editLanes.length <= 1) return
      const next = editLanes.filter((_, i) => i !== index)
      setEditLanes(next)
      const newActive = index >= next.length ? next.length - 1 : index
      setActiveLane(newActive)
      setEditSteps(next[newActive]?.steps ?? [])
    } else {
      if (lanes.length <= 1) return
      const next = lanes.filter((_, i) => i !== index)
      setLanes(next)
      const newActive = index >= next.length ? next.length - 1 : index
      setActiveLane(newActive)
      setSteps(next[newActive]?.steps ?? [])
      setParamMap(new Map())
    }
  }

  const renameLane = (index: number, newName: string, isEditMode: boolean) => {
    if (isEditMode) {
      setEditLanes(prev => prev.map((l, i) => i === index ? { ...l, name: newName } : l))
    } else {
      setLanes(prev => prev.map((l, i) => i === index ? { ...l, name: newName } : l))
    }
  }

  const toggleParam = (stepIdx: number, key: string, originalValue: string) => {
    toggleParamAt(setParamMap, stepIdx, key, originalValue)
  }

  const updateParamDescription = (stepIdx: number, key: string, description: string) => {
    updateParamDescAt(setParamMap, stepIdx, key, description)
  }

  const updateParamName = (stepIdx: number, key: string, paramName: string) => {
    updateParamNameAt(setParamMap, stepIdx, key, paramName)
  }

  // ─── Counts ────────────────────────────────────────────────────

  const updateStepWaitUntil = (idx: number, value: Step['waitUntil'], isEditMode: boolean) => {
    if (isEditMode) {
      updateStepWaitUntilAt(setEditSteps, setEditLanes, activeLane, idx, value)
    } else {
      updateStepWaitUntilAt(setSteps, setLanes, activeLane, idx, value)
    }
  }

  const extractCount = steps.filter(s => s.action === 'extract').length
  const paramCount = Array.from(paramMap.values()).reduce(
    (sum, m) => sum + Array.from(m.values()).filter(p => p.enabled).length, 0
  )

  // ─── Edit view ─────────────────────────────────────────────────

  if (view === 'edit') {
    return (
      <div className="flex flex-col h-screen">
        <Header
          title="Edit Macro"
          icon={isEditRecording ? <Circle className="h-4 w-4 text-destructive fill-destructive animate-pulse-dot" /> : <Pencil className="h-4 w-4 text-primary" />}
          onBack={() => { if (isEditRecording) handleEditStop(); backToList() }}
        />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Macro Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="What does this macro do?" />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { if (isEditRecording) handleEditStop(); backToList() }} disabled={editSaving}>Cancel</Button>
              <Button variant="default" size="sm" className="flex-1" onClick={handleSaveEdit} disabled={editSaving || isEditRecording}>
                {editSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save Changes'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => addLane(true)} disabled={isEditRecording}>
                <Columns className="h-3.5 w-3.5" /> Add Lane
              </Button>
              {editTool && (
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExportTool(editTool.id)} disabled={isEditRecording}>
                  <Download className="h-3.5 w-3.5" /> Export JSON
                </Button>
              )}
            </div>
          </div>

          {/* Recording toolbar */}
          <div className="flex flex-wrap gap-2 px-1">
            {isEditRecording ? (
              <Button variant="destructive" size="sm" onClick={handleEditStop}>
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={handleEditRecord}>
                <Circle className="h-3.5 w-3.5" /> Record
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleEditExtract('list')}>
              <List className="h-3.5 w-3.5" /> List
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleEditExtract('single')}>
              <FileText className="h-3.5 w-3.5" /> Single
            </Button>
            <Button variant={showSelectorInput ? 'secondary' : 'outline'} size="sm" onClick={() => { setShowSelectorInput(!showSelectorInput); setShowAccessibilityInput(false); setSelectorError(null) }}>
              <Code className="h-3.5 w-3.5" /> Selector
            </Button>
            <Button variant={showAccessibilityInput ? 'secondary' : 'outline'} size="sm" onClick={() => { setShowAccessibilityInput(!showAccessibilityInput); setShowSelectorInput(false); setSelectorError(null) }}>
              <ScanEye className="h-3.5 w-3.5" /> A11y
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowWaitInput(!showWaitInput)}>
              <Timer className="h-3.5 w-3.5" /> Wait
            </Button>
            <Button variant="outline" size="sm" disabled={isEditRecording || editSteps.length === 0} onClick={() => handleClearAllSteps(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>

          {/* CSS Selector input (edit mode) */}
          {showSelectorInput && (
            <div className="px-1">
              <SelectorInputForm
                value={selectorValue} onChange={setSelectorValue}
                mode={selectorMode} onModeChange={setSelectorMode}
                loading={selectorLoading} error={selectorError}
                onSubmit={handleSelectorExtract}
                onClose={() => { setShowSelectorInput(false); setSelectorError(null); setSelectorValue('') }}
              />
            </div>
          )}

          {/* Accessibility input (edit mode) */}
          {showAccessibilityInput && (
            <div className="px-1">
              <AccessibilityInputForm
                roleValues={roleValues} onRoleValuesChange={setRoleValues}
                roleNameValue={roleNameValue} onRoleNameValueChange={setRoleNameValue}
                roleIncludeChildren={roleIncludeChildren} onRoleIncludeChildrenChange={setRoleIncludeChildren}
                loading={selectorLoading} error={selectorError}
                onSubmit={handleAccessibilityExtract}
                onClose={() => { setShowAccessibilityInput(false); setSelectorError(null); setRoleValues([]); setRoleNameValue(''); setRoleIncludeChildren(true); setAxSnapshot(null) }}
                snapshot={axSnapshot} snapshotLoading={axSnapshotLoading} onSnapshot={handleAccessibilitySnapshot} onSnapshotExtract={handleSnapshotExtract}
              />
            </div>
          )}

          {/* Manual wait input (edit mode) */}
          {showWaitInput && (
            <div className="flex items-center gap-2 px-1">
              <Input
                type="number"
                min="0.1"
                max="30"
                step="0.1"
                value={waitSeconds}
                onChange={(e) => setWaitSeconds(e.target.value)}
                className="w-20"
                placeholder="1"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddWaitStep(true) }}
              />
              <span className="text-sm text-muted-foreground">sec</span>
              <Button variant="default" size="sm" onClick={() => handleAddWaitStep(true)}>Add</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowWaitInput(false); setWaitSeconds('1') }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {recordError && (
            <div className="px-1">
              <div className="px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <X className="h-4 w-4 shrink-0" />
                {recordError}
              </div>
            </div>
          )}

          {/* Lane tabs */}
          <LaneTabBar
            lanes={editLanes}
            activeLane={activeLane}
            onSwitch={(i) => switchLane(i, true)}
            onAdd={() => addLane(true)}
            onRemove={(i) => removeLane(i, true)}
            onRename={(i, name) => renameLane(i, name, true)}
          />

          {/* Steps */}
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
              Steps ({editSteps.length}){editLanes.length > 1 && ` · ${editLanes[activeLane]?.name ?? `Lane ${activeLane + 1}`}`}
            </p>
            {editSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {isEditRecording ? 'Recording - interact with the page…' : 'No steps - press Record to add actions'}
              </p>
            ) : editSteps.map((step, i) => (
              <StepCard
                key={i}
                index={i}
                total={editSteps.length}
                step={step}
                paramMeta={editParamMap.get(i) ?? new Map()}
                onDelete={() => editDeleteStep(i)}
                onMoveUp={() => editMoveStep(i, i - 1)}
                onMoveDown={() => editMoveStep(i, i + 1)}
                onDragStart={() => { editDragIdxRef.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (editDragIdxRef.current !== null) { editDropStep(editDragIdxRef.current, i); editDragIdxRef.current = null } }}
                onToggleParam={(key, orig) => editToggleParam(i, key, orig)}
                onDescriptionChange={(key, desc) => editUpdateParamDescription(i, key, desc)}
                onParamNameChange={(key, name) => editUpdateParamName(i, key, name)}
                onWaitUntilChange={(val) => updateStepWaitUntil(i, val, true)}
                onUpdateFields={step.action === 'extract'
                  ? (fields) => updateStepFieldsAt(setEditSteps, setEditLanes, activeLane, i, fields)
                  : undefined}
                onSubActions={(name, sourceStep) => {
                  setSubActionFlow({
                    sourceExtractName: name,
                    sourceStep,
                    phase: 'config',
                    openMethod: 'url',
                    urlField: '',
                    clickSelector: '',
                    detailSteps: [],
                    concurrency: 3,
                    maxItems: 0,
                    filters: [],
                  })
                }}
                onUpdateStepProps={(props) => updateStepPropsAt(setEditSteps, setEditLanes, activeLane, i, props)}
                sourceFieldKeys={step.action === 'forEachItem' ? (() => {
                  const src = editSteps.find(s => s.action === 'extract' && s.name === step.sourceExtract)
                  return (src?.fields as Array<{ key: string }> | undefined)?.map(f => f.key) ?? []
                })() : undefined}
              />
            ))}
            <div ref={stepsEndRef} />

            {/* Sub-action recording indicator (edit mode) */}
            {subActionFlow?.phase === 'recording' && (
              <SubActionRecordingPanel
                subActionFlow={subActionFlow}
                setSubActionFlow={setSubActionFlow}
                onFinish={finishSubActionFlow}
              />
            )}

            {/* Sub-action config panel (edit mode) */}
            {subActionFlow?.phase === 'config' && (
              <SubActionConfigPanel
                subActionFlow={subActionFlow}
                setSubActionFlow={setSubActionFlow}
                onStart={startSubActionRecording}
                onCancel={() => setSubActionFlow(null)}
              />
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t text-sm text-muted-foreground">
          {isEditRecording && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />}
          <span>
            {editSteps.length} step{editSteps.length !== 1 ? 's' : ''}
            {editLanes.length > 1 && ` · ${editLanes[activeLane]?.name ?? `Lane ${activeLane + 1}`}/${editLanes.length}`}
            {editLanes.length > 1 && ` (${editLanes.reduce((s, l) => s + l.steps.length, 0)} total)`}
            {isEditRecording && ' · Recording…'}
          </span>
        </div>
      </div>
    )
  }

  // ─── Save view ─────────────────────────────────────────────────

  if (view === 'save') {
    const serverName = servers.find(s => s.id === selectedServerId)?.name ?? ''
    return (
      <div className="flex flex-col h-screen">
        <Header
          title="Save Macro"
          icon={<Save className="h-4 w-4 text-primary" />}
          onBack={() => setView('record')}
        />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Server: <span className="font-medium text-foreground">{serverName}</span>
              {lanes.length > 1
                ? ` · ${lanes.length} lanes · ${lanes.reduce((s, l) => s + l.steps.length, 0)} total steps`
                : ` · ${steps.length} steps`}
              {paramCount > 0 && ` · ${paramCount} params`}
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Macro Name</label>
              <Input value={toolName} onChange={(e) => setToolName(e.target.value)}
                placeholder="e.g. search_hacker_news" autoFocus />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input value={toolDesc} onChange={(e) => setToolDesc(e.target.value)}
                placeholder="What does this tool do?" />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setView('record')} disabled={isSaving}>
                Back
              </Button>
              <Button variant="default" size="sm" className="flex-1" onClick={handleSaveTool} disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save Macro'}
              </Button>
            </div>
          </div>

          {/* Preview steps */}
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">Steps preview</p>
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[step.action] ?? Wrench
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{step.action === 'forEachItem' ? 'For each item' : step.action}</span>
                  <span className="text-muted-foreground truncate">{stepDetail(step)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── List view ─────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div className="flex flex-col h-screen">
        <Header
          title="Macros"
          icon={<Server className="h-4 w-4 text-primary" />}
        />
        {/* Hidden file input for JSON import */}
        <input
          ref={importFileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Import error banner */}
          {importError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0"><p>{importError}</p></div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setImportError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Connection error banner */}
          {connectionError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p>{connectionError}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-amber-500/20" onClick={() => { if (portRef.current) refreshServers(portRef.current) }} title="Retry">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* New server form */}
          {showNewServerForm && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">New Macro Server</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowNewServerForm(false); setCreateError(null) }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input value={newServerName} onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server name" autoFocus />
              <Input value={newServerDesc} onChange={(e) => setNewServerDesc(e.target.value)}
                placeholder="Description (optional)" />
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setShowNewServerForm(false); setCreateError(null) }}>Cancel</Button>
                <Button variant="default" size="sm" onClick={handleCreateServer}>Create</Button>
              </div>
            </div>
          )}

          {/* Content */}
          {serversLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : servers.length === 0 && !showNewServerForm ? (
            <div className="py-8 space-y-3 text-center">
              <Server className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-base text-muted-foreground">No macro servers yet</p>
              <p className="text-sm text-muted-foreground px-4">
                Create a server to start recording macros.
              </p>
              <Button variant="default" size="sm" onClick={() => setShowNewServerForm(true)}>
                <Plus className="h-4 w-4" /> New Server
              </Button>
            </div>
          ) : (
            <>
              {servers.map((s) => {
                const serverTools = getToolsForServer(s.id)
                const isEditingServer = editingServerId === s.id
                return (
                  <div key={s.id} className="rounded-lg border bg-card overflow-hidden">
                    {isEditingServer ? (
                      <div className="px-4 py-3 space-y-2.5">
                        <Input value={editServerName} onChange={(e) => setEditServerName(e.target.value)}
                          className="font-medium" autoFocus />
                        <Input value={editServerDesc} onChange={(e) => setEditServerDesc(e.target.value)}
                          placeholder="Description" />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={cancelEditServer}>Cancel</Button>
                          <Button variant="default" size="sm" onClick={saveEditServer}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            {s.description && <p className="text-sm text-muted-foreground truncate">{s.description}</p>}
                            <p className="text-sm text-muted-foreground">
                              {serverTools.length} tool{serverTools.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="xs" className="h-8 w-8 p-0"
                              onClick={() => handleExportServer(s.id)} title="Export server (JSON)">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="xs" className="h-8 w-8 p-0"
                              onClick={() => handleImportTool(s.id)} title="Import tool (JSON)">
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="xs" className="h-8 w-8 p-0"
                              onClick={() => startEditServer(s)} title="Edit server">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              onClick={() => handleDeleteServer(s.id, s.name)} title="Delete server">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <button
                          onClick={() => openRecordView(s.id)}
                          className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Circle className="h-3.5 w-3.5" />
                          Record Macro
                        </button>
                      </div>
                    )}

                    {serverTools.length > 0 && (
                      <div className="border-t px-4 py-2.5 bg-muted/30 space-y-1">
                        {serverTools.map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5 py-1.5 group cursor-pointer hover:bg-secondary/50 rounded-md px-2 -mx-2 transition-colors"
                            onClick={() => openEditView(t.id)} role="button" tabIndex={0}>
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-foreground truncate block">{t.displayName || t.name}</span>
                              {t.description && <span className="text-sm text-muted-foreground truncate block">{t.description}</span>}
                            </div>
                            <button type="button"
                              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleExportTool(t.id) }} title="Export tool (JSON)">
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-muted-foreground shrink-0" />
                            <button type="button"
                              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTool(t.id, t.displayName || t.name) }} title="Delete macro">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {!showNewServerForm && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowNewServerForm(true)}>
                    <Plus className="h-4 w-4" /> New Server
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleImportServer}>
                    <Upload className="h-4 w-4" /> Import JSON
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Record view ───────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Record Macro"
        icon={isRecording ? <Circle className="h-4 w-4 text-destructive fill-destructive animate-pulse-dot" /> : <Circle className="h-4 w-4 text-primary" />}
        onBack={backToList}
      />

      {recordError && (
        <div className="mx-4 mt-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          {recordError}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b">
        {isRecording ? (
          <Button variant="destructive" size="sm" onClick={handleStop}>
            <Square className="h-3.5 w-3.5" /> Stop
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={handleRecord}>
            <Circle className="h-3.5 w-3.5" /> Record
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => handleExtract('list')}>
          <List className="h-3.5 w-3.5" /> List
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExtract('single')}>
          <FileText className="h-3.5 w-3.5" /> Single
        </Button>
        <Button variant={showSelectorInput ? 'secondary' : 'outline'} size="sm" onClick={() => { setShowSelectorInput(!showSelectorInput); setShowAccessibilityInput(false); setSelectorError(null) }}>
          <Code className="h-3.5 w-3.5" /> Selector
        </Button>
        <Button variant={showAccessibilityInput ? 'secondary' : 'outline'} size="sm" onClick={() => { setShowAccessibilityInput(!showAccessibilityInput); setShowSelectorInput(false); setSelectorError(null) }}>
          <ScanEye className="h-3.5 w-3.5" /> A11y
        </Button>
        <Button variant="outline" size="sm" disabled={isRecording} onClick={() => addLane(false)}>
          <Columns className="h-3.5 w-3.5" /> Lane
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowWaitInput(!showWaitInput)}>
          <Timer className="h-3.5 w-3.5" /> Wait
        </Button>
        <Button variant="outline" size="sm" disabled={isRecording || steps.length === 0} onClick={() => handleClearAllSteps(false)}>
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </Button>
        <Button variant="secondary" size="sm" disabled={steps.length === 0 && lanes.every(l => l.steps.length === 0)} onClick={handleDone}>
          <Check className="h-3.5 w-3.5" /> Done
        </Button>
      </div>

      {/* CSS Selector input */}
      {showSelectorInput && (
        <div className="px-4 py-2 border-b">
          <SelectorInputForm
            value={selectorValue} onChange={setSelectorValue}
            mode={selectorMode} onModeChange={setSelectorMode}
            loading={selectorLoading} error={selectorError}
            onSubmit={handleSelectorExtract}
            onClose={() => { setShowSelectorInput(false); setSelectorError(null); setSelectorValue('') }}
          />
        </div>
      )}

      {/* Accessibility input */}
      {showAccessibilityInput && (
        <div className="px-4 py-2 border-b">
          <AccessibilityInputForm
            roleValues={roleValues} onRoleValuesChange={setRoleValues}
            roleNameValue={roleNameValue} onRoleNameValueChange={setRoleNameValue}
            roleIncludeChildren={roleIncludeChildren} onRoleIncludeChildrenChange={setRoleIncludeChildren}
            loading={selectorLoading} error={selectorError}
            onSubmit={handleAccessibilityExtract}
            onClose={() => { setShowAccessibilityInput(false); setSelectorError(null); setRoleValues([]); setRoleNameValue(''); setRoleIncludeChildren(true); setAxSnapshot(null) }}
            snapshot={axSnapshot} snapshotLoading={axSnapshotLoading} onSnapshot={handleAccessibilitySnapshot} onSnapshotExtract={handleSnapshotExtract}
          />
        </div>
      )}

      {/* Manual wait input */}
      {showWaitInput && (
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Input
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            value={waitSeconds}
            onChange={(e) => setWaitSeconds(e.target.value)}
            className="w-20"
            placeholder="1"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddWaitStep(false) }}
          />
          <span className="text-sm text-muted-foreground">sec</span>
          <Button variant="default" size="sm" onClick={() => handleAddWaitStep(false)}>Add</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowWaitInput(false); setWaitSeconds('1') }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Lane tabs (only shown when >1 lane) */}
      <LaneTabBar
        lanes={lanes}
        activeLane={activeLane}
        onSwitch={(i) => switchLane(i, false)}
        onAdd={() => addLane(false)}
        onRemove={(i) => removeLane(i, false)}
        onRename={(i, name) => renameLane(i, name, false)}
      />

      {/* Help text */}
      <p className="text-sm text-muted-foreground px-4 py-2.5 leading-relaxed">
        Press "Record" to capture clicks, typing, and navigation. Use "Parameterize" to turn URL values into LLM inputs.
      </p>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {steps.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MousePointerClick className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-base text-muted-foreground">
              {isRecording ? 'Recording - interact with the page…' : 'No steps yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <StepCard
                key={i}
                index={i}
                total={steps.length}
                step={step}
                paramMeta={paramMap.get(i) ?? new Map()}
                onDelete={() => handleDeleteStep(i)}
                onMoveUp={() => handleMoveStep(i, i - 1)}
                onMoveDown={() => handleMoveStep(i, i + 1)}
                onDragStart={() => { dragIdxRef.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdxRef.current !== null) { handleDropStep(dragIdxRef.current, i); dragIdxRef.current = null } }}
                onToggleParam={(key, orig) => toggleParam(i, key, orig)}
                onDescriptionChange={(key, desc) => updateParamDescription(i, key, desc)}
                onParamNameChange={(key, name) => updateParamName(i, key, name)}
                onWaitUntilChange={(val) => updateStepWaitUntil(i, val, false)}
                onUpdateFields={step.action === 'extract'
                  ? (fields) => updateStepFieldsAt(setSteps, setLanes, activeLane, i, fields)
                  : undefined}
                onSubActions={(name, sourceStep) => {
                  setSubActionFlow({
                    sourceExtractName: name,
                    sourceStep,
                    phase: 'config',
                    openMethod: 'url',
                    urlField: '',
                    clickSelector: '',
                    detailSteps: [],
                    concurrency: 3,
                    maxItems: 0,
                    filters: [],
                  })
                }}
                onUpdateStepProps={(props) => updateStepPropsAt(setSteps, setLanes, activeLane, i, props)}
                sourceFieldKeys={step.action === 'forEachItem' ? (() => {
                  const src = steps.find(s => s.action === 'extract' && s.name === step.sourceExtract)
                  return (src?.fields as Array<{ key: string }> | undefined)?.map(f => f.key) ?? []
                })() : undefined}
              />
            ))}
            <div ref={stepsEndRef} />

            {/* Sub-action recording indicator */}
            {subActionFlow?.phase === 'recording' && (
              <SubActionRecordingPanel
                subActionFlow={subActionFlow}
                setSubActionFlow={setSubActionFlow}
                onFinish={finishSubActionFlow}
              />
            )}

            {/* Sub-action config panel */}
            {subActionFlow?.phase === 'config' && (
              <SubActionConfigPanel
                subActionFlow={subActionFlow}
                setSubActionFlow={setSubActionFlow}
                onStart={startSubActionRecording}
                onCancel={() => setSubActionFlow(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t text-sm text-muted-foreground">
        {isRecording && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />}
        <span>
          {steps.length} step{steps.length !== 1 ? 's' : ''}
          {lanes.length > 1 && ` · ${lanes[activeLane]?.name ?? `Lane ${activeLane + 1}`}/${lanes.length}`}
          {lanes.length > 1 && ` (${lanes.reduce((s, l) => s + l.steps.length, 0)} total)`}
          {extractCount > 0 && ` · ${extractCount} extract${extractCount !== 1 ? 's' : ''}`}
          {paramCount > 0 && ` · ${paramCount} param${paramCount !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  )
}

// ─── LaneTabBar ──────────────────────────────────────────────────────────────

function LaneTabBar({
  lanes,
  activeLane,
  onSwitch,
  onAdd,
  onRemove,
  onRename,
}: {
  lanes: Lane[]
  activeLane: number
  onSwitch: (idx: number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
  onRename: (idx: number, name: string) => void
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startRename = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(lanes[idx]?.name ?? '')
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitRename = () => {
    if (editingIdx !== null && editValue.trim()) {
      onRename(editingIdx, editValue.trim())
    }
    setEditingIdx(null)
  }

  const cancelRename = () => {
    setEditingIdx(null)
  }

  if (lanes.length <= 1) return null
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30 overflow-x-auto">
      {lanes.map((lane, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSwitch(i)}
          onDoubleClick={() => startRename(i)}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 cursor-pointer',
            i === activeLane
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {editingIdx === i ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') cancelRename()
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-none outline-none text-sm font-medium w-20 p-0"
              autoFocus
            />
          ) : (
            <>
              {lane.name}
              <span className="text-xs opacity-70">({lane.steps.length})</span>
            </>
          )}
          {lanes.length > 1 && editingIdx !== i && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(i) }}
              className={cn(
                'ml-0.5 rounded p-0.5 transition-colors cursor-pointer',
                i === activeLane
                  ? 'hover:bg-primary-foreground/20'
                  : 'hover:bg-destructive/10 hover:text-destructive',
              )}
              title={`Remove ${lane.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </button>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 cursor-pointer"
        title="Add parallel lane"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ title, icon, onBack }: { title: string; icon: ReactNode; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-card">
      {onBack && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      {icon}
      <span className="font-semibold text-base">{title}</span>
    </div>
  )
}

// ─── Extract Field Types ──────────────────────────────────────────────────────

// ─── SelectorInputForm (CSS only) ────────────────────────────────────────────

function SelectorInputForm({ value, onChange, mode, onModeChange, loading, error, onSubmit, onClose }: {
  value: string
  onChange: (v: string) => void
  mode: 'list' | 'single'
  onModeChange: (m: 'list' | 'single') => void
  loading: boolean
  error: string | null
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">CSS Selector</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="CSS selector (e.g. .post-item, table tbody tr)"
        className="flex-1 font-mono text-xs"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter' && !loading) onSubmit() }}
      />
      <div className="flex items-center gap-2">
        <Select value={mode} onValueChange={(v) => onModeChange(v as 'list' | 'single')}>
          <SelectTrigger className="w-24 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="single">Single</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="default" size="sm" onClick={onSubmit} disabled={loading || !value.trim()} className="h-7">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Extract'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: Right-click an element in DevTools &rarr; Copy &rarr; Copy selector
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── AccessibilityInputForm ──────────────────────────────────────────────────

const ARIA_ROLES = [
  'button', 'link', 'heading', 'listitem', 'row', 'cell',
  'img', 'article', 'navigation', 'textbox', 'list', 'table',
  'form', 'checkbox', 'radio', 'separator', 'main', 'banner',
] as const

const ROLE_NAME_HINTS: Record<string, string> = {
  button: 'e.g. "Submit", "Cancel"',
  link: 'e.g. "Sign In", "Read more"',
  heading: 'e.g. "Welcome", "About"',
  listitem: 'e.g. item text to filter',
  img: 'e.g. alt text like "Logo"',
  textbox: 'e.g. "Search", "Email"',
  checkbox: 'e.g. "Accept terms"',
  radio: 'e.g. "Option A"',
  navigation: 'e.g. "Main navigation"',
}

function AccessibilityInputForm({ roleValues, onRoleValuesChange, roleNameValue, onRoleNameValueChange,
  roleIncludeChildren, onRoleIncludeChildrenChange, loading, error, onSubmit, onClose,
  snapshot, snapshotLoading, onSnapshot, onSnapshotExtract,
}: {
  roleValues: string[]
  onRoleValuesChange: (v: string[]) => void
  roleNameValue: string
  onRoleNameValueChange: (v: string) => void
  roleIncludeChildren: boolean
  onRoleIncludeChildrenChange: (v: boolean) => void
  loading: boolean
  error: string | null
  onSubmit: () => void
  onClose: () => void
  snapshot: string | null
  snapshotLoading: boolean
  onSnapshot: () => void
  onSnapshotExtract: () => void
}) {
  const [a11yTab, setA11yTab] = useState<'role' | 'fullpage'>('fullpage')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [snapshotAdded, setSnapshotAdded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const canSubmit = roleValues.length > 0

  useEffect(() => {
    if (!roleDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setRoleDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [roleDropdownOpen])

  const toggleRole = (role: string) => {
    onRoleValuesChange(
      roleValues.includes(role) ? roleValues.filter(r => r !== role) : [...roleValues, role]
    )
  }

  const handleSnapshotAdd = () => {
    onSnapshotExtract()
    setSnapshotAdded(true)
    setTimeout(() => setSnapshotAdded(false), 1500)
  }

  const nameHint = roleValues.length === 1 ? (ROLE_NAME_HINTS[roleValues[0]] || 'Filter by name (optional)') : 'Filter by name (optional)'

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">Accessibility</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-md border border-input overflow-hidden">
        <button type="button"
          onClick={() => setA11yTab('role')}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer',
            a11yTab === 'role' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50 text-muted-foreground'
          )}
        >By Role</button>
        <button type="button"
          onClick={() => setA11yTab('fullpage')}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer border-l border-input',
            a11yTab === 'fullpage' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50 text-muted-foreground'
          )}
        >Full Page</button>
      </div>

      {/* ── By Role tab ── */}
      {a11yTab === 'role' && (
        <>
          <div className="space-y-1.5">
            {/* Multi-select role dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex min-h-8 w-full items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
              >
                {roleValues.length === 0 ? (
                  <span className="text-muted-foreground font-mono">Select roles…</span>
                ) : (
                  <span className="flex flex-wrap gap-1 flex-1">
                    {roleValues.map(r => (
                      <span key={r} className="inline-flex items-center gap-0.5 rounded bg-primary/15 text-primary px-1.5 py-0.5 font-mono text-xs">
                        {r}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleRole(r) }}
                          className="hover:text-destructive cursor-pointer">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
              </button>
              {roleDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md p-1">
                  {ARIA_ROLES.map(r => (
                    <button key={r} type="button"
                      onClick={() => toggleRole(r)}
                      className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs font-mono hover:bg-accent cursor-pointer transition-colors"
                    >
                      <span className={cn(
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                        roleValues.includes(r) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                      )}>
                        {roleValues.includes(r) && <Check className="h-2.5 w-2.5" />}
                      </span>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              value={roleNameValue}
              onChange={(e) => onRoleNameValueChange(e.target.value)}
              placeholder={nameHint}
              className="font-mono text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading && canSubmit) onSubmit() }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => onRoleIncludeChildrenChange(!roleIncludeChildren)}
              className={cn(
                'shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer',
                roleIncludeChildren ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-muted-foreground/35'
              )}
              role="switch"
              aria-checked={roleIncludeChildren}
            >
              <span className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                roleIncludeChildren ? 'translate-x-[18px]' : 'translate-x-0.5'
              )} />
            </button>
            <span className="text-xs text-muted-foreground">Include children</span>
            <div className="flex-1" />
            <Button variant="default" size="sm" onClick={onSubmit} disabled={loading || !canSubmit} className="h-7">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Extract'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {roleIncludeChildren
              ? 'Extracts child content (links, text, images) within each matched element'
              : 'Extracts only direct properties (text, href, src) of matched elements'}
          </p>
        </>
      )}

      {/* ── Full Page tab ── */}
      {a11yTab === 'fullpage' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Extract the complete accessibility tree of the current page. Works reliably on any site - no selectors or class names needed.
          </p>
          <Button
            variant="default" size="sm" className="w-full h-8"
            onClick={handleSnapshotAdd}
            disabled={snapshotLoading || snapshotAdded}
          >
            {snapshotAdded
              ? <><Check className="h-3.5 w-3.5" /> Step added</>
              : snapshotLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting…</>
                : <><ScanEye className="h-3.5 w-3.5" /> Extract full page tree</>}
          </Button>
          {!snapshot && !snapshotLoading && (
            <button type="button" onClick={onSnapshot}
              className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer transition-colors"
            >Preview tree before adding</button>
          )}
          {snapshotLoading && !snapshot && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading preview…
            </div>
          )}
          {snapshot && (
            <pre className="max-h-48 overflow-auto rounded-md border bg-muted/50 p-2 text-[10px] leading-tight font-mono whitespace-pre select-all">{snapshot}</pre>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Extract Field Types ──────────────────────────────────────────────────────

interface ExtractField {
  key: string
  selector: string
  type?: string
  attribute?: string
  pattern?: string
  default?: string | number | null
  transform?: string
  fields?: ExtractField[]
}

const FIELD_TYPES = ['text', 'html', 'attribute', 'value', 'regex', 'nested', 'nested_list'] as const
const TRANSFORM_OPTIONS = ['', 'trim', 'lowercase', 'uppercase', 'number'] as const

/** Parse an HTML fragment safely (handles table elements like <tr>, <td>) */
function parseHtmlFragment(html: string): Element | null {
  const trimmed = html.trim()
  // Table-specific elements need proper table context to survive innerHTML parsing
  if (/^<tr[\s>]/i.test(trimmed)) {
    const tbl = document.createElement('table')
    const tbody = document.createElement('tbody')
    tbody.innerHTML = trimmed
    tbl.appendChild(tbody)
    return tbody.firstElementChild as Element | null
  }
  if (/^<td[\s>]/i.test(trimmed) || /^<th[\s>]/i.test(trimmed)) {
    const tbl = document.createElement('table')
    const tbody = document.createElement('tbody')
    const tr = document.createElement('tr')
    tr.innerHTML = trimmed
    tbody.appendChild(tr)
    tbl.appendChild(tbody)
    return tr.firstElementChild as Element | null
  }
  const tpl = document.createElement('template')
  tpl.innerHTML = trimmed
  return tpl.content.firstElementChild as Element | null
}

/** Re-extract preview data from stored HTML using current field definitions */
function extractFromHtml(htmlStrings: string[], fields: ExtractField[]): Record<string, unknown>[] {
  return htmlStrings.map(html => {
    const item = parseHtmlFragment(html)
    if (!item) return {}
    const row: Record<string, unknown> = {}
    for (const f of fields) {
      try {
        const el = f.selector === '*' ? item : item.querySelector(f.selector)
        if (!el) { row[f.key || '_'] = null; continue }
        const t = f.type ?? 'text'
        if (t === 'attribute') row[f.key || '_'] = el.getAttribute(f.attribute || '') || null
        else if (t === 'html') row[f.key || '_'] = el.innerHTML
        else if (t === 'value') row[f.key || '_'] = (el as HTMLInputElement).value || null
        else if (t === 'regex') {
          const txt = (el.textContent || '').trim()
          const m = f.pattern ? txt.match(new RegExp(f.pattern)) : null
          row[f.key || '_'] = m ? (m[1] || m[0]) : null
        } else row[f.key || '_'] = (el.textContent || '').trim()
      } catch { row[f.key || '_'] = null }
    }
    return row
  })
}

/** Get actual attribute names of the element matching a field's selector */
function getFieldAttributes(htmlStrings: string[], selector: string): string[] {
  if (!htmlStrings.length) return []
  const item = parseHtmlFragment(htmlStrings[0])
  if (!item) return []
  const el = selector === '*' ? item : item.querySelector(selector)
  if (!el) return []
  return el.getAttributeNames().filter(a => !a.startsWith('data-izan'))
}

// ─── StepCard ────────────────────────────────────────────────────────────────

function StepCard({
  step, index, total, paramMeta, onDelete, onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDrop, onToggleParam, onDescriptionChange,
  onParamNameChange, onWaitUntilChange, onUpdateFields, onSubActions,
  onUpdateStepProps, sourceFieldKeys,
}: {
  step: Step
  index: number
  total: number
  paramMeta: Map<string, ParamMeta>
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onToggleParam: (key: string, originalValue: string) => void
  onDescriptionChange: (key: string, desc: string) => void
  onParamNameChange?: (key: string, name: string) => void
  onWaitUntilChange?: (value: Step['waitUntil']) => void
  onUpdateFields?: (fields: ExtractField[]) => void
  onSubActions?: (sourceExtractName: string, sourceStep: Step) => void
  onUpdateStepProps?: (props: Partial<Step>) => void
  /** Field keys from the source extract step (for forEachItem filter dropdowns) */
  sourceFieldKeys?: string[]
}) {
  const Icon = STEP_ICONS[step.action] ?? Wrench
  const detail = stepDetail(step)
  const params = getNavParams(step)
  const pathSegments = getPathSegments(step)
  const typeText = step.action === 'type' ? (step.text ?? '') : ''

  // Expandable: steps with editable details start collapsed
  const hasDetails = (step.action === 'navigate' && (params.length > 0 || pathSegments.length > 0 || onWaitUntilChange))
    || (step.action === 'type' && !!typeText)
    || (step.action === 'extract' && Array.isArray(step.fields))
    || (step.action === 'forEachItem')
  const [expanded, setExpanded] = useState(step.action === 'forEachItem')

  return (
    <div
      className="group relative flex gap-2 p-3 rounded-lg border bg-card hover:bg-secondary/50 text-sm transition-colors"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag handle + reorder buttons */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
        <button type="button" onClick={onMoveUp} disabled={index === 0}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer" title="Move up">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer" title="Move down">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{step.action === 'forEachItem' ? 'For each item' : step.action}</span>
        {detail && <p className="text-muted-foreground truncate mt-0.5">{detail}</p>}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary/70 hover:text-primary mt-1 cursor-pointer transition-colors"
          >
            {expanded
              ? 'Close'
              : step.action === 'extract' ? 'Edit fields'
              : step.action === 'navigate' ? 'Parameterize'
              : step.action === 'type' ? 'Parameterize'
              : step.action === 'forEachItem' ? 'Show details'
              : 'Edit'}
          </button>
        )}

        {expanded && step.action === 'navigate' && onWaitUntilChange && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground shrink-0">Wait until</span>
            <Select value={step.waitUntil ?? 'load'} onValueChange={(v) => onWaitUntilChange(v as Step['waitUntil'])}>
              <SelectTrigger className="w-auto h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load">Page Load</SelectItem>
                <SelectItem value="domcontentloaded">DOM Ready</SelectItem>
                <SelectItem value="networkidle">Network Idle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Path Segments (navigate steps) */}
        {expanded && pathSegments.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Path Segments</p>
            {pathSegments.map(([segIdx, segment]) => {
              const key = `__path:${segIdx}`
              const meta = paramMeta.get(key)
              const isP = meta?.enabled ?? false
              return (
                <div key={key} className={cn('rounded-md border transition-colors', isP ? 'border-primary/30 bg-primary/5' : 'bg-background/50')}>
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <span className="font-mono text-sm text-muted-foreground shrink-0">/{segment}</span>
                    <span className="flex-1" />
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleParam(key, segment) }}
                      className={cn(
                        'shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer',
                        isP ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-muted-foreground/35'
                      )}
                      role="switch"
                      aria-checked={isP}
                      title={isP ? 'Revert to static value' : 'Make dynamic - LLM will provide this value'}
                    >
                      <span className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                        isP ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  {isP && (
                    <div className="px-2.5 pb-2 space-y-1.5">
                      <Input value={meta?.paramName ?? ''}
                        onChange={(e) => onParamNameChange?.(key, e.target.value)}
                        placeholder="Parameter name (e.g. user_id)" />
                      <Input value={meta?.description ?? ''}
                        onChange={(e) => onDescriptionChange(key, e.target.value)}
                        placeholder="Description (e.g. The user's ID)" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* URL Parameters (navigate steps) */}
        {expanded && params.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">URL Parameters</p>
            {params.map(([k, v]) => {
              const meta = paramMeta.get(k)
              const isP = meta?.enabled ?? false
              return (
                <div key={k} className={cn('rounded-md border transition-colors', isP ? 'border-primary/30 bg-primary/5' : 'bg-background/50')}>
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <span className="font-mono font-medium text-sm shrink-0">{k}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      = {isP ? <span className="text-primary font-semibold">{`{{${k}}}`}</span> : v}
                    </span>
                    {/* Toggle switch */}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleParam(k, v) }}
                      className={cn(
                        'shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer',
                        isP ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-muted-foreground/35'
                      )}
                      role="switch"
                      aria-checked={isP}
                      title={isP ? 'Revert to static value' : 'Make dynamic - LLM will provide this value'}
                    >
                      <span className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                        isP ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  {isP && (
                    <div className="px-2.5 pb-2">
                      <Input value={meta?.description ?? ''}
                        onChange={(e) => onDescriptionChange(k, e.target.value)}
                        placeholder="Describe this parameter (e.g. Search query)" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Input Value (type steps) */}
        {expanded && step.action === 'type' && typeText && (
          <div className="mt-2.5 space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Input Value</p>
            {(() => {
              const key = '__input'
              const meta = paramMeta.get(key)
              const isP = meta?.enabled ?? false
              return (
                <div className={cn('rounded-md border transition-colors', isP ? 'border-primary/30 bg-primary/5' : 'bg-background/50')}>
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <span className="font-mono text-sm text-muted-foreground truncate flex-1">"{typeText}"</span>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleParam(key, typeText) }}
                      className={cn(
                        'shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer',
                        isP ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-muted-foreground/35'
                      )}
                      role="switch"
                      aria-checked={isP}
                      title={isP ? 'Revert to static value' : 'Make dynamic - LLM will provide this value'}
                    >
                      <span className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                        isP ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  {isP && (
                    <div className="px-2.5 pb-2 space-y-1.5">
                      <Input value={meta?.paramName ?? ''}
                        onChange={(e) => onParamNameChange?.(key, e.target.value)}
                        placeholder="Parameter name (e.g. search_query)" />
                      <Input value={meta?.description ?? ''}
                        onChange={(e) => onDescriptionChange(key, e.target.value)}
                        placeholder="Description (e.g. Text to search for)" />
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Extraction Fields (extract steps) */}
        {expanded && step.action === 'extract' && onUpdateFields && Array.isArray(step.fields) && (
          <div className="mt-2.5 space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Extraction Fields</p>
            {(step.fields as ExtractField[]).map((field, fi) => {
              const fieldType = field.type ?? 'text'
              const isNested = fieldType === 'nested' || fieldType === 'nested_list'
              return (
                <div key={fi} className="rounded-md border bg-background/50 px-2.5 py-2 space-y-1.5">
                  {/* Row 1: key + delete */}
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={field.key}
                      onChange={(e) => {
                        const updated = [...step.fields as ExtractField[]]
                        updated[fi] = { ...updated[fi], key: e.target.value }
                        onUpdateFields(updated)
                      }}
                      className="flex-1 min-w-0 h-7 text-xs font-medium"
                      placeholder="key"
                    />
                    <button type="button"
                      onClick={() => {
                        const updated = (step.fields as ExtractField[]).filter((_, i) => i !== fi)
                        onUpdateFields(updated)
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                      title="Remove field">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Row 2: type + transform */}
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={fieldType}
                      onValueChange={(v) => {
                        const updated = [...step.fields as ExtractField[]]
                        const patch: Partial<ExtractField> = { type: v === 'text' ? undefined : v }
                        if (v !== 'attribute') patch.attribute = undefined
                        if (v !== 'regex') patch.pattern = undefined
                        if (v === 'nested' || v === 'nested_list') {
                          if (!updated[fi].fields) patch.fields = []
                        }
                        updated[fi] = { ...updated[fi], ...patch }
                        onUpdateFields(updated)
                      }}
                    >
                      <SelectTrigger className="flex-1 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={field.transform ?? '__none'}
                      onValueChange={(v) => {
                        const updated = [...step.fields as ExtractField[]]
                        updated[fi] = { ...updated[fi], transform: v === '__none' ? undefined : v }
                        onUpdateFields(updated)
                      }}
                    >
                      <SelectTrigger className="flex-1 h-7 text-xs">
                        <SelectValue placeholder="transform" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFORM_OPTIONS.map(t => (
                          <SelectItem key={t || '__none'} value={t || '__none'}>{t || '\u2014'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Row 3: selector */}
                  <p className="font-mono text-xs text-muted-foreground truncate">{field.selector}</p>
                  {/* Row 4: conditional inputs */}
                  {fieldType === 'attribute' && (() => {
                    const currentAttr = field.attribute ?? ''
                    const previewHtml = step._previewHtml as string[] | undefined
                    const actualAttrs = previewHtml?.length
                      ? getFieldAttributes(previewHtml, field.selector)
                      : []
                    const options = actualAttrs.length > 0
                      ? actualAttrs
                      : ['href', 'src', 'alt', 'title']
                    // Ensure current value is in list
                    const finalOptions = currentAttr && !options.includes(currentAttr)
                      ? [currentAttr, ...options]
                      : options
                    return (
                      <Select
                        value={currentAttr || finalOptions[0] || 'href'}
                        onValueChange={(v) => {
                          const updated = [...step.fields as ExtractField[]]
                          updated[fi] = { ...updated[fi], attribute: v || undefined }
                          onUpdateFields(updated)
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {finalOptions.map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  })()}
                  {fieldType === 'regex' && (
                    <Input
                      value={field.pattern ?? ''}
                      onChange={(e) => {
                        const updated = [...step.fields as ExtractField[]]
                        updated[fi] = { ...updated[fi], pattern: e.target.value || undefined }
                        onUpdateFields(updated)
                      }}
                      className="h-7 text-xs font-mono"
                      placeholder="Regex pattern (e.g. \d+)"
                    />
                  )}
                  {(fieldType === 'regex' || field.default !== undefined) && (
                    <Input
                      value={field.default != null ? String(field.default) : ''}
                      onChange={(e) => {
                        const updated = [...step.fields as ExtractField[]]
                        updated[fi] = { ...updated[fi], default: e.target.value || undefined }
                        onUpdateFields(updated)
                      }}
                      className="h-7 text-xs"
                      placeholder="Default value"
                    />
                  )}
                  {isNested && (
                    <p className="text-xs text-muted-foreground italic">
                      {fieldType} - {field.fields?.length ?? 0} sub-fields (edit via JSON export)
                    </p>
                  )}
                </div>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                const updated = [...(step.fields as ExtractField[]), { key: '', selector: '', type: 'text' } as ExtractField]
                onUpdateFields(updated)
              }}
            >
              <Plus className="h-3 w-3" /> Add Field
            </Button>
          </div>
        )}

        {/* Extraction Preview (always visible, no expand needed) */}
        {step.action === 'extract' && (step._previewHtml || step._preview != null) && (
          <ExtractPreview
            preview={step._preview}
            previewHtml={step._previewHtml as string[] | undefined}
            fields={step.fields as ExtractField[] | undefined}
            mode={(step.mode as string) ?? 'single'}
            step={step}
            onSubActions={onSubActions}
          />
        )}

        {/* ForEachItem expanded details */}
        {step.action === 'forEachItem' && expanded && (
          <div className="mt-2 space-y-2.5 text-xs">
            {/* Info tags */}
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                {step.openMethod === 'click' ? 'Click' : (step.urlField as string ?? 'url')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                {(step.concurrency as number) ?? 3}x parallel
              </span>
              {(step.maxItems as number) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                  max {step.maxItems as number}
                </span>
              )}
            </div>
            {onUpdateStepProps && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="shrink-0">Parallel</span>
                  <Input type="number" min={1} className="h-6 w-full text-xs px-1.5 text-center"
                    defaultValue={(step.concurrency as number) ?? 3}
                    onBlur={e => {
                      const v = Math.max(1, Math.min(10, Number(e.target.value) || 1))
                      e.target.value = String(v)
                      onUpdateStepProps({ concurrency: v })
                    }} />
                </label>
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="shrink-0">Limit</span>
                  <Input type="number" min={0} className="h-6 w-full text-xs px-1.5 text-center"
                    defaultValue={(step.maxItems as number) || ''}
                    placeholder="all"
                    onBlur={e => onUpdateStepProps({ maxItems: Number(e.target.value) || 0 })} />
                </label>
              </div>
            )}
            {/* Filters */}
            {onUpdateStepProps && (
              <ForEachFilterEditor
                filters={(step.filters as Array<{ field: string; op: string; value: string }>) ?? []}
                fieldKeys={sourceFieldKeys ?? []}

                onChange={filters => onUpdateStepProps({ filters })}
              />
            )}
            {Array.isArray(step.detailSteps) && (step.detailSteps as Step[]).length > 0 && (
              <div className="border-l-2 border-primary/30 pl-2.5 space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Detail steps ({(step.detailSteps as Step[]).length})</span>
                {(step.detailSteps as Step[]).map((ds, di) => {
                  const DsIcon = STEP_ICONS[ds.action] ?? Wrench
                  return (
                    <div key={di} className="flex items-center gap-1.5 text-xs py-0.5 rounded hover:bg-muted/50 pr-1 min-w-0">
                      <DsIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium shrink-0">{ds.action}</span>
                      <span className="text-muted-foreground truncate">{stepDetail(ds)}</span>
                      {onUpdateStepProps && (
                        <button type="button" className="ml-auto h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            const updated = (step.detailSteps as Step[]).filter((_, j) => j !== di)
                            onUpdateStepProps({ detailSteps: updated })
                          }}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {(!step.detailSteps || (step.detailSteps as Step[]).length === 0) && (
              <p className="text-xs text-muted-foreground/60 italic">No detail steps</p>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
        title="Delete step">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── SubActionRecordingPanel ──────────────────────────────────────────────────

function SubActionRecordingPanel({ subActionFlow, setSubActionFlow, onFinish }: {
  subActionFlow: NonNullable<Parameters<typeof SubActionRecordingPanel>[0]['subActionFlow']>
  setSubActionFlow: (fn: (prev: typeof subActionFlow | null) => typeof subActionFlow | null) => void
  onFinish: () => void
}) {
  const hint = subActionFlow.openMethod === 'click' && !subActionFlow.clickSelector
    ? 'Click on the element that opens the detail page'
    : 'Extract the fields you want from the detail page'

  const detailSteps = subActionFlow.detailSteps
  const noop = () => {}
  const noopParam = (_k: string, _v: string) => {}

  return (
    <div className="mx-0.5 mt-2 rounded-lg border border-primary/25 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-primary/8 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
        <span className="text-sm font-medium text-primary flex-1">Recording for each item</span>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground px-3 py-1.5 border-b">{hint}</p>

      {/* Detail steps - rendered as full StepCards */}
      {detailSteps.length > 0 && (
        <div className="px-1 py-1.5 space-y-1.5">
          {detailSteps.map((ds, di) => (
            <StepCard
              key={di}
              index={di}
              total={detailSteps.length}
              step={ds}
              paramMeta={new Map()}
              onDelete={() => setSubActionFlow(prev => prev ? {
                ...prev,
                detailSteps: prev.detailSteps.filter((_, j) => j !== di),
              } : prev)}
              onMoveUp={() => {
                if (di === 0) return
                setSubActionFlow(prev => {
                  if (!prev) return prev
                  const arr = [...prev.detailSteps]
                  ;[arr[di - 1], arr[di]] = [arr[di], arr[di - 1]]
                  return { ...prev, detailSteps: arr }
                })
              }}
              onMoveDown={() => {
                if (di === detailSteps.length - 1) return
                setSubActionFlow(prev => {
                  if (!prev) return prev
                  const arr = [...prev.detailSteps]
                  ;[arr[di], arr[di + 1]] = [arr[di + 1], arr[di]]
                  return { ...prev, detailSteps: arr }
                })
              }}
              onDragStart={noop}
              onDragOver={(e) => e.preventDefault()}
              onDrop={noop}
              onToggleParam={noopParam}
              onDescriptionChange={noopParam}
              onUpdateFields={ds.action === 'extract'
                ? (fields) => setSubActionFlow(prev => prev ? {
                    ...prev,
                    detailSteps: prev.detailSteps.map((s, j) => j === di ? { ...s, fields } : s),
                  } : prev)
                : undefined}
            />
          ))}
        </div>
      )}

      {detailSteps.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic text-center py-3">No steps recorded yet</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t">
        <Button size="sm" variant="default" className="h-7 text-xs"
          disabled={detailSteps.length === 0}
          onClick={onFinish}>
          Done ({detailSteps.length})
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs"
          onClick={() => setSubActionFlow(() => null)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── ForEachFilterEditor ─────────────────────────────────────────────────────

const FILTER_OPS = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: '!contains' },
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'starts_with', label: 'starts' },
  { value: 'ends_with', label: 'ends' },
  { value: 'regex', label: 'regex' },
] as const

type FilterRow = { field: string; op: string; value: string }

/** Text input with local state - only calls onCommit on blur/Enter (avoids parent re-renders per keystroke) */
function LocalTextInput({ value, onCommit, className, placeholder }: {
  value: string; onCommit: (v: string) => void; className?: string; placeholder?: string
}) {
  const [local, setLocal] = useState(value)
  const committedRef = useRef(value)
  // Sync from parent when value changes externally (e.g. filter removed, index shifted)
  useEffect(() => { if (value !== committedRef.current) { setLocal(value); committedRef.current = value } }, [value])
  const commit = () => { if (local !== committedRef.current) { committedRef.current = local; onCommit(local) } }
  return (
    <input type="text" className={className} placeholder={placeholder}
      value={local} onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() } }} />
  )
}

function ForEachFilterEditor({ filters, fieldKeys, onChange }: {
  filters: FilterRow[]
  fieldKeys: string[]
  onChange: (filters: FilterRow[]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const addFilter = useCallback(() => {
    const cur = filtersRef.current
    const next = [...cur, { field: fieldKeys[0] ?? '', op: 'contains', value: '' }]
    onChangeRef.current(next)
    // Scroll the new filter row into view after render
    requestAnimationFrame(() => {
      const el = containerRef.current
      if (el) {
        const last = el.querySelector('[data-filter-row]:last-child') as HTMLElement | null
        last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        const input = last?.querySelector('input[type="text"]:last-of-type') as HTMLInputElement | null
        input?.focus()
      }
    })
  }, [fieldKeys])

  const removeFilter = useCallback((i: number) => {
    onChangeRef.current(filtersRef.current.filter((_, j) => j !== i))
  }, [])

  const updateFilter = useCallback((i: number, patch: Partial<FilterRow>) => {
    onChangeRef.current(filtersRef.current.map((f, j) => j === i ? { ...f, ...patch } : f))
  }, [])

  return (
    <div ref={containerRef} className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Filters{filters.length > 0 ? ` (${filters.length})` : ''}
        </span>
        <button type="button" onClick={addFilter}
          className="text-[10px] text-primary/70 hover:text-primary transition-colors cursor-pointer flex items-center gap-0.5">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {filters.map((f, i) => (
        <div key={i} data-filter-row className="flex items-center gap-1">
          {fieldKeys.length > 0 ? (
            <select className="h-6 text-[11px] border rounded px-1 bg-background min-w-0 w-[72px] shrink-0"
              value={f.field} onChange={e => updateFilter(i, { field: e.target.value })}>
              {fieldKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          ) : (
            <LocalTextInput className="h-6 text-[11px] border rounded px-1.5 bg-background w-[72px] shrink-0 outline-none focus:ring-1 focus:ring-primary/50" placeholder="field"
              value={f.field} onCommit={v => updateFilter(i, { field: v })} />
          )}
          <select className="h-6 text-[11px] border rounded px-0.5 bg-background shrink-0 w-[68px]"
            value={f.op} onChange={e => updateFilter(i, { op: e.target.value })}>
            {FILTER_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <LocalTextInput className="h-6 text-[11px] border rounded px-1.5 bg-background flex-1 min-w-0 outline-none focus:ring-1 focus:ring-primary/50" placeholder="value"
            value={f.value} onCommit={v => updateFilter(i, { value: v })} />
          <button type="button" onClick={() => removeFilter(i)}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── SubActionConfigPanel ────────────────────────────────────────────────────

function SubActionConfigPanel({ subActionFlow, setSubActionFlow, onStart, onCancel }: {
  subActionFlow: NonNullable<Parameters<typeof SubActionConfigPanel>[0]['subActionFlow']>
  setSubActionFlow: (fn: (prev: typeof subActionFlow | null) => typeof subActionFlow | null) => void
  onStart: () => void
  onCancel: () => void
}) {
  // Detect URL fields from the source step's preview data
  const urlFields = useMemo(() => {
    const sourceStep = subActionFlow.sourceStep
    const fields = sourceStep.fields as Array<{ key: string; type?: string; attribute?: string }> | undefined
    const result: string[] = []
    if (fields) {
      for (const f of fields) {
        if (f.type === 'attribute' && f.attribute === 'href') {
          result.push(f.key)
        }
      }
    }
    // Also check preview data for URL-like values
    const preview = sourceStep._preview as unknown[]
    if (Array.isArray(preview) && preview.length > 0 && fields) {
      const first = preview[0] as Record<string, unknown>
      for (const f of fields) {
        if (result.includes(f.key)) continue
        const val = first[f.key]
        if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'))) {
          result.push(f.key)
        }
      }
    }
    return result
  }, [subActionFlow.sourceStep])

  // All field keys from source extract step (for filter dropdowns)
  const allFieldKeys = useMemo(() => {
    const fields = subActionFlow.sourceStep.fields as Array<{ key: string }> | undefined
    return fields?.map(f => f.key) ?? []
  }, [subActionFlow.sourceStep])

  // Auto-select first URL field
  useEffect(() => {
    if (subActionFlow.openMethod === 'url' && !subActionFlow.urlField && urlFields.length > 0) {
      setSubActionFlow(prev => prev ? { ...prev, urlField: urlFields[0] } : prev)
    }
  }, [urlFields, subActionFlow.openMethod, subActionFlow.urlField, setSubActionFlow])

  return (
    <div className="mx-0.5 mt-2 rounded-lg border bg-card overflow-hidden">
      <div className="px-3 py-2.5 border-b bg-muted/30">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          For each item
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Visit each item's detail page and extract additional data</p>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* Open method */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Open item via</p>
          <div className="space-y-1">
            <label className={cn(
              'flex items-start gap-2 text-xs cursor-pointer rounded-md border px-2.5 py-2 transition-colors',
              subActionFlow.openMethod === 'url' ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/50',
            )}>
              <input type="radio" name="openMethod" className="accent-primary mt-0.5" checked={subActionFlow.openMethod === 'url'}
                onChange={() => setSubActionFlow(prev => prev ? { ...prev, openMethod: 'url' } : prev)} />
              <div className="flex-1 min-w-0">
                <span className="font-medium">Follow URL field</span>
                {subActionFlow.openMethod === 'url' && urlFields.length > 0 && (
                  <select className="mt-1 block w-full text-xs border rounded px-1.5 py-1 bg-background"
                    value={subActionFlow.urlField}
                    onChange={e => setSubActionFlow(prev => prev ? { ...prev, urlField: e.target.value } : prev)}>
                    {urlFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
                {subActionFlow.openMethod === 'url' && urlFields.length === 0 && (
                  <p className="text-muted-foreground/70 italic mt-0.5">no URL fields found</p>
                )}
              </div>
            </label>
            <label className={cn(
              'flex items-center gap-2 text-xs cursor-pointer rounded-md border px-2.5 py-2 transition-colors',
              subActionFlow.openMethod === 'click' ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/50',
            )}>
              <input type="radio" name="openMethod" className="accent-primary" checked={subActionFlow.openMethod === 'click'}
                onChange={() => setSubActionFlow(prev => prev ? { ...prev, openMethod: 'click' } : prev)} />
              <span className="font-medium">Click to navigate</span>
            </label>
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <span className="shrink-0">Parallel</span>
            <Input type="number" min={1} className="h-6 w-full text-xs px-1.5 text-center"
              defaultValue={subActionFlow.concurrency}
              onBlur={e => {
                const v = Math.max(1, Math.min(10, Number(e.target.value) || 1))
                e.target.value = String(v)
                setSubActionFlow(prev => prev ? { ...prev, concurrency: v } : prev)
              }} />
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <span className="shrink-0">Limit</span>
            <Input type="number" min={0} className="h-6 w-full text-xs px-1.5 text-center"
              defaultValue={subActionFlow.maxItems || ''}
              placeholder="all"
              onBlur={e => setSubActionFlow(prev => prev ? { ...prev, maxItems: Number(e.target.value) || 0 } : prev)} />
          </label>
        </div>

        {/* Filters */}
        <ForEachFilterEditor
          filters={subActionFlow.filters}
          fieldKeys={allFieldKeys}

          onChange={filters => setSubActionFlow(prev => prev ? { ...prev, filters } : prev)}
        />

        <div className="flex gap-2 pt-0.5">
          <Button size="sm" variant="default" className="h-8 text-xs px-4"
            disabled={subActionFlow.openMethod === 'url' && !subActionFlow.urlField}
            onClick={onStart}>
            Start Recording
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── ExtractPreview ──────────────────────────────────────────────────────────

function ExtractPreview({ preview, previewHtml, fields, mode, step, onSubActions }: {
  preview?: unknown
  previewHtml?: string[]
  fields?: ExtractField[]
  mode: string
  step?: Step
  onSubActions?: (sourceExtractName: string, sourceStep: Step) => void
}) {
  const [expanded, setExpanded] = useState(true)

  // Re-extract from HTML when fields change; fall back to static preview if all null
  const items = useMemo(() => {
    if (previewHtml?.length && fields?.length) {
      const extracted = extractFromHtml(previewHtml, fields)
      const hasData = extracted.some(row => Object.values(row).some(v => v != null))
      if (hasData) return extracted
    }
    if (preview == null) return []
    return Array.isArray(preview) ? preview : [preview]
  }, [previewHtml, fields, preview])

  if (items.length === 0) return null

  const label = mode === 'list'
    ? `Preview (${items.length} item${items.length !== 1 ? 's' : ''})`
    : 'Preview'

  const isList = mode === 'list'

  const renderItem = (item: Record<string, unknown>, idx: number) => {
    const entries = Object.entries(item)
    return (
      <div key={idx} className={cn(
        'space-y-0.5 px-2.5 py-1.5',
        idx > 0 && 'border-t',
        isList && idx % 2 !== 0 && 'bg-muted/20',
      )}>
        {isList && (
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">{idx + 1}.</span>
        )}
        {entries.slice(0, expanded ? entries.length : 4).map(([k, v]) => (
          <div key={k} className="flex gap-1.5 text-xs leading-tight">
            <span className="text-muted-foreground shrink-0 font-medium">{k}:</span>
            <span className="text-foreground truncate">{formatPreviewValue(v)}</span>
          </div>
        ))}
        {!expanded && entries.length > 4 && (
          <span className="text-xs text-muted-foreground">+{entries.length - 4} more fields</span>
        )}
      </div>
    )
  }

  const visibleItems = expanded ? items : items.slice(0, 3)
  const hiddenCount = items.length > visibleItems.length ? items.length - visibleItems.length : 0

  return (
    <div className="mt-2.5 space-y-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', !expanded && '-rotate-90')} />
        {label}
      </button>
      {expanded && (
        <div className="rounded-md border overflow-hidden max-h-64 overflow-y-auto">
          {visibleItems.map((item, i) => renderItem(item as Record<string, unknown>, i))}
          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground text-center py-1.5 bg-muted/30">+{hiddenCount} more items</p>
          )}
        </div>
      )}
      {mode === 'list' && onSubActions && step?.name && items.length > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSubActions(step.name as string, step) }}
          className="w-full mt-1.5 py-2 text-xs font-medium text-primary/80 hover:text-primary border border-dashed border-primary/30 hover:border-primary/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers className="h-3.5 w-3.5" />
          Extract details for each item
        </button>
      )}
    </div>
  )
}

function formatPreviewValue(v: unknown): string {
  if (v == null) return '-'
  if (typeof v === 'string') return v.length > 60 ? v.slice(0, 57) + '...' : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[${v.length} items]`
  if (typeof v === 'object') return `{${Object.keys(v).length} keys}`
  return String(v)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stepDetail(step: Step): string {
  switch (step.action) {
    case 'navigate': {
      const u = step.url ?? ''
      try { const parsed = new URL(u); return parsed.hostname } catch { /* relative or invalid */ }
      return u.slice(0, 40)
    }
    case 'click': return step.selector?.slice(0, 50) ?? ''
    case 'type': return `"${step.text?.slice(0, 25)}" → ${step.selector?.slice(0, 20)}`
    case 'scroll': return `${step.direction ?? 'down'} ${step.amount ?? 0}px`
    case 'select': return `${step.value} → ${step.selector?.slice(0, 20)}`
    case 'wait': { const ms = step.ms ?? 0; return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms` }
    case 'waitForSelector': return step.selector?.slice(0, 50) ?? ''
    case 'waitForUrl': return step.pattern?.slice(0, 50) ?? ''
    case 'waitForLoad': return `${step.timeout ?? 0}ms`
    case 'extract': {
      const props = Array.isArray(step.fields) ? step.fields.length : 0
      return step.mode === 'list' && step.itemCount
        ? `${step.itemCount} items · ${props} props`
        : `${step.mode ?? 'single'} · ${props} props`
    }
    case 'forEachItem': {
      const n = Array.isArray(step.detailSteps) ? (step.detailSteps as unknown[]).length : 0
      const filters = Array.isArray(step.filters) ? (step.filters as unknown[]).length : 0
      return `${step.sourceExtract as string} · ${n} steps${filters ? ` · ${filters} filter${filters > 1 ? 's' : ''}` : ''}`
    }
    default: return ''
  }
}

function getNavParams(step: Step): [string, string][] {
  if (step.action !== 'navigate') return []
  if (step.urlParams) return Object.entries(step.urlParams)
  if (step.url) {
    try { return Array.from(new URL(step.url, 'https://placeholder.com').searchParams.entries()) } catch { /* */ }
  }
  return []
}

/** Returns [segmentIndex, segmentValue][] for non-empty path segments */
function getPathSegments(step: Step): [number, string][] {
  if (step.action !== 'navigate' || !step.url) return []
  try {
    const parsed = new URL(step.url, 'https://placeholder.com')
    return parsed.pathname
      .split('/')
      .slice(1) // remove leading empty string from /
      .map((seg, i) => [i, seg] as [number, string])
      .filter(([, seg]) => seg.length > 0)
  } catch { return [] }
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
