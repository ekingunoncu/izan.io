# API Keys and Privacy

## Privacy-First Design

izan.io is built around a simple principle: **your data stays in your browser**. There is no account system, no backend database storing your information, and no sign-up required.

## API Key Storage

Your API keys are stored in the browser's **IndexedDB**, a local database built into every modern browser. Keys are:

- **Never sent to izan.io servers** -- they exist only on your device
- **Never logged or transmitted** to any backend
- **Accessible only to the izan.io tab** in your browser

You can delete your keys at any time from the Settings page.

## Direct Provider Calls

When you send a message, your browser makes **direct API calls to the LLM provider** (OpenAI, Anthropic, Google, etc.). There is no middleman -- the request goes straight from your browser to the provider's API endpoint. izan.io's servers are never in the path of your conversations.

## Local Conversation Storage

All conversations and messages are stored in **IndexedDB** alongside your keys. Nothing is uploaded to a remote server. Clearing your browser data will remove your conversations.

## Open Source Transparency

izan.io is licensed under **AGPL-3.0** and the full source code is publicly available. You can audit exactly how API keys are handled, how data is stored, and what network requests are made.

## MCP Proxy

The only server-side component is the **MCP proxy**, used exclusively for **CORS bypass** when connecting to custom MCP servers. The proxy:

- Forwards only MCP protocol traffic to the target server
- **Does not see your API keys** -- those go directly to LLM providers
- **Does not see your conversation content** -- only MCP tool requests and responses pass through it
