<p align="center">
  <img src="thumbnail.png" alt="izan.io" width="280" />
</p>

<h1 align="center">izan.io</h1>
<p align="center">
  <strong>Open-Source AI Assistant — 17+ Providers, MCP Tools, Browser Automation</strong>
</p>

<p align="center">
  <a href="https://github.com/ekingunoncu/izan.io/stargazers">
    <img src="https://img.shields.io/github/stars/ekingunoncu/izan.io?style=social&label=Star" alt="GitHub stars" />
  </a>
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/MCP-Protocol-green" alt="MCP" />
</p>

<p align="center">
  <a href="README.tr.md">Turkce</a> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://izan.io"><strong>Try it live → izan.io</strong></a>
</p>

<br />

<p align="center">
  <a href="https://www.youtube.com/watch?v=jyZmNIUs-oE">
    <img src="https://img.youtube.com/vi/jyZmNIUs-oE/maxresdefault.jpg" alt="izan.io demo" width="720" />
  </a>
</p>

---

## Why izan.io?

- **Zero setup** — Open the browser, paste your API key, start chatting. No backend to deploy, no Docker, no config files.
- **Privacy-first** — API keys and conversations never leave your browser. Everything is stored in IndexedDB, client-side only.
- **No-code automation** — Record browser actions, turn them into MCP tools, and let agents run them. Build workflows without writing a single line of code.

---

## ⚡ What is this?

**izan.io** is an open-source AI assistant platform that brings all AI models into one place while keeping your privacy first. Use your own API keys and your own data.

> **Copyleft:** This project is licensed under [AGPL-3.0](./LICENSE). If you fork, modify, or create derivative works, **you must make your code open source too**. Derivatives offered over a network must make their source code available. See [LICENSE](./LICENSE) for details.

---

## ✨ Highlights

| Feature | Description |
|---------|-------------|
| **Privacy** | API keys stored only in your browser. Never sent to our servers. |
| **Multi-Provider** | 17+ AI providers supported (see below). |
| **Smart Agents** | MCP-connected agents - web search, code, and more. |
| **Multi-Agent Orchestration** | Chain agents together - one agent's output becomes another's input. Up to 3 levels deep. |
| **MCP** | Built-in and custom MCP servers. |
| **Action Recorder** | Record browser actions, extract data via CSS or accessibility tree, and save as MCP tools; no coding required (see [docs/visual-mcp-tool-builder.md](docs/visual-mcp-tool-builder.md)). |
| **Long Running Tasks** | Agents work in the background on complex research and multi-step workflows. Get notified when results are ready. |
| **Scheduled Automations** | Run agent tasks on a schedule - price tracking, data collection, and recurring workflows on autopilot. |

---

## 🔌 Supported Providers

**OpenAI** · **Google** (Gemini) · **Groq** · **Mistral** · **xAI** (Grok) · **DeepSeek** · **Qwen** (DashScope) · **Together AI** · **Fireworks AI** · **Perplexity** · **Cerebras** · **Deep Infra** · **Cohere** · **Moonshot AI** (Kimi) · **MiniMax** · **OpenRouter** (hundreds of models) · **Ollama** (local) · **Custom** (OpenAI-compatible endpoints)

---

## 🚀 Quick Start

**Requirements:** Node.js 18+, npm 10+

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run dev
```

Open `http://localhost:5173`. Add a provider and API key in settings, then start chatting.

See `apps/web/.env.example` for optional env vars. API keys are stored in the browser.

---

## 🏗️ Architecture

```
izan.io/
├── apps/web/                    # React + Vite web app
├── packages/
│   ├── agent-core/             # Agent routing, tool execution, LLM-agnostic
│   ├── mcp-client/              # MCP protocol client
│   ├── mcp-browser-servers/     # Browser MCP servers (TabServerTransport)
│   │   ├── crypto-analysis/     # CoinGecko, technical indicators
│   │   ├── domain-check/       # RDAP + DoH domain availability
│   │   └── general/            # get_time, random_number, uuid, calculate, generate_password
│   ├── mcp-extension-servers/   # Chrome extension: side panel recorder, dynamic MCP, CDP automation
│   └── infra/                   # CDK infra (S3/CloudFront, incl. /mcp-tools/)
```

**Action recorder:** The extension (`mcp-extension-servers`) provides a side panel to record clicks, typing, and scrolls; parameterize URL/path segments; and extract data via CSS selectors or the accessibility tree (ARIA roles, full-page snapshot). The element picker works with or without an active recording. Recordings become MCP tool definitions (stored as JSON in IndexedDB or loaded from S3). A built-in `accessibility_snapshot` tool is always available to agents. See [docs/visual-mcp-tool-builder.md](docs/visual-mcp-tool-builder.md).

---

## 📦 MCP Servers

| Type | Package | Description |
|------|---------|-------------|
| **Browser** | `mcp-browser-servers/` | crypto-analysis (CoinGecko, indicators), domain-check (RDAP/DoH), general (time, uuid, calc, password). TabServerTransport, client-side. |
| **Extension** | `mcp-extension-servers/` | Chrome extension: side panel (React + shadcn), action recorder, element picker (CSS + accessibility), dynamic MCP server, built-in `accessibility_snapshot` tool. User-recorded tools stored as JSON. |

**Recording MCP tools:** Install the extension, open the side panel, click **Record**; the action recorder captures clicks, typing, scrolls and URL params. Use **List** / **Single** to pick extraction targets via CSS, or **A11y** to extract by ARIA roles or full-page accessibility tree. **Done** sends the flow to the web app; save as an MCP tool in Settings. Built-in tool definitions (JSON) can be served from S3/CloudFront.

---

## 🌐 Deploy

Deploy via `npm run deploy:infra` or GitHub Actions (push to `main`). The stack uses S3 + CloudFront.

**Custom domain (izan.io, www.izan.io):** Set `IZAN_DOMAIN_CERTIFICATE_ARN` to an ACM cert in **us-east-1** for those domains. CloudFront adds them to its domain list. DNS (A/CNAME records) is managed manually.

---

## 🛠️ Tech Stack

React 19 · React Router 7 · Vite 7 · Tailwind CSS 4 · Zustand · IndexedDB (Dexie) · react-i18next · npm workspaces + Turbo

---

## 🤝 Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork → create branch → commit → push → open PR
2. By contributing, you agree to AGPL-3.0.

---

## 📜 License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- Use, modify, distribute
- Derivatives must be AGPL-3.0
- Network-hosted derivatives must offer source

See [LICENSE](./LICENSE).

---

<p align="center">
  <strong>izan.io</strong> — Wisdom · Understanding · Intellect
</p>
<p align="center">
  <sub>If izan.io is useful to you, consider giving it a ⭐</sub>
</p>
