# Getting Started

izan.io is a Chrome extension that turns your browser into an MCP server. External MCP clients like Claude Desktop, Cursor, and VS Code connect through a bridge CLI and can call tools that automate the browser.

## 1. Install the Chrome Extension

Install the izan.io extension from the [Chrome Web Store](https://chromewebstore.google.com). Once installed, you will see the izan.io icon in your browser toolbar.

## 2. Install the Bridge

The bridge (`izan-mcp`) connects MCP clients to the Chrome extension. Run:

```bash
npx izan-mcp
```

This starts a local WebSocket server that relays messages between your MCP client and the extension.

## 3. Configure Your MCP Client

Add izan.io to your MCP client configuration. For Claude Desktop, edit `claude_desktop_config.json`:

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

Restart your MCP client after saving.

## 4. Try a Built-in Tool

Open your MCP client and try one of the built-in tools:

- **web_fetch** -- Fetches the content of a URL
- **accessibility_snapshot** -- Returns the accessibility tree of the current page

Example prompt: *"Use web_fetch to get the content of https://example.com"*

The extension will execute the request in the browser and return the result to your MCP client.

## Next Steps

- [Chrome Extension](/docs/chrome-extension) -- Learn about the extension side panel and tool management
- [Tools](/docs/tools) -- Create custom tools with the browser API
- [Bridge](/docs/bridge) -- Configure the bridge for different MCP clients
- [Marketplace](/docs/marketplace) -- Browse and install community tools
