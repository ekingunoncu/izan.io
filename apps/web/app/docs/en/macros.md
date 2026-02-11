# Macros

## What Are Macros?

Macros are **recorded browser automations** that agents can execute as tools during a conversation. You record a sequence of browser interactions -- clicks, typing, navigation -- and save it as a reusable macro. When an agent needs to perform that task, the LLM calls the macro as a tool and the Chrome extension replays the steps.

## Recording Macros

1. Open the **izan.io Chrome extension** side panel (click the extension icon)
2. Click **Record** to start capturing
3. **Interact with any website** -- click buttons, fill forms, navigate pages
4. Click **Stop** when finished
5. **Name your macro** and save it

The recorder captures each interaction as a discrete step with element selectors, action types, and input values.

## Editing Macros

After recording, you can refine your macro:

- **Modify steps** -- change selectors, update input values, reorder or delete steps
- **Add parameters** -- define variables that the agent fills in at runtime (e.g., a search query or username)
- **Configure extraction** -- specify what data to pull from the page after execution (e.g., scrape results, read text content)

## Parallel Lanes

Macros support **parallel lanes**, which let you run multiple step sequences concurrently in **separate browser tabs**. This is useful for tasks like searching several sites at once or comparing results across pages. Each lane operates independently and can target different URLs.

## Sharing Macros

Macros can be **exported as JSON** files and shared with others. To transfer a macro:

- **Export** from the macro editor to get a JSON file
- **Import** on another machine by loading the JSON file through the extension or izan.io settings

This makes it straightforward to distribute automation workflows across teams.

## Using Macros with Agents

To make a macro available to an agent:

1. Open the **agent edit panel**
2. Go to the **Macros** section
3. Select which macros the agent can use

During a conversation, the LLM sees each assigned macro as a callable tool. When the model decides to invoke a macro, the **Chrome extension executes the recorded steps** in the browser and returns the results to the conversation. The agent can then use the extracted data to continue its response.
