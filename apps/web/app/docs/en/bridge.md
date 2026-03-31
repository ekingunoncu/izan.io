# Bridge

The bridge (`izan-mcp`) is a CLI tool that connects MCP clients to the izan.io Chrome extension. It translates between the stdio-based MCP protocol and WebSocket messages.

## How It Works

The bridge runs two communication channels simultaneously:

1. **stdio** -- Reads MCP requests from the client and writes responses back
2. **WebSocket** -- Connects to the Chrome extension to relay tool calls

When an MCP client sends a tool call, the bridge forwards it to the extension via WebSocket. The extension executes the tool in the browser and returns the result through the same path.

## Installation and Usage

```bash
npx izan-mcp
```

Or install globally:

```bash
npm install -g izan-mcp
izan-mcp
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | WebSocket server port | `3717` |

## MCP Client Configuration

### Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "izan": {
      "command": "npx",
      "args": ["izan-mcp"]
    }
  }
}
```

### Cursor

In Cursor settings, add a new MCP server:

- **Name**: izan
- **Command**: `npx izan-mcp`

### VS Code

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "izan": {
      "command": "npx",
      "args": ["izan-mcp"]
    }
  }
}
```

### Other Clients

Any MCP client that supports stdio transport can use the bridge. Set the command to `npx izan-mcp` and the bridge will handle the rest.

## Troubleshooting

- **Bridge starts but client cannot connect**: Make sure the MCP client is configured to use `npx izan-mcp` as the command, not a URL.
- **Extension shows "Waiting"**: The bridge may not be running. Run `npx izan-mcp` in a terminal.
- **Port conflict**: If port 3717 is in use, specify a different port with `--port 3800`.
