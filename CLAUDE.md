# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

izan.io is an open-source AI assistant platform (AGPL-3.0) that aggregates 17+ LLM providers with MCP (Model Context Protocol) tool support and browser automation (macros). API keys are stored client-side in IndexedDB. The app runs at [izan.io](https://izan.io).

## Commands

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start dev server (Vite, http://localhost:5173)
npm run build        # Build all packages (via Turbo)
npm run lint         # Lint all packages (ESLint, TypeScript)

# Web app specific
npm run lint -w @izan/web         # Lint web app only
npm run typecheck -w @izan/web    # Type-check web app

# Tests
npm run test -w @izan/mcp-browser-servers          # Run MCP browser server tests (vitest)
npm run test:watch -w @izan/mcp-browser-servers     # Watch mode

# Code generation
npm run discover:builtin -w @izan/mcp-client        # Regenerate builtin MCP server registry
# Agent discovery runs via packages/agents/scripts/discover-agents.ts

# Infrastructure
npm run deploy:infra    # Build + deploy AWS CDK stack (S3 + CloudFront)

# Chrome extension
npm run build:extension # Build extension MCP servers
```

## Architecture

**Monorepo**: npm workspaces + Turborepo. All packages under `packages/`, web app under `apps/web/`.

### apps/web/ — React Router v7 + Vite + Tailwind CSS 4

- **Routing** (`app/routes.ts`): Language-prefixed routes (`/:lang/agents`, `/:lang/settings`, `/:lang/docs`) are prerendered. `/chat` routes are client-only with no language prefix. Agent-specific chat via `/chat/:agentSlug`.
- **State** (Zustand, `app/store/`): Key stores are `chat.store` (conversations, message history, tool-calling loop), `agent.store` (agent CRUD, MCP assignments), `mcp.store` (MCP registry, lazy server activation/deactivation per agent), `model.store` (provider/model/API key selection).
- **Database** (`app/lib/db/`): Dexie.js wrapping IndexedDB. Tables: `chats`, `messages`, `agents`, `mcpServers`, `preferences`, `automationTools`, `automationServers`. Schema v4, versioned with migrations.
- **LLM Service** (`app/lib/services/llm.service.ts`): Direct browser→provider API calls. Supports streaming + tool calling. Special Responses API path for OpenAI o1/o3/o4/gpt-5 models.
- **i18n** (`app/i18n/`): i18next with 3 locales (`en`, `tr`, `de`). Namespaces: `common`, `models`, `legal`. When adding UI strings, update all 3 locale files.
- **LLM Providers** (`app/lib/llm-providers.ts`): Provider definitions with model lists, pricing, and capability flags (`supportsTools`, `supportsVision`, `canReason`).
- **Documentation** (`app/docs/`): GitBook-style docs system. `manifest.ts` defines slugs/categories, `loader.ts` has static `?raw` Vite imports for 21 markdown files (7 docs × 3 locales). Routes: `docs-layout.tsx` (sidebar), `docs-index.tsx` (landing), `docs-page.tsx` (renders markdown via `react-markdown` + `remark-gfm`). Prose styling via `.docs-content` class in `index.css`.
- **Dev proxy** (`vite.config.ts`): Local MCP proxy middleware intercepts `/api/proxy/mcp` in dev mode, bypassing CORS. Production uses the Lambda proxy.

### packages/agent-core/ — LLM-agnostic agent types + tool executor

- `AgentDefinition`, `ToolCall`, `ToolResult`, `ChatMessage` types
- `ToolExecutor`: Executes MCP tools via registry with retry + exponential backoff

### packages/agents/ — Built-in agent definitions

- Each agent is a directory with `definition.ts` exporting `AgentDefinition` + optional `implicitMCPIds`
- Auto-discovery script generates `src/generated.ts` with `BUILTIN_AGENT_DEFINITIONS` and `IMPLICIT_AGENT_SERVERS` maps
- Current agents: `general` (general MCP), `domain-expert` (domain-check MCP)

### packages/mcp-client/ — MCP protocol client + server registry

- `MCPServerRegistry`: Manages connections to multiple MCP servers, tool discovery, tool execution
- `IzanMCPClient`: Single server connection via JSON-RPC
- Server sources: `builtin` (browser), `user` (custom URLs), `extension` (Chrome extension)
- `builtin-servers.generated.ts`: Auto-generated from `discover-builtin-servers.ts` script

### packages/mcp-browser-servers/ — In-browser MCP servers

- Run entirely client-side using `@mcp-b/transports` TabServerTransport (postMessage-based)
- Servers: `general` (time, uuid, calc, password), `domain-check` (RDAP/DoH)
- Tests use vitest

### packages/mcp-extension-servers/ — Chrome extension MCP servers

- Background service worker (`background.ts`), content scripts (`content.ts`), side panel UI
- **Macros / Browser Automation**: Records browser interactions (clicks, typing, scrolls, navigation) → generates MCP tool definitions as JSON. Supports parallel lanes (tabbed execution), parameterized URLs, element picking for data extraction. Recordings stored in IndexedDB (`automationTools`, `automationServers` tables).
- **Automation runner** (`automation-runner.ts`): Replays recorded macros via Chrome DevTools Protocol (CDP) commands dispatched through the background service worker.
- **Dynamic MCP server** (`dynamic-server.ts`): Exposes recorded macros as callable MCP tools at runtime.
- **Tool definitions** (`tool-definitions/`): JSON-based tool definitions with `manifest.json` registry. Can be served from S3/CloudFront for built-in tools.
- Communication: Extension ↔ web app via `window.postMessage` with `izan:*` protocol events
- Separate Vite configs for background, recorder inject, and side panel builds

### packages/proxy-mcp-server/ — AWS Lambda MCP proxy

- CORS bypass for user-added custom MCP servers
- Browser → CloudFront → Lambda → external MCP server
- Target URL passed via `X-MCP-Proxy-Target` header (base64 JSON)

### packages/infra/ — AWS CDK stack

- S3 + CloudFront for static hosting, API Gateway + Lambda for `/api/proxy/mcp` and `/api/github-stars`
- Custom domain via `IZAN_DOMAIN_CERTIFICATE_ARN` env var

## Key Patterns

- **Tool-calling loop**: Chat store runs up to 5 LLM↔tool rounds per message. Tools come from MCP servers + linked agents.
- **Multi-agent orchestration**: Agents can link other agents as callable tools (`ask_agent_{id}`). Max depth: 3 levels.
- **Lazy MCP activation**: Only MCPs needed by the current agent are connected. Switching agents disconnects unused servers.
- **MCP proxy fallback**: Custom MCP servers first try direct connection; on CORS failure, fall back to Lambda proxy. In dev mode, a local Vite middleware handles the proxy instead of Lambda.
- **Macros as MCP tools**: Recorded browser automations are stored as JSON tool definitions and exposed as MCP tools via the extension's dynamic server. Agents can invoke macros like any other tool.
- **Adding a new MCP server**: Create directory under `mcp-browser-servers/` with `config.json`, `index.ts`, `tools.ts`, then run `npm run discover:builtin -w @izan/mcp-client`.
- **Adding a new LLM provider**: Add config in `apps/web/app/lib/providers/index.ts`, endpoint in `llm-providers.ts`, and i18n translations in all 3 locale files.
- **Adding documentation**: Add markdown files in `app/docs/{en,tr,de}/`, add entry to `app/docs/manifest.ts`, add static import to `app/docs/loader.ts`, add i18n title key to all 3 locale files. Also update inlined `DOC_SLUGS` in `react-router.config.ts` and `scripts/generate-seo.ts`.

## Commit Convention

Prefix commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`, `style:`, `perf:`.
