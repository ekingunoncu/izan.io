import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  ArrowLeft, Server, Plus, Trash2, X, Circle, Square,
  List, FileText, Check, Globe, MousePointerClick,
  Keyboard, ArrowDownUp, ListFilter, Timer, Hourglass,
  Link, Database, Save, Wrench, Loader2, AlertTriangle, RefreshCw,
  GripVertical, ChevronUp, ChevronDown, Pencil,
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
  const editDragIdxRef = useRef<number | null>(null)

  // Auto-scroll & drag state
  const stepsEndRef = useRef<HTMLDivElement>(null)
  const dragIdxRef = useRef<number | null>(null)

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
          refreshServers(port)
          setView('list')
        } else {
          setEditError(msg.error as string)
        }
      } else if (type === 'getAutomationToolDone') {
        if (msg.error) {
          setEditError(msg.error as string)
        } else {
          const tool = msg.data as AutomationToolFull
          setEditTool(tool)
          setEditSteps(tool.steps ?? [])
          setEditName(tool.displayName || tool.name)
          setEditDesc(tool.description ?? '')
          setEditError(null)
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
        setSteps(prev => [...prev, msg.step as Step])
      } else if (type === 'recording-complete') {
        // Don't replace steps — the side panel already has the full list
        // from incremental recording-step + extract-result messages.
        // Replacing would discard extract steps (which aren't in the recorder).
        setIsRecording(false)
        if (msg.error) setRecordError(msg.error as string)
      } else if (type === 'extract-result' && msg.step != null && (msg.step as Step).action === 'extract') {
        setSteps(prev => [...prev, msg.step as Step])
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

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps.length])

  // ─── Handlers ───────────────────────────────────────────────────

  const handleRecord = () => {
    setSteps([])
    setParamMap(new Map())
    setRecordError(null)
    setIsRecording(true)
    portRef.current?.postMessage({ type: 'startRecording' })
  }

  const handleStop = () => {
    portRef.current?.postMessage({ type: 'stopRecording' })
    setIsRecording(false)
  }

  const handleExtract = (mode: 'list' | 'single') => {
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

    return { steps: finalSteps, parameters }
  }

  const handleDone = () => {
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

    const { steps: finalSteps, parameters } = buildFinalData()
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
      version: '1.0.0',
    })
  }

  const openRecordView = (serverId: string) => {
    setSelectedServerId(serverId)
    setSteps([])
    setParamMap(new Map())
    setRecordError(null)
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

  const handleDeleteStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx))
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
    setSteps(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
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
    portRef.current?.postMessage({
      type: 'updateAutomationTool',
      toolId: editTool.id,
      name: slugify(editName),
      displayName: editName.trim(),
      description: editDesc.trim(),
      steps: editSteps,
    })
  }

  const editMoveStep = (from: number, to: number) => {
    if (to < 0 || to >= editSteps.length) return
    setEditSteps(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const editDeleteStep = (idx: number) => {
    setEditSteps(prev => prev.filter((_, i) => i !== idx))
  }

  const editDropStep = (dragFrom: number, dropTo: number) => {
    if (dragFrom === dropTo) return
    editMoveStep(dragFrom, dropTo)
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
          icon={<Pencil className="h-4 w-4 text-primary" />}
          onBack={backToList}
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Macro Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description</label>
              <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                placeholder="What does this macro do?"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={backToList} disabled={editSaving}>Cancel</Button>
              <Button variant="default" size="sm" className="flex-1" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
              Steps ({editSteps.length})
            </p>
            {editSteps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No steps</p>
            ) : editSteps.map((step, i) => (
              <StepCard
                key={i}
                index={i}
                total={editSteps.length}
                step={step}
                paramMeta={new Map()}
                onDelete={() => editDeleteStep(i)}
                onMoveUp={() => editMoveStep(i, i - 1)}
                onMoveDown={() => editMoveStep(i, i + 1)}
                onDragStart={() => { editDragIdxRef.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (editDragIdxRef.current !== null) { editDropStep(editDragIdxRef.current, i); editDragIdxRef.current = null } }}
                onToggleParam={() => {}}
                onDescriptionChange={() => {}}
              />
            ))}
          </div>
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
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div className="rounded-lg border bg-card p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Server: <span className="font-medium text-foreground">{serverName}</span>
              {' · '}{steps.length} steps{paramCount > 0 && ` · ${paramCount} params`}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Macro Name</label>
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
              <label className="text-xs font-medium">Description</label>
              <input
                type="text"
                value={toolDesc}
                onChange={(e) => setToolDesc(e.target.value)}
                placeholder="What does this tool do?"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {saveError && <p className="text-xs text-destructive">{saveError}</p>}

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
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">Steps preview</p>
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[step.action] ?? Wrench
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/50 text-xs">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {/* Connection error banner */}
          {connectionError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p>{connectionError}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-amber-500/20" onClick={() => { if (portRef.current) refreshServers(portRef.current) }} title="Retry">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* New server form */}
          {showNewServerForm && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">New Macro Server</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowNewServerForm(false); setCreateError(null) }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <input type="text" value={newServerName} onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server name" className="w-full rounded-md border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" autoFocus />
              <input type="text" value={newServerDesc} onChange={(e) => setNewServerDesc(e.target.value)}
                placeholder="Description (optional)" className="w-full rounded-md border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" />
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <div className="flex gap-1.5 justify-end">
                <Button variant="outline" size="xs" onClick={() => { setShowNewServerForm(false); setCreateError(null) }}>Cancel</Button>
                <Button variant="default" size="xs" onClick={handleCreateServer}>Create</Button>
              </div>
            </div>
          )}

          {/* Content */}
          {serversLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : servers.length === 0 && !showNewServerForm ? (
            <div className="py-6 space-y-3 text-center">
              <Server className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No macro servers yet</p>
              <p className="text-xs text-muted-foreground px-4">
                Create a server to start recording macros.
              </p>
              <Button variant="default" size="sm" onClick={() => setShowNewServerForm(true)}>
                <Plus className="h-3.5 w-3.5" /> New Server
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
                      <div className="px-3 py-2.5 space-y-2">
                        <input type="text" value={editServerName} onChange={(e) => setEditServerName(e.target.value)}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm font-medium outline-none focus:ring-1 focus:ring-ring" autoFocus />
                        <input type="text" value={editServerDesc} onChange={(e) => setEditServerDesc(e.target.value)}
                          placeholder="Description" className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" />
                        <div className="flex gap-1.5 justify-end">
                          <Button variant="outline" size="xs" onClick={cancelEditServer}>Cancel</Button>
                          <Button variant="default" size="xs" onClick={saveEditServer}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            {s.description && <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>}
                            <p className="text-[11px] text-muted-foreground">
                              {serverTools.length} tool{serverTools.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="xs" className="h-7 w-7 p-0"
                              onClick={() => startEditServer(s)} title="Edit server">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive h-7 w-7 p-0"
                              onClick={() => handleDeleteServer(s.id, s.name)} title="Delete server">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <button
                          onClick={() => openRecordView(s.id)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Circle className="h-3 w-3" />
                          Record Macro
                        </button>
                      </div>
                    )}

                    {serverTools.length > 0 && (
                      <div className="border-t px-3 py-2 bg-muted/30 space-y-0.5">
                        {serverTools.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 py-1 group cursor-pointer hover:bg-secondary/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => openEditView(t.id)} role="button" tabIndex={0}>
                            <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-foreground truncate block">{t.displayName || t.name}</span>
                              {t.description && <span className="text-[10px] text-muted-foreground truncate block">{t.description}</span>}
                            </div>
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground shrink-0" />
                            <button type="button"
                              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTool(t.id, t.displayName || t.name) }} title="Delete macro">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {!showNewServerForm && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowNewServerForm(true)}>
                  <Plus className="h-3.5 w-3.5" /> New Macro Server
                </Button>
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
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <X className="h-3.5 w-3.5 shrink-0" />
          {recordError}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b">
        {isRecording ? (
          <Button variant="destructive" size="xs" onClick={handleStop}>
            <Square className="h-3 w-3" /> Stop
          </Button>
        ) : (
          <Button variant="default" size="xs" onClick={handleRecord}>
            <Circle className="h-3 w-3" /> Record
          </Button>
        )}
        <Button variant="outline" size="xs" disabled={!isRecording} onClick={() => handleExtract('list')}>
          <List className="h-3 w-3" /> List
        </Button>
        <Button variant="outline" size="xs" disabled={!isRecording} onClick={() => handleExtract('single')}>
          <FileText className="h-3 w-3" /> Single
        </Button>
        <Button variant="secondary" size="xs" disabled={steps.length === 0} onClick={handleDone}>
          <Check className="h-3 w-3" /> Done
        </Button>
      </div>

      {/* Help text */}
      <p className="text-[11px] text-muted-foreground px-3 py-2 leading-relaxed">
        Press "Record" to capture clicks, typing, and navigation. Use "Parameterize" to turn URL values into LLM inputs.
      </p>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {steps.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <MousePointerClick className="h-6 w-6 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {isRecording ? 'Recording — interact with the page…' : 'No steps yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
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
      <div className="flex items-center gap-2 px-3 py-2 border-t text-[11px] text-muted-foreground">
        {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-dot" />}
        <span>
          {steps.length} step{steps.length !== 1 ? 's' : ''}
          {extractCount > 0 && ` · ${extractCount} extract${extractCount !== 1 ? 's' : ''}`}
          {paramCount > 0 && ` · ${paramCount} param${paramCount !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ title, icon, onBack }: { title: string; icon: ReactNode; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-card">
      {onBack && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      {icon}
      <span className="font-semibold text-sm">{title}</span>
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
      className="group relative flex gap-1.5 p-2 rounded-lg border bg-card hover:bg-secondary/50 text-xs transition-colors"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag handle + reorder buttons */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
        <button type="button" onClick={onMoveUp} disabled={index === 0}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer" title="Move up">
          <ChevronUp className="h-3 w-3" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer" title="Move down">
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{step.action}</span>
        {detail && <p className="text-muted-foreground truncate mt-0.5">{detail}</p>}

        {params.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">URL Parameters</p>
            {params.map(([k, v]) => {
              const meta = paramMeta.get(k)
              const isP = meta?.enabled ?? false
              return (
                <div key={k} className={cn('rounded-md border transition-colors', isP ? 'border-primary/30 bg-primary/5' : 'bg-background/50')}>
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <span className="font-mono font-medium text-[11px] shrink-0">{k}</span>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">
                      = {isP ? <span className="text-primary font-semibold">{`{{${k}}}`}</span> : v}
                    </span>
                    {/* Toggle switch */}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleParam(k, v) }}
                      className={cn(
                        'shrink-0 relative inline-flex h-4 w-7 items-center rounded-full transition-colors cursor-pointer',
                        isP ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-muted-foreground/35'
                      )}
                      role="switch"
                      aria-checked={isP}
                      title={isP ? 'Revert to static value' : 'Make dynamic — LLM will provide this value'}
                    >
                      <span className={cn(
                        'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                        isP ? 'translate-x-3.5' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  {isP && (
                    <div className="px-2 pb-1.5">
                      <input type="text" value={meta?.description ?? ''}
                        onChange={(e) => onDescriptionChange(k, e.target.value)}
                        placeholder="Describe this parameter (e.g. Search query)"
                        className="w-full rounded-md border bg-background/80 px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring"
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
        className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
        title="Delete step">
        <Trash2 className="h-3 w-3" />
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
