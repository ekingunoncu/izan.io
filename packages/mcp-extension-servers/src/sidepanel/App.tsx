import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  ArrowLeft, Server, Plus, Trash2, X, Circle, Square,
  List, FileText, Check, Globe, MousePointerClick,
  Keyboard, ArrowDownUp, ListFilter, Timer, Hourglass,
  Link, Database, Save, Wrench, Loader2, AlertTriangle, RefreshCw,
  GripVertical, ChevronUp, ChevronDown, Pencil, Columns,
  Download, Upload,
} from 'lucide-react'
import { Button } from '~ui/button'
import { cn } from '~lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  action: string
  url?: string
  urlParams?: Record<string, string>
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
}

interface AutomationServer { id: string; name: string; description?: string; toolIds?: string[] }
interface AutomationTool { id: string; name: string; displayName?: string; description?: string; serverId: string }

interface AutomationToolFull extends AutomationTool {
  steps: Step[]
  lanes?: Step[][]
  parameters: Array<{ name: string; type: string; description: string; required: boolean; source?: string; sourceKey?: string }>
}

type View = 'list' | 'record' | 'save' | 'edit'

const STEP_ICONS: Record<string, typeof Globe> = {
  navigate: Globe, click: MousePointerClick, type: Keyboard, scroll: ArrowDownUp,
  select: ListFilter, wait: Timer, waitForSelector: Hourglass,
  waitForUrl: Link, waitForLoad: Hourglass, extract: Database,
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

  // Parallel lanes (record/edit)
  const [lanes, setLanes] = useState<Step[][]>([[]])
  const [activeLane, setActiveLane] = useState(0)
  const [editLanes, setEditLanes] = useState<Step[][]>([[]])

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
        if (!msg.error) refreshServers(port)
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
              ...(tool.lanes && tool.lanes.length > 1 ? { lanes: tool.lanes } : {}),
            }
            downloadJson(exportData, `${slugify(tool.name)}-tool.json`)
            return
          }

          setEditTool(tool)
          setEditSteps(tool.steps ?? [])
          // Load lanes from tool or wrap steps as single lane
          const loadedLanes = (tool.lanes && tool.lanes.length > 1) ? tool.lanes : [tool.steps ?? []]
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
            if (s.action !== 'navigate') continue
            const navParams = s.urlParams ? Object.entries(s.urlParams) : (() => {
              try { return Array.from(new URL(s.url ?? '', 'https://x').searchParams.entries()) } catch { return [] }
            })()
            if (navParams.length === 0) continue
            const stepMeta = new Map<string, ParamMeta>()
            for (const [k, v] of navParams) {
              const isParameterized = typeof v === 'string' && /^\{\{.+\}\}$/.test(v)
              const matchingParam = toolParams.find(p => p.sourceKey === k || p.name === k)
              stepMeta.set(k, {
                enabled: isParameterized,
                description: matchingParam?.description ?? '',
                originalValue: isParameterized ? (matchingParam?.name ?? k) : v,
              })
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
          // Tool created — go back to list
          setSteps([])
          setParamMap(new Map())
          setToolName('')
          setToolDesc('')
          setSaveError(null)
          setView('list')
          refreshServers(port)
        }
      } else if (type === 'recording-step' && msg.step != null) {
        const newStep = msg.step as Step
        if (viewRef.current === 'edit') {
          setEditSteps(prev => [...prev, newStep])
          setEditLanes(prev => prev.map((l, i) => i === activeLaneRef.current ? [...l, newStep] : l))
        } else {
          setSteps(prev => [...prev, newStep])
          setLanes(prev => prev.map((l, i) => i === activeLaneRef.current ? [...l, newStep] : l))
        }
      } else if (type === 'recording-complete') {
        if (viewRef.current === 'edit') {
          setIsEditRecording(false)
        } else {
          setIsRecording(false)
        }
        if (msg.error) setRecordError(msg.error as string)
      } else if (type === 'extract-result' && msg.step != null && (msg.step as Step).action === 'extract') {
        const newStep = msg.step as Step
        if (viewRef.current === 'edit') {
          setEditSteps(prev => [...prev, newStep])
          setEditLanes(prev => prev.map((l, i) => i === activeLaneRef.current ? [...l, newStep] : l))
        } else {
          setSteps(prev => [...prev, newStep])
          setLanes(prev => prev.map((l, i) => i === activeLaneRef.current ? [...l, newStep] : l))
        }
      } else if (type === 'exportAutomationServerDone') {
        if (msg.error) {
          setImportError(msg.error as string)
        } else if (msg.data) {
          const data = msg.data as { server: { name: string }; tools: unknown[] }
          downloadJson(data, `${slugify(data.server.name)}-server.json`)
        }
      } else if (type === 'importAutomationServerDone' || type === 'importAutomationToolDone') {
        if (msg.error) {
          setImportError(msg.error as string)
        } else {
          setImportError(null)
          refreshServers(port)
        }
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
  useEffect(() => { activeLaneRef.current = activeLane }, [activeLane])
  useEffect(() => { exportingToolIdRef.current = exportingToolId }, [exportingToolId])
  useEffect(() => { viewRef.current = view }, [view])

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps.length, editSteps.length])

  // ─── Handlers ───────────────────────────────────────────────────

  const handleRecord = () => {
    setSteps([])
    setParamMap(new Map())
    setRecordError(null)
    setIsRecording(true)
    // Reset only the active lane's steps (keep other lanes intact)
    setLanes(prev => prev.map((l, i) => i === activeLane ? [] : l))
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

  const buildFinalData = () => {
    const finalSteps = steps.map((s, i) => {
      const meta = paramMap.get(i)
      if (!meta || s.action !== 'navigate') return s
      const newParams: Record<string, string> = { ...(s.urlParams ?? {}) }
      for (const [k, m] of meta) {
        newParams[k] = m.enabled ? `{{${k}}}` : m.originalValue
      }
      return { ...s, urlParams: newParams }
    })

    const parameters: Array<{ name: string; type: string; description: string; required: boolean; source: string; sourceKey: string }> = []
    for (const [, meta] of paramMap) {
      for (const [k, m] of meta) {
        if (m.enabled) {
          parameters.push({ name: k, type: 'string', description: m.description || k, required: true, source: 'urlParam', sourceKey: k })
        }
      }
    }

    // Include lanes when there are multiple parallel lanes
    const hasMultipleLanes = lanes.length > 1
    const finalLanes = hasMultipleLanes ? lanes : undefined

    return { steps: finalSteps, parameters, lanes: finalLanes }
  }

  const handleDone = () => {
    // Save current steps into active lane before transitioning to save
    setLanes(prev => prev.map((l, i) => i === activeLane ? steps : l))
    setToolName('')
    setToolDesc('')
    setSaveError(null)
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
      version: '1.0.0',
    })
  }

  const openRecordView = (serverId: string) => {
    setSelectedServerId(serverId)
    setSteps([])
    setParamMap(new Map())
    setRecordError(null)
    setLanes([[]])
    setActiveLane(0)
    setView('record')
  }

  const backToList = () => {
    setSelectedServerId(null)
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
    // We intercept the response in getAutomationToolDone — but that opens edit view.
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

  const handleDeleteStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx))
    setLanes(prev => prev.map((l, i) => i === activeLane ? l.filter((_, j) => j !== idx) : l))
    setParamMap(prev => {
      const next = new Map<number, Map<string, ParamMeta>>()
      for (const [k, v] of prev) {
        if (k < idx) next.set(k, v)
        else if (k > idx) next.set(k - 1, v)
      }
      return next
    })
  }

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return
    const reorder = (arr: Step[]) => {
      const next = [...arr]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    }
    setSteps(reorder)
    setLanes(prev => prev.map((l, i) => i === activeLane ? reorder(l) : l))
    // Remap paramMap indices
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

  const handleDropStep = (dragFrom: number, dropTo: number) => {
    if (dragFrom === dropTo) return
    moveStep(dragFrom, dropTo)
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

    // Apply paramMap to steps and build parameters array
    const finalSteps = editSteps.map((s, i) => {
      const meta = editParamMap.get(i)
      if (!meta || s.action !== 'navigate') return s
      const newParams: Record<string, string> = { ...(s.urlParams ?? {}) }
      for (const [k, m] of meta) {
        newParams[k] = m.enabled ? `{{${k}}}` : m.originalValue
      }
      return { ...s, urlParams: newParams }
    })

    const parameters: Array<{ name: string; type: string; description: string; required: boolean; source: string; sourceKey: string }> = []
    for (const [, meta] of editParamMap) {
      for (const [k, m] of meta) {
        if (m.enabled) {
          parameters.push({ name: k, type: 'string', description: m.description || k, required: true, source: 'urlParam', sourceKey: k })
        }
      }
    }

    portRef.current?.postMessage({
      type: 'updateAutomationTool',
      toolId: editTool.id,
      name: slugify(editName),
      displayName: editName.trim(),
      description: editDesc.trim(),
      steps: finalSteps,
      parameters,
      ...(hasMultipleLanes ? { lanes: editLanes } : { lanes: [] }),
    })
  }

  const editMoveStep = (from: number, to: number) => {
    if (to < 0 || to >= editSteps.length) return
    const reorder = (arr: Step[]) => {
      const next = [...arr]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    }
    setEditSteps(reorder)
    setEditLanes(prev => prev.map((l, i) => i === activeLane ? reorder(l) : l))
    setEditParamMap(prev => {
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

  const editDeleteStep = (idx: number) => {
    setEditSteps(prev => prev.filter((_, i) => i !== idx))
    setEditLanes(prev => prev.map((l, i) => i === activeLane ? l.filter((_, j) => j !== idx) : l))
    setEditParamMap(prev => {
      const next = new Map<number, Map<string, ParamMeta>>()
      for (const [k, v] of prev) {
        if (k < idx) next.set(k, v)
        else if (k > idx) next.set(k - 1, v)
      }
      return next
    })
  }

  const editDropStep = (dragFrom: number, dropTo: number) => {
    if (dragFrom === dropTo) return
    editMoveStep(dragFrom, dropTo)
  }

  const editToggleParam = (stepIdx: number, key: string, originalValue: string) => {
    setEditParamMap(prev => {
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

  const editUpdateParamDescription = (stepIdx: number, key: string, description: string) => {
    setEditParamMap(prev => {
      const next = new Map(prev)
      const stepMeta = new Map(next.get(stepIdx) ?? [])
      const existing = stepMeta.get(key)
      if (existing) stepMeta.set(key, { ...existing, description })
      next.set(stepIdx, stepMeta)
      return next
    })
  }

  // ─── Lane management ────────────────────────────────────────────

  const switchLane = (index: number, isEditMode: boolean) => {
    if (isEditMode) {
      // Save current editSteps into current lane before switching
      setEditLanes(prev => prev.map((l, i) => i === activeLane ? editSteps : l))
      setEditSteps(editLanes[index] ?? [])
    } else {
      // Save current steps into current lane before switching
      setLanes(prev => prev.map((l, i) => i === activeLane ? steps : l))
      setSteps(lanes[index] ?? [])
      setParamMap(new Map()) // paramMap is per-lane, reset on switch
    }
    setActiveLane(index)
  }

  const addLane = (isEditMode: boolean) => {
    if (isEditMode) {
      setEditLanes(prev => [...prev, []])
      const newIdx = editLanes.length
      setActiveLane(newIdx)
      setEditSteps([])
    } else {
      // Save current steps into current lane before adding new one
      setLanes(prev => {
        const updated = prev.map((l, i) => i === activeLane ? steps : l)
        return [...updated, []]
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
      setEditSteps(next[newActive] ?? [])
    } else {
      if (lanes.length <= 1) return
      const next = lanes.filter((_, i) => i !== index)
      setLanes(next)
      const newActive = index >= next.length ? next.length - 1 : index
      setActiveLane(newActive)
      setSteps(next[newActive] ?? [])
      setParamMap(new Map())
    }
  }

  const toggleParam = (stepIdx: number, key: string, originalValue: string) => {
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

  const updateParamDescription = (stepIdx: number, key: string, description: string) => {
    setParamMap(prev => {
      const next = new Map(prev)
      const stepMeta = new Map(next.get(stepIdx) ?? [])
      const existing = stepMeta.get(key)
      if (existing) stepMeta.set(key, { ...existing, description })
      next.set(stepIdx, stepMeta)
      return next
    })
  }

  // ─── Counts ────────────────────────────────────────────────────

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
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                placeholder="What does this macro do?"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
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
            <Button variant="outline" size="sm" disabled={!isEditRecording} onClick={() => handleEditExtract('list')}>
              <List className="h-3.5 w-3.5" /> List
            </Button>
            <Button variant="outline" size="sm" disabled={!isEditRecording} onClick={() => handleEditExtract('single')}>
              <FileText className="h-3.5 w-3.5" /> Single
            </Button>
          </div>

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
          />

          {/* Steps */}
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
              Steps ({editSteps.length}){editLanes.length > 1 && ` · Lane ${activeLane + 1}`}
            </p>
            {editSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {isEditRecording ? 'Recording — interact with the page…' : 'No steps — press Record to add actions'}
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
              />
            ))}
            <div ref={stepsEndRef} />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t text-sm text-muted-foreground">
          {isEditRecording && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />}
          <span>
            {editSteps.length} step{editSteps.length !== 1 ? 's' : ''}
            {editLanes.length > 1 && ` · Lane ${activeLane + 1}/${editLanes.length}`}
            {editLanes.length > 1 && ` (${editLanes.reduce((s, l) => s + l.length, 0)} total)`}
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
                ? ` · ${lanes.length} lanes · ${lanes.reduce((s, l) => s + l.length, 0)} total steps`
                : ` · ${steps.length} steps`}
              {paramCount > 0 && ` · ${paramCount} params`}
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Macro Name</label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="e.g. search_hacker_news"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={toolDesc}
                onChange={(e) => setToolDesc(e.target.value)}
                placeholder="What does this tool do?"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
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
                  <span className="font-medium text-foreground">{step.action}</span>
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
              <input type="text" value={newServerName} onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server name" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" autoFocus />
              <input type="text" value={newServerDesc} onChange={(e) => setNewServerDesc(e.target.value)}
                placeholder="Description (optional)" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
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
                        <input type="text" value={editServerName} onChange={(e) => setEditServerName(e.target.value)}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-ring" autoFocus />
                        <input type="text" value={editServerDesc} onChange={(e) => setEditServerDesc(e.target.value)}
                          placeholder="Description" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
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
        <Button variant="outline" size="sm" disabled={!isRecording} onClick={() => handleExtract('list')}>
          <List className="h-3.5 w-3.5" /> List
        </Button>
        <Button variant="outline" size="sm" disabled={!isRecording} onClick={() => handleExtract('single')}>
          <FileText className="h-3.5 w-3.5" /> Single
        </Button>
        <Button variant="outline" size="sm" disabled={isRecording} onClick={() => addLane(false)}>
          <Columns className="h-3.5 w-3.5" /> Lane
        </Button>
        <Button variant="secondary" size="sm" disabled={steps.length === 0 && lanes.every(l => l.length === 0)} onClick={handleDone}>
          <Check className="h-3.5 w-3.5" /> Done
        </Button>
      </div>

      {/* Lane tabs (only shown when >1 lane) */}
      <LaneTabBar
        lanes={lanes}
        activeLane={activeLane}
        onSwitch={(i) => switchLane(i, false)}
        onAdd={() => addLane(false)}
        onRemove={(i) => removeLane(i, false)}
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
              {isRecording ? 'Recording — interact with the page…' : 'No steps yet'}
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
                onMoveUp={() => moveStep(i, i - 1)}
                onMoveDown={() => moveStep(i, i + 1)}
                onDragStart={() => { dragIdxRef.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdxRef.current !== null) { handleDropStep(dragIdxRef.current, i); dragIdxRef.current = null } }}
                onToggleParam={(key, orig) => toggleParam(i, key, orig)}
                onDescriptionChange={(key, desc) => updateParamDescription(i, key, desc)}
              />
            ))}
            <div ref={stepsEndRef} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t text-sm text-muted-foreground">
        {isRecording && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />}
        <span>
          {steps.length} step{steps.length !== 1 ? 's' : ''}
          {lanes.length > 1 && ` · Lane ${activeLane + 1}/${lanes.length}`}
          {lanes.length > 1 && ` (${lanes.reduce((s, l) => s + l.length, 0)} total)`}
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
}: {
  lanes: Step[][]
  activeLane: number
  onSwitch: (idx: number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}) {
  if (lanes.length <= 1) return null
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30 overflow-x-auto">
      {lanes.map((lane, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSwitch(i)}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 cursor-pointer',
            i === activeLane
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          Lane {i + 1}
          <span className="text-xs opacity-70">({lane.length})</span>
          {lanes.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(i) }}
              className={cn(
                'ml-0.5 rounded p-0.5 transition-colors cursor-pointer',
                i === activeLane
                  ? 'hover:bg-primary-foreground/20'
                  : 'hover:bg-destructive/10 hover:text-destructive',
              )}
              title={`Remove Lane ${i + 1}`}
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

// ─── StepCard ────────────────────────────────────────────────────────────────

function StepCard({
  step, index, total, paramMeta, onDelete, onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDrop, onToggleParam, onDescriptionChange,
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
}) {
  const Icon = STEP_ICONS[step.action] ?? Wrench
  const detail = stepDetail(step)
  const params = getNavParams(step)

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
        <span className="font-medium text-foreground">{step.action}</span>
        {detail && <p className="text-muted-foreground truncate mt-0.5">{detail}</p>}

        {params.length > 0 && (
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
                      title={isP ? 'Revert to static value' : 'Make dynamic — LLM will provide this value'}
                    >
                      <span className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                        isP ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  {isP && (
                    <div className="px-2.5 pb-2">
                      <input type="text" value={meta?.description ?? ''}
                        onChange={(e) => onDescriptionChange(k, e.target.value)}
                        placeholder="Describe this parameter (e.g. Search query)"
                        className="w-full rounded-md border bg-background/80 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  )}
                </div>
              )
            })}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stepDetail(step: Step): string {
  switch (step.action) {
    case 'navigate': try { return new URL(step.url ?? '', 'https://x').hostname } catch { return step.url?.slice(0, 40) ?? '' }
    case 'click': return step.selector?.slice(0, 50) ?? ''
    case 'type': return `"${step.text?.slice(0, 25)}" → ${step.selector?.slice(0, 20)}`
    case 'scroll': return `${step.direction ?? 'down'} ${step.amount ?? 0}px`
    case 'select': return `${step.value} → ${step.selector?.slice(0, 20)}`
    case 'wait': return `${step.ms ?? 0}ms`
    case 'waitForSelector': return step.selector?.slice(0, 50) ?? ''
    case 'waitForUrl': return step.pattern?.slice(0, 50) ?? ''
    case 'waitForLoad': return `${step.timeout ?? 0}ms`
    case 'extract': {
      const props = Array.isArray(step.fields) ? step.fields.length : 0
      return step.mode === 'list' && step.itemCount
        ? `${step.itemCount} items · ${props} props`
        : `${step.mode ?? 'single'} · ${props} props`
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
