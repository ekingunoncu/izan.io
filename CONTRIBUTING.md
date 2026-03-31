# Contributing to izan.io

Thank you for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run build
```

### Project Structure

```
izan.io/
├── apps/
│   ├── web/              # Landing page + docs (izan.io)
│   └── zihin.io/         # Tool marketplace (zihin.io)
├── packages/
│   ├── extension/        # Chrome extension (MCP server, side panel, CDP)
│   └── bridge/           # Bridge CLI (stdio <-> WebSocket)
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Name your branch: `feat/add-x`, `fix/issue-123`, `docs/update-readme`
3. Keep PRs focused and small
4. Test locally
5. Push and open a Pull Request

## Commit Convention

```
feat: add new browser API method
fix: resolve CDP connection timeout
docs: update getting started guide
refactor: simplify tool executor
chore: update dependencies
```

Prefix with: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`.

## License

By contributing, you agree that your contributions will be licensed under [AGPL-3.0](./LICENSE).
