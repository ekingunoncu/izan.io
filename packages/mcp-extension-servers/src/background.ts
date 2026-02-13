/**
 * Background Service Worker
 *
 * 1. Extension lifecycle (install, update, startup)
 * 2. BrowserWindow commands via chrome.windows / chrome.tabs
 * 3. CDP (chrome.debugger) for CSP-free JS evaluation in popup window
 * 4. Automation CRUD via chrome.storage.local (no izan.io tab required)
 */

import * as automationStorage from './automation-storage.js'

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') console.log('[izan-ext] Installed')
  else if (reason === 'update') console.log(`[izan-ext] Updated to ${chrome.runtime.getManifest().version}`)
})

// ─── Side panel & recording bridge ───────────────────────────────────────────

let sidePanelPort: chrome.runtime.Port | null = null
let recordingTabId: number | null = null
/** Steps accumulated before a cross-page navigation, sent back to the re-injected recorder */
let pendingRecordingSteps: unknown[] | null = null

/** Stricter match: only tabs whose origin is izan.io or localhost */
function isIzanTab(tab: chrome.tabs.Tab): boolean {
  if (!tab.url) return false
  try {
    const u = new URL(tab.url)
    return u.hostname === 'izan.io' || u.hostname === 'www.izan.io' || u.hostname === 'localhost'
  } catch { return false }
}

/**
 * Best-effort sync: push full automation data to an open izan.io tab.
 * Silently ignores failures (no tab open, content script not loaded, etc.)
 */
function bestEffortSyncToTab(): void {
  automationStorage.getData().then((data) => {
    chrome.tabs.query({}, (tabs) => {
      for (const t of tabs) {
        if (!t.id || !isIzanTab(t)) continue
        chrome.tabs.sendMessage(t.id, {
          type: 'izan-sync-automation',
          servers: data.servers,
          tools: data.tools,
        }).catch(() => {})
      }
    })
  }).catch(() => {})
}

// ─── Re-inject recorder on page reload/navigation ────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId !== recordingTabId || changeInfo.status !== 'complete') return
  // The recording tab finished loading - re-inject the recorder script
  const steps = pendingRecordingSteps
  pendingRecordingSteps = null
  chrome.scripting
    .executeScript({ target: { tabId }, files: ['recorder-inject.js'], world: 'ISOLATED' })
    .then(() => new Promise<void>((r) => setTimeout(r, 150)))
    .then(() => chrome.tabs.sendMessage(tabId, { type: 'recorder-resume', steps: steps ?? [] }))
    .then(() => {
      console.log('[izan-ext] Re-injected recorder after navigation, tabId:', tabId)
      sidePanelPort?.postMessage({ type: 'recording-reinjected' })
    })
    .catch((err) => {
      console.error('[izan-ext] Failed to re-inject recorder:', err)
    })
})

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId != null) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {})
  }
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel') return
  sidePanelPort = port
  port.onDisconnect.addListener(() => { sidePanelPort = null })

  port.onMessage.addListener((msg: { type: string; mode?: string; steps?: unknown[] }) => {
    if (msg.type === 'startRecording') {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return
        recordingTabId = tab.id
        chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ['recorder-inject.js'], world: 'ISOLATED' })
          .then(() => {
            // Give the injected script time to register its onMessage listener before we send recorder-start
            return new Promise<void>((r) => setTimeout(r, 150))
          })
          .then(() => chrome.tabs.sendMessage(tab.id!, { type: 'recorder-start' }))
          .then(() =>
            chrome.scripting.executeScript({
              target: { tabId: tab.id! },
              func: () => ({ width: window.innerWidth, height: window.innerHeight }),
            }),
          )
          .then((results) => {
            const viewport = results?.[0]?.result as { width: number; height: number } | undefined
            sidePanelPort?.postMessage({ type: 'recording-started', viewport })
          })
          .catch((err) => {
            console.error('[izan-ext] Inject or start failed:', err)
            recordingTabId = null
            sidePanelPort?.postMessage({ type: 'recording-complete', steps: [], error: String(err) })
          })
      })
    } else if (msg.type === 'stopRecording' && recordingTabId != null) {
      chrome.tabs.sendMessage(recordingTabId, { type: 'recorder-stop' }).catch(() => {})
      recordingTabId = null
    } else if (msg.type === 'navigateRecordingTab') {
      const rawUrl = (msg as Record<string, unknown>).url as string
      const resolveAndNavigate = (tabId: number) => {
        chrome.tabs.get(tabId, (tab) => {
          let finalUrl = rawUrl
          // Resolve relative URLs against the tab's current page origin
          if (!/^https?:\/\//.test(rawUrl) && tab?.url) {
            try { finalUrl = new URL(rawUrl, tab.url).href } catch { /* keep raw */ }
          }
          // Only navigate to http(s) URLs
          if (/^https?:\/\//.test(finalUrl)) {
            chrome.tabs.update(tabId, { url: finalUrl }).catch(() => {})
          }
        })
      }
      if (recordingTabId != null) {
        resolveAndNavigate(recordingTabId)
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) {
            recordingTabId = tab.id
            resolveAndNavigate(tab.id)
          }
        })
      }
    } else if (msg.type === 'extract' && recordingTabId != null) {
      chrome.tabs.sendMessage(recordingTabId, { type: 'recorder-extract', mode: msg.mode ?? 'list' }).catch(() => {})
    } else if (msg.type === 'extract' && recordingTabId == null) {
      // Not recording - inject picker on-demand into the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return
        const tabId = tab.id
        chrome.scripting
          .executeScript({ target: { tabId }, files: ['recorder-inject.js'], world: 'ISOLATED' })
          .then(() => new Promise<void>((r) => setTimeout(r, 150)))
          .then(() => chrome.tabs.sendMessage(tabId, { type: 'recorder-extract', mode: msg.mode ?? 'list' }))
          .catch((err) => {
            console.error('[izan-ext] Picker inject failed:', err)
          })
      })
    } else if (msg.type === 'recordingComplete') {
      // Clear highlights in the recording tab (user finished with Done) without requesting steps
      if (recordingTabId != null) {
        chrome.tabs.sendMessage(recordingTabId, { type: 'recorder-cleanup' }).catch(() => {})
        recordingTabId = null
      }
      // Forward to izan.io content script so web app can show save dialog (with serverId pre-selected)
      const payload = {
        type: 'izan-recording-complete',
        steps: msg.steps,
        parameters: (msg as Record<string, unknown>).parameters,
        serverId: (msg as Record<string, unknown>).serverId,
      }
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (!t.id || !isIzanTab(t)) continue
          chrome.tabs.sendMessage(t.id, payload).catch(() => {})
        }
      })
    } else if (msg.type === 'getAutomationServers') {
      console.log('[izan-ext][bg] port received getAutomationServers')
      automationStorage.getData()
        .then((data) => sidePanelPort?.postMessage({ type: 'automationServers', data }))
        .catch((err) => sidePanelPort?.postMessage({ type: 'automationServers', data: { servers: [], tools: [] }, error: String(err) }))
    } else if (msg.type === 'createAutomationServer') {
      const m = msg as Record<string, unknown>
      automationStorage.createServer(m.name as string, (m.description as string) ?? '')
        .then((server) => {
          sidePanelPort?.postMessage({ type: 'createAutomationServerDone', data: server })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'createAutomationServerDone', error: String(err) }))
    } else if (msg.type === 'createAutomationTool') {
      const m = msg as Record<string, unknown>
      automationStorage.createTool({
        serverId: m.serverId as string,
        name: m.name as string,
        displayName: m.displayName as string,
        description: m.description as string,
        parameters: m.parameters as [],
        steps: m.steps as [],
        lanes: m.lanes as [] | undefined,
        viewport: m.viewport as { width: number; height: number } | undefined,
        version: m.version as string,
      })
        .then((tool) => {
          sidePanelPort?.postMessage({ type: 'createAutomationToolDone', data: tool })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'createAutomationToolDone', error: String(err) }))
    } else if (msg.type === 'updateAutomationServer') {
      const m = msg as Record<string, unknown>
      automationStorage.updateServer(m.serverId as string, { name: m.name as string | undefined, description: m.description as string | undefined })
        .then((server) => {
          sidePanelPort?.postMessage({ type: 'updateAutomationServerDone', data: server })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'updateAutomationServerDone', error: String(err) }))
    } else if (msg.type === 'getAutomationTool') {
      const m = msg as Record<string, unknown>
      automationStorage.getTool(m.toolId as string)
        .then((tool) => sidePanelPort?.postMessage({ type: 'getAutomationToolDone', data: tool }))
        .catch((err) => sidePanelPort?.postMessage({ type: 'getAutomationToolDone', error: String(err) }))
    } else if (msg.type === 'updateAutomationTool') {
      const m = msg as Record<string, unknown>
      automationStorage.updateTool(m.toolId as string, {
        name: m.name as string | undefined,
        displayName: m.displayName as string | undefined,
        description: m.description as string | undefined,
        steps: m.steps as [] | undefined,
        lanes: m.lanes as [] | undefined,
        parameters: m.parameters as [] | undefined,
      })
        .then((tool) => {
          sidePanelPort?.postMessage({ type: 'updateAutomationToolDone', data: tool })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'updateAutomationToolDone', error: String(err) }))
    } else if (msg.type === 'deleteAutomationServer') {
      const m = msg as Record<string, unknown>
      automationStorage.deleteServer(m.serverId as string)
        .then(() => {
          sidePanelPort?.postMessage({ type: 'deleteAutomationServerDone' })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'deleteAutomationServerDone', error: String(err) }))
    } else if (msg.type === 'deleteAutomationTool') {
      const m = msg as Record<string, unknown>
      automationStorage.deleteTool(m.toolId as string)
        .then(() => {
          sidePanelPort?.postMessage({ type: 'deleteAutomationToolDone' })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'deleteAutomationToolDone', error: String(err) }))
    } else if (msg.type === 'exportAutomationServer') {
      const m = msg as Record<string, unknown>
      automationStorage.getServerExport(m.serverId as string)
        .then((data) => {
          if (!data) {
            sidePanelPort?.postMessage({ type: 'exportAutomationServerDone', error: 'Server not found' })
            return
          }
          sidePanelPort?.postMessage({ type: 'exportAutomationServerDone', data })
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'exportAutomationServerDone', error: String(err) }))
    } else if (msg.type === 'importAutomationServer') {
      const m = msg as Record<string, unknown>
      automationStorage.importServerData(m.data as { server: { name: string; description: string; category?: string }; tools: [] })
        .then((server) => {
          sidePanelPort?.postMessage({ type: 'importAutomationServerDone', data: server })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'importAutomationServerDone', error: String(err) }))
    } else if (msg.type === 'importAutomationTool') {
      const m = msg as Record<string, unknown>
      automationStorage.importToolData(m.serverId as string, m.data as { name: string; steps: [] })
        .then((tool) => {
          sidePanelPort?.postMessage({ type: 'importAutomationToolDone', data: tool })
          bestEffortSyncToTab()
        })
        .catch((err) => sidePanelPort?.postMessage({ type: 'importAutomationToolDone', error: String(err) }))
    } else if (msg.type === 'selectorExtract') {
      const m = msg as Record<string, unknown>
      const selector = m.selector as string
      const mode = (m.mode as 'list' | 'single') || 'list'
      const isXPath = selector.startsWith('/') || selector.startsWith('(') || selector.includes('//')
      console.log(`[izan-ext] selectorExtract: "${selector}" mode=${mode} isXPath=${isXPath}`)
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) {
          console.warn('[izan-ext] selectorExtract: no active tab')
          sidePanelPort?.postMessage({ type: 'selector-extract-error', error: 'No active tab' })
          return
        }
        console.log(`[izan-ext] selectorExtract: tab=${tab.id} url=${tab.url?.slice(0, 80)}`)
        handleSelectorExtract(tab.id, selector, mode)
      })
    } else if (msg.type === 'roleExtract') {
      const m = msg as Record<string, unknown>
      const roles = (Array.isArray(m.roles) ? m.roles : [m.role]) as string[]
      const name = (m.name as string) || ''
      const includeChildren = m.includeChildren !== false
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) {
          sidePanelPort?.postMessage({ type: 'selector-extract-error', error: 'No active tab' })
          return
        }
        handleRoleExtract(tab.id, roles.filter(Boolean), name, includeChildren)
      })
    } else if (msg.type === 'fullAccessibilitySnapshot') {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) {
          sidePanelPort?.postMessage({ type: 'accessibility-snapshot-error', error: 'No active tab' })
          return
        }
        handleFullAccessibilitySnapshotForSidepanel(tab.id)
      })
    } else if (msg.type === 'accessibilityNeighborsPreview') {
      const m = msg as Record<string, unknown>
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) {
          sidePanelPort?.postMessage({ type: 'accessibility-neighbors-error', error: 'No active tab' })
          return
        }
        handleAccessibilityNeighborsForSidepanel(
          tab.id,
          m.targetName as string,
          m.targetRole as string | undefined,
          (m.count as number) ?? 3,
          (m.direction as 'both' | 'above' | 'below') ?? 'both',
          (m.includeChildren as boolean) ?? true,
          (m.matchMode as 'contains' | 'equals') ?? 'contains',
        )
      })
    } else if (msg.type === 'trySelectorHighlight') {
      const selector = (msg as Record<string, unknown>).selector as string
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (!tab?.id) {
          sidePanelPort?.postMessage({ type: 'trySelectorHighlight-result', found: false, error: 'No active tab' })
          return
        }
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string) => {
              const isXPath = sel.startsWith('/') || sel.startsWith('(') || sel.includes('//')
              const el = isXPath
                ? document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement | null
                : document.querySelector<HTMLElement>(sel)
              if (!el) return { found: false, tag: '' }
              // Flash outline 3 times
              const prev = el.style.outline
              const prevOffset = el.style.outlineOffset
              const prevTransition = el.style.transition
              el.style.transition = 'outline-color 0.15s ease'
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              let count = 0
              const flash = () => {
                if (count >= 6) { el.style.outline = prev; el.style.outlineOffset = prevOffset; el.style.transition = prevTransition; return }
                el.style.outline = count % 2 === 0 ? '3px solid hsl(200 90% 50%)' : '3px solid transparent'
                el.style.outlineOffset = '2px'
                count++
                setTimeout(flash, 250)
              }
              flash()
              return { found: true, tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : '') }
            },
            args: [selector],
          })
          const r = results?.[0]?.result as { found: boolean; tag: string } | undefined
          sidePanelPort?.postMessage({ type: 'trySelectorHighlight-result', found: r?.found ?? false, tag: r?.tag ?? '' })
        } catch (e) {
          sidePanelPort?.postMessage({ type: 'trySelectorHighlight-result', found: false, error: e instanceof Error ? e.message : String(e) })
        }
      })
    }
  })
})

