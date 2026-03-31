import { useRef, useEffect } from 'react'
import * as monaco from 'monaco-editor'

// ─── Browser API Type Definitions ────────────────────────────────────────────

const BROWSER_TYPES_LIB = `
interface Browser {
  /** Open a URL in a new tab */
  open(url: string): Promise<void>;
  /** Navigate the current tab to a URL */
  navigate(url: string): Promise<void>;
  /** Wait for page to finish loading */
  waitForLoad(timeout?: number): Promise<void>;
  /** Close the current tab */
  close(): Promise<void>;
  /** Get the current page URL */
  getUrl(): Promise<string>;
  /** Attach to the currently active tab instead of opening a new one */
  attachActiveTab(): Promise<void>;

  /** Click an element matching the CSS selector */
  click(selector: string): Promise<void>;
  /** Type text into an input. Clears existing text by default. */
  type(selector: string, text: string, opts?: { clear?: boolean }): Promise<void>;
  /** Select an option in a <select> by value */
  select(selector: string, value: string): Promise<void>;
  /** Scroll the page or a specific element */
  scroll(opts?: { selector?: string; direction?: 'up' | 'down' | 'left' | 'right'; amount?: number }): Promise<void>;

  /** Get text content of an element */
  getText(selector: string): Promise<string>;
  /** Get innerHTML of an element */
  getHtml(selector: string): Promise<string>;
  /** Get an attribute value */
  getAttribute(selector: string, attr: string): Promise<string | null>;
  /** Get input/textarea/select value */
  getValue(selector: string): Promise<string>;
  /** Check if an element exists in the DOM */
  exists(selector: string): Promise<boolean>;

  /**
   * Run JavaScript in the page context and return the result.
   * Full access to DOM and Web APIs.
   * @example
   * await browser.evaluate('document.title')
   * await browser.evaluate('[...document.querySelectorAll(".item")].map(e => e.textContent)')
   * await browser.evaluate('fetch("/api/data").then(r => r.json())')
   */
  evaluate<T = any>(expression: string): Promise<T>;

  /** Wait for an element to appear in the DOM */
  waitForSelector(selector: string, timeout?: number): Promise<void>;
  /** Wait for URL to contain a pattern string */
  waitForUrl(pattern: string, timeout?: number): Promise<void>;
  /** Pause execution for N milliseconds */
  wait(ms: number): Promise<void>;

  /** Get accessibility tree of the page or a specific element */
  snapshot(selector?: string): Promise<string>;
}
`

// ─── Monaco Setup ────────────────────────────────────────────────────────────

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url), { type: 'module' })
    }
    return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), { type: 'module' })
  },
}

let monacoSetup = false
function setupMonaco() {
  if (monacoSetup) return
  monacoSetup = true

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  })
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
  })
  monaco.languages.typescript.javascriptDefaults.addExtraLib(BROWSER_TYPES_LIB, 'browser.d.ts')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
}

function buildParamsType(parameters: ToolParameter[]): string {
  if (parameters.length === 0) return 'Record<string, any>'
  return '{ ' + parameters.map(p => {
    const t = p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean' : 'string'
    return `${p.name}${p.required ? '' : '?'}: ${t}`
  }).join(', ') + ' }'
}

/** Hidden line prepended to the model so TS infers types on the arrow fn params */
function buildWrapper(parameters: ToolParameter[]): string {
  const paramsType = buildParamsType(parameters)
  return `/** @type {(params: ${paramsType}, browser: Browser) => Promise<any>} */\n`
}

const WRAPPER_LINES = 1 // the @type comment is 1 line

// ─── Component ───────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  parameters?: ToolParameter[]
  onRun?: () => void
  readOnly?: boolean
  minHeight?: string
  placeholder?: string
}

export function CodeEditor({ value, onChange, parameters = [], onRun, readOnly, minHeight = '200px' }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  const suppressRef = useRef(false)
  onChangeRef.current = onChange
  onRunRef.current = onRun

  const wrapperRef = useRef(buildWrapper(parameters))

  useEffect(() => {
    if (!containerRef.current) return
    setupMonaco()

    wrapperRef.current = buildWrapper(parameters)
    const fullContent = wrapperRef.current + value

    const editor = monaco.editor.create(containerRef.current, {
      value: fullContent,
      language: 'javascript',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: (n) => n > WRAPPER_LINES ? String(n - WRAPPER_LINES) : '',
      lineNumbersMinChars: 3,
      folding: true,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      readOnly: !!readOnly,
      renderLineHighlight: 'line',
      matchBrackets: 'always',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
      padding: { top: 4, bottom: 8 },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      contextmenu: false,
      glyphMargin: false,
    })

    // Decorate wrapper line as muted
    applyDecorations(editor)

    // Block editing wrapper line
    editor.onKeyDown((e) => {
      const pos = editor.getPosition()
      if (!pos) return
      if (pos.lineNumber <= WRAPPER_LINES) {
        // Allow only down arrow
        if (e.keyCode !== monaco.KeyCode.DownArrow) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
      // Block backspace at start of first user line from deleting into wrapper
      if (pos.lineNumber === WRAPPER_LINES + 1 && pos.column === 1 && e.keyCode === monaco.KeyCode.Backspace) {
        e.preventDefault()
        e.stopPropagation()
      }
    })

    editor.onDidChangeModelContent(() => {
      if (suppressRef.current) return
      const full = editor.getValue()
      // Strip the first line (wrapper)
      const lines = full.split('\n')
      const userCode = lines.slice(WRAPPER_LINES).join('\n')
      onChangeRef.current(userCode)
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.()
    })

    // Start cursor on user code
    editor.setPosition({ lineNumber: WRAPPER_LINES + 1, column: 1 })
    editor.revealLine(WRAPPER_LINES + 1)

    editorRef.current = editor
    return () => { editor.dispose(); editorRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync parameters changes → update wrapper line
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const newWrapper = buildWrapper(parameters)
    if (newWrapper === wrapperRef.current) return
    wrapperRef.current = newWrapper

    suppressRef.current = true
    const model = editor.getModel()
    if (model) {
      const oldFirstLine = model.getLineContent(1)
      model.applyEdits([{
        range: new monaco.Range(1, 1, 1, oldFirstLine.length + 1),
        text: newWrapper.trimEnd(), // replace first line only
      }])
    }
    suppressRef.current = false
    applyDecorations(editor)
  }, [parameters])

  // Sync value changes from outside
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const full = wrapperRef.current + value
    if (editor.getValue() !== full) {
      suppressRef.current = true
      editor.setValue(full)
      suppressRef.current = false
      applyDecorations(editor)
    }
  }, [value])

  return (
    <>
      <style>{`.preamble-text { opacity: 0.3 !important; font-style: italic !important; }`}</style>
      <div ref={containerRef} style={{ minHeight, height: '100%' }} />
    </>
  )
}

function applyDecorations(editor: monaco.editor.IStandaloneCodeEditor) {
  editor.createDecorationsCollection([{
    range: new monaco.Range(1, 1, WRAPPER_LINES, 1000),
    options: { isWholeLine: true, inlineClassName: 'preamble-text' },
  }])
}
