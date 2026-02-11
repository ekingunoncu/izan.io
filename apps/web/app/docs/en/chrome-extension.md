# Chrome Extension

## What Does the Extension Do?

The izan.io Chrome extension enables **macro recording and execution** directly in your browser. It is the bridge between the izan.io web app and real browser interactions -- without it, agents cannot record or run macros.

## Installation

### Download & Install (Recommended)

1. [**Download the extension ZIP**](/downloads/izan-macros.zip)
2. Unzip the downloaded file
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked**
6. Select the unzipped folder
7. The extension icon appears in the toolbar -- done!

### Chrome Web Store

The extension will be available on the Chrome Web Store soon. In the meantime, use the download method above.

### Build from Source

Clone the repository, run `npm run build:extension`, and load the `dist` folder as an unpacked extension in `chrome://extensions`.

## Side Panel

Click the **extension icon** in Chrome's toolbar to open the side panel. The side panel provides:

- **Recording controls** -- start, stop, and manage macro recordings
- **Macro list** -- view and manage your saved macros
- **Status indicators** -- see whether the extension is connected to izan.io

## Recording Workflow

1. Open the side panel from the extension icon
2. Click **Record** to begin capturing
3. Interact with any website -- the extension tracks clicks, text input, navigation, and other actions
4. Click **Stop** to finish recording
5. Name the macro and save it

Each recorded interaction is stored as a step with the target element's selector, the action type, and any input values.

## Communication with izan.io

The extension communicates with the izan.io web app using **`window.postMessage`** messages between the content script and the page. All messages follow the `izan:*` protocol prefix. This allows the web app to trigger macro execution and receive results without any external network calls.

## When Is the Extension Required?

The extension is **required for any agent that uses macros**. If you only use built-in MCP tools and custom MCP servers, the extension is not needed. Install it when you want to record browser automations or let agents interact with websites on your behalf.