chrome.runtime.onMessage.addListener(
  (msg: { type: string; steps?: unknown[]; parameters?: unknown[]; [k: string]: unknown }, sender, sendResponse) => {
    // Forward recorder events from content script → side panel
    if (msg.type === 'recording-step' || msg.type === 'recording-complete' || msg.type === 'extract-result') {
      sidePanelPort?.postMessage(msg)
      sendResponse({ ok: true })
      return true
    }

    // Snapshot of accumulated steps before cross-page navigation
    if (msg.type === 'recording-steps-snapshot') {
      pendingRecordingSteps = msg.steps as unknown[] ?? null
      sendResponse({ ok: true })
      return true
    }

    // "Tamamla" from side panel → forward to izan.io tabs
    if (msg.type === 'izan-recording-complete') {
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (!t.id || !t.url) continue
          if (t.url.includes('izan.io') || t.url.includes('localhost')) {
            chrome.tabs.sendMessage(t.id, msg).catch(() => {})
          }
        }
      })
      sendResponse({ ok: true })
      return true
    }

    return false
  },
)

// ─── Shared Automation Window ────────────────────────────────────────────────

/** Single automation window shared across all lanes and runs */
let automationWindowId: number | null = null

/** Map of laneId → tabId within the shared automation window */
const laneTabs = new Map<string, number>()

/** Tabs we attached to (not created) - should only detach CDP, never close */
const attachedOnlyTabs = new Set<number>()

/**
 * Promise-based mutex for window creation.
 * When the first lane starts creating a window, concurrent lanes
 * await this promise instead of creating a second window.
 */
let windowCreationLock: Promise<void> | null = null

/** Reverse lookup: tabId → laneId */
function laneIdForTab(tid: number): string | undefined {
  for (const [lid, tabId] of laneTabs) { if (tabId === tid) return lid }
  return undefined
}

function getLaneId(p: P): string {
  return (p.laneId as string) || 'main'
}

/** Clean up when the automation window is closed by the user */
chrome.windows.onRemoved.addListener((id) => {
  if (id === automationWindowId) {
    // User closed the window - clean up all lane state
    for (const [, tid] of laneTabs) {
      cdpDetach(tid).catch(() => {})
    }
    laneTabs.clear()
    automationWindowId = null
    windowCreationLock = null
  }
})

/** Clean up when individual tabs are closed */
chrome.tabs.onRemoved.addListener((tabId) => {
  const lid = laneIdForTab(tabId)
  if (lid) {
    cdpDetach(tabId).catch(() => {})
    laneTabs.delete(lid)
    attachedOnlyTabs.delete(tabId)
  }
})

// ─── CDP Helpers ──────────────────────────────────────────────────────────────

async function cdpAttach(tid: number): Promise<void> {
  await chrome.debugger.attach({ tabId: tid }, '1.3')
  await chrome.debugger.sendCommand({ tabId: tid }, 'Runtime.enable')
}

/** Override the tab's viewport to emulate a specific resolution via CDP */
async function cdpSetViewport(tid: number, width: number, height: number): Promise<void> {
  await chrome.debugger.sendCommand({ tabId: tid }, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
}

async function cdpDetach(tid: number): Promise<void> {
  try { await chrome.debugger.detach({ tabId: tid }) } catch { /* already detached */ }
}

async function cdpEval<T = unknown>(tid: number, expression: string): Promise<T> {
  const res = await chrome.debugger.sendCommand({ tabId: tid }, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }) as { result?: { value?: T }; exceptionDetails?: { text?: string; exception?: { description?: string } } }

  if (res.exceptionDetails) {
    const e = res.exceptionDetails
    throw new Error(e.exception?.description ?? e.text ?? 'CDP evaluate failed')
  }
  return res.result?.value as T
}

chrome.debugger.onDetach.addListener((_source, _reason) => {
  // When a debugger is forcibly detached, clean up the lane's tabId tracking.
  // We can't easily determine which tab was detached without extra bookkeeping,
  // so this is a best-effort cleanup handled per-lane via cdpDetach calls.
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function waitForTab(tid: number, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tid)
    if (tab.status === 'complete') return
    await sleep(200)
  }
  throw new Error(`Tab ${tid} did not load within ${timeout}ms`)
}

function resolveEl(sel: string): string {
  // Returns a JS expression that resolves an element by CSS or XPath selector
  return `(function(s){return(s.startsWith('/')||s.startsWith('(')||s.includes('//'))` +
    `?document.evaluate(s,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue` +
    `:document.querySelector(s)})(${JSON.stringify(sel)})`
}

/** Like resolveEl but throws a properly-escaped Error if the element is not found */
function resolveElOrThrow(sel: string): string {
  const j = JSON.stringify(sel)
  return `(function(s){var el=(s.startsWith('/')||s.startsWith('(')||s.includes('//'))` +
    `?document.evaluate(s,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue` +
    `:document.querySelector(s);if(!el)throw new Error('Not found: '+s);return el})(${j})`
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

type R = { success: true; data?: unknown } | { success: false; error: string }
type P = Record<string, unknown>

async function handleOpen(p: P): Promise<R> {
  const url = p.url as string
  const viewport = p.viewport as { width: number; height: number } | undefined
  const background = p.background !== false // default true for backward compat
  // Use a small physical window; actual viewport is emulated via CDP
  const opts = { width: 400, height: 300 }
  const laneId = getLaneId(p)

  // Check if the automation window still exists
  if (automationWindowId != null) {
    try {
      await chrome.windows.get(automationWindowId)
    } catch {
      automationWindowId = null
      laneTabs.clear()
    }
  }

  let tid: number | null

  // If this lane already has a tab, detach CDP and navigate it
  const existingTab = laneTabs.get(laneId)
  if (existingTab != null) {
    try {
      await cdpDetach(existingTab)
      await chrome.tabs.update(existingTab, { url })
      await waitForTab(existingTab, 15_000)
      await cdpAttach(existingTab)
      if (viewport) {
        await cdpSetViewport(existingTab, viewport.width, viewport.height)
      }
      if (!background && automationWindowId != null) {
        await chrome.windows.update(automationWindowId, { focused: true })
      }
      return { success: true, data: { tabId: existingTab } }
    } catch {
      laneTabs.delete(laneId)
    }
  }

  // ── Serialized window creation ──
  // If another lane is currently creating the window, wait for it
  if (windowCreationLock) {
    await windowCreationLock
  }

  // Re-check after awaiting lock (window may now exist)
  if (automationWindowId != null) {
    try {
      await chrome.windows.get(automationWindowId)
    } catch {
      automationWindowId = null
      laneTabs.clear()
    }
  }

  if (automationWindowId != null) {
    // Window exists (possibly created by another lane) - add a tab
    const tab = await chrome.tabs.create({ windowId: automationWindowId, url, active: true })
    tid = tab.id!
    if (!background) {
      await chrome.windows.update(automationWindowId, { focused: true })
    }
  } else {
    // First lane - create the window under a lock
    let resolveCreation!: () => void
    windowCreationLock = new Promise<void>((r) => { resolveCreation = r })

    try {
      const win = await chrome.windows.create({
        url,
        type: 'normal',
        width: opts.width,
        height: opts.height,
        focused: !background,
      })
      if (!win) return { success: false, error: 'Failed to create window' }
      tid = win.tabs?.[0]?.id ?? null
      if (!tid || !win.id) return { success: false, error: 'Failed to get tab' }
      automationWindowId = win.id
    } finally {
      windowCreationLock = null
      resolveCreation()
    }
  }

  await waitForTab(tid, 15_000)
  await cdpAttach(tid)
  if (viewport) {
    await cdpSetViewport(tid, viewport.width, viewport.height)
  }
  laneTabs.set(laneId, tid)

  return { success: true, data: { tabId: tid } }
}

/**
 * Attach CDP to the currently active tab (no new window/tab created).
 * Used when a macro starts without a navigate step.
 */
async function handleAttachActiveTab(p: P): Promise<R> {
  const laneId = getLaneId(p)
  const existingTab = laneTabs.get(laneId)
  if (existingTab != null) {
    return { success: true, data: { tabId: existingTab } }
  }
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab?.id) return { success: false, error: 'No active tab found' }
  try {
    await cdpAttach(tab.id)
  } catch {
    // CDP may already be attached (e.g. from a previous run)
  }
  laneTabs.set(laneId, tab.id)
  attachedOnlyTabs.add(tab.id)
  return { success: true, data: { tabId: tab.id } }
}

async function handleClose(p: P): Promise<R> {
  const laneId = getLaneId(p)
  const tid = laneTabs.get(laneId)
  if (tid != null) {
    await cdpDetach(tid)
    // Only close tabs we created - don't close tabs we merely attached to
    if (!attachedOnlyTabs.has(tid)) {
      try { await chrome.tabs.remove(tid) } catch { /* tab already closed */ }
    }
    attachedOnlyTabs.delete(tid)
    laneTabs.delete(laneId)
  }
  return { success: true }
}

