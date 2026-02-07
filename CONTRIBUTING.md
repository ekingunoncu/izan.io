# Contributing to izan.io

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

By participating, you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run dev
```

The web app runs at `http://localhost:5173`. MCP dev server runs at `http://localhost:3100`.

### Project Structure

```
izan.io/
├── apps/web/           # React + Vite web app
├── packages/
│   ├── agent-core/     # Agent routing, tool execution
│   ├── mcp-client/     # MCP protocol client
│   ├── mcp-servers/    # Built-in MCP servers (Bing, Google, Namecheap, etc.)
│   └── infra/          # AWS CDK infrastructure
```

## How to Contribute

### Reporting Bugs

Use the [bug report template](https://github.com/ekingunoncu/izan.io/issues/new?template=bug_report.md) on GitHub Issues.

### Requesting Features

Use the [feature request template](https://github.com/ekingunoncu/izan.io/issues/new?template=feature_request.md) on GitHub Issues.

### Pull Requests

1. **Fork** the repo and create a branch from `main`
2. **Name your branch** descriptively: `feature/add-x`, `fix/issue-123`, `docs/update-readme`
3. **Make your changes** - keep PRs focused and small
4. **Test** your changes locally
5. **Push** and open a Pull Request

### Commit Convention

Use clear, descriptive commit messages:

```
feat: add Anthropic provider support
fix: resolve dark mode flash on refresh
docs: update contributing guide
refactor: simplify tool-calling loop
chore: update dependencies
```

Prefix with: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`.

## Code Style

- **TypeScript** with strict mode
- **ESLint** for linting (`npm run lint`)
- **Tailwind CSS** for styling
- Use meaningful variable and function names
- Keep files focused and reasonably sized

## Running Tests

```bash
# MCP server integration tests
npm run test:mcp

# With API keys loaded from .env
npm run test:mcp:integration

# Lint all packages
npm run lint
```

## Adding a New MCP Server

1. Create a new directory under `packages/mcp-servers/your-server/`
2. Add `package.json`, `tsconfig.json`, and `src/index.ts`
3. Define tools in `src/tools.ts` using the shared `ToolDef` type
4. Export a handler via `createHandler()` from `@izan/mcp-servers-shared`
5. The CDK stack auto-discovers servers - no infra changes needed

## Adding a New LLM Provider

1. Add provider config in `apps/web/app/lib/providers/index.ts`
2. Add endpoint in `apps/web/app/lib/llm-providers.ts` if needed
3. Add i18n translations in all 3 locale files (`en`, `tr`, `de`)

## License

By contributing, you agree that your contributions will be licensed under [AGPL-3.0](./LICENSE).

This means:
- Your contributions remain open source
- Derivative works must also be open source
- Network-hosted derivatives must provide source code access
