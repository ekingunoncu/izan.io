// Generate Extension Server Registry
//
// Combines static extension servers (servers/[name]/config.json) and
// automation servers (tool-definitions/manifest.json) into a single
// manifest deployed to S3/CloudFront.
//
// Output: built-in-registry/manifest.json
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')
const SERVERS_DIR = join(PKG_ROOT, 'servers')
const TOOL_DEFS_MANIFEST = join(PKG_ROOT, 'tool-definitions', 'manifest.json')
const OUT_DIR = join(PKG_ROOT, 'built-in-registry')
const OUT_FILE = join(OUT_DIR, 'manifest.json')

interface RegistryServer {
  id: string
  name: string
  description: string
  category: string
  type: 'static' | 'automation'
  tools: string[]
}

// ─── Static extension servers (servers/*/config.json) ────────────────────────

const staticServers: RegistryServer[] = []

if (existsSync(SERVERS_DIR)) {
  const entries = readdirSync(SERVERS_DIR, { withFileTypes: true })
  const serverDirs = entries
    .filter((e) => e.isDirectory())
    .filter((e) => existsSync(join(SERVERS_DIR, e.name, 'config.json')))
    .map((e) => e.name)
    .sort()

  for (const dir of serverDirs) {
    const configPath = join(SERVERS_DIR, dir, 'config.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      id: string
      name: string
      description: string
      category: string
      tools?: string[]
    }
    if (config.id && config.name) {
      staticServers.push({
        id: config.id,
        name: config.name,
        description: config.description ?? '',
        category: config.category ?? 'general',
        type: 'static',
        tools: config.tools ?? [],
      })
    }
  }
}

// ─── Automation servers (tool-definitions/manifest.json) ─────────────────────

const automationServers: RegistryServer[] = []

if (existsSync(TOOL_DEFS_MANIFEST)) {
  const manifest = JSON.parse(readFileSync(TOOL_DEFS_MANIFEST, 'utf-8')) as {
    servers: { id: string; name: string; description: string; category: string; tools: string[] }[]
  }
  for (const server of manifest.servers) {
    automationServers.push({
      id: server.id,
      name: server.name,
      description: server.description ?? '',
      category: server.category ?? 'general',
      type: 'automation',
      tools: server.tools ?? [],
    })
  }
}

// ─── Output ──────────────────────────────────────────────────────────────────

const registry = {
  version: '1.0.0',
  servers: [...staticServers, ...automationServers],
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(registry, null, 2) + '\n', 'utf-8')

console.log(
  `[generate-registry] Wrote ${OUT_FILE} (${staticServers.length} static + ${automationServers.length} automation)`,
)
