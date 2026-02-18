import { useRef, useEffect, useCallback, useState } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { basicSetup } from 'codemirror'
import { Maximize2, Minimize2 } from 'lucide-react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onRun?: () => void
  readOnly?: boolean
  minHeight?: string
  expandable?: boolean
}

export function CodeEditor({ value, onChange, placeholder, onRun, readOnly, minHeight = '80px', expandable = true }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  onChangeRef.current = onChange
  onRunRef.current = onRun

  const [expanded, setExpanded] = useState(false)

  const createView = useCallback((container: HTMLDivElement, height: string) => {
    const runKeymap = keymap.of([{
      key: 'Mod-Enter',
      run: () => { onRunRef.current?.(); return true },
    }])

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        keymap.of([...defaultKeymap, indentWithTab]),
        runKeymap,
        updateListener,
        EditorState.readOnly.of(!!readOnly),
        EditorView.lineWrapping,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.theme({
          '&': { minHeight: height, fontSize: '12px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { minHeight: height },
        }),
      ],
    })

    return new EditorView({ state, parent: container })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Main editor
  useEffect(() => {
    if (!containerRef.current) return
    viewRef.current = createView(containerRef.current, minHeight)
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [createView, minHeight])

  // Sync external value changes to main editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  // Close expanded on Escape
  useEffect(() => {
    if (!expanded) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expanded])

  return (
    <>
      <div className="relative">
        <div
          ref={containerRef}
          className="rounded-md border overflow-hidden"
          style={{ resize: 'vertical', overflow: 'auto', minHeight }}
        />
        {expandable && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute top-1 right-1 z-10 p-1 rounded bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background/90 transition-colors cursor-pointer"
            title="Expand editor"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <ExpandedModal
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onRun={onRun}
          readOnly={readOnly}
          onClose={() => setExpanded(false)}
          createView={createView}
        />
      )}
    </>
  )
}

function ExpandedModal({
  value,
  onChange,
  placeholder,
  onRun,
  readOnly,
  onClose,
  createView,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onRun?: () => void
  readOnly?: boolean
  onClose: () => void
  createView: (container: HTMLDivElement, height: string) => EditorView
}) {
  const modalEditorRef = useRef<HTMLDivElement>(null)
  const modalViewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!modalEditorRef.current) return
    modalViewRef.current = createView(modalEditorRef.current, '100%')
    // Focus the expanded editor
    setTimeout(() => modalViewRef.current?.focus(), 50)
    return () => {
      modalViewRef.current?.destroy()
      modalViewRef.current = null
    }
  }, [createView])

  // Sync value changes into modal editor
  useEffect(() => {
    const view = modalViewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div
        className="flex-1 flex flex-col m-2 rounded-xl border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">JavaScript Editor</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div
          ref={modalEditorRef}
          className="flex-1 overflow-auto [&_.cm-editor]:!h-full [&_.cm-scroller]:!overflow-auto"
        />
      </div>
    </div>
  )
}
