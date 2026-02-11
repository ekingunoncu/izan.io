/**
 * Recorder inject script
 *
 * Injected into the active tab when the user clicks "Record" in the side panel.
 * Captures click/type/scroll in this tab and sends each step to the background,
 * which forwards to the side panel. Handles Extract mode (element picker) in-page.
 */

import { ActionRecorder } from './recorder.js'
import { ElementPicker, type PickerResult } from './element-picker.js'
import type { ActionStep } from './tool-schema.js'

const recorder = new ActionRecorder()
const picker = new ElementPicker()

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; mode?: 'list' | 'single' },
    _sender,
    sendResponse: (r?: unknown) => void,
  ) => {
    if (msg.type === 'recorder-start') {
      recorder.start((step: ActionStep, index: number) => {
        chrome.runtime.sendMessage({ type: 'recording-step', step, index }).catch(() => {})
      })
      sendResponse({ ok: true })
      return true
    }

    if (msg.type === 'recorder-cleanup') {
      picker.cancel()
      sendResponse({ ok: true })
      return true
    }

    if (msg.type === 'recorder-stop') {
      picker.cancel()
      const steps = recorder.stop()
      chrome.runtime.sendMessage({ type: 'recording-complete', steps }).catch(() => {})
      sendResponse({ ok: true, steps })
      return true
    }

    if (msg.type === 'recorder-extract') {
      const mode = msg.mode ?? 'list'
      // Pause the recorder so clicks/inputs during extraction aren't captured as steps
      recorder.pause()
      picker.start(
        (result: PickerResult) => {
          // Defer resume so the current click event fully propagates before
          // the recorder re-attaches its listeners (avoids spurious click step).
          setTimeout(() => recorder.resume(), 0)
          chrome.runtime.sendMessage({
            type: 'extract-result',
            step: result.step,
            preview: result.preview,
          }).catch(() => {})
        },
        mode,
        () => { setTimeout(() => recorder.resume(), 0) }, // onCancel (ESC key)
      )
      sendResponse({ ok: true })
      return true
    }

    return false
  },
)
