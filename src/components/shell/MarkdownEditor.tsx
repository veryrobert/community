import { useRef, useState } from 'react'
import { Bold, Italic, Link, List, ListOrdered, Quote } from 'lucide-react'
import { Markdown } from './Markdown'
import { ToolButton } from './ToolButton'

type Action = { label: string; icon: typeof Bold; keys?: string; apply: (sel: string) => { text: string; select?: [number, number] } }

// Each wraps or prefixes the selection; select is where the cursor lands, relative to the inserted text
const ACTIONS: Action[] = [
  { label: 'Bold', icon: Bold, keys: 'b', apply: s => ({ text: `**${s || 'bold'}**`, select: [2, 2 + (s || 'bold').length] }) },
  { label: 'Italic', icon: Italic, keys: 'i', apply: s => ({ text: `*${s || 'italic'}*`, select: [1, 1 + (s || 'italic').length] }) },
  { label: 'Link', icon: Link, keys: 'k', apply: s => ({ text: `[${s || 'text'}](https://)`, select: [(s || 'text').length + 3, (s || 'text').length + 11] }) },
  { label: 'Bulleted list', icon: List, apply: s => ({ text: lines(s || 'Item', l => `- ${l}`) }) },
  { label: 'Numbered list', icon: ListOrdered, apply: s => ({ text: lines(s || 'Item', (l, i) => `${i + 1}. ${l}`) }) },
  { label: 'Quote', icon: Quote, apply: s => ({ text: lines(s || 'Quote', l => `> ${l}`) }) },
]
const lines = (s: string, f: (l: string, i: number) => string) => s.split('\n').map(f).join('\n')

// A writing space for markdown that fills the space it's given, with its toolbar along the bottom
// (beside the keyboard on phones), as in Discourse's composer. The toolbar formats the selection or
// inserts a placeholder; ⌘B / ⌘I / ⌘K do the same; Preview flips to Edit.
export function MarkdownEditor({ value, onChange, placeholder, label }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label: string
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')

  function run(a: Action) {
    const el = area.current
    if (!el) return
    const [start, end] = [el.selectionStart, el.selectionEnd]
    const { text, select } = a.apply(value.slice(start, end))
    onChange(value.slice(0, start) + text + value.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      const [s, e] = select ?? [text.length, text.length]
      el.setSelectionRange(start + s, start + e)
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {mode === 'write' ? (
        <textarea ref={area} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label}
          onKeyDown={e => {
            if (!(e.metaKey || e.ctrlKey)) return
            const a = ACTIONS.find(x => x.keys === e.key.toLowerCase())
            if (a) { e.preventDefault(); run(a) }
          }}
          className="min-h-40 w-full flex-1 resize-none overflow-y-auto bg-transparent px-5 py-4 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground" />
      ) : (
        <div className="min-h-40 flex-1 overflow-y-auto px-5 py-4">
          {value.trim() ? <Markdown className="text-base">{value}</Markdown> : <p className="text-base text-muted-foreground">Nothing to preview yet.</p>}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5">
        <div role="toolbar" aria-label="Formatting" className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {ACTIONS.map(a => (
            <ToolButton key={a.label} icon={a.icon} label={a.keys ? `${a.label} (⌘${a.keys.toUpperCase()})` : a.label} side="top"
              disabled={mode === 'preview'} onMouseDown={e => e.preventDefault()} onClick={() => run(a)} className="size-8 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4" />
          ))}
        </div>
        <button type="button" aria-pressed={mode === 'preview'} onClick={() => setMode(mode === 'write' ? 'preview' : 'write')}
          className="h-8 shrink-0 rounded-full px-3 text-xs text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground">
          {mode === 'write' ? 'Preview' : 'Edit'}
        </button>
      </div>
    </div>
  )
}
