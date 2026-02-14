# Scheduled Plans

Scheduled Plans let you automate your agents by scheduling them to run with a specific prompt - either once at a specific time, or on a recurring basis using cron expressions.

## Overview

With Scheduled Plans, you can:

- **Run agents on a schedule** - daily reports, weekly summaries, periodic checks
- **One-time execution** - schedule an agent to run at a specific date and time
- **Recurring execution** - use standard cron expressions for flexible scheduling
- **Non-disruptive execution** - plans run in the background without affecting your current chat
- **Execution history** - view past runs and link back to the generated chats

## Creating a Plan

1. Navigate to the **Plans** page from the main navigation (CalendarClock icon)
2. Click **Create Plan**
3. Fill in the form:
   - **Name**: A descriptive name for your plan
   - **Description**: Optional description of what the plan does
   - **Agent**: Select which agent should execute the plan
   - **Prompt**: The message to send to the agent
   - **Schedule Type**: Choose between "Once" or "Recurring"

### One-Time Plans

Select "Once" and pick a date and time. The plan will execute at that time and automatically mark itself as completed.

### Recurring Plans

Select "Recurring" and enter a standard 5-field cron expression, or use one of the preset buttons:

| Preset | Cron Expression | Description |
|--------|----------------|-------------|
| Every hour | `0 * * * *` | Runs at the top of every hour |
| Daily at 9am | `0 9 * * *` | Runs daily at 9:00 AM |
| Weekly (Monday) | `0 9 * * 1` | Runs every Monday at 9:00 AM |
| Monthly (1st) | `0 9 1 * *` | Runs on the 1st of every month at 9:00 AM |

The form shows a live preview of the next scheduled run time.

## How Execution Works

When a plan's scheduled time arrives:

1. A new chat is created for the selected agent (titled with `[Plan]` prefix)
2. The prompt is sent to the agent as a user message
3. The agent responds using all its configured tools and MCP servers
4. The execution is logged in the plan's history

Plans run **in the background** - they won't interrupt your current chat session.

## Extension vs. Fallback Mode

- **With Chrome Extension**: Plans use `chrome.alarms` for reliable scheduling, even when the tab is in the background
- **Without Extension**: Plans use a 30-second interval check when the izan.io tab is open. Plans will catch up on missed executions when you reopen the tab.

## Managing Plans

- **Pause/Resume**: Toggle a plan's status between active and paused
- **Run Now**: Manually trigger a plan execution at any time
- **Edit**: Modify the plan's name, prompt, agent, or schedule
- **Delete**: Remove a plan and its execution history

## Requirements

- An **API key** must be configured for your selected provider (the plan uses the same provider/model as your current settings)
- The **agent** assigned to the plan must exist and be enabled

## Edge Cases

- If the app is closed when a plan is due, it will catch up and execute once when you reopen
- Multiple browser tabs won't cause duplicate executions (protected by a 10-second deduplication window)
- If an execution is interrupted (e.g., page reload), it's automatically marked as failed