async function handleCloseAll(_p: P): Promise<R> {
  for (const [, tid] of laneTabs) {
    await cdpDetach(tid)
    if (!attachedOnlyTabs.has(tid)) {
      try { await chrome.tabs.remove(tid) } catch { /* tab already closed */ }
    }
  }
  laneTabs.clear()
  attachedOnlyTabs.clear()
  return { success: true }
}

async function handleNavigate(p: P): Promise<R> {
  const tid = p.tabId as number
  const url = p.url as string
  // Remember which window had focus so we can restore it if Chrome brings our window to front
  const prevFocused = await new Promise<number | undefined>((resolve) => {
    chrome.windows.getLastFocused((w) => resolve(w?.id))
  })
  await chrome.tabs.update(tid, { url, active: false })
  await waitForTab(tid, 15_000)
  const tab = await chrome.tabs.get(tid)
  const ourWindowId = tab.windowId
  const nowFocused = await new Promise<number | undefined>((resolve) => {
    chrome.windows.getLastFocused((w) => resolve(w?.id))
  })
  if (nowFocused === ourWindowId && prevFocused != null && prevFocused !== ourWindowId) {
    await chrome.windows.update(prevFocused, { focused: true })
  }
  return { success: true }
}

async function handleGetUrl(p: P): Promise<R> {
  const tab = await chrome.tabs.get(p.tabId as number)
  return { success: true, data: tab.url ?? '' }
}

async function handleEvaluate(p: P): Promise<R> {
  const tid = p.tabId as number
  // Verify this tab belongs to a known lane
  const knownLane = laneIdForTab(tid)
  if (!knownLane) {
    console.warn(`[izan-ext] handleEvaluate: tab ${tid} not attached (no known lane)`)
    return { success: false, error: 'CDP not attached' }
  }
  try {
    const exprPreview = (p.expression as string).slice(0, 120).replace(/\n/g, ' ')
    console.log(`[izan-ext] handleEvaluate: tab=${tid} lane=${knownLane} expr="${exprPreview}..."`)
    const data = await cdpEval(tid, p.expression as string)
    const preview = data == null ? 'null' : Array.isArray(data) ? `array(${data.length})` : typeof data === 'object' ? `object(${Object.keys(data as Record<string, unknown>).length})` : String(data).slice(0, 100)
    console.log(`[izan-ext] handleEvaluate: result=${preview}`)
    return { success: true, data }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error(`[izan-ext] handleEvaluate: ERROR tab=${tid}: ${errMsg}`)
    return { success: false, error: errMsg }
  }
}

async function handleClick(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){${resolveElOrThrow(p.selector as string)}.click();return null})()` })
}

async function handleType(p: P): Promise<R> {
  const sel = p.selector as string
  const txt = p.text as string
  const clr = p.clear as boolean
  // Use nativeInputValueSetter to bypass React's synthetic event system,
  // then dispatch proper InputEvent so frameworks detect the change.
  const expr = `(function(){
    var el=${resolveEl(sel)};
    if(!el) throw new Error('Not found: '+${JSON.stringify(sel)});
    el.focus();
    var nativeSetter=Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el),'value'
    )?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    if(nativeSetter){
      nativeSetter.call(el,${clr ? '' : 'el.value+'}${JSON.stringify(txt)});
    } else {
      ${clr ? "el.value='';" : ''}
      el.value+=${JSON.stringify(txt)};
    }
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return null;
  })()`
  return handleEvaluate({ tabId: p.tabId, expression: expr })
}

async function handleGetText(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){return ${resolveElOrThrow(p.selector as string)}.textContent||''})()` })
}

async function handleGetAttribute(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){return ${resolveElOrThrow(p.selector as string)}.getAttribute(${JSON.stringify(p.attribute as string)})})()` })
}

async function handleGetValue(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){return ${resolveElOrThrow(p.selector as string)}.value||''})()` })
}

async function handleExists(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){return ${resolveEl(p.selector as string)}!==null})()` })
}

async function handleGetHtml(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){return ${resolveElOrThrow(p.selector as string)}.innerHTML})()` })
}

async function handleSelect(p: P): Promise<R> {
  return handleEvaluate({ tabId: p.tabId, expression: `(function(){var el=${resolveElOrThrow(p.selector as string)};el.value=${JSON.stringify(p.value as string)};el.dispatchEvent(new Event('change',{bubbles:true}));return null})()` })
}

async function handleScroll(p: P): Promise<R> {
  const sel = p.selector as string | undefined
  const dir = (p.direction as string) || 'down'
  const amount = (p.amount as number) || 500
  const dx = dir === 'left' ? -amount : dir === 'right' ? amount : 0
  const dy = dir === 'up' ? -amount : dir === 'down' ? amount : 0
  const expr = sel
    ? `(function(){${resolveElOrThrow(sel)}.scrollBy(${dx},${dy});return null})()`
    : `(function(){window.scrollBy(${dx},${dy});return null})()`
  return handleEvaluate({ tabId: p.tabId, expression: expr })
}

/**
 * Shared JS helper to resolve a selector (CSS or XPath) relative to a context node.
 * XPath detected by leading '/' or '(' or containing '//'.
 */
const RESOLVE_SEL_JS = `function _qsel(ctx,sel){
  if(!sel)return null;
  if(sel.startsWith('/')||sel.startsWith('(')||sel.includes('//')){
    return document.evaluate(sel,ctx,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;
  }
  return ctx.querySelector(sel);
}
function _qselAll(ctx,sel){
  if(!sel)return[];
  if(sel.startsWith('/')||sel.startsWith('(')||sel.includes('//')){
    var r=document.evaluate(sel,ctx,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
    var n=[];for(var i=0;i<r.snapshotLength;i++)n.push(r.snapshotItem(i));return n;
  }
  return ctx.querySelectorAll(sel);
}`

/**
 * Shared JS helper injected via CDP to recursively extract a field value.
 * Supports: text, html, value, attribute, regex, nested, nested_list + transform + default.
 */
const EXTRACT_FIELD_JS = `function extractField(el,f){
  if(!el)return f.default!=null?f.default:null;
  var t=f.type||'text';
  if(t==='nested'){
    var nested=_qsel(el,f.selector);
    if(!nested)return f.default!=null?f.default:{};
    var obj={};
    (f.fields||[]).forEach(function(sf){obj[sf.key]=extractField(nested,sf)});
    return obj;
  }
  if(t==='nested_list'){
    var items=_qselAll(el,f.selector);
    return Array.from(items).map(function(item){
      var obj={};
      (f.fields||[]).forEach(function(sf){obj[sf.key]=extractField(item,sf)});
      return obj;
    });
  }
  var target=(f.selector&&f.selector!=='*')?_qsel(el,f.selector):el;
  if(!target)return f.default!=null?f.default:null;
  var val;
  if(t==='text')val=(target.textContent||'').trim();
  else if(t==='html')val=target.innerHTML;
  else if(t==='value')val=target.value||'';
  else if(t==='attribute')val=target.getAttribute(f.attribute||'')||'';
  else if(t==='regex'){
    var txt=(target.textContent||'').trim();
    try{
      var re=new RegExp(f.pattern||'');
      var m=txt.match(re);
      if(m){
        if(m.groups){var gk=Object.keys(m.groups);if(gk.length>0){val=m.groups[gk[0]]||m[1]||m[0]}else{val=m[1]||m[0]}}
        else{val=m[1]||m[0]}
      }else{val=null}
    }catch(e){val=null}
  }
  else val=(target.textContent||'').trim();
  if(val!=null&&f.transform){
    if(f.transform==='trim')val=typeof val==='string'?val.trim():val;
    else if(f.transform==='lowercase')val=typeof val==='string'?val.toLowerCase():val;
    else if(f.transform==='uppercase')val=typeof val==='string'?val.toUpperCase():val;
    else if(f.transform==='number')val=parseFloat(String(val).replace(/[^\\d.,\\-]/g,''))||null;
  }
  return val!=null?val:(f.default!=null?f.default:null);
}`

async function handleExtractList(p: P): Promise<R> {
  const container = p.containerSelector as string
  const fields = p.fields as Array<Record<string, unknown>>
  const isXP = container.startsWith('/') || container.startsWith('(') || container.includes('//')
  console.log(`[izan-ext] extractList: container="${container}" fields=${fields.length} isXPath=${isXP}`)
  const fieldStr = JSON.stringify(fields)
  const containerStr = JSON.stringify(container)
  // Poll until elements appear (dynamic sites load content after 'load' event)
  const expr = `new Promise(function(resolve){
    ${RESOLVE_SEL_JS}
    ${EXTRACT_FIELD_JS}
    var sel=${containerStr};
    var fields=${fieldStr};
    function isVisible(el){var r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'}
    function isEmptyRow(row){for(var k in row){var v=row[k];if(v!=null&&v!=='')return false}return true}
    function extract(){
      var items=_qselAll(document,sel);
      console.log('[izan-ext] extractList/page: qselAll("'+sel.slice(0,60)+'") → '+items.length+' items');
      if(items.length===0)return null;
      var result=[];
      items.forEach(function(item,idx){
        if(!isVisible(item)){console.log('[izan-ext] extractList/page: item['+idx+'] not visible, skip');return}
        var row={};
        fields.forEach(function(f){
          try{row[f.key]=extractField(item,f)}catch(e){console.warn('[izan-ext] extractList/page: field "'+f.key+'" error: '+e.message);row[f.key]=null}
        });
        if(!isEmptyRow(row))result.push(row);
      });
      console.log('[izan-ext] extractList/page: '+result.length+' non-empty rows');
      return result.length>0?result:null;
    }
    var r=extract();if(r){console.log('[izan-ext] extractList/page: resolved immediately with '+r.length+' rows');resolve(r);return}
    console.log('[izan-ext] extractList/page: no results yet, polling...');
    var tries=0;var maxTries=20;
    var iv=setInterval(function(){
      tries++;r=extract();
      if(r||tries>=maxTries){clearInterval(iv);resolve(r||[])}
    },500);
  })`
  return handleEvaluate({ tabId: p.tabId, expression: expr })
}

async function handleExtractSingle(p: P): Promise<R> {
  const container = p.containerSelector as string
  const fields = p.fields as Array<Record<string, unknown>>
  const continueOnError = p.continueOnError as boolean | undefined
  const isXP = container.startsWith('/') || container.startsWith('(') || container.includes('//')
  console.log(`[izan-ext] extractSingle: container="${container}" fields=${fields.length} isXPath=${isXP}`)
  const fieldStr = JSON.stringify(fields)
  const containerStr = JSON.stringify(container)
  const coStr = continueOnError ? 'true' : 'false'
  // Poll until container appears (dynamic sites load content after 'load' event)
  const expr = `new Promise(function(resolve,reject){
    ${RESOLVE_SEL_JS}
    ${EXTRACT_FIELD_JS}
    var sel=${containerStr};
    var fields=${fieldStr};
    var continueOnError=${coStr};
    function extract(){
      var container=_qsel(document,sel);
      if(!container)return null;
      var result={};
      fields.forEach(function(f){
        try{result[f.key]=extractField(container,f)}catch(e){result[f.key]=null}
      });
      return result;
    }
    var r=extract();if(r){resolve(r);return}
    var tries=0;var maxTries=20;
    var iv=setInterval(function(){
      tries++;r=extract();
      if(r||tries>=maxTries){clearInterval(iv);
        if(r)resolve(r);
        else if(continueOnError)resolve({});
        else reject(new Error('Not found after 10s: '+sel))}
    },500);
  })`
  return handleEvaluate({ tabId: p.tabId, expression: expr })
}

async function handleWaitForSelector(p: P): Promise<R> {
  const sel = p.selector as string
  const ms = (p.timeout as number) || 10_000
  const errMsg = JSON.stringify(`waitForSelector timed out after ${ms}ms: ${sel}`)
  return handleEvaluate({
    tabId: p.tabId,
    expression: `new Promise(function(ok,fail){var r=function(){return ${resolveEl(sel)}};if(r()){ok(null);return}var o=new MutationObserver(function(){if(r()){o.disconnect();ok(null)}});o.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){o.disconnect();fail(new Error(${errMsg}))},${ms})})`,
  })
}

