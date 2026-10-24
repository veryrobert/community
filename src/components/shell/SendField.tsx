import { useState, type FormEvent } from 'react'
import { ArrowUp, type LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// A field with its action inside it: a round button on the right that appears once there's
// something to send. Enter (or the keyboard's Send/Go key) does the same. In multiline fields,
// Shift+Enter starts a new line.
export function SendField({
  label,
  placeholder,
  onSend,
  icon = ArrowUp,
  multiline = false,
  type = 'text',
  enterKeyHint = 'send',
  autoComplete,
  autoFocus,
  clearOnSend = true,
  initialValue = '',
}: {
  label: string
  placeholder?: string
  onSend: (value: string) => Promise<unknown>
  icon?: LucideIcon
  multiline?: boolean
  type?: string
  enterKeyHint?: 'send' | 'go' | 'done'
  autoComplete?: string
  autoFocus?: boolean
  clearOnSend?: boolean
  initialValue?: string // to start with text, e.g. a quote; change the key to load a new one
}) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Icon = icon
  const ready = value.trim().length > 0 && !busy

  async function send(e?: FormEvent) {
    e?.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      await onSend(value.trim())
      if (clearOnSend) setValue('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const common = {
    value,
    placeholder,
    autoFocus,
    'aria-label': placeholder ?? label,
    enterKeyHint,
    onChange: (e: { target: { value: string } }) => setValue(e.target.value),
    className: 'pr-14',
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-2">
      <div className="relative">
        {multiline ? (
          <Textarea {...common} className="min-h-12 pr-14"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }} />
        ) : (
          <Input {...common} type={type} autoComplete={autoComplete} />
        )}
        <button
          type="submit"
          aria-label={label}
          disabled={!ready}
          className={cn(
            'absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
            ready ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <Icon className="size-4" strokeWidth={1.5} />
        </button>
      </div>
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </form>
  )
}
