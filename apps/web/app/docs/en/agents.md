# Agents

## What Are Agents?

Agents are **specialized AI assistants** equipped with built-in tools via MCP (Model Context Protocol) servers. Each agent has a tailored system prompt, specific model parameters, and a curated set of tools that let it perform actions beyond simple text generation.

## Built-in Agents

### General Assistant

The default agent with access to everyday utility tools:

- **Time and date** queries
- **Calculator** for math operations
- **Password generator** with configurable strength
- **UUID generator** for unique identifiers

### Domain Expert

A specialized agent for domain name research:

- **Domain search** across multiple TLDs
- **Availability checking** via RDAP and DNS-over-HTTPS lookups

## Creating Custom Agents

You can build your own agents from the **Agents** page by clicking **Create Agent**. Configure the following:

- **Name and description** -- how the agent appears in the sidebar
- **System prompt** -- instructions that shape the agent's behavior and personality
- **Model parameters** -- choose a specific provider, model, temperature, and max tokens

## Multi-Agent Orchestration

Agents can **call other agents as tools**. When you link agents together, one agent can delegate tasks to another using `ask_agent_{id}` tool calls. This creates a chain of specialized assistants working together, with a **maximum nesting depth of 3 levels** to prevent runaway loops.

## Deep Task Mode

When you have a complex task that requires the agent to work autonomously through many tool calls, use **Deep Task** mode. Click the **lightning bolt icon** next to the send button before sending your message.

When Deep Task is active:

- A **progress banner** appears immediately, showing elapsed time and step count
- **Browser notifications** are automatically enabled -- you'll be notified when the task completes
- The agent works through its full tool-calling loop without waiting for user intervention

Deep Task is ideal for research-heavy tasks, multi-step workflows, and any task where the agent needs to make many consecutive tool calls.

### Long Task Auto-Detection

Even without Deep Task mode, izan.io detects when a task runs **3 or more tool-calling rounds** and automatically shows the progress banner. You can enable browser notifications from the banner so you're alerted when the task finishes.

### Background Tasks

If you switch to a different chat while a task is still running, the running task **automatically moves to the background**. Background tasks continue executing and:

- Show a **status indicator** (spinner) next to the chat in the sidebar
- Display **step progress** in the chat list
- Fire a **browser notification** when they complete or fail
- Flash the **browser tab title** if the tab is not focused

You can also see completed/failed task status in the sidebar. Clicking a completed background task clears its status badge.

## Max Iterations

Each agent has a configurable **max iterations** setting (default: 25) that controls the maximum number of tool-calling rounds per message. You can adjust this in the **Model Parameters** section of the agent edit panel. Higher values allow longer autonomous tasks, while lower values keep tasks focused.

## Assigning Tools to Agents

From the **agent edit panel**, you can:

- **Assign MCP servers** -- give the agent access to any connected MCP server's tools
- **Assign macros** -- attach recorded browser automations that the agent can trigger during a conversation
- **Link other agents** -- enable multi-agent orchestration by selecting agents as callable tools

## Agent Export & Import

You can **share agent configurations** with others or back them up:

### Export

From the agent edit panel, click the **export button** to download the agent as a JSON file. The export includes:

- Agent name, description, system prompt, icon, and model parameters
- All linked agents (recursively)
- Custom MCP server configurations
- Macro servers and tools assigned to the agent

### Import

From the agent edit panel, click the **import button** and select a JSON file. izan.io will:

- Create the agent with all its settings
- Recursively import linked agents
- Restore custom MCP server connections
- Restore macro servers and tools

This makes it easy to distribute specialized agent setups across devices or teams.

## Agent Profile Pages

Each agent has a **profile page** accessible from the agents list. The profile shows:

- Agent icon, name, and description
- System prompt
- Assigned tools: built-in MCPs, custom MCPs, macros, and linked agents
- A **Use Agent** button to start chatting with it

For custom agents, the profile also shows a "User Created" badge. Built-in agents display detailed descriptions, usage examples, and pro tips.
