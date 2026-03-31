# Chrome Extension

The izan.io Chrome extension runs an MCP server directly in your browser. MCP clients connect to it through the bridge CLI and can invoke tools that interact with web pages.

## What the Extension Does

The extension exposes browser automation capabilities as MCP tools. When an MCP client calls a tool, the extension executes it in the browser context -- navigating pages, clicking elements, extracting data, and returning results.

## Side Panel

Click the izan.io icon in the toolbar to open the side panel. From here you can:

- **Create tools** -- Write new tools with the built-in editor
- **Edit tools** -- Modify existing tool definitions
- **Test tools** -- Run tools manually with test parameters
- **Manage tools** -- Enable, disable, or delete tools

Each tool has a name, description, parameter definitions, and a JavaScript function body.

## Tool Storage

Tools are stored locally in `chrome.storage.local`. They never leave your browser unless you explicitly export or publish them. This means:

- Tools persist across browser restarts
- Tools are tied to your Chrome profile
- Uninstalling the extension removes all tools

## Connection Status

The side panel shows the current connection status:

- **Connected** -- The bridge is running and an MCP client is connected
- **Waiting** -- The extension is ready but no bridge is connected
- **Disconnected** -- The extension cannot communicate with the bridge

If you see "Disconnected", make sure the bridge is running (`npx izan-mcp`) and your MCP client is configured correctly.