async function handleWaitForUrl(p: P): Promise<R> {
  const pattern = p.pattern as string
  const timeout = (p.timeout as number) || 10_000
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(p.tabId as number)
    if (tab.url?.includes(pattern)) return { success: true }
    await sleep(300)
  }
  return { success: false, error: `waitForUrl("${pattern}") timed out` }
}

async function handleWaitForLoad(p: P): Promise<R> {
  await waitForTab(p.tabId as number, (p.timeout as number) || 15_000)
  return { success: true }
}

async function handleWaitForDOMContentLoaded(p: P): Promise<R> {
  const tid = p.tabId as number
  const timeout = (p.timeout as number) || 15_000

  // Check if already past DOMContentLoaded
  try {
    const state = await cdpEval<string>(tid, 'document.readyState')
    if (state === 'interactive' || state === 'complete') return { success: true }
  } catch { /* page may be navigating, fall through to listener */ }

  await chrome.debugger.sendCommand({ tabId: tid }, 'Page.enable')

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        chrome.debugger.onEvent.removeListener(listener)
        reject(new Error(`DOMContentLoaded timed out after ${timeout}ms`))
      }, timeout)

      const listener = (source: chrome.debugger.Debuggee, method: string) => {
        if (source.tabId === tid && method === 'Page.domContentEventFired') {
          clearTimeout(timer)
          chrome.debugger.onEvent.removeListener(listener)
          resolve()
        }
      }
      chrome.debugger.onEvent.addListener(listener)
    })
  } finally {
    await chrome.debugger.sendCommand({ tabId: tid }, 'Page.disable').catch(() => {})
  }

  return { success: true }
}

async function handleWaitForNetworkIdle(p: P): Promise<R> {
  const tid = p.tabId as number
  const timeout = (p.timeout as number) || 30_000
  const idleTime = (p.idleTime as number) || 500

  await chrome.debugger.sendCommand({ tabId: tid }, 'Network.enable')

  try {
    await new Promise<void>((resolve) => {
      let inflight = 0
      let idleTimer: ReturnType<typeof setTimeout> | null = null

      const globalTimer = setTimeout(() => {
        cleanup()
        resolve() // Gracefully resolve on timeout - not an error
      }, timeout)

      function checkIdle() {
        if (inflight <= 0) {
          if (idleTimer) clearTimeout(idleTimer)
          idleTimer = setTimeout(() => { cleanup(); resolve() }, idleTime)
        } else if (idleTimer) {
          clearTimeout(idleTimer)
          idleTimer = null
        }
      }

      function cleanup() {
        clearTimeout(globalTimer)
        if (idleTimer) clearTimeout(idleTimer)
        chrome.debugger.onEvent.removeListener(listener)
      }

      const listener = (source: chrome.debugger.Debuggee, method: string) => {
        if (source.tabId !== tid) return
        if (method === 'Network.requestWillBeSent') {
          inflight++
          checkIdle()
        } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
          inflight = Math.max(0, inflight - 1)
          checkIdle()
        }
      }

      chrome.debugger.onEvent.addListener(listener)
      checkIdle() // Start idle check immediately
    })
  } finally {
    await chrome.debugger.sendCommand({ tabId: tid }, 'Network.disable').catch(() => {})
  }

  return { success: true }
}

// ─── Selector-based Extraction ────────────────────────────────────────────────

/**
 * Evaluate a user-provided CSS selector on the active tab to auto-detect fields
 * and generate an extract step. Uses chrome.scripting.executeScript to run in
 * the page context - no debugger banner, works on CSP-restricted sites.
 */
async function handleSelectorExtract(tabId: number, selector: string, mode: 'list' | 'single'): Promise<void> {
  console.log(`[izan-ext] handleSelectorExtract: tab=${tabId} selector="${selector}" mode=${mode}`)
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: selectorExtractInPage,
      args: [selector, mode],
    })
    const data = results?.[0]?.result as {
      containerSelector: string
      fields: Array<{ key: string; selector: string; type: string; attribute?: string }>
      preview: Record<string, unknown>[] | Record<string, unknown>
      previewHtml: string[]
      itemCount?: number
      name: string
      mode: string
      error?: string
    } | null

    console.log('[izan-ext] handleSelectorExtract result:', data?.error ? `ERROR: ${data.error}` : `fields=${data?.fields?.length} items=${data?.itemCount ?? '?'} mode=${data?.mode}`)

    if (data?.error) {
      sidePanelPort?.postMessage({ type: 'selector-extract-error', error: data.error })
    } else if (data && data.fields && data.fields.length > 0) {
      const step = {
        action: 'extract' as const,
        name: data.name,
        mode: data.mode,
        containerSelector: data.containerSelector,
        fields: data.fields,
        itemCount: data.itemCount,
        label: data.mode === 'list'
          ? `${data.itemCount ?? '?'} items · ${data.fields.length} fields (list)`
          : `${data.fields.length} fields (single)`,
      }
      sidePanelPort?.postMessage({
        type: 'selector-extract-result',
        step,
        preview: data.preview,
        previewHtml: data.previewHtml,
      })
    } else {
      sidePanelPort?.postMessage({ type: 'selector-extract-error', error: 'No elements found for this selector' })
    }
  } catch (err) {
    sidePanelPort?.postMessage({ type: 'selector-extract-error', error: err instanceof Error ? err.message : String(err) })
  }
}

/**
 * Injected into the page via chrome.scripting.executeScript.
 * Finds elements matching the selector, auto-detects fields, generates preview.
 */
