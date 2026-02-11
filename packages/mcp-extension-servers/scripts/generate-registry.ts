// Generate Extension Server Registry
//
// Reads automation servers from tool-definitions/manifest.json and outputs
// the registry manifest + tool definition JSONs into the web app's public/
// directory so they are served by Vite in dev and included in the production build.
//
// Output:
//   apps/web/public/mcp-extension-servers/manifest.json
//   apps/web/public/mcp-tools/manifest.json
//   apps/web/public/mcp-tools/tools/**/*.json
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')
const TOOL_DEFS_DIR = join(PKG_ROOT, 'tool-definitions')
const TOOL_DEFS_MANIFEST = join(TOOL_DEFS_DIR, 'manifest.json')

const WEB_PUBLIC = join(PKG_ROOT, '..', '..', 'apps', 'web', 'public')
const REGISTRY_OUT_DIR = join(WEB_PUBLIC, 'mcp-extension-servers')
const TOOLS_OUT_DIR = join(WEB_PUBLIC, 'mcp-tools')

interface RegistryServer {
  id: string
  name: string
  description: string
  category: string
  type: 'automation'
  tools: string[]
}

// ─── Automation servers (tool-definitions/manifest.json) ─────────────────────

const servers: RegistryServer[] = []

if (existsSync(TOOL_DEFS_MANIFEST)) {
  const manifest = JSON.parse(readFileSync(TOOL_DEFS_MANIFEST, 'utf-8')) as {
    servers: { id: string; name: string; description: string; category: string; tools: string[] }[]
  }
  for (const server of manifest.servers) {
    servers.push({
      id: server.id,
      name: server.name,
      description: server.description ?? '',
      category: server.category ?? 'general',
      type: 'automation',
      tools: server.tools ?? [],
    })
  }
}

// ─── Output: Extension registry manifest ────────────────────────────────────

const registry = {
  version: '1.0.0',
  servers,
}

mkdirSync(REGISTRY_OUT_DIR, { recursive: true })
const registryOutFile = join(REGISTRY_OUT_DIR, 'manifest.json')
writeFileSync(registryOutFile, JSON.stringify(registry, null, 2) + '\n', 'utf-8')

console.log(
  `[generate-registry] Wrote ${registryOutFile} (${servers.length} automation server(s))`,
)

// ─── Output: Tool definitions ───────────────────────────────────────────────

if (existsSync(TOOL_DEFS_DIR)) {
  mkdirSync(TOOLS_OUT_DIR, { recursive: true })

  // Copy manifest.json
  const toolsManifestSrc = join(TOOL_DEFS_DIR, 'manifest.json')
  if (existsSync(toolsManifestSrc)) {
    writeFileSync(join(TOOLS_OUT_DIR, 'manifest.json'), readFileSync(toolsManifestSrc, 'utf-8'), 'utf-8')
  }

  // Copy tools/ directory
  const toolsSrcDir = join(TOOL_DEFS_DIR, 'tools')
  if (existsSync(toolsSrcDir)) {
    cpSync(toolsSrcDir, join(TOOLS_OUT_DIR, 'tools'), { recursive: true })
  }

  console.log(`[generate-registry] Copied tool definitions to ${TOOLS_OUT_DIR}`)
}
