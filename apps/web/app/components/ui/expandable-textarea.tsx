import { useState, useEffect, useRef } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '~/lib/utils'

interface ExpandableTextareaProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  label?: string
  rows?: number
  className?: string
}

export function ExpandableTextarea({
  value,
  onChange,
  placeholder,
  label,
  rows = 4,
  className,
}: ExpandableTextareaProps) {
  const [open, setOpen] = useState(false)
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => modalTextareaRef.current?.focus(), 50)
    }
  }, [open])

  return (
    <>
      <div className="relative">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring pr-9',
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={label ? `Expand ${label}` : 'Expand'}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border shadow-2xl w-full h-full sm:max-w-2xl sm:h-[80vh] sm:rounded-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <span className="text-sm font-medium">{label || 'Edit'}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 p-3 sm:p-4 min-h-0">
              <textarea
                ref={modalTextareaRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full h-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
