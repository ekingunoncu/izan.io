import type { Plugin } from 'vite'

const RELOAD_SERVER_URL = 'http://localhost:8089'

/**
 * Vite plugin that triggers extension reload after each build by
 * sending a POST to the standalone reload server.
 */
export function extensionReloadTrigger(): Plugin {
  return {
    name: 'extension-reload-trigger',
    closeBundle: {
      sequential: true,
      async handler() {
        try {
          await fetch(`${RELOAD_SERVER_URL}/trigger`, { method: 'POST' })
          console.log('[extension-reload] Triggered reload')
        } catch {
          // Reload server not running (e.g. standalone build) — ignore
        }
      },
    },
  }
}

/**
 * Vite plugin that injects a WebSocket reload client into the
 * Chrome extension's background script. When the reload server
 * sends "reload", the extension calls `chrome.runtime.reload()`.
 *
 * Only the file matching `backgroundPath` is transformed.
 */
export function injectReloadClient(backgroundPath: string): Plugin {
  return {
    name: 'inject-reload-client',
    transform(code, id) {
      if (!id.endsWith(backgroundPath) && !id.includes(backgroundPath)) return null

      const client = `
// ── Hot-reload client (dev only) ──────────────────────────────────
;(function _hotReload() {
  const url = 'ws://localhost:8089';
  function connect() {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => {
      if (e.data === 'reload') {
        console.log('[hot-reload] Reloading extension…');
        chrome.runtime.reload();
      }
    };
    ws.onclose = () => setTimeout(connect, 1000);
  }
  connect();
  // On update, reload active tabs so content scripts are re-injected
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'update') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        for (const tab of tabs) { if (tab.id) chrome.tabs.reload(tab.id); }
      });
    }
  });
})();
// ── End hot-reload client ─────────────────────────────────────────
`
      return { code: code + client, map: null }
    },
  }
}
