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

## Assigning Tools to Agents

From the **agent edit panel**, you can:

- **Assign MCP servers** -- give the agent access to any connected MCP server's tools
- **Assign macros** -- attach recorded browser automations that the agent can trigger during a conversation
- **Link other agents** -- enable multi-agent orchestration by selecting agents as callable tools
