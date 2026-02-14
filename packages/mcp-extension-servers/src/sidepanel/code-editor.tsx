import { useRef, useEffect, useCallback } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { basicSetup } from 'codemirror'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onRun?: () => void
  readOnly?: boolean
  minHeight?: string
}

export function CodeEditor({ value, onChange, placeholder, onRun, readOnly, minHeight = '80px' }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  onChangeRef.current = onChange
  onRunRef.current = onRun

  const createView = useCallback(() => {
    if (!containerRef.current) return

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
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.theme({
          '&': { minHeight, fontSize: '12px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { minHeight },
        }),
      ],
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    createView()
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [createView])

  // Sync external value changes
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

  return (
    <div
      ref={containerRef}
      className="rounded-md border overflow-hidden"
      style={{ resize: 'vertical', overflow: 'auto', minHeight }}
    />
  )
}
