import { useState, useEffect, useCallback } from 'react'
import { CodeEditor } from './code-editor'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
  enum?: string[]
  default?: string | number | boolean
}

interface CodeToolDefinition {
  id: string
  name: string
  description: string
  version: string
  parameters: ToolParameter[]
  code: string
  createdAt?: number
  updatedAt?: number
}

interface ToolStorageData {
  tools: CodeToolDefinition[]
  version: number
}

interface MarketplaceToolIndex {
  slug: string
  name: string
  displayName: string
  description: string
  category: string
  author: { githubUsername: string; displayName: string; avatarUrl: string }
  tags: string[]
  updatedAt: string
}

interface MarketplaceToolFull {
  id: string
  slug: string
  name: string
  displayName: string
  description: string
  category: string
  version: string
  parameters: ToolParameter[]
  code: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GITHUB_RAW = 'https://raw.githubusercontent.com/ekingunoncu/zihin.io/main'
const STORAGE_KEY = 'izan_tools'

async function fetchMarketplaceIndex(): Promise<MarketplaceToolIndex[]> {
  try { const r = await fetch(`${GITHUB_RAW}/tools/index.json`); return r.ok ? r.json() : [] } catch { return [] }
}
async function fetchMarketplaceTool(slug: string): Promise<MarketplaceToolFull | null> {
  try { const r = await fetch(`${GITHUB_RAW}/tools/${slug}/tool.json`); if (!r.ok) return null; const d = await r.json(); return d.tool ?? d } catch { return null }
}
async function loadTools(): Promise<CodeToolDefinition[]> {
  const r = await chrome.storage.local.get(STORAGE_KEY); return (r[STORAGE_KEY] as ToolStorageData | undefined)?.tools ?? []
}
async function saveTools(tools: CodeToolDefinition[]): Promise<void> {
  const d = await chrome.storage.local.get(STORAGE_KEY); const v = (d[STORAGE_KEY] as ToolStorageData | undefined)?.version ?? 0
  await chrome.storage.local.set({ [STORAGE_KEY]: { tools, version: v + 1 } })
}

const DEFAULT_CODE = `async (params, browser) => {
  await browser.open('https://example.com')
  await browser.waitForLoad()
  const title = await browser.evaluate('document.title')
  return { title }
}`

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [tools, setTools] = useState<CodeToolDefinition[]>([])
  const [tab, setTab] = useState<'tools' | 'store'>('tools')
  const [editing, setEditing] = useState<CodeToolDefinition | null>(null)
  const [connected, setConnected] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    loadTools().then(setTools)
    const fn = (c: Record<string, chrome.storage.StorageChange>) => { if (c[STORAGE_KEY]) setTools((c[STORAGE_KEY].newValue as ToolStorageData)?.tools ?? []) }
    chrome.storage.onChanged.addListener(fn)
    return () => chrome.storage.onChanged.removeListener(fn)
  }, [])

  useEffect(() => {
    const check = () => chrome.runtime.sendMessage({ type: 'izan-bridge-status' }, r => { if (!chrome.runtime.lastError) setConnected(r?.connected ?? false) })
    check(); const i = setInterval(check, 5000); return () => clearInterval(i)
  }, [])

  const newTool = () => {
    setEditing({ id: crypto.randomUUID(), name: '', description: '', version: '1.0.0', parameters: [], code: DEFAULT_CODE })
    setOutput(null)
  }

  const saveTool = useCallback(async () => {
    if (!editing || !editing.name.trim()) return
    const now = Date.now()
    // Strip JSDoc preamble if it leaked into the code
    const cleanCode = editing.code.replace(/^\/\*\*\s*@type\s*\{[^}]*\}\s*\*\/\n?/, '')
    const t = { ...editing, code: cleanCode, name: editing.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''), updatedAt: now, createdAt: editing.createdAt || now }
    await saveTools(tools.some(x => x.id === t.id) ? tools.map(x => x.id === t.id ? t : x) : [...tools, t])
    setEditing(null)
    setOutput(null)
  }, [editing, tools])

  const deleteTool = useCallback(async (id: string) => { await saveTools(tools.filter(t => t.id !== id)) }, [tools])

  const runTool = useCallback(async (tool: CodeToolDefinition, args: Record<string, unknown> = {}) => {
    setRunning(true); setOutput(null)
    // Strip JSDoc preamble if present
    const cleanTool = { ...tool, code: tool.code.replace(/^\/\*\*\s*@type\s*\{[^}]*\}\s*\*\/\n?/, '') }
    // Fill in default values for params not provided
    const fullArgs = { ...args }
    for (const p of cleanTool.parameters) {
      if (fullArgs[p.name] === undefined && p.default !== undefined) {
        fullArgs[p.name] = p.default
      }
    }
    try {
      const r = await chrome.runtime.sendMessage({ type: 'izan-test-tool', tool: cleanTool, args: fullArgs })
      setOutput(JSON.stringify(r, null, 2))
    } catch (e) { setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`) }
    finally { setRunning(false) }
  }, [])

  const installTool = useCallback(async (mt: MarketplaceToolFull) => {
    const now = Date.now()
    const t: CodeToolDefinition = { id: crypto.randomUUID(), name: mt.name, description: mt.description, version: mt.version || '1.0.0', parameters: mt.parameters, code: mt.code, createdAt: now, updatedAt: now }
    const existing = tools.find(x => x.name === t.name)
    await saveTools(existing ? tools.map(x => x.name === t.name ? { ...t, id: x.id, createdAt: x.createdAt } : x) : [...tools, t])
  }, [tools])

  // ─── Editor mode ────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex flex-col h-screen dark text-[12px] font-mono">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-[#1e1e1e] text-[11px]">
          <button onClick={() => { setEditing(null); setOutput(null) }} className="px-1.5 py-0.5 hover:bg-[#333] rounded text-[#999] hover:text-white">← back</button>
          <div className="flex-1" />
          <button onClick={() => runTool(editing)} disabled={running} className="px-2 py-0.5 hover:bg-[#333] rounded text-green-400 hover:text-green-300 disabled:opacity-40">
            {running ? '⏳ running' : '▶ run'}
          </button>
          <button onClick={saveTool} disabled={!editing.name.trim()} className="px-2 py-0.5 hover:bg-[#333] rounded text-[#999] hover:text-white disabled:opacity-30">
            save
          </button>
        </div>

        {/* Meta */}
        <div className="px-2 py-1 border-b bg-[#1e1e1e] flex items-center gap-2">
          <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="tool_name" className="w-28 bg-transparent text-[11px] text-[#ccc] focus:outline-none" />
          <input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="description" className="flex-1 bg-transparent text-[11px] text-[#666] focus:outline-none" />
        </div>

        {/* Params */}
        <div className="px-2 py-1 border-b bg-[#1e1e1e]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#555] uppercase tracking-wider">params</span>
            <button onClick={() => setEditing({ ...editing, parameters: [...editing.parameters, { name: '', type: 'string', description: '', required: true }] })} className="text-[10px] text-[#555] hover:text-white px-1.5 py-0.5 border border-[#333] rounded hover:bg-[#333] transition-colors">+</button>
          </div>
          {editing.parameters.length === 0 && (
            <span className="text-[10px] text-[#444] italic">no parameters</span>
          )}
          {editing.parameters.length > 0 && (
            <div className="grid gap-px">
              {/* Header */}
              <div className="grid grid-cols-[1fr_40px_1fr_16px] gap-1 text-[9px] text-[#444] uppercase tracking-wider pb-0.5">
                <span>name</span><span>type</span><span>default</span><span />
              </div>
              {editing.parameters.map((p, i) => {
                const update = (u: Partial<ToolParameter & { default?: string | number | boolean }>) => { const ps = [...editing.parameters]; ps[i] = { ...ps[i], ...u }; setEditing({ ...editing, parameters: ps }) }
                return (
                  <div key={i} className="grid grid-cols-[1fr_40px_1fr_16px] gap-1 items-center py-0.5 hover:bg-[#252525] rounded">
                    <input value={p.name} onChange={e => update({ name: e.target.value })} placeholder="name" className="bg-transparent text-[11px] text-[#ccc] focus:outline-none min-w-0" />
                    <select value={p.type} onChange={e => update({ type: e.target.value as ToolParameter['type'] })} className="bg-transparent text-[10px] text-[#888] focus:outline-none">
                      <option value="string">str</option><option value="number">num</option><option value="boolean">bool</option>
                    </select>
                    <input value={p.default ?? ''} onChange={e => update({ default: e.target.value || undefined })} placeholder="-" className="bg-transparent text-[11px] text-[#666] focus:outline-none min-w-0" />
                    <button onClick={() => setEditing({ ...editing, parameters: editing.parameters.filter((_, j) => j !== i) })} className="text-[10px] text-[#444] hover:text-red-400 text-center">×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Code editor */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={editing.code}
            onChange={code => setEditing({ ...editing, code })}
            parameters={editing.parameters}
            placeholder="async (params, browser) => { ... }"
            onRun={() => runTool(editing)}
            minHeight="100%"
          />
        </div>

        {/* Output panel */}
        {output !== null && (
          <div className="border-t bg-[#1e1e1e] max-h-48 overflow-auto">
            <div className="flex items-center justify-between px-2 py-0.5 border-b border-[#333]">
              <span className="text-[10px] text-[#555] uppercase tracking-wider">output</span>
              <button onClick={() => setOutput(null)} className="text-[10px] text-[#555] hover:text-white">×</button>
            </div>
            <pre className="px-2 py-1 text-[11px] text-[#ccc] whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    )
  }

  // ─── List mode ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen dark text-[12px]">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b bg-[#1e1e1e]">
        <div className="flex gap-3 text-[11px]">
          <button onClick={() => setTab('tools')} className={tab === 'tools' ? 'text-white' : 'text-[#666] hover:text-white'}>tools</button>
          <button onClick={() => setTab('store')} className={tab === 'store' ? 'text-white' : 'text-[#666] hover:text-white'}>store</button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {tab === 'tools' && <button onClick={newTool} className="text-[11px] text-[#666] hover:text-white">+ new</button>}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        {tab === 'tools' && <ToolsPanel tools={tools} onEdit={t => { setEditing({ ...t }); setOutput(null) }} onDelete={deleteTool} onRun={t => runTool(t)} />}
        {tab === 'store' && <StorePanel installed={tools} onInstall={installTool} onRun={t => runTool(t)} />}
      </main>

      {/* Output from list-mode run */}
      {output !== null && !editing && (
        <div className="border-t bg-[#1e1e1e] max-h-40 overflow-auto">
          <div className="flex items-center justify-between px-2 py-0.5 border-b border-[#333]">
            <span className="text-[10px] text-[#555] uppercase tracking-wider">output</span>
            <button onClick={() => setOutput(null)} className="text-[10px] text-[#555] hover:text-white">×</button>
          </div>
          <pre className="px-2 py-1 text-[11px] font-mono text-[#ccc] whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Tools Panel ─────────────────────────────────────────────────────────────

function ToolsPanel({ tools, onEdit, onDelete, onRun }: {
  tools: CodeToolDefinition[]
  onEdit: (t: CodeToolDefinition) => void
  onDelete: (id: string) => void
  onRun: (t: CodeToolDefinition) => void
}) {
  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="text-[11px] text-[#555]">no tools yet</span>
        <button onClick={() => onEdit({ id: crypto.randomUUID(), name: '', description: '', version: '1.0.0', parameters: [], code: DEFAULT_CODE })} className="text-[11px] text-[#888] hover:text-white px-2 py-0.5 border border-[#333] rounded hover:bg-[#333] transition-colors">+ new</button>
      </div>
    )
  }

  return (
    <div>
      {tools.map(t => (
        <div key={t.id} className="flex items-center group hover:bg-[#2a2a2a] px-2 py-1.5 cursor-pointer" onClick={() => onEdit(t)}>
          <span className="text-[11px] font-mono text-[#ccc] w-28 shrink-0 truncate">{t.name}</span>
          <span className="text-[11px] text-[#555] flex-1 truncate">{t.description}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 ml-1">
            <button onClick={e => { e.stopPropagation(); onRun(t) }} className="text-[10px] text-green-400/70 hover:text-green-400 px-1">▶</button>
            <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${t.name}"?`)) onDelete(t.id) }} className="text-[10px] text-[#555] hover:text-red-400 px-1">×</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Store Panel ─────────────────────────────────────────────────────────────

