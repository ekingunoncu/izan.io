# Analytics

## Overview

The Analytics page gives you a breakdown of your **token usage and costs** across models, agents, and tools. Every LLM API call is recorded locally in your browser's IndexedDB -- no data leaves your device.

Access Analytics from the **chart icon** in the home page header.

## Summary Cards

At the top of the page, four cards show aggregated stats for the selected time range:

- **Total Cost** -- your total spending in USD, with a trend indicator comparing against the previous period
- **Total Tokens** -- combined input and output tokens, with a per-type breakdown
- **API Calls** -- total number of LLM requests
- **Avg / Call** -- average cost per API call

## Time Range

Filter data by time range using the segmented control:

- **7d** -- last 7 days
- **30d** -- last 30 days (default)
- **90d** -- last 90 days
- **All** -- all recorded data

The trend indicator on the Total Cost card compares the current period against the previous one (e.g., this 7 days vs. the prior 7 days).

## Usage Over Time

A bar chart shows daily usage. Toggle between **Cost** and **Tokens** views:

- **Cost** -- daily spending in USD
- **Tokens** -- stacked bars showing input tokens (blue) and output tokens (green)

Hover over bars to see exact values in the tooltip.

## Breakdowns

### Per Agent

Shows which agents consume the most budget. Each agent displays a progress bar relative to the top spender, along with its total cost.

### Per Model

Same layout as agent breakdown, but grouped by model ID (e.g., `gpt-4.1`, `claude-sonnet-4-5-20250929`). Useful for comparing cost efficiency across providers.

### Tool Usage

Lists the **top 10 most-called tools** with their invocation count. This helps identify which MCP tools your agents rely on most.

## Clearing Data

Click the **trash icon** in the header to delete all analytics records. A confirmation dialog appears before any data is removed. This action is irreversible.

## How It Works

Every time an LLM call completes (including each round in the tool-calling loop), a usage record is saved to IndexedDB with:

- Input and output token counts
- Cost calculated from the provider's pricing
- Agent and model identifiers
- Names of any tools called in that round

All calculations happen client-side. No analytics data is sent to any server.
