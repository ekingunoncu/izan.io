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
  <strong>Lokaler KI-Assistent - Open Source, Transparent, Frei</strong>
</p>
<p align="center">
  <em>Weisheit • Verständnis • Intellekt</em>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.tr.md">Türkçe</a>
</p>
<p align="center">
  <a href="https://izan.io">🌐 Live ausprobieren → izan.io</a>
</p>

---

## ⚡ Was ist das?

**izan.io** ist eine Open-Source-KI-Assistenten-Plattform, die alle KI-Modelle an einem Ort vereint und deine Privatsphäre priorisiert. Nutze deine eigenen API-Keys und deine eigenen Daten.

> 🚨 **Copyleft:** Dieses Projekt steht unter [AGPL-3.0](./LICENSE). Beim Forken, Ändern oder Ableiten **musst du deinen Code ebenfalls Open Source machen**. Netzwerk-weit bereitgestellte Ableitungen müssen den Quellcode bereitstellen. Details: [LICENSE](./LICENSE)

---

## ✨ Highlights

| Feature | Beschreibung |
|---------|--------------|
| 🔐 **Privatsphäre** | API-Keys nur im Browser. Nie an unsere Server gesendet. |
| 🧠 **Multi-Provider** | 17+ KI-Provider unterstützt (siehe unten). |
| 🤖 **Smarte Agents** | MCP-vernetzte Agents - Websuche, Code, und mehr. |
| 🌐 **MCP** | Integrierte und eigene MCP-Server. |
| 🎬 **Aktions-Recorder** | Browser-Aktionen im Extension-Seitenpanel aufzeichnen und als MCP-Tools speichern; kein Code nötig ([docs/visual-mcp-tool-builder.md](docs/visual-mcp-tool-builder.md)). |

---

## 🔌 Unterstützte Provider

**OpenAI** · **Google** (Gemini) · **Groq** · **Mistral** · **xAI** (Grok) · **DeepSeek** · **Qwen** (DashScope) · **Together AI** · **Fireworks AI** · **Perplexity** · **Cerebras** · **Deep Infra** · **Cohere** · **Moonshot AI** (Kimi) · **MiniMax** · **OpenRouter** (Hunderte Modelle) · **Ollama** (lokal) · **Custom** (OpenAI-kompatible Endpoints)

---

## 🏗️ Architektur

```
izan.io/
├── apps/web/                    # React + Vite Web-App
├── packages/
│   ├── agent-core/             # Agent-Routing, Tool-Ausführung, LLM-agnostisch
│   ├── mcp-client/              # MCP-Protokoll-Client
│   ├── mcp-browser-servers/     # Browser-MCP-Server (TabServerTransport)
│   │   ├── crypto-analysis/     # CoinGecko, technische Indikatoren
│   │   ├── domain-check/       # RDAP + DoH Domain-Verfügbarkeit
│   │   └── general/            # get_time, random_number, uuid, calculate, generate_password
│   ├── mcp-extension-servers/   # Chrome-Extension: Seitenpanel-Recorder, dynamischer MCP, CDP-Automatisierung
│   └── infra/                   # CDK-Infra (S3/CloudFront, inkl. /mcp-tools/)
```

**Aktions-Recorder:** Die Extension (`mcp-extension-servers`) bietet ein Seitenpanel zum Aufzeichnen von Klicks, Tippen und Scrollen; URL-Parameter parametrisieren; Daten von Seiten extrahieren. Aufzeichnungen werden zu MCP-Tool-Definitionen (als JSON in IndexedDB oder von S3). Siehe [docs/visual-mcp-tool-builder.md](docs/visual-mcp-tool-builder.md).

---

## 🚀 Schnellstart

**Voraussetzungen:** Node.js 18+, npm 10+

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run dev
```

Öffne `http://localhost:5173`. In den Einstellungen Provider und API-Key hinzufügen, dann chatten.

Siehe `apps/web/.env.example` für optionale Umgebungsvariablen. API-Keys werden im Browser gespeichert.

---

## 📦 MCP-Server

| Typ | Paket | Beschreibung |
|-----|-------|--------------|
| **Browser** | `mcp-browser-servers/` | crypto-analysis, domain-check (RDAP/DoH), general. TabServerTransport, clientseitig. |
| **Extension** | `mcp-extension-servers/` | Chrome-Extension: Seitenpanel (React + shadcn), Aktions-Recorder, Element-Picker, dynamischer MCP-Server. Vordefinierte Tools + vom Nutzer aufgezeichnete Tools (als JSON gespeichert). |

**MCP aufzeichnen:** Extension installieren, Seitenpanel öffnen, **Aufzeichnen** klicken; der Aktions-Recorder erfasst Klicks, Tippen, Scroll und URL-Parameter. **Liste** / **Einzeln** für Extraktionsziele. **Fertig** sendet den Ablauf an die Web-App; in den Einstellungen als MCP-Tool speichern.

---

## 🌐 Deploy

Deployment per `npm run deploy:infra` oder GitHub Actions (Push auf `main`). Stack nutzt S3 + CloudFront.

**Eigene Domain (izan.io, www.izan.io):** `IZAN_DOMAIN_CERTIFICATE_ARN` auf ein ACM-Zertifikat in **us-east-1** setzen. DNS (A/CNAME) manuell verwalten.

---

## 🛠️ Tech-Stack

React 19 · React Router 7 · Vite 7 · Tailwind CSS 4 · Zustand · IndexedDB (Dexie) · react-i18next · npm workspaces + Turbo

---

## 🤝 Beitragen

PRs willkommen. Siehe [CONTRIBUTING.md](./CONTRIBUTING.md) für Richtlinien.

1. Fork → Branch → Commit → Push → PR
2. Mit Beiträgen stimmst du AGPL-3.0 zu.

---

## 📜 Lizenz

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- ✅ Verwenden, Ändern, Verteilen
- ⚠️ Ableitungen müssen unter AGPL-3.0 stehen
- ⚠️ Netzwerk-gehostete Ableitungen müssen Quellcode bereitstellen

Siehe [LICENSE](./LICENSE).

---

<p align="center">
  <strong>izan.io</strong> - Wisdom • Understanding • Intellect
</p>
<p align="center">
  <sub>Fork it, build it, share it.</sub>
</p>
