<p align="center">
  <img src="thumbnail.png" alt="izan.io" width="280" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/MCP-Protocol-green" alt="MCP" />
</p>

<h1 align="center">izan.io</h1>
<p align="center">
  <strong>Local AI Assistant - Open Source, Transparent, Free</strong>
</p>
<p align="center">
  <em>Wisdom • Understanding • Intellect</em>
</p>

<p align="center">
  <a href="README.tr.md">Türkçe</a> · <a href="README.de.md">Deutsch</a>
</p>
<p align="center">
  <a href="https://izan.io">🌐 Try it live → izan.io</a>
</p>

---

## ⚡ What is this?

**izan.io** is an open-source AI assistant platform that brings all AI models into one place while keeping your privacy first. Use your own API keys and your own data.

> 🚨 **Copyleft:** This project is licensed under [AGPL-3.0](./LICENSE). If you fork, modify, or create derivative works, **you must make your code open source too**. Derivatives offered over a network must make their source code available. See [LICENSE](./LICENSE) for details.

---

## ✨ Highlights

| Feature | Description |
|---------|-------------|
| 🔐 **Privacy** | API keys stored only in your browser. Never sent to our servers. |
| 🧠 **Multi-Provider** | 17+ AI providers supported (see below). |
| 🤖 **Smart Agents** | MCP-connected agents - web search, code, and more. |
| 🌐 **MCP** | Built-in and custom MCP servers. |

---

## 🔌 Supported Providers

**OpenAI** · **Google** (Gemini) · **Groq** · **Mistral** · **xAI** (Grok) · **DeepSeek** · **Qwen** (DashScope) · **Together AI** · **Fireworks AI** · **Perplexity** · **Cerebras** · **Deep Infra** · **Cohere** · **Moonshot AI** (Kimi) · **MiniMax** · **OpenRouter** (hundreds of models) · **Ollama** (local) · **Custom** (OpenAI-compatible endpoints)

---

## 🏗️ Architecture

```
izan.io/
├── apps/web/           # React + Vite web app
├── packages/
│   ├── agent-core/     # Agent routing, tool execution, LLM-agnostic
│   ├── mcp-client/     # MCP protocol client
│   ├── mcp-servers/    # Google, Bing, Namecheap, etc.
│   └── infra/          # CDK infra
```

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

- ✅ Use, modify, distribute
- ⚠️ Derivatives must be AGPL-3.0
- ⚠️ Network-hosted derivatives must offer source

See [LICENSE](./LICENSE).

---

<p align="center">
  <strong>izan.io</strong> - Wisdom • Understanding • Intellect
</p>
<p align="center">
  <sub>Fork it, build it, share it.</sub>
</p>
