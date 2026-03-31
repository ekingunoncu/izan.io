<p align="center">
  <img src="thumbnail.png" alt="izan.io" width="280" />
</p>

<h1 align="center">izan.io</h1>
<p align="center">
  <strong>Chrome Extension MCP Server - Gib jeder KI die Macht, einen Browser zu nutzen</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MCP-Protocol-green" alt="MCP" />
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.tr.md">Turkce</a>
</p>

<p align="center">
  <a href="https://izan.io"><strong>izan.io</strong></a> · <a href="https://zihin.io"><strong>Tool Marketplace</strong></a>
</p>

---

## Was ist izan.io?

izan.io ist eine Chrome-Extension, die deinen Browser in einen **MCP-Server** verwandelt. Jeder MCP-Client - Claude Desktop, Cursor, VS Code, Claude Code - kann sich verbinden und deinen Browser uber Tools steuern.

- **Schreibe Tools** in JavaScript mit der `browser`-API (klicken, tippen, navigieren, Daten extrahieren)
- **Installiere Tools** vom [zihin.io](https://zihin.io) Community-Marketplace
- **Deine Sitzungen bleiben privat** - die Extension lauft in deinem authentifizierten Browser

---

## Schnellstart

**1. Chrome Extension installieren** aus dem Chrome Web Store.

**2. In die MCP-Client-Konfiguration einfugen:**

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

**3. Fertig.** Die Extension verbindet sich automatisch. Eingebaute Tools (`web_fetch`, `accessibility_snapshot`) sind sofort einsatzbereit. Offne das Seitenpanel, um eigene Tools zu erstellen oder aus dem Marketplace zu installieren.

---

## Architektur

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
Browser Tab (jede Website)
```

```
izan.io/
├── apps/
│   ├── web/              # Landing Page + Dokumentation (izan.io)
│   └── zihin.io/         # Tool Marketplace (zihin.io)
├── packages/
│   ├── extension/        # Chrome Extension (MCP Server, Seitenpanel, CDP-Automatisierung)
│   └── bridge/           # Bridge CLI (stdio <-> WebSocket)
```

---

## Entwicklung

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run build
```

Lade `packages/extension/dist` als entpackte Extension in Chrome (`chrome://extensions`, Entwicklermodus).

---

## Lizenz

**AGPL-3.0** - Siehe [LICENSE](./LICENSE).
