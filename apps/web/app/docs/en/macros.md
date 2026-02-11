# Macros

## What Are Macros?

Macros are **recorded browser automations** that agents can execute as tools during a conversation. You record a sequence of browser interactions -- clicks, typing, navigation -- and save it as a reusable macro. When an agent needs to perform that task, the LLM calls the macro as a tool and the Chrome extension replays the steps.

## Macro Servers

Before recording, you need a **macro server** to organize your macros. A server is simply a named group of related macros.

- Click **New Server** in the side panel to create one
- Give it a **name** and optional **description**
- Edit or delete servers via the icons next to the server name
- Each server can hold multiple macros

## Recording Macros

1. Open the **izan.io Chrome extension** side panel (click the extension icon)
2. Click **Record Macro** under the server you want to add it to
3. Click the **Record** button to start capturing
4. **Interact with any website** -- click buttons, fill forms, navigate pages, scroll
5. Click **Stop** when finished
6. Click **Done** to proceed to the save screen
7. **Name your macro**, add a description, and save it

The recorder captures each interaction as a discrete step with element selectors, action types, and input values. Steps appear in the side panel in real time as you interact with the page.

### Additional Recording Controls

- **List extraction** -- click the **List** button during recording to enter element picker mode for extracting lists of similar items (e.g., search results, table rows)
- **Single extraction** -- click **Single** to extract data from a single element
- **Wait step** -- click **Wait** to insert a manual delay (0.1--30 seconds) between steps
- **Lane** -- add a parallel lane for concurrent execution in separate tabs

## Parameterization

Parameterization turns static recorded values into **dynamic inputs** that the LLM provides at runtime. There are three types:

### URL Query Parameters

When a navigate step has URL query parameters (e.g., `?q=test`), each parameter appears with a **toggle switch**. Enable the toggle to make it dynamic:

1. The value changes from `test` to `{{q}}`
2. Enter a **description** so the LLM knows what to provide (e.g., "Search query")
3. At runtime, the LLM fills in the actual value

### URL Path Segments

Path segments in a URL can also be parameterized. For example, in `github.com/user/repo/issues/123`:

1. Each path segment (`user`, `repo`, `issues`, `123`) appears with a toggle
2. Enable the toggle on `123` to make it dynamic
3. Enter a **parameter name** (e.g., `issue_number`) and **description**
4. The URL becomes `github.com/user/repo/issues/{{issue_number}}`

### Type Input Values

Text typed into input fields can be parameterized:

1. A type step shows the recorded text with a toggle
2. Enable the toggle to make the text dynamic
3. Enter a **parameter name** (e.g., `search_query`) and **description**
4. At runtime, the LLM provides the text to type

## Editing Macros

Click any macro in the list to open the **edit view**. You can:

- **Rename** the macro and update its description
- **Reorder steps** by dragging the grip handle or using the up/down arrows
- **Delete steps** by hovering and clicking the trash icon
- **Record additional steps** -- press Record to append new actions to the existing macro
- **Add extraction steps** using the List/Single buttons while in edit-record mode
- **Insert wait steps** manually with configurable duration
- **Configure wait-until** on navigate steps: choose between Page Load (default), DOM Ready, or Network Idle
- **Adjust parameters** -- toggle parameterization on/off for URL params, path segments, and type inputs
- **Export** the macro as JSON from the edit view

## Data Extraction

Extraction lets macros **pull structured data** from web pages. During recording:

### List Mode

1. Click **List** while recording
2. Hover over a repeating element (e.g., a search result item) -- it highlights in yellow
3. Click to select -- all similar elements are detected and highlighted
4. The extraction step captures the item count and field definitions
5. At runtime, data from all matching elements is returned as a structured list

### Single Mode

1. Click **Single** while recording
2. Hover over the target element and click
3. A single element's data is captured
4. At runtime, the extracted data is returned as a single object

## Parallel Lanes

Macros support **parallel lanes** for running multiple step sequences concurrently in **separate browser tabs**.

- Click **Lane** (record view) or **Add Lane** (edit view) to create a new lane
- **Switch between lanes** by clicking the lane tabs
- **Rename lanes** by double-clicking the tab name
- **Remove lanes** with the X button on the tab
- Each lane executes independently -- useful for searching multiple sites simultaneously or comparing data across pages

## Sharing Macros

Macros and servers can be **exported and imported** as JSON:

### Export

- **Export a server** (with all its tools) via the download icon next to the server name
- **Export a single tool** via the download icon on the tool row, or from the edit view

### Import

- **Import a server** using the "Import JSON" button at the bottom of the list
- **Import a tool** into a specific server via the upload icon next to the server name

This makes it straightforward to distribute automation workflows across teams or back up your macros.

## Using Macros with Agents

To make a macro available to an agent:

1. Open the **agent edit panel**
2. Go to the **Macros** section
3. Select which macros the agent can use

During a conversation, the LLM sees each assigned macro as a callable tool. When the model decides to invoke a macro, the **Chrome extension executes the recorded steps** in the browser and returns the results to the conversation. The agent can then use the extracted data to continue its response.
