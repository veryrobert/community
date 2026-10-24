import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup } from '@/components/shell/Field'
import { cn } from '@/lib/utils'
import { publishUpdate, type Store } from '@/lib/data'
import { STATUS } from '@/lib/types'

export const UPDATE_FORM = 'update-form'

export function UpdateForm({ store, onDone }: { store: Store; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [linked, setLinked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ideas most likely to be reported on come first
  const rank = { done: 0, progress: 1, planned: 2, review: 3 } as Record<string, number>
  const ideas = store.ideas
    .filter(i => i.status !== 'merged' && i.status !== 'declined')
    .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || b.updated_at.localeCompare(a.updated_at))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!title.trim()) { setError('Give the update a title.'); return }
    setBusy(true)
    setError(null)
    try {
      await publishUpdate(title.trim(), body.trim(), linked)
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const toggle = (id: number) => setLinked(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  return (
    <form id={UPDATE_FORM} onSubmit={submit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field label="Title" htmlFor="update-title">
          <Input id="update-title" value={title} onChange={e => setTitle(e.target.value)} autoFocus enterKeyHint="next"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('update-body')?.focus() } }} />
        </Field>
        <Field label="Update" htmlFor="update-body">
          <Textarea id="update-body" value={body} onChange={e => setBody(e.target.value)} className="min-h-36" />
        </Field>
      </FieldGroup>
      {ideas.length > 0 && (
        <FieldGroup title="Ideas this update is about">
          <ul className="flex flex-col">
            {ideas.map(i => {
              const on = linked.includes(i.id)
              return (
                <li key={i.id}>
                  <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(i.id)}
                    className="flex w-full items-start gap-3 border-t border-border px-1 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-input', on && 'border-primary bg-primary text-primary-foreground')}>
                      {on && <Check className="size-3" strokeWidth={2} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-foreground">{i.title}</span>
                      <span className="text-xs text-muted-foreground">{STATUS[i.status]}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </FieldGroup>
      )}
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </form>
  )
}
