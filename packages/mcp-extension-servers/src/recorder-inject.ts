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

// Clean up previous injection's listener to prevent duplicates
if ((globalThis as any).__izanRecorderCleanup) {
  (globalThis as any).__izanRecorderCleanup()
}

const recorder = new ActionRecorder()
const picker = new ElementPicker()
let pendingResumeTimer: ReturnType<typeof setTimeout> | null = null

const deferResume = () => {
  // Cancel any pending resume before scheduling a new one
  if (pendingResumeTimer != null) clearTimeout(pendingResumeTimer)
  pendingResumeTimer = setTimeout(() => { pendingResumeTimer = null; recorder.resume() }, 0)
}

const cancelPendingResume = () => {
  if (pendingResumeTimer != null) { clearTimeout(pendingResumeTimer); pendingResumeTimer = null }
}

const stepCallback = (step: ActionStep, index: number) => {
  chrome.runtime.sendMessage({ type: 'recording-step', step, index }).catch(() => {})
}

const listener = (
  msg: { type: string; mode?: 'list' | 'single'; steps?: ActionStep[] },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (r?: unknown) => void,
) => {
  if (msg.type === 'recorder-start') {
    cancelPendingResume()
    recorder.start(stepCallback)
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'recorder-resume') {
    cancelPendingResume()
    // Resume recording with steps accumulated before cross-page navigation
    recorder.start(stepCallback, msg.steps)
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'recorder-cleanup') {
    cancelPendingResume()
    picker.cancel()
    recorder.stop()
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'recorder-stop') {
    cancelPendingResume()
    picker.cancel()
    const steps = recorder.stop()
    chrome.runtime.sendMessage({ type: 'recording-complete', steps }).catch(() => {})
    sendResponse({ ok: true, steps })
    return true
  }

  if (msg.type === 'recorder-pause') {
    cancelPendingResume()
    recorder.pause()
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'recorder-defer-resume') {
    deferResume()
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'recorder-extract') {
    // Cancel any pending resume from a previous extract to prevent race
    cancelPendingResume()
    const mode = msg.mode ?? 'list'
    // Pause the recorder so clicks/inputs during extraction aren't captured as steps
    recorder.pause()
    picker.start(
      (result: PickerResult) => {
        // Defer resume so the current click event fully propagates before
        // the recorder re-attaches its listeners (avoids spurious click step).
        deferResume()
        chrome.runtime.sendMessage({
          type: 'extract-result',
          step: result.step,
          preview: result.preview,
          previewHtml: result.previewHtml,
        }).catch(() => {})
      },
      mode,
      deferResume, // onCancel (ESC key)
    )
    sendResponse({ ok: true })
    return true
  }

  return false
}

chrome.runtime.onMessage.addListener(listener)

;(globalThis as any).__izanRecorderCleanup = () => {
  chrome.runtime.onMessage.removeListener(listener)
  picker.cancel()
  recorder.stop()
}
