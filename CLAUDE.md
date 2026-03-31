# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

izan.io is an open-source Chrome extension (AGPL-3.0) that acts as an MCP (Model Context Protocol) server, giving any AI the power to control a browser. External MCP clients (Claude Desktop, Cursor, VS Code) connect via a WebSocket bridge CLI. Tools are JavaScript code that use a `browser` API to automate web pages via Chrome DevTools Protocol.

## Commands

```bash
npm install          # Install all workspace dependencies
npm run build        # Build all packages (via Turbo)
npm run dev          # Start dev servers

# Chrome extension
npm run build:extension      # Build extension (content + background + sidepanel)
npm run build -w @izan/extension

# Bridge CLI
npm run build:bridge         # Build the izan-mcp CLI
npm run build -w izan-mcp

# Web app (landing + docs)
npm run build -w @izan/web
npm run dev -w @izan/web
npm run lint -w @izan/web
npm run typecheck -w @izan/web
```

## Architecture

**Monorepo**: npm workspaces + Turborepo. Packages under `packages/`, apps under `apps/`.

```
MCP Client (Claude Desktop, Cursor, VS Code)
  │ stdio (JSON-RPC)
  v
packages/bridge/  (izan-mcp CLI)
  │ WebSocket (localhost:3717)
  v
Chrome Extension background.ts
  │ CDP (chrome.debugger)
  v
Browser Tab (any website)
```

### packages/bridge/ - Bridge CLI (`izan-mcp`)

- Node.js CLI that bridges external MCP clients to the Chrome extension
- `cli.ts`: Entry point, starts stdio MCP server + WebSocket server
- `stdio-server.ts`: MCP server using `@modelcontextprotocol/sdk` StdioServerTransport
- `ws-bridge.ts`: WebSocket server on localhost:3717, accepts extension connection
- `protocol.ts`: Shared message types for WebSocket communication

### packages/extension/ - Chrome Extension (core product)

- **`background.ts`**: Service worker - CDP commands, window/tab management, WS bridge client, tool dispatch
- **`content.ts`**: Content script (ISOLATED world) on izan.io/zihin.io. Boots MCP server, handles tool sync
- **`dynamic-server.ts`**: MCP server via TabServerTransport. Registers code-based tools + built-in tools (accessibility_snapshot, web_fetch)
- **`code-tool-executor.ts`**: Sends tool code to offscreen document for execution (MV3 can't eval in service workers)
- **`offscreen.ts`**: Offscreen document - evaluates tool code with `new Function()`, proxies `browser.*` calls back to background
- **`browser-window.ts`**: Browser automation API wrapping CDP commands (open, click, type, evaluate, waitFor*, snapshot, etc.)
- **`ws-client.ts`**: WebSocket client connecting to the bridge CLI for external MCP clients
- **Side panel** (`sidepanel/`): React + CodeMirror UI for creating, editing, testing tools + marketplace
- Build: Separate Vite builds for content.ts, background.ts, offscreen.ts, and sidepanel

### apps/web/ - Landing page + docs

- React Router v7 + Vite + Tailwind CSS 4
- Landing page + documentation (5 docs × 3 locales)
- i18n: 3 locales (en, tr, de). When adding UI strings, update all 3 locale files.

### apps/zihin.io/ - Tool Marketplace

- Community tool marketplace for browsing and installing browser tools
- GitHub-backed (tools stored as JSON in a GitHub repo, fetched via Octokit)
- Users can submit tools via GitHub OAuth + PR workflow

## Key Patterns

- **Code-based tools**: `async (params, browser) => { ... }` - the `browser` object provides CDP-backed methods
- **Offscreen execution**: Tool code runs in an offscreen document (new Function) since MV3 service workers can't eval
- **Dual transport**: Extension serves tools via TabServerTransport (web app) AND WebSocket (external MCP clients)
- **Tool storage**: `chrome.storage.local` under key `izan_tools`. Side panel and bridge react to changes.
- **Extension build**: Separate Vite entries for content, background, offscreen, and sidepanel

## Browser API Reference (available in tool code)

```typescript
browser.open(url)                    // Open URL in new tab
browser.navigate(url)                // Navigate current tab
browser.click(selector)              // Click element
browser.type(selector, text)         // Type text into element
browser.getText(selector)            // Get element text
browser.getAttribute(selector, attr) // Get attribute value
browser.evaluate(expression)         // Run JS in page context
browser.waitForSelector(selector)    // Wait for element
browser.waitForLoad()                // Wait for page load
browser.wait(ms)                     // Wait N milliseconds
browser.snapshot(selector?)          // Get accessibility tree
browser.scroll(opts?)                // Scroll page/element
browser.close()                      // Close tab
```

## Commit Convention

Prefix commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`, `style:`, `perf:`.