function selectorExtractInPage(selector: string, mode: string) {
  /* eslint-disable no-var */
  try {
    // ── Helpers ──
    function isDynamicClass(cls: string) {
      if (cls.length < 3) return true
      if (/^[a-z]{1,2}-/.test(cls)) return true
      if (/^[a-zA-Z]{1,3}[A-Z][a-zA-Z]{4,}$/.test(cls)) return true
      if (/^(bg|text|flex|grid|p|m|w|h)-/.test(cls)) return true
      return false
    }

    function generateRelativeSelector(el: Element, container: Element, structuralOnly: boolean): string {
      var parts: string[] = []
      var cur: Element | null = el
      while (cur && cur !== container) {
        var p = cur.parentElement
        if (!p) break
        var tag = cur.tagName.toLowerCase()
        if (!structuralOnly) {
          for (var ci = 0; ci < cur.classList.length; ci++) {
            var cls = cur.classList[ci]
            if (isDynamicClass(cls) || cls.indexOf('izan-') === 0) continue
            if (p.querySelectorAll('.' + CSS.escape(cls)).length === 1) {
              parts.unshift('.' + CSS.escape(cls))
              return parts.join(' > ') || '*'
            }
          }
        }
        var sibs = Array.from(p.children).filter(function(c) { return c.tagName === cur!.tagName })
        if (sibs.length === 1) parts.unshift(tag)
        else parts.unshift(tag + ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')')
        cur = p
      }
      return parts.join(' > ') || '*'
    }

    function slugify(s: string) {
      return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'field'
    }

    function inferType(el: Element) {
      var t = el.tagName
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return 'value'
      if (t === 'A' || t === 'IMG') return 'attribute'
      return 'text'
    }

    /** Filter out tracking pixels, tiny icons, and placeholder images */
    function isJunkImage(el: Element) {
      var w = (el as HTMLImageElement).naturalWidth || (el as HTMLImageElement).width || 0
      var h = (el as HTMLImageElement).naturalHeight || (el as HTMLImageElement).height || 0
      // 1x1 tracking pixels or invisible images
      if (w <= 1 || h <= 1) return true
      // Tiny icons (< 24x24)
      if (w < 24 && h < 24) return true
      // Common tracker/spacer URL patterns
      var src = el.getAttribute('src') || ''
      if (/\b(pixel|tracker|spacer|blank|1x1|beacon|\.gif\?)/i.test(src)) return true
      // Data URIs that are very short (likely single-pixel placeholders)
      if (src.startsWith('data:') && src.length < 200) return true
      return false
    }

    function fieldKey(el: Element, idx: number) {
      var tag = el.tagName
      if (tag === 'TIME') return 'date'
      if (tag === 'A') return 'link'
      if (tag === 'IMG') return 'image'
      var attrs = el.getAttributeNames ? el.getAttributeNames() : []
      for (var ai = 0; ai < attrs.length; ai++) {
        if (attrs[ai].indexOf('data-') === 0 && attrs[ai] !== 'data-izan-recorder') {
          var k = attrs[ai].slice(5)
          if (k.length >= 3 && k.length <= 20) return slugify(k)
        }
      }
      var al = el.getAttribute('aria-label'); if (al) return slugify(al)
      var nm = el.getAttribute('name'); if (nm) return slugify(nm)
      var cn = el.className ? el.className.toString() : ''
      if (cn) {
        var classes = cn.split(/\s+/)
        for (var ci = 0; ci < classes.length; ci++) {
          if (classes[ci].length > 3 && !isDynamicClass(classes[ci])) return slugify(classes[ci])
        }
      }
      var txt = (el.textContent || '').trim().slice(0, 20)
      if (txt) return slugify(txt)
      return 'field_' + idx
    }

    function autoDetectFields(item: Element, structural: boolean) {
      var fields: Array<{ key: string; selector: string; type: string; attribute?: string }> = []
      var usedKeys: Record<string, boolean> = {}
      function uniqueKey(base: string) {
        var key = base, i = 2
        while (usedKeys[key]) { key = base + '_' + i; i++ }
        usedKeys[key] = true
        return key
      }
      var candidates: Element[] = []
      var seen = new Set<Element>()
      function walk(el: Element, depth: number) {
        if (depth > 15 || candidates.length >= 20 || seen.has(el)) return
        seen.add(el)
        if (el.hasAttribute && el.hasAttribute('data-izan-recorder')) return
        var h = el as HTMLElement
        if (!h.offsetWidth && !h.offsetHeight) return
        var tag = el.tagName
        if (tag === 'A' && el.getAttribute('href')) { candidates.push(el); return }
        if (tag === 'IMG' && el.getAttribute('src') && !isJunkImage(el)) { candidates.push(el); return }
        if (tag === 'TIME' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { candidates.push(el); return }
        var hasChildren = el.children.length > 0
        var text = (el.textContent || '').trim()
        if (!hasChildren && text.length > 0) { candidates.push(el); return }
        if (hasChildren) {
          var childEls = Array.from(el.children)
          var hasDeep = childEls.some(function(c) { return c.children.length > 0 })
          if (!hasDeep && text.length > 0 && text.length < 200 && childEls.length <= 3) { candidates.push(el); return }
          childEls.forEach(function(c) { walk(c, depth + 1) })
        }
      }
      // Check root element itself before walking children
      var rootTag = item.tagName
      if (rootTag === 'A' && item.getAttribute('href')) { candidates.push(item) }
      else if (rootTag === 'IMG' && item.getAttribute('src') && !isJunkImage(item)) { candidates.push(item) }
      // Then walk children for nested content
      Array.from(item.children).forEach(function(c) { walk(c, 0) })
      var rootHasHref = rootTag === 'A' && item.getAttribute('href')
      var rootHasImg = rootTag === 'IMG' && item.getAttribute('src')
      if (candidates.length === 0 && (item.textContent || '').trim()) {
        var rootFields: Array<{ key: string; selector: string; type: string; attribute?: string }> = [{ key: 'text', selector: '*', type: 'text' }]
        if (rootHasHref) rootFields.push({ key: 'href', selector: '*', type: 'attribute', attribute: 'href' })
        if (rootHasImg) {
          rootFields.push({ key: 'src', selector: '*', type: 'attribute', attribute: 'src' })
          if (item.getAttribute('alt')) rootFields.push({ key: 'alt', selector: '*', type: 'attribute', attribute: 'alt' })
        }
        return rootFields
      }
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i]
        var sel = generateRelativeSelector(c, item, structural)
        var type = inferType(c)
        var bk = fieldKey(c, fields.length)
        var key = uniqueKey(bk)
        var field: { key: string; selector: string; type: string; attribute?: string } = { key: key, selector: sel, type: type }
        if (type === 'attribute') field.attribute = c.tagName === 'A' ? 'href' : 'src'
        if (c.tagName === 'A' && (c.textContent || '').trim())
          fields.push({ key: uniqueKey(bk + '_text'), selector: sel, type: 'text' })
        fields.push(field)
      }
      if (rootHasHref && !usedKeys['href']) {
        fields.unshift({ key: uniqueKey('href'), selector: '*', type: 'attribute', attribute: 'href' })
        if (!usedKeys['text']) fields.unshift({ key: uniqueKey('text'), selector: '*', type: 'text' })
      }
      if (rootHasImg && !usedKeys['src']) {
        fields.unshift({ key: uniqueKey('src'), selector: '*', type: 'attribute', attribute: 'src' })
        if (item.getAttribute('alt') && !usedKeys['alt']) fields.unshift({ key: uniqueKey('alt'), selector: '*', type: 'attribute', attribute: 'alt' })
      }
      return fields
    }

    function autoDetectTableFields(row: Element) {
      var fields: Array<{ key: string; selector: string; type: string; attribute?: string }> = []
      var usedKeys: Record<string, boolean> = {}
      function uniqueKey(base: string) {
        var key = base, i = 2
        while (usedKeys[key]) { key = base + '_' + i; i++ }
        usedKeys[key] = true
        return key
      }
      var table = row.closest('table')
      var headers: string[] = []
      if (table) {
        table.querySelectorAll('thead th, tr:first-child th').forEach(function(th) { headers.push((th.textContent || '').trim()) })
      }
      Array.from(row.children).forEach(function(cell, childIdx) {
        if (cell.tagName !== 'TD' && cell.tagName !== 'TH') return
        if (!(cell as HTMLElement).offsetWidth && !(cell as HTMLElement).offsetHeight) return
        var headerText = headers[childIdx]
        var baseKey = headerText ? slugify(headerText) : 'col_' + (childIdx + 1)
        var tag = cell.tagName.toLowerCase()
        var nthSel = tag + ':nth-child(' + (childIdx + 1) + ')'
        fields.push({ key: uniqueKey(baseKey), selector: nthSel, type: 'text' })
        if (cell.querySelector('a[href]'))
          fields.push({ key: uniqueKey(baseKey + '_url'), selector: nthSel + ' a', type: 'attribute', attribute: 'href' })
        if (cell.querySelector('img[src]'))
          fields.push({ key: uniqueKey(baseKey + '_img'), selector: nthSel + ' img', type: 'attribute', attribute: 'src' })
      })
      return fields
    }

    function extractValue(el: Element, f: { type: string; attribute?: string }) {
      if (!el) return null
      switch (f.type) {
        case 'text': return (el.textContent || '').trim()
        case 'html': return el.innerHTML
        case 'value': return (el as HTMLInputElement).value || ''
        case 'attribute': return el.getAttribute(f.attribute || '') || ''
        default: return (el.textContent || '').trim()
      }
    }

    function cleanHtml(el: Element) {
      var clone = el.cloneNode(true) as Element
      clone.querySelectorAll('[data-izan-recorder]').forEach(function(n) { n.remove() })
      return clone.outerHTML
    }

    // ── XPath / CSS helpers ──
    var isXP = selector.indexOf('//') >= 0 || selector.charAt(0) === '/' || selector.charAt(0) === '('
    console.log('[izan-ext] selectorExtractInPage: selector="' + selector + '" mode=' + mode + ' isXPath=' + isXP)
    function qsel(ctx: Node, s: string): Element | null {
      if (isXP) { var r = document.evaluate(s, ctx, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null); return r.singleNodeValue as Element | null }
      return (ctx as Element).querySelector(s)
    }
    function qselAll(ctx: Node, s: string): Element[] {
      if (isXP) { var r = document.evaluate(s, ctx, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); var n: Element[] = []; for (var i = 0; i < r.snapshotLength; i++) n.push(r.snapshotItem(i) as Element); return n }
      return Array.from((ctx as Element).querySelectorAll(s))
    }

    // ── Main logic ──
    if (mode === 'list') {
      var items = qselAll(document, selector)
      console.log('[izan-ext] selectorExtractInPage: list mode, found ' + items.length + ' items')
      if (items.length === 0) return { error: 'No elements match "' + selector + '"' }
      var firstItem = items[0]
      var fields = firstItem.tagName === 'TR' ? autoDetectTableFields(firstItem) : autoDetectFields(firstItem, true)
      if (!fields || fields.length === 0) fields = [{ key: 'text', selector: '*', type: 'text' }]
      var previewItems = Array.from(items).slice(0, 3)
      var preview = previewItems.map(function(item) {
        var row: Record<string, unknown> = {}
        for (var fi = 0; fi < fields.length; fi++) {
          var f = fields[fi]
          try {
            var target = f.selector === '*' ? item : item.querySelector(f.selector)
            row[f.key] = target ? extractValue(target, f) : null
          } catch { row[f.key] = null }
        }
        return row
      })
      return {
        containerSelector: selector,
        fields: fields,
        preview: preview,
        previewHtml: previewItems.map(cleanHtml),
        itemCount: items.length,
        name: slugify(selector.slice(0, 30)) || 'data',
        mode: 'list',
      }
    } else {
      var el = qsel(document, selector)
      console.log('[izan-ext] selectorExtractInPage: single mode, found=' + !!el + (el ? ' tag=' + el.tagName : ''))
      if (!el) return { error: 'No element matches "' + selector + '"' }
      var fields = el.tagName === 'TR' ? autoDetectTableFields(el) : autoDetectFields(el, false)
      if (!fields || fields.length === 0) fields = [{ key: 'text', selector: '*', type: 'text' }]
      var row: Record<string, unknown> = {}
      for (var fi = 0; fi < fields.length; fi++) {
        var f = fields[fi]
        try {
          var target = f.selector === '*' ? el : el.querySelector(f.selector)
          row[f.key] = target ? extractValue(target, f) : null
        } catch { row[f.key] = null }
      }
      return {
        containerSelector: selector,
        fields: fields,
        preview: row,
        previewHtml: [cleanHtml(el)],
        name: slugify(selector.slice(0, 30)) || 'data',
        mode: 'single',
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
  /* eslint-enable no-var */
}

// ─── Role-based Extraction (Accessibility Tree) ──────────────────────────────

async function cleanupRoleExtract(tabId: number): Promise<void> {
  try { await chrome.debugger.sendCommand({ tabId }, 'Accessibility.disable') } catch {}
  try { await chrome.debugger.sendCommand({ tabId }, 'DOM.disable') } catch {}
  await cdpDetach(tabId)
}

function processRoleResult(value: unknown, mode: 'list' | 'single', roles?: string[], roleName?: string, roleIncludeChildren?: boolean): void {
  const v = value as { containerSelector?: string; fields?: unknown[]; preview?: unknown; previewHtml?: string[]; itemCount?: number; name?: string; error?: string } | null
  if (!v || v.error) {
    sidePanelPort?.postMessage({ type: 'selector-extract-error', error: v?.error || 'Extraction failed' })
    return
  }
  if (!v.fields || (v.fields as unknown[]).length === 0) {
    sidePanelPort?.postMessage({ type: 'selector-extract-error', error: 'No fields detected' })
    return
  }
  const step = {
    action: 'extract' as const,
    name: v.name || 'data',
    mode,
    containerSelector: v.containerSelector,
    fields: v.fields,
    itemCount: v.itemCount,
    // Always mark role extraction steps so runtime uses accessibility, not CSS
    extractionMethod: 'role' as const,
    roles,
    roleName: roleName || undefined,
    roleIncludeChildren: roleIncludeChildren ?? true,
    label: mode === 'list'
      ? `${v.itemCount ?? '?'} items · ${(v.fields as unknown[]).length} fields (list)`
      : `${(v.fields as unknown[]).length} fields (single)`,
  }
  console.log(`[izan-ext] processRoleResult: mode=${mode} fields=${(v.fields as unknown[]).length} roles=[${roles?.join(',') ?? ''}] extractionMethod=role`)
  sidePanelPort?.postMessage({
    type: 'selector-extract-result',
    step,
    preview: v.preview,
    previewHtml: v.previewHtml,
  })
}

/**
 * Build a self-contained function string for Runtime.callFunctionOn.
 * `this` = first matched DOM element. arguments[0]=role, arguments[1]=name, arguments[2]=includeChildren.
 *
 * includeChildren=true  → treat each matched element as a container, auto-detect child fields
 * includeChildren=false → extract direct properties of matched elements (text, href, src etc.)
 */
function buildRoleExtractExpression(): string {
  // Shared helper functions (must be self-contained for CDP Runtime.callFunctionOn)
  const helpers = `
    function isDynamicClass(cls) {
      if (cls.length < 3) return true;
      if (/^[a-z]{1,2}-/.test(cls)) return true;
      if (/^[a-zA-Z]{1,3}[A-Z][a-zA-Z]{4,}$/.test(cls)) return true;
      if (/^(bg|text|flex|grid|p|m|w|h)-/.test(cls)) return true;
      return false;
    }
    function generateRelativeSelector(el, container, structuralOnly) {
      var parts = [];
      var cur = el;
      while (cur && cur !== container) {
        var p = cur.parentElement;
        if (!p) break;
        var tag = cur.tagName.toLowerCase();
        if (!structuralOnly) {
          for (var ci = 0; ci < cur.classList.length; ci++) {
            var cls = cur.classList[ci];
            if (isDynamicClass(cls) || cls.indexOf('izan-') === 0) continue;
            if (p.querySelectorAll('.' + CSS.escape(cls)).length === 1) {
              parts.unshift('.' + CSS.escape(cls));
              return parts.join(' > ') || '*';
            }
          }
        }
        var sibs = Array.from(p.children).filter(function(c) { return c.tagName === cur.tagName });
        if (sibs.length === 1) parts.unshift(tag);
        else parts.unshift(tag + ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')');
        cur = p;
      }
      return parts.join(' > ') || '*';
    }
    function slugify(s) {
      return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'field';
    }
    function inferType(el) {
      var t = el.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return 'value';
      if (t === 'A' || t === 'IMG') return 'attribute';
      return 'text';
    }
    function isJunkImage(el) {
      var w = el.naturalWidth || el.width || 0;
      var h = el.naturalHeight || el.height || 0;
      if (w <= 1 || h <= 1) return true;
      if (w < 24 && h < 24) return true;
      var src = el.getAttribute('src') || '';
      if (/\\b(pixel|tracker|spacer|blank|1x1|beacon|\\.gif\\?)/i.test(src)) return true;
      if (src.indexOf('data:') === 0 && src.length < 200) return true;
      return false;
    }
    function fieldKey(el, idx) {
      var tag = el.tagName;
      if (tag === 'TIME') return 'date';
      if (tag === 'A') return 'link';
      if (tag === 'IMG') return 'image';
      var attrs = el.getAttributeNames ? el.getAttributeNames() : [];
      for (var ai = 0; ai < attrs.length; ai++) {
        if (attrs[ai].indexOf('data-') === 0 && attrs[ai] !== 'data-izan-recorder') {
          var k = attrs[ai].slice(5);
          if (k.length >= 3 && k.length <= 20) return slugify(k);
        }
      }
      var al = el.getAttribute('aria-label'); if (al) return slugify(al);
      var nm = el.getAttribute('name'); if (nm) return slugify(nm);
      var cn = el.className ? el.className.toString() : '';
      if (cn) {
        var classes = cn.split(/\\s+/);
        for (var ci = 0; ci < classes.length; ci++) {
          if (classes[ci].length > 3 && !isDynamicClass(classes[ci])) return slugify(classes[ci]);
        }
      }
      var txt = (el.textContent || '').trim().slice(0, 20);
      if (txt) return slugify(txt);
      return 'field_' + idx;
    }
    function autoDetectFields(item, structural) {
      var fields = [];
      var usedKeys = {};
      function uniqueKey(base) {
        var key = base, i = 2;
        while (usedKeys[key]) { key = base + '_' + i; i++; }
        usedKeys[key] = true;
        return key;
      }
      var candidates = [];
      var seen = new Set();
      function walk(el, depth) {
        if (depth > 15 || candidates.length >= 20 || seen.has(el)) return;
        seen.add(el);
        if (el.hasAttribute && el.hasAttribute('data-izan-recorder')) return;
        var h = el;
        if (!h.offsetWidth && !h.offsetHeight) return;
        var tag = el.tagName;
        if (tag === 'A' && el.getAttribute('href')) { candidates.push(el); return; }
        if (tag === 'IMG' && el.getAttribute('src') && !isJunkImage(el)) { candidates.push(el); return; }
        if (tag === 'TIME' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { candidates.push(el); return; }
        var hasChildren = el.children.length > 0;
        var text = (el.textContent || '').trim();
        if (!hasChildren && text.length > 0) { candidates.push(el); return; }
        if (hasChildren) {
          var childEls = Array.from(el.children);
          var hasDeep = childEls.some(function(c) { return c.children.length > 0 });
          if (!hasDeep && text.length > 0 && text.length < 200 && childEls.length <= 3) { candidates.push(el); return; }
          childEls.forEach(function(c) { walk(c, depth + 1); });
        }
      }
      // Check root element itself before walking children
      var rootTag = item.tagName;
      if (rootTag === 'A' && item.getAttribute('href')) { candidates.push(item); }
      else if (rootTag === 'IMG' && item.getAttribute('src') && !isJunkImage(item)) { candidates.push(item); }
      // Then walk children for nested content
      Array.from(item.children).forEach(function(c) { walk(c, 0); });
      var rootHasHref = rootTag === 'A' && item.getAttribute('href');
      var rootHasImg = rootTag === 'IMG' && item.getAttribute('src');
      if (candidates.length === 0 && (item.textContent || '').trim()) {
        var rootFields = [{ key: 'text', selector: '*', type: 'text' }];
        if (rootHasHref) rootFields.push({ key: 'href', selector: '*', type: 'attribute', attribute: 'href' });
        if (rootHasImg) {
          rootFields.push({ key: 'src', selector: '*', type: 'attribute', attribute: 'src' });
          if (item.getAttribute('alt')) rootFields.push({ key: 'alt', selector: '*', type: 'attribute', attribute: 'alt' });
        }
        return rootFields;
      }
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        var sel = generateRelativeSelector(c, item, structural);
        var type = inferType(c);
        var bk = fieldKey(c, fields.length);
        var key = uniqueKey(bk);
        var field = { key: key, selector: sel, type: type };
        if (type === 'attribute') field.attribute = c.tagName === 'A' ? 'href' : 'src';
        if (c.tagName === 'A' && (c.textContent || '').trim())
          fields.push({ key: uniqueKey(bk + '_text'), selector: sel, type: 'text' });
        fields.push(field);
      }
      // If root element has href/src but no child candidate picked it up, add root-level fields
      if (rootHasHref && !usedKeys['href']) {
        fields.unshift({ key: uniqueKey('href'), selector: '*', type: 'attribute', attribute: 'href' });
        if (!usedKeys['text']) fields.unshift({ key: uniqueKey('text'), selector: '*', type: 'text' });
      }
      if (rootHasImg && !usedKeys['src']) {
        fields.unshift({ key: uniqueKey('src'), selector: '*', type: 'attribute', attribute: 'src' });
        if (item.getAttribute('alt') && !usedKeys['alt']) fields.unshift({ key: uniqueKey('alt'), selector: '*', type: 'attribute', attribute: 'alt' });
      }
      return fields;
    }
    function autoDetectTableFields(row) {
      var fields = [];
      var usedKeys = {};
      function uniqueKey(base) {
        var key = base, i = 2;
        while (usedKeys[key]) { key = base + '_' + i; i++; }
        usedKeys[key] = true;
        return key;
      }
      var table = row.closest('table');
      var headers = [];
      if (table) {
        table.querySelectorAll('thead th, tr:first-child th').forEach(function(th) { headers.push((th.textContent || '').trim()); });
      }
      Array.from(row.children).forEach(function(cell, childIdx) {
        if (cell.tagName !== 'TD' && cell.tagName !== 'TH') return;
        if (!cell.offsetWidth && !cell.offsetHeight) return;
        var headerText = headers[childIdx];
        var baseKey = headerText ? slugify(headerText) : 'col_' + (childIdx + 1);
        var tag = cell.tagName.toLowerCase();
        var nthSel = tag + ':nth-child(' + (childIdx + 1) + ')';
        fields.push({ key: uniqueKey(baseKey), selector: nthSel, type: 'text' });
        if (cell.querySelector('a[href]'))
          fields.push({ key: uniqueKey(baseKey + '_url'), selector: nthSel + ' a', type: 'attribute', attribute: 'href' });
        if (cell.querySelector('img[src]'))
          fields.push({ key: uniqueKey(baseKey + '_img'), selector: nthSel + ' img', type: 'attribute', attribute: 'src' });
      });
      return fields;
    }
    function extractValue(el, f) {
      if (!el) return null;
      switch (f.type) {
        case 'text': return (el.textContent || '').trim();
        case 'html': return el.innerHTML;
        case 'value': return el.value || '';
        case 'attribute': return el.getAttribute(f.attribute || '') || '';
        default: return (el.textContent || '').trim();
      }
    }
    function cleanHtml(el) {
      var clone = el.cloneNode(true);
      clone.querySelectorAll('[data-izan-recorder]').forEach(function(n) { n.remove(); });
      return clone.outerHTML;
    }
    var IMPLICIT_ROLES = {
      button: 'button', link: 'a', heading: 'h1,h2,h3,h4,h5,h6',
      listitem: 'li', row: 'tr', cell: 'td,th', img: 'img',
      article: 'article', navigation: 'nav', textbox: 'input,textarea',
      list: 'ul,ol', table: 'table', form: 'form', banner: 'header',
      contentinfo: 'footer', main: 'main', complementary: 'aside',
      region: 'section', checkbox: 'input[type=checkbox]',
      radio: 'input[type=radio]', separator: 'hr',
    };
    function isVisible(el) {
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      var s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    }
    /** Find all elements matching a single role - merges explicit [role] attr AND implicit HTML tags */
    function findByRole(role, name) {
      var seen = new Set();
      var items = [];
      // Explicit role attribute
      Array.from(document.querySelectorAll('[role="' + role + '"]')).forEach(function(el) {
        if (!seen.has(el) && isVisible(el)) { seen.add(el); items.push(el); }
      });
      // Implicit HTML roles (always merge, not just as fallback)
      if (IMPLICIT_ROLES[role]) {
        Array.from(document.querySelectorAll(IMPLICIT_ROLES[role])).forEach(function(el) {
          if (!seen.has(el) && isVisible(el)) { seen.add(el); items.push(el); }
        });
      }
      if (name && items.length > 0) {
        var lowerName = name.toLowerCase();
        items = items.filter(function(el) {
          var accName = (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title') || el.textContent || '').trim().toLowerCase();
          return accName.indexOf(lowerName) !== -1;
        });
      }
      return items;
    }
    /** Find elements matching ANY of the given roles */
    function findByRoles(roles, name) {
      var seen = new Set();
      var items = [];
      for (var ri = 0; ri < roles.length; ri++) {
        var roleItems = findByRole(roles[ri], name);
        for (var i = 0; i < roleItems.length; i++) {
          if (!seen.has(roleItems[i])) { seen.add(roleItems[i]); items.push(roleItems[i]); }
        }
      }
      return items;
    }
    function buildContainerSelector(roles) {
      var parts = [];
      for (var ri = 0; ri < roles.length; ri++) {
        var role = roles[ri];
        parts.push('[role="' + role + '"]');
        if (IMPLICIT_ROLES[role]) parts.push(IMPLICIT_ROLES[role]);
      }
      return parts.join(', ');
    }
    /** Build fields for direct properties of matched elements (no children walk) */
    function directFields(el) {
      var fields = [];
      var tag = el.tagName;
      fields.push({ key: 'text', selector: '*', type: 'text' });
      if (tag === 'A' && el.getAttribute('href'))
        fields.push({ key: 'href', selector: '*', type: 'attribute', attribute: 'href' });
      if (tag === 'IMG') {
        if (el.getAttribute('src')) fields.push({ key: 'src', selector: '*', type: 'attribute', attribute: 'src' });
        if (el.getAttribute('alt')) fields.push({ key: 'alt', selector: '*', type: 'attribute', attribute: 'alt' });
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
        fields.push({ key: 'value', selector: '*', type: 'value' });
      return fields;
    }
  `

  return `function(roles, name, includeChildren) {
    try {
      ${helpers}
      // roles can be a single string (legacy) or an array
      if (typeof roles === 'string') roles = [roles];
      var items = findByRoles(roles, name);
      if (items.length === 0) {
        return { error: 'No elements found with role="' + roles.join(', ') + '"' + (name ? ' and name containing "' + name + '"' : '') };
      }
      var totalCount = items.length;
      if (items.length > 100) items = items.slice(0, 100);
      var firstItem = items[0];
      var fields;
      if (includeChildren) {
        fields = firstItem.tagName === 'TR' ? autoDetectTableFields(firstItem) : autoDetectFields(firstItem, true);
      } else {
        fields = directFields(firstItem);
      }
      if (!fields || fields.length === 0) fields = [{ key: 'text', selector: '*', type: 'text' }];
      var containerSelector = buildContainerSelector(roles);
      function isEmptyRow(row) { for (var k in row) { var v = row[k]; if (v != null && v !== '') return false; } return true; }
      var previewItems = [];
      var previewHtmls = [];
      for (var pi = 0; pi < items.length && previewItems.length < 5; pi++) {
        var item = items[pi];
        var row = {};
        for (var fi = 0; fi < fields.length; fi++) {
          var f = fields[fi];
          try {
            var target = f.selector === '*' ? item : item.querySelector(f.selector);
            row[f.key] = target ? extractValue(target, f) : null;
          } catch(e) { row[f.key] = null; }
        }
        if (!isEmptyRow(row)) {
          previewItems.push(row);
          previewHtmls.push(cleanHtml(item));
        }
      }
      return {
        containerSelector: containerSelector,
        fields: fields,
        preview: previewItems,
        previewHtml: previewHtmls,
        itemCount: totalCount,
        name: roles.map(function(r) { return slugify(r); }).join('_') || 'data',
        mode: 'list',
      };
    } catch(e) {
      return { error: e.message || String(e) };
    }
  }`
}

/**
 * Get full accessibility tree snapshot for the sidepanel.
 * Attaches CDP to the active tab, gets the AX tree, detaches.
 */
async function handleFullAccessibilitySnapshotForSidepanel(tabId: number): Promise<void> {
  try {
    await cdpAttach(tabId)
    await chrome.debugger.sendCommand({ tabId }, 'DOM.enable')
    await chrome.debugger.sendCommand({ tabId }, 'Accessibility.enable')

    const result = await chrome.debugger.sendCommand({ tabId }, 'Accessibility.getFullAXTree', { depth: -1 }) as { nodes: AXNode[] }
    const formatted = formatAXTree(result.nodes)

    await chrome.debugger.sendCommand({ tabId }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId }, 'DOM.disable').catch(() => {})
    await cdpDetach(tabId)

    sidePanelPort?.postMessage({ type: 'accessibility-snapshot-result', data: formatted })
  } catch (e) {
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Accessibility.disable').catch(() => {})
      await chrome.debugger.sendCommand({ tabId }, 'DOM.disable').catch(() => {})
      await cdpDetach(tabId)
    } catch {}
    sidePanelPort?.postMessage({ type: 'accessibility-snapshot-error', error: e instanceof Error ? e.message : String(e) })
  }
}

