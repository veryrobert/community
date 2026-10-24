import { useMemo, useState, type FormEvent } from 'react'
import Fuse from 'fuse.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup } from '@/components/shell/Field'
import { AutoInput, AutoTextarea } from '@/components/shell/Auto'
import { Picker } from '@/components/shell/Picker'
import { createIdea, editIdea, setIdeaTags, type Store } from '@/lib/data'
import { MAX_TAGS_PER_IDEA, TagPicker } from '@/components/shell/Tags'
import type { Idea } from '@/lib/types'

export const IDEA_FORM = 'idea-form'

const options = (store: Store) => ({
  goals: [{ value: '', label: 'None' }, ...store.goals.map(g => ({ value: String(g.id), label: g.title }))],
})

// New idea: posted with the Post button at the bottom
export function NewIdea({ store, onPosted, onOpen }: { store: Store; onPosted: (id: number) => void; onOpen: (id: number) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<number[]>([])
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const o = options(store)

  // Similar ideas as you type the title (Fider and Nolt both do this), so people support what's
  // there instead of posting it again
  const fuse = useMemo(() => new Fuse(store.ideas.filter(i => i.status !== 'merged' && i.status !== 'declined'), {
    keys: [{ name: 'title', weight: 0.7 }, { name: 'body', weight: 0.3 }], threshold: 0.4, ignoreLocation: true, minMatchCharLength: 3,
  }), [store.ideas])
  const similar = title.trim().length >= 4 ? fuse.search(title.trim(), { limit: 3 }).map(r => r.item) : []

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (title.trim().length < 3) { setError('Give the idea a title.'); return }
    setBusy(true)
    setError(null)
    try {
      onPosted(await createIdea({ title: title.trim(), body: body.trim(), goal_id: goal ? Number(goal) : null }, tags))
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form id={IDEA_FORM} onSubmit={submit}>
      <FieldGroup>
        <Field label="Title" htmlFor="idea-title">
          <Input id="idea-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={140} autoFocus enterKeyHint="next"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('idea-body')?.focus() } }} />
        </Field>
        {similar.length > 0 && (
          <div className="-mt-2 flex flex-col">
            <p className="px-1 pb-1 text-xs text-muted-foreground">Already suggested? Support it instead</p>
            {similar.map(i => (
              <button key={i.id} type="button" onClick={() => onOpen(i.id)}
                className="flex items-baseline justify-between gap-3 border-t border-border px-1 py-2.5 text-left text-sm text-foreground outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0">{i.title}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{i.vote_count}</span>
              </button>
            ))}
          </div>
        )}
        <Field label="Details" htmlFor="idea-body">
          <Textarea id="idea-body" value={body} onChange={e => setBody(e.target.value)} className="min-h-36" placeholder="What would change, and who for" />
          <p className="px-1 text-[length:calc(var(--text-xs)*0.875)] text-muted-foreground">Markdown works: **bold**, *italic*, lists and links</p>
        </Field>
        {store.tags.length > 0 && (
          <Field label="Tags" aside={`${tags.length}/${MAX_TAGS_PER_IDEA}`}>
            <TagPicker label="Tags" tags={store.tags} value={tags} onChange={setTags} />
          </Field>
        )}
        {store.goals.length > 0 && (
          <Field label="Goal"><Picker label="Goal" value={goal} onChange={setGoal} options={o.goals} /></Field>
        )}
        {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base">{busy ? 'Posting' : 'Post'}</Button>
      </FieldGroup>
    </form>
  )
}

// Editing saves each field as you leave it
export function EditIdea({ store, idea, onChanged }: { store: Store; idea: Idea; onChanged: () => void }) {
  const o = options(store)
  const save = (input: Parameters<typeof editIdea>[1]) => editIdea(idea.id, input).then(onChanged)
  const [error, setError] = useState<string | null>(null)
  const pick = (input: Parameters<typeof editIdea>[1]) => { setError(null); save(input).catch(e => setError(e.message)) }

  return (
    <FieldGroup>
      <AutoInput label="Title" value={idea.title} required maxLength={140} onSave={v => save({ title: v })} />
      <AutoTextarea label="Details" value={idea.body} className="min-h-36" onSave={v => save({ body: v })} />
      {store.tags.length > 0 && (
        <Field label="Tags" aside={`${idea.tag_ids.length}/${MAX_TAGS_PER_IDEA}`}>
          <TagPicker label="Tags" tags={store.tags} value={idea.tag_ids}
            onChange={ids => { setError(null); setIdeaTags(idea.id, idea.tag_ids, ids).then(onChanged).catch(e => setError(e.message)) }} />
        </Field>
      )}
      {store.goals.length > 0 && (
        <Field label="Goal">
          <Picker label="Goal" value={String(idea.goal_id ?? '')} onChange={v => pick({ goal_id: v ? Number(v) : null })} options={o.goals} />
        </Field>
      )}
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </FieldGroup>
  )
}
