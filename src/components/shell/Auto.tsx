import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from './Field'

// Fields that save themselves: on blur, or on the keyboard's Done key for single lines.
// No Save buttons; the label row says Saving and Saved instead.
type Status = 'idle' | 'saving' | 'saved' | 'error'

function useAutosave(value: string, save: (v: string) => Promise<unknown>, required: boolean) {
  const [draft, setDraft] = useState(value)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const last = useRef(value)

  // Take the stored value when it changes elsewhere, unless this field has unsaved edits
  useEffect(() => {
    if (draft === last.current) setDraft(value)
    last.current = value
  }, [value])

  useEffect(() => {
    if (status !== 'saved') return
    const t = setTimeout(() => setStatus('idle'), 1600)
    return () => clearTimeout(t)
  }, [status])

  async function commit() {
    const next = draft.trim()
    if (next === value.trim()) return
    if (required && !next) { setDraft(value); return }
    setStatus('saving')
    try {
      await save(next)
      last.current = next
      setStatus('saved')
      setError(null)
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  const aside = status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'error' ? <span className="text-destructive">{error}</span> : undefined
  return { draft, setDraft, commit, aside }
}

type Common = { label: string; value: string; onSave: (v: string) => Promise<unknown>; required?: boolean; count?: number }

export function AutoInput({ label, value, onSave, required = false, count, ...props }: Common & Omit<ComponentProps<'input'>, 'value' | 'onChange'>) {
  const { draft, setDraft, commit, aside } = useAutosave(value, onSave, required)
  const id = `auto-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <Field label={label} htmlFor={id} aside={aside ?? (count ? `${draft.length}/${count}` : undefined)}>
      <Input id={id} value={draft} maxLength={count} enterKeyHint="done" {...props}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
    </Field>
  )
}

export function AutoTextarea({ label, value, onSave, required = false, count, ...props }: Common & Omit<ComponentProps<'textarea'>, 'value' | 'onChange'>) {
  const { draft, setDraft, commit, aside } = useAutosave(value, onSave, required)
  const id = `auto-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <Field label={label} htmlFor={id} aside={aside ?? (count ? `${draft.length}/${count}` : undefined)}>
      <Textarea id={id} value={draft} maxLength={count} {...props} onChange={e => setDraft(e.target.value)} onBlur={commit} />
    </Field>
  )
}