async function handleAccessibilityNeighborsForSidepanel(
  tabId: number,
  targetName: string,
  targetRole: string | undefined,
  count: number,
  direction: 'both' | 'above' | 'below',
  includeChildren: boolean,
  matchMode: 'contains' | 'equals' = 'contains',
): Promise<void> {
  try {
    await cdpAttach(tabId)
    const result = await handleAccessibilityNeighbors({
      tabId,
      targetName,
      targetRole,
      count,
      direction,
      includeChildren,
      matchMode,
    })
    await cdpDetach(tabId)
    if ((result as { success: boolean }).success) {
      sidePanelPort?.postMessage({ type: 'accessibility-neighbors-result', data: (result as { data: string }).data })
    } else {
      sidePanelPort?.postMessage({ type: 'accessibility-neighbors-error', error: (result as { error: string }).error })
    }
  } catch (e) {
    try { await cdpDetach(tabId) } catch {}
    sidePanelPort?.postMessage({ type: 'accessibility-neighbors-error', error: e instanceof Error ? e.message : String(e) })
  }
}

async function handleRoleExtract(tabId: number, roles: string[], name: string, includeChildren: boolean): Promise<void> {
  try {
    await cdpAttach(tabId)
    await chrome.debugger.sendCommand({ tabId }, 'DOM.enable')
    await chrome.debugger.sendCommand({ tabId }, 'Accessibility.enable')

    const { root } = await chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } }

    // Query accessibility tree for ALL roles, merge backendDOMNodeIds
    const allBackendNodeIds: number[] = []
    for (const role of roles) {
      const queryParams: Record<string, unknown> = { nodeId: root.nodeId, role }
      if (name) queryParams.name = name
      try {
        const { nodes } = await chrome.debugger.sendCommand({ tabId }, 'Accessibility.queryAXTree', queryParams) as { nodes: Array<{ backendDOMNodeId?: number }> }
        if (nodes) {
          for (const n of nodes) {
            if (n.backendDOMNodeId != null && !allBackendNodeIds.includes(n.backendDOMNodeId)) {
              allBackendNodeIds.push(n.backendDOMNodeId)
            }
          }
        }
      } catch { /* skip failed role queries */ }
    }

    if (allBackendNodeIds.length === 0) {
      const rolesStr = roles.join(', ')
      sidePanelPort?.postMessage({ type: 'selector-extract-error', error: `No elements found with role="${rolesStr}"${name ? ` and name="${name}"` : ''}` })
      await cleanupRoleExtract(tabId)
      return
    }

    // Resolve the first node to get an objectId for Runtime.callFunctionOn
    const { object } = await chrome.debugger.sendCommand({ tabId }, 'DOM.resolveNode', {
      backendNodeId: allBackendNodeIds[0],
    }) as { object: { objectId: string } }

    const result = await chrome.debugger.sendCommand({ tabId }, 'Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: buildRoleExtractExpression(),
      arguments: [{ value: roles }, { value: name }, { value: includeChildren }],
      returnByValue: true,
    }) as { result: { value: unknown } }

    await cleanupRoleExtract(tabId)
    processRoleResult(result.result.value, 'list', roles, name, includeChildren)
  } catch (err: unknown) {
    try { await cleanupRoleExtract(tabId) } catch {}
    const message = err instanceof Error ? err.message : String(err)
    sidePanelPort?.postMessage({ type: 'selector-extract-error', error: message })
  }
}

