<p align="center">
  <img src="thumbnail.png" alt="izan.io" width="280" />
</p>

<h1 align="center">izan.io</h1>
<p align="center">
  <strong>Chrome Extension MCP Server - Give Any AI the Power to Use a Browser</strong>
</p>

<p align="center">
  <a href="https://github.com/ekingunoncu/izan.io/stargazers">
    <img src="https://img.shields.io/github/stars/ekingunoncu/izan.io?style=social&label=Star" alt="GitHub stars" />
  </a>
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MCP-Protocol-green" alt="MCP" />
</p>

<p align="center">
  <a href="README.tr.md">Turkce</a> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://izan.io"><strong>izan.io</strong></a> · <a href="https://zihin.io"><strong>Tool Marketplace</strong></a>
</p>

---

## What is izan.io?

izan.io is a Chrome extension that turns your browser into an **MCP server**. Any MCP client - Claude Desktop, Cursor, VS Code, Claude Code - can connect and control your browser through tools.

- **Write tools** in JavaScript using the `browser` API (click, type, navigate, extract data)
- **Install tools** from the [zihin.io](https://zihin.io) community marketplace
- **Your sessions stay yours** - the extension runs inside your authenticated browser, no cookie hacks needed

---

## Quick Start

**1. Install the Chrome Extension** from the Chrome Web Store.

**2. Add to your MCP client config:**

```json
{
  "mcpServers": {
    "izan": {
      "command": "npx",
      "args": ["izan-mcp"]
    }
  }
}
```

Works with Claude Desktop, Cursor, VS Code, Claude Code, and any MCP client that supports stdio.

**3. Done.** The extension connects automatically. Built-in tools (`web_fetch`, `accessibility_snapshot`) are ready to use. Open the side panel to create your own tools or install from the marketplace.

---

## Architecture

```
MCP Client (Claude Desktop, Cursor, VS Code)
  | stdio (JSON-RPC)
  v
packages/bridge/  (izan-mcp CLI)
  | WebSocket (localhost:3717)
  v
Chrome Extension (packages/extension/)
  | CDP (chrome.debugger)
  v
Browser Tab (any website)
```

```
izan.io/
├── apps/
│   ├── web/              # Landing page + docs (izan.io)
│   └── zihin.io/         # Tool marketplace (zihin.io)
├── packages/
│   ├── extension/        # Chrome extension (MCP server, side panel, CDP automation)
│   └── bridge/           # Bridge CLI (stdio <-> WebSocket)
```

---

## Writing Tools

Tools are JavaScript async functions with a `browser` API:

```javascript
async (params, browser) => {
  await browser.open(`https://example.com/search?q=${params.query}`)
  await browser.waitForSelector('.result')
  const title = await browser.getText('.result:first-child .title')
  await browser.close()
  return { title }
}
```

Create tools in the extension side panel or submit to the [zihin.io marketplace](https://zihin.io).

---

## Development

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run build
```

Load `packages/extension/dist` as an unpacked extension in Chrome (`chrome://extensions`, developer mode).

---

## License

**AGPL-3.0** - See [LICENSE](./LICENSE).

---

<p align="center">
  <strong>izan.io</strong> - Give any AI the power to use a browser
</p>