function StorePanel({ installed, onInstall, onRun }: {
  installed: CodeToolDefinition[]
  onInstall: (t: MarketplaceToolFull) => Promise<void>
  onRun: (t: CodeToolDefinition) => void
}) {
  const [index, setIndex] = useState<MarketplaceToolIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { fetchMarketplaceIndex().then(d => { setIndex(d); setLoading(false) }) }, [])

  const byName = new Map(installed.map(t => [t.name, t]))
  const filtered = search ? index.filter(t => (t.displayName + t.name + t.description).toLowerCase().includes(search.toLowerCase())) : index

  const doInstall = async (e: MarketplaceToolIndex) => {
    setBusy(e.slug)
    try { const t = await fetchMarketplaceTool(e.slug); if (t) await onInstall(t) }
    finally { setBusy(null) }
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-[11px] text-[#555]">loading...</div>

  return (
    <div>
      <div className="px-2 py-1.5 border-b border-[#333]">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search..." className="w-full bg-transparent text-[11px] text-[#ccc] focus:outline-none" />
      </div>
      {filtered.length === 0 && <div className="text-center text-[11px] text-[#555] py-8">{search ? 'no results' : 'marketplace empty'}</div>}
      {filtered.map(entry => {
        const inst = byName.get(entry.name)
        return (
          <div key={entry.slug} className="flex items-center hover:bg-[#2a2a2a] px-2 py-1.5">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-[#ccc] block truncate">{entry.displayName}</span>
              <span className="text-[10px] text-[#555] block truncate">{entry.description}</span>
            </div>
            <div className="flex gap-1 ml-1">
              {inst && <button onClick={() => onRun(inst)} className="text-[10px] text-green-400/70 hover:text-green-400 px-1">▶</button>}
              <button onClick={() => doInstall(entry)} disabled={busy === entry.slug} className="text-[10px] text-[#888] hover:text-white px-1 disabled:opacity-40">
                {busy === entry.slug ? '...' : inst ? '✓' : 'get'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
