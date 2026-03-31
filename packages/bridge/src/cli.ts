#!/usr/bin/env node

/**
 * izan-mcp CLI
 *
 * Bridges the izan.io Chrome extension (MCP server) to external MCP clients
 * like Claude Desktop, Cursor, and VS Code.
 *
 * Usage:
 *   npx izan-mcp              # Start with default port 3717
 *   npx izan-mcp --port 4000  # Custom WebSocket port
 *
 * Architecture:
 *   MCP Client (stdio) <-> izan-mcp <-> WebSocket <-> Chrome Extension
 */

import { WSBridge } from './ws-bridge.js'
import { startStdioServer, stopStdioServer } from './stdio-server.js'
import { DEFAULT_WS_PORT } from './protocol.js'
import type { CodeToolDefinition } from './protocol.js'

function parseArgs(): { port: number } {
  const args = process.argv.slice(2)
  let port = DEFAULT_WS_PORT

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10)
      if (isNaN(port) || port < 1 || port > 65535) {
        process.stderr.write(`Invalid port: ${args[i + 1]}\n`)
        process.exit(1)
      }
      i++
    } else if (args[i] === '--help' || args[i] === '-h') {
      process.stderr.write(`
izan-mcp - Browser tools for AI via Chrome extension

Usage: izan-mcp [options]

Options:
  --port <number>  WebSocket port for extension connection (default: ${DEFAULT_WS_PORT})
  --help, -h       Show this help message
  --version, -v    Show version

Setup:
  1. Install the izan.io Chrome extension
  2. Add to Claude Desktop config:
     {
       "mcpServers": {
         "izan-browser": {
           "command": "npx",
           "args": ["izan-mcp"]
         }
       }
     }
  3. The extension auto-connects when the bridge starts
`)
      process.exit(0)
    } else if (args[i] === '--version' || args[i] === '-v') {
      process.stderr.write('izan-mcp v0.1.0\n')
      process.exit(0)
    }
  }

  return { port }
}

async function main(): Promise<void> {
  const { port } = parseArgs()

  process.stderr.write('[izan-mcp] Starting izan.io MCP bridge...\n')

  const bridge = new WSBridge(port)

  // When extension connects and sends tools, start/restart the MCP server
  let currentTools: CodeToolDefinition[] = []

  bridge.setToolsReadyHandler(async (tools) => {
    currentTools = tools
    process.stderr.write(`[izan-mcp] Registering ${tools.length} tool(s) on MCP server\n`)
    try {
      await startStdioServer(tools, bridge)
    } catch (err) {
      process.stderr.write(`[izan-mcp] Failed to start MCP server: ${err}\n`)
    }
  })

  bridge.setConnectionHandler(async (connected) => {
    if (!connected) {
      process.stderr.write('[izan-mcp] Waiting for extension to reconnect...\n')
    }
  })

  // Start WebSocket server
  await bridge.start()

  // Start MCP server with empty tools (will be populated when extension connects)
  await startStdioServer([], bridge)

  // Graceful shutdown
  const shutdown = async () => {
    process.stderr.write('\n[izan-mcp] Shutting down...\n')
    await stopStdioServer()
    await bridge.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  process.stderr.write('[izan-mcp] Ready. Waiting for Chrome extension to connect...\n')
}

main().catch((err) => {
  process.stderr.write(`[izan-mcp] Fatal error: ${err}\n`)
  process.exit(1)
})
