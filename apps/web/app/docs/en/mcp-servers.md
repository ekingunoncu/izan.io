# MCP Servers

## What is MCP?

**Model Context Protocol (MCP)** is a standard protocol for giving AI models access to tools. Instead of hard-coding capabilities into an LLM, MCP lets you connect external tool servers that the model can call during a conversation. izan.io uses MCP as its primary tool system.

## Built-in Servers

These servers **run entirely in your browser** with no external dependencies:

- **General** -- time/date queries, calculator, password generator, UUID generator
- **Domain Check** -- domain availability lookups via RDAP and DNS-over-HTTPS

Built-in servers are automatically available and require no setup.

## Adding Custom MCP Servers

You can connect any MCP-compatible server:

1. Go to **Settings** and scroll to **Custom MCP Servers**
2. Click **Add** and enter the server's URL
3. izan.io will connect and discover the server's available tools
4. Assign the server to one or more agents

This makes izan.io a great environment for **MCP developers testing their own servers** -- connect your local or deployed server and interact with its tools through a full chat interface.

## CORS Handling

Browser security restrictions (CORS) can block direct connections to external MCP servers. izan.io handles this automatically:

- First attempts a **direct browser-to-server connection**
- If CORS blocks the request, it **retries through the MCP proxy** (an AWS Lambda relay)
- The proxy only forwards the MCP protocol traffic -- it **never sees your API keys or conversation data**

## Assigning Servers to Agents

You can assign MCP servers to agents in two ways:

- From the **agent edit panel**, select which servers the agent should have access to
- From **Settings**, manage server assignments across all agents

Only servers assigned to the **active agent** are connected during a chat session. Switching agents automatically disconnects unused servers and connects the relevant ones.
