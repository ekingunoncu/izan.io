/**
 * Convention-based discovery of MCP servers.
 * Scans packages/mcp-servers and returns server IDs (excluding 'shared').
 */

import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const MCP_SERVERS_ROOT = join(__dirname, '..', '..', 'mcp-servers')

export function discoverMcpServers(): string[] {
  if (!existsSync(MCP_SERVERS_ROOT)) {
    return []
  }

  const entries = readdirSync(MCP_SERVERS_ROOT, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && e.name !== 'shared')
    .filter((e) =>
      existsSync(join(MCP_SERVERS_ROOT, e.name, 'src', 'index.ts')),
    )
    .map((e) => e.name)
}
