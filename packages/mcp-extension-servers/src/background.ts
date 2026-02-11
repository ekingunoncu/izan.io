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
  chrome.scripting
    .executeScript({ target: { tabId }, files: ['recorder-inject.js'], world: 'ISOLATED' })
    .then(() => new Promise<void>((r) => setTimeout(r, 150)))
    .then(() => chrome.tabs.sendMessage(tabId, { type: 'recorder-start' }))
    .then(() => {
      console.log('[izan-ext] Re-injected recorder after page reload, tabId:', tabId)
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
          .then(() => {
            sidePanelPort?.postMessage({ type: 'recording-started' })
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
    } else if (msg.type === 'extract' && recordingTabId != null) {
      chrome.tabs.sendMessage(recordingTabId, { type: 'recorder-extract', mode: msg.mode ?? 'list' }).catch(() => {})
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
        .then((data) => sidePanelPort?.postMessage({ type: 'exportAutomationServerDone', data }))
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
  }
})

// ─── CDP Helpers ──────────────────────────────────────────────────────────────

async function cdpAttach(tid: number): Promise<void> {
  await chrome.debugger.attach({ tabId: tid }, '1.3')
  await chrome.debugger.sendCommand({ tabId: tid }, 'Runtime.enable')
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
  const opts = { width: (p.width as number) || 800, height: (p.height as number) || 600 }
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
        focused: true,
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
  laneTabs.set(laneId, tid)

  return { success: true, data: { tabId: tid } }
}

async function handleClose(p: P): Promise<R> {
  const laneId = getLaneId(p)
  const tid = laneTabs.get(laneId)
  if (tid != null) {
    await cdpDetach(tid)
    try { await chrome.tabs.remove(tid) } catch { /* tab already closed */ }
    laneTabs.delete(laneId)
  }
  return { success: true }
}

async function handleCloseAll(_p: P): Promise<R> {
  for (const [, tid] of laneTabs) {
    await cdpDetach(tid)
    try { await chrome.tabs.remove(tid) } catch { /* tab already closed */ }
  }
  laneTabs.clear()
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
  if (!knownLane) return { success: false, error: 'CDP not attached' }
  try {
    const data = await cdpEval(tid, p.expression as string)
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
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

async function handleExtractList(p: P): Promise<R> {
  const container = p.containerSelector as string
  const fields = p.fields as Array<{ key: string; selector: string; type?: string; attribute?: string }>
  const fieldStr = JSON.stringify(fields)
  const expr = `(function(){
    var items=document.querySelectorAll(${JSON.stringify(container)});
    var fields=${fieldStr};
    var result=[];
    items.forEach(function(item){
      var row={};
      fields.forEach(function(f){
        var el=item.querySelector(f.selector);
        if(!el){row[f.key]=null;return}
        var t=f.type||'text';
        if(t==='text')row[f.key]=(el.textContent||'').trim();
        else if(t==='html')row[f.key]=el.innerHTML;
        else if(t==='value')row[f.key]=el.value||'';
        else if(t==='attribute')row[f.key]=el.getAttribute(f.attribute||'')||'';
        else row[f.key]=(el.textContent||'').trim();
      });
      result.push(row);
    });
    return result;
  })()`
  return handleEvaluate({ tabId: p.tabId, expression: expr })
}

async function handleExtractSingle(p: P): Promise<R> {
  const container = p.containerSelector as string
  const fields = p.fields as Array<{ key: string; selector: string; type?: string; attribute?: string }>
  const fieldStr = JSON.stringify(fields)
  const containerStr = JSON.stringify(container)
  const expr = `(function(){
    var container=document.querySelector(${containerStr});
    if(!container)throw new Error('Not found: '+${containerStr});
    var fields=${fieldStr};
    var result={};
    fields.forEach(function(f){
      var el=f.selector?container.querySelector(f.selector):container;
      if(!el){result[f.key]=null;return}
      var t=f.type||'text';
      if(t==='text')result[f.key]=(el.textContent||'').trim();
      else if(t==='html')result[f.key]=el.innerHTML;
      else if(t==='value')result[f.key]=el.value||'';
      else if(t==='attribute')result[f.key]=el.getAttribute(f.attribute||'')||'';
      else result[f.key]=(el.textContent||'').trim();
    });
    return result;
  })()`
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
  waitForSelector: handleWaitForSelector,
  waitForUrl: handleWaitForUrl,
  waitForLoad: handleWaitForLoad,
  waitForDOMContentLoaded: handleWaitForDOMContentLoaded,
  waitForNetworkIdle: handleWaitForNetworkIdle,
}

chrome.runtime.onMessage.addListener(
  (msg: { type: string; action: string; payload: P }, _sender, sendResponse) => {
    if (msg.type !== 'bw-command') return false
    const handler = HANDLERS[msg.action]
    if (!handler) { sendResponse({ success: false, error: `Unknown: ${msg.action}` }); return false }
    handler(msg.payload)
      .then(sendResponse)
      .catch((e) => sendResponse({ success: false, error: e instanceof Error ? e.message : String(e) }))
    return true
  },
)