// ─── Runtime Role-Based Extraction ────────────────────────────────────────────

/**
 * Build a self-contained function string for Runtime.callFunctionOn that extracts
 * data from role-matched elements using provided field definitions.
 * Used at runtime (macro execution) - unlike buildRoleExtractExpression which is for recording preview.
 */
function buildRuntimeRoleExtractExpression(): string {
  return `function(roles, name, includeChildren, fields) {
    try {
      ${RESOLVE_SEL_JS}
      ${EXTRACT_FIELD_JS}
      var IMPLICIT_ROLES = {
        button: 'button', link: 'a', heading: 'h1,h2,h3,h4,h5,h6',
        listitem: 'li', row: 'tr', cell: 'td,th', img: 'img',
        article: 'article', navigation: 'nav', textbox: 'input,textarea',
        list: 'ul,ol', table: 'table', form: 'form', banner: 'header',
        contentinfo: 'footer', main: 'main', complementary: 'aside',
        region: 'section', checkbox: 'input[type=checkbox]',
        radio: 'input[type=radio]', separator: 'hr',
      };
      function isVisible(el) {
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        var s = getComputedStyle(el);
        return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
      }
      function findByRole(role, name) {
        var seen = new Set();
        var items = [];
        Array.from(document.querySelectorAll('[role="' + role + '"]')).forEach(function(el) {
          if (!seen.has(el) && isVisible(el)) { seen.add(el); items.push(el); }
        });
        if (IMPLICIT_ROLES[role]) {
          Array.from(document.querySelectorAll(IMPLICIT_ROLES[role])).forEach(function(el) {
            if (!seen.has(el) && isVisible(el)) { seen.add(el); items.push(el); }
          });
        }
        if (name && items.length > 0) {
          var lowerName = name.toLowerCase();
          items = items.filter(function(el) {
            var accName = (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title') || el.textContent || '').trim().toLowerCase();
            return accName.indexOf(lowerName) !== -1;
          });
        }
        return items;
      }
      function findByRoles(roles, name) {
        var seen = new Set();
        var items = [];
        for (var ri = 0; ri < roles.length; ri++) {
          var roleItems = findByRole(roles[ri], name);
          for (var i = 0; i < roleItems.length; i++) {
            if (!seen.has(roleItems[i])) { seen.add(roleItems[i]); items.push(roleItems[i]); }
          }
        }
        return items;
      }
      if (typeof roles === 'string') roles = [roles];
      console.log('[izan-ext] runtimeRoleExtract: finding elements for roles=[' + roles.join(',') + '] name="' + name + '"');
      var items = findByRoles(roles, name);
      console.log('[izan-ext] runtimeRoleExtract: found ' + items.length + ' elements');
      if (items.length === 0) return [];
      if (items.length > 100) { console.log('[izan-ext] runtimeRoleExtract: truncating to 100'); items = items.slice(0, 100); }
      function isEmptyRow(row) { for (var k in row) { var v = row[k]; if (v != null && v !== '') return false; } return true; }
      var result = [];
      for (var ii = 0; ii < items.length; ii++) {
        var item = items[ii];
        var row = {};
        for (var fi = 0; fi < fields.length; fi++) {
          var f = fields[fi];
          try { row[f.key] = extractField(item, f); } catch(e) { console.warn('[izan-ext] runtimeRoleExtract: field "' + f.key + '" error: ' + e.message); row[f.key] = null; }
        }
        if (!isEmptyRow(row)) result.push(row);
      }
      console.log('[izan-ext] runtimeRoleExtract: returning ' + result.length + ' rows (from ' + items.length + ' elements)');
      if (result.length > 0) console.log('[izan-ext] runtimeRoleExtract: first row=' + JSON.stringify(result[0]).slice(0, 300));
      return result;
    } catch(e) {
      console.error('[izan-ext] runtimeRoleExtract: FATAL error: ' + e.message);
      return [];
    }
  }`
}

/**
 * Runtime handler: extract data using accessibility roles via CDP.
 * Used by automation-runner when step.extractionMethod === 'role'.
 */
async function handleExtractByRole(p: P): Promise<R> {
  const tid = p.tabId as number
  const roles = p.roles as string[]
  const name = (p.name as string) || ''
  const includeChildren = p.includeChildren !== false
  const fields = p.fields as Array<Record<string, unknown>>
  console.log(`[izan-ext] handleExtractByRole: tab=${tid} roles=[${roles.join(',')}] name="${name}" includeChildren=${includeChildren} fields=${fields.length}`)
  console.log(`[izan-ext] handleExtractByRole: fields=${JSON.stringify(fields).slice(0, 500)}`)

  try {
    // Enable additional CDP domains (Runtime already enabled by cdpAttach)
    console.log(`[izan-ext] handleExtractByRole: enabling DOM + Accessibility domains`)
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.enable')
    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.enable')

    const { root } = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } }
    console.log(`[izan-ext] handleExtractByRole: document root nodeId=${root.nodeId}`)

    // Query AX tree for all roles
    const allBackendNodeIds: number[] = []
    for (const role of roles) {
      const params: Record<string, unknown> = { nodeId: root.nodeId, role }
      if (name) params.name = name
      try {
        const { nodes } = await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.queryAXTree', params) as { nodes: Array<{ backendDOMNodeId?: number }> }
        console.log(`[izan-ext] handleExtractByRole: AX queryAXTree role="${role}" → ${nodes?.length ?? 0} nodes`)
        if (nodes) {
          for (const n of nodes) {
            if (n.backendDOMNodeId != null && !allBackendNodeIds.includes(n.backendDOMNodeId))
              allBackendNodeIds.push(n.backendDOMNodeId)
          }
        }
      } catch (roleErr) {
        console.warn(`[izan-ext] handleExtractByRole: AX queryAXTree role="${role}" FAILED: ${roleErr instanceof Error ? roleErr.message : String(roleErr)}`)
      }
    }

    console.log(`[izan-ext] handleExtractByRole: total ${allBackendNodeIds.length} unique backendNodeIds`)

    if (allBackendNodeIds.length === 0) {
      console.log(`[izan-ext] handleExtractByRole: no elements found, returning empty array`)
      await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
      await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})
      return { success: true, data: [] }
    }

    // Resolve first node to get an objectId for Runtime.callFunctionOn
    console.log(`[izan-ext] handleExtractByRole: resolving backendNodeId=${allBackendNodeIds[0]}`)
    const { object } = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.resolveNode', {
      backendNodeId: allBackendNodeIds[0],
    }) as { object: { objectId: string } }
    console.log(`[izan-ext] handleExtractByRole: resolved objectId=${object.objectId?.slice(0, 40)}`)

    console.log(`[izan-ext] handleExtractByRole: calling Runtime.callFunctionOn with buildRuntimeRoleExtractExpression`)
    const result = await chrome.debugger.sendCommand({ tabId: tid }, 'Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: buildRuntimeRoleExtractExpression(),
      arguments: [{ value: roles }, { value: name }, { value: includeChildren }, { value: fields }],
      returnByValue: true,
    }) as { result: { value: unknown; exceptionDetails?: unknown } }

    // Check for JS exceptions in the evaluated code
    if ((result.result as Record<string, unknown>).exceptionDetails) {
      console.error(`[izan-ext] handleExtractByRole: JS exception in page:`, JSON.stringify((result.result as Record<string, unknown>).exceptionDetails).slice(0, 500))
    }

    const items = Array.isArray(result.result.value) ? result.result.value.length : '?'
    console.log(`[izan-ext] handleExtractByRole: runtime extraction returned ${items} items`)
    if (Array.isArray(result.result.value) && result.result.value.length > 0) {
      console.log(`[izan-ext] handleExtractByRole: first item=${JSON.stringify(result.result.value[0]).slice(0, 300)}`)
    }

    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})

    return { success: true, data: result.result.value }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error(`[izan-ext] handleExtractByRole: FAILED: ${errMsg}`)
    console.error(`[izan-ext] handleExtractByRole: stack:`, e instanceof Error ? e.stack : '')
    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})
    return { success: false, error: errMsg }
  }
}

// ─── Accessibility Snapshot ──────────────────────────────────────────────────

interface AXNode {
  nodeId: string
  parentId?: string
  role?: { type: string; value: string }
  name?: { type: string; value: string }
  properties?: Array<{ name: string; value: { type: string; value: unknown } }>
  ignored?: boolean
  childIds?: string[]
}

/**
 * Format flat AX node list into a compact text tree (Playwright-style).
 * Filters out ignored nodes, generic/none roles, and empty StaticText.
 */
