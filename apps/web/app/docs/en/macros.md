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
- **Selector** -- click the **Selector** button to open the CSS selector extraction panel (see [Extraction Methods](#extraction-methods) below)
- **A11y** -- click the **A11y** button to open the accessibility extraction panel, where you can extract data by ARIA role or take a full-page accessibility snapshot
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

Extraction lets macros **pull structured data** from web pages. There are several ways to create extraction steps:

### Element Picker (List & Single)

The element picker uses an on-page overlay to visually select elements.

**List mode:**

1. Click **List** while recording
2. Hover over a repeating element (e.g., a search result item) -- it highlights in yellow
3. Click to select -- all similar elements are detected and highlighted
4. The extraction step captures the item count and field definitions
5. At runtime, data from all matching elements is returned as a structured list

**Single mode:**

1. Click **Single** while recording
2. Hover over the target element and click
3. Fields are **auto-detected** from the element (text, links, images, inputs) -- just like list mode
4. Optionally click additional sub-elements to add more fields
5. Click **Done** to confirm -- the extraction step is created immediately
6. At runtime, the extracted data is returned as a single object

### Extraction Methods

The toolbar provides two separate buttons for extraction:

#### CSS Selector (Selector button)

Click the **Selector** button to open the CSS extraction panel. Enter a CSS selector manually (e.g., `.post-item`, `table tbody tr`). Choose **List** or **Single** mode, then click **Extract**.

- **List** -- all matching elements are treated as items; fields are auto-detected from the first item
- **Single** -- the first matching element is used; fields are auto-detected from it
- Tip: right-click an element in DevTools → Copy → Copy selector

#### Accessibility (A11y button)

Click the **A11y** button to open the accessibility extraction panel. This approach extracts elements by their **ARIA role** instead of CSS selectors -- more resilient to styling changes, penetrates Shadow DOM boundaries, and doesn't depend on class names.

1. Select one or more **roles** from the dropdown (e.g., `link`, `button`, `heading`, `article`, `listitem`, `row`)
2. Optionally enter an **accessible name** to filter results -- the placeholder shows examples for the selected role (e.g., for `link`: "Sign In", "Read more")
3. Toggle **Include children**:
   - **ON** (default) -- each matched element is treated as a container and its child content (links, text, images) is auto-detected as separate fields. Use this for rich elements like `article`, `listitem`, or `row` that contain nested content.
   - **OFF** -- only direct properties of the matched elements are extracted (text content, `href` for links, `src`/`alt` for images, `value` for inputs). Use this for simple elements like `link`, `button`, or `heading`.
4. Click **Extract**

The accessibility method always produces a list of all matching elements. At runtime, extraction steps created with the A11y method use the **real accessibility tree** via Chrome DevTools Protocol, making them reliable even on sites with dynamic class names or obfuscated markup.

#### Accessibility Snapshot

The A11y panel also includes a **Snapshot** section. Click **Snapshot** to retrieve the **full accessibility tree** of the current page. This returns a compact text representation showing the page structure with roles, names, and properties -- useful for understanding page layout before deciding which roles to extract.

The snapshot is also available as a built-in MCP tool called `accessibility_snapshot` (see [Using Macros with Agents](#using-macros-with-agents)).

### Table Auto-Detection

When the element picker detects a `<table>` element, it automatically maps each column to a field using the table headers as keys. This means you get structured row-by-row data without manually defining fields.

### Editing Extraction Fields

After an extraction step is created, you can **edit individual fields** by clicking "Edit fields" on the step card. Each field card shows:

- **Key** -- the property name in the output object
- **Type** dropdown -- choose from `text`, `html`, `attribute`, `value`, `regex`, `nested`, or `nested_list`
- **Transform** dropdown -- apply `trim`, `lowercase`, `uppercase`, or `number` post-processing
- **Selector** -- the CSS selector used to locate the element (shown as a monospace label)

Depending on the selected type, additional inputs appear:

- **attribute** -- a dropdown for the HTML attribute name to extract (e.g., `href`, `src`), populated from the actual element
- **regex** -- an input for the regex pattern, plus an optional default value
- **nested / nested_list** -- sub-field count is displayed; edit sub-fields via JSON export/import

You can **add new fields** with the "+ Add Field" button or **remove fields** with the x button on each card. Changes are applied immediately to the step data and included when you save or export the macro.

### Data Preview

When an extraction step is created, a **preview** of the extracted data is captured from the live page and shown directly on the step card -- no need to expand anything. The preview updates live as you edit fields.

- For **list mode**, the preview shows the first few items with their key-value pairs
- For **single mode**, the preview shows the extracted object's key-value pairs
- Values are truncated for readability; nested objects and arrays show their size
- Click the preview header to collapse/expand it

The preview helps you verify that the correct data is being extracted before saving the macro.

### Default Values

Fields can have a **default value** that is returned when the selector matches no element or the extraction yields an empty result. Set defaults via the field editor or JSON export.

### Transform Pipeline

Each field supports an optional **transform** applied after extraction:

- **trim** -- remove leading/trailing whitespace
- **lowercase** -- convert to lowercase
- **uppercase** -- convert to uppercase
- **number** -- parse the text as a number

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

### Built-in Accessibility Snapshot Tool

In addition to user-created macros, every agent with macros enabled automatically has access to the `accessibility_snapshot` tool. This built-in tool returns the **full accessibility tree** of the current automation browser page as compact text -- roles, names, and properties in a tree format. Agents can use it to understand page structure, verify navigation results, or decide which elements to interact with next.