function formatAXTree(nodes: AXNode[]): string {
  const nodeMap = new Map<string, AXNode>()
  for (const n of nodes) nodeMap.set(n.nodeId, n)

  const SKIP_ROLES = new Set([
    'generic', 'none', 'InlineTextBox', 'LineBreak',
    'presentation',  // layout-only elements
    'separator',      // visual dividers (hr etc.)
  ])

  /** Roles considered noise when they have no accessible name */
  const NOISE_UNNAMED = new Set([
    'group', 'Section', 'div',
  ])

  function shouldSkip(node: AXNode): boolean {
    if (node.ignored) return true
    const role = node.role?.value
    if (!role || SKIP_ROLES.has(role)) return true
    if (role === 'StaticText' && (!node.name?.value || !(node.name.value as string).trim())) return true
    // Skip unnamed noise containers (but still render their children)
    if (NOISE_UNNAMED.has(role) && !node.name?.value) return true
    // Skip hidden elements flagged via properties
    if (node.properties) {
      for (const p of node.properties) {
        if (p.name === 'hidden' && p.value.value === true) return true
      }
    }
    return false
  }

  function formatProperties(node: AXNode): string {
    const props: string[] = []
    if (node.properties) {
      for (const p of node.properties) {
        if (p.name === 'level') props.push(`level=${p.value.value}`)
        if (p.name === 'checked') props.push(`checked=${p.value.value}`)
        if (p.name === 'disabled' && p.value.value === true) props.push('disabled')
        if (p.name === 'required' && p.value.value === true) props.push('required')
        if (p.name === 'expanded') props.push(`expanded=${p.value.value}`)
        if (p.name === 'selected' && p.value.value === true) props.push('selected')
      }
    }
    return props.length > 0 ? ` [${props.join(', ')}]` : ''
  }

  function renderNode(nodeId: string, depth: number): string[] {
    const node = nodeMap.get(nodeId)
    if (!node) return []
    if (shouldSkip(node)) {
      // Still render children of skipped nodes
      const lines: string[] = []
      if (node.childIds) {
        for (const cid of node.childIds) lines.push(...renderNode(cid, depth))
      }
      return lines
    }

    const role = node.role?.value || 'unknown'
    const name = node.name?.value as string | undefined
    const props = formatProperties(node)
    const indent = '  '.repeat(depth)
    const nameStr = name?.trim() ? ` "${name.trim().slice(0, 100)}"` : ''
    const lines = [`${indent}- ${role}${nameStr}${props}`]

    if (node.childIds) {
      for (const cid of node.childIds) lines.push(...renderNode(cid, depth + 1))
    }
    return lines
  }

  // Find root node (first node without parentId, or nodeId "1")
  let rootId = nodes[0]?.nodeId
  for (const n of nodes) {
    if (!n.parentId) { rootId = n.nodeId; break }
  }
  if (!rootId) return '(empty accessibility tree)'

  const lines = renderNode(rootId, 0)
  // Limit output to prevent massive responses
  if (lines.length > 2000) {
    return lines.slice(0, 2000).join('\n') + `\n... (truncated, ${lines.length - 2000} more lines)`
  }
  return lines.join('\n') || '(empty accessibility tree)'
}

/**
 * Runtime handler: get accessibility tree snapshot.
 * Supports optional `selector` param (CSS or XPath) to scope to a specific element's subtree.
 */
async function handleAccessibilitySnapshot(p: P): Promise<R> {
  const tid = p.tabId as number
  const selector = p.selector as string | undefined
  console.log(`[izan-ext] accessibilitySnapshot: tab=${tid} selector=${selector ?? '(full page)'}`)
  try {
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.enable')
    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.enable')

    let result: { nodes: AXNode[] }

    if (selector) {
      // Scoped: find element via selector, get its partial AX tree
      const doc = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } }
      let nodeId: number

      const isXPath = selector.startsWith('/') || selector.startsWith('(') || selector.includes('//')
      if (isXPath) {
        const search = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.performSearch', { query: selector }) as { searchId: string; resultCount: number }
        if (search.resultCount === 0) {
          await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.discardSearchResults', { searchId: search.searchId }).catch(() => {})
          return { success: false, error: `No element found for XPath: ${selector}` }
        }
        const results = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.getSearchResults', { searchId: search.searchId, fromIndex: 0, toIndex: 1 }) as { nodeIds: number[] }
        nodeId = results.nodeIds[0]
        await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.discardSearchResults', { searchId: search.searchId }).catch(() => {})
      } else {
        const found = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector }) as { nodeId: number }
        if (!found.nodeId) return { success: false, error: `No element found for selector: ${selector}` }
        nodeId = found.nodeId
      }

      // Resolve to backend node for accessibility query
      const resolved = await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.resolveNode', { nodeId }) as { object: { objectId: string } }
      result = await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.getPartialAXTree', {
        objectId: resolved.object.objectId,
        fetchRelatives: false,
      }) as { nodes: AXNode[] }
    } else {
      // Full page tree
      result = await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.getFullAXTree', { depth: -1 }) as { nodes: AXNode[] }
    }

    const formatted = formatAXTree(result.nodes)

    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})

    return { success: true, data: formatted }
  } catch (e) {
    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Runtime handler: get accessibility tree neighbors around a target node.
 * Finds a node by accessible name (and optionally role), then returns
 * its siblings (above/below/both) from the parent's children.
 */
async function handleAccessibilityNeighbors(p: P): Promise<R> {
  const tid = p.tabId as number
  const targetName = p.targetName as string
  const targetRole = p.targetRole as string | undefined
  const count = (p.count as number) ?? 3
  const direction = (p.direction as 'both' | 'above' | 'below') ?? 'both'
  const matchMode = (p.matchMode as 'contains' | 'equals') ?? 'contains'

  console.log(`[izan-ext] accessibilityNeighbors: tab=${tid} target="${targetName}" role=${targetRole ?? '(any)'} count=${count} dir=${direction} match=${matchMode}`)

  if (!targetName) return { success: false, error: 'targetName is required' }

  try {
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.enable')
    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.enable')

    const result = await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.getFullAXTree', { depth: -1 }) as { nodes: AXNode[] }

    // Render the full AX tree, then find target lines and slice neighbors.
    // This uses the rendered line order (same as full-page snapshot) so `count`
    // directly controls how many visible lines above/below are returned.
    const allLines = formatAXTree(result.nodes).split('\n')

    // Support comma-separated target names
    const targets = targetName.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    if (targets.length === 0) return { success: false, error: 'No valid target names provided' }

    // Line matcher: extract the quoted name from a rendered AX line
    const extractName = (line: string): string | null => {
      const m = line.match(/"([^"]*)"/)
      return m ? m[1].toLowerCase() : null
    }

    const matchLine = (line: string, target: string): boolean => {
      if (matchMode === 'equals') {
        const name = extractName(line)
        return name !== null && name === target
      }
      return line.toLowerCase().includes(target)
    }

    // Find all matching line indices
    const matchedIndices: number[] = []
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i]
      // Role filter: check "- role" at the start of trimmed line
      if (targetRole) {
        const roleMatch = line.match(/- (\S+)/)
        if (!roleMatch || roleMatch[1].toLowerCase() !== targetRole.toLowerCase()) continue
      }
      for (const target of targets) {
        if (matchLine(line, target)) {
          matchedIndices.push(i)
          break
        }
      }
    }

    if (matchedIndices.length === 0) {
      await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
      await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})
      const roleMsg = targetRole ? ` with role "${targetRole}"` : ''
      const modeMsg = matchMode === 'equals' ? 'matching' : 'containing'
      return { success: false, error: `No accessibility node found with name ${modeMsg} "${targetName}"${roleMsg}` }
    }

    // Mark all target lines
    for (const idx of matchedIndices) {
      allLines[idx] = allLines[idx] + ' ← TARGET'
    }

    // Build ranges around each match, then merge overlapping ranges
    const ranges: Array<[number, number]> = []
    for (const idx of matchedIndices) {
      let s: number, e: number
      if (direction === 'above') {
        s = Math.max(0, idx - count); e = idx
      } else if (direction === 'below') {
        s = idx; e = Math.min(allLines.length - 1, idx + count)
      } else {
        s = Math.max(0, idx - count); e = Math.min(allLines.length - 1, idx + count)
      }
      ranges.push([s, e])
    }
    // Sort and merge overlapping ranges
    ranges.sort((a, b) => a[0] - b[0])
    const merged: Array<[number, number]> = [ranges[0]]
    for (let i = 1; i < ranges.length; i++) {
      const prev = merged[merged.length - 1]
      if (ranges[i][0] <= prev[1] + 1) {
        prev[1] = Math.max(prev[1], ranges[i][1])
      } else {
        merged.push(ranges[i])
      }
    }

    // Collect lines from merged ranges, separate non-adjacent ranges with a divider
    const lines: string[] = []
    for (let i = 0; i < merged.length; i++) {
      if (i > 0) lines.push('---')
      const [s, e] = merged[i]
      for (let j = s; j <= e; j++) lines.push(allLines[j])
    }

    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})

    if (lines.length === 0) return { success: true, data: '(no neighbor nodes found)' }
    if (lines.length > 2000) {
      return { success: true, data: lines.slice(0, 2000).join('\n') + `\n... (truncated, ${lines.length - 2000} more lines)` }
    }
    return { success: true, data: lines.join('\n') }
  } catch (e) {
    await chrome.debugger.sendCommand({ tabId: tid }, 'Accessibility.disable').catch(() => {})
    await chrome.debugger.sendCommand({ tabId: tid }, 'DOM.disable').catch(() => {})
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ─── Message Router ───────────────────────────────────────────────────────────

const HANDLERS: Record<string, (p: P) => Promise<R>> = {
  open: handleOpen,
  close: handleClose,
  closeAll: handleCloseAll,
  navigate: handleNavigate,
  getUrl: handleGetUrl,
  evaluate: handleEvaluate,
  click: handleClick,
  type: handleType,
  getText: handleGetText,
  getAttribute: handleGetAttribute,
  getValue: handleGetValue,
  exists: handleExists,
  getHtml: handleGetHtml,
  select: handleSelect,
  scroll: handleScroll,
  extractList: handleExtractList,
  extractSingle: handleExtractSingle,
  extractByRole: handleExtractByRole,
  accessibilitySnapshot: handleAccessibilitySnapshot,
  accessibilityNeighbors: handleAccessibilityNeighbors,
  waitForSelector: handleWaitForSelector,
  waitForUrl: handleWaitForUrl,
  waitForLoad: handleWaitForLoad,
  waitForDOMContentLoaded: handleWaitForDOMContentLoaded,
  waitForNetworkIdle: handleWaitForNetworkIdle,
  attachActiveTab: handleAttachActiveTab,
}

chrome.runtime.onMessage.addListener(
  (msg: { type: string; action: string; payload: P }, _sender, sendResponse) => {
    if (msg.type !== 'bw-command') return false
    const handler = HANDLERS[msg.action]
    if (!handler) {
      console.warn(`[izan-ext] bw-command: unknown action "${msg.action}"`)
      sendResponse({ success: false, error: `Unknown: ${msg.action}` })
      return false
    }
    const payloadPreview = msg.payload ? `tabId=${msg.payload.tabId} laneId=${msg.payload.laneId}` : 'no-payload'
    console.log(`[izan-ext] bw-command: action="${msg.action}" ${payloadPreview}`)
    const t0 = Date.now()
    handler(msg.payload)
      .then((result) => {
        const dt = Date.now() - t0
        const ok = (result as Record<string, unknown>).success !== false
        console.log(`[izan-ext] bw-command: action="${msg.action}" ${ok ? 'OK' : 'FAIL'} ${dt}ms`)
        sendResponse(result)
      })
      .catch((e) => {
        const dt = Date.now() - t0
        const errMsg = e instanceof Error ? e.message : String(e)
        console.error(`[izan-ext] bw-command: action="${msg.action}" EXCEPTION ${dt}ms: ${errMsg}`)
        sendResponse({ success: false, error: errMsg })
      })
    return true
  },
)
