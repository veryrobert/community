import { useEffect, useState } from 'react'
import { Field, FieldGroup } from '@/components/shell/Field'
import { Picker } from '@/components/shell/Picker'
import { AutoTextarea } from '@/components/shell/Auto'
import { Markdown } from '@/components/shell/Markdown'
import { TagList } from '@/components/shell/Tags'
import { setStatus, type Store } from '@/lib/data'
import { NEEDS_NOTE, STATUS, STATUS_ORDER, when, type Idea, type Status } from '@/lib/types'
import { VoteButton } from '@/views/IdeaRow'
import { Comments } from './Comments'
import { EditIdea } from './IdeaForm'

export function IdeaSheet({
  idea, store, editing, onVote, onOpen, onChanged, copyLink,
}: {
  idea: Idea
  store: Store
  editing: boolean // in place, as GitHub edits an issue: the panel's fields become editable
  onVote: (i: Idea) => void
  onOpen: (id: number) => void
  onChanged: () => void
  copyLink: () => void
}) {
  const { me } = store
  const original = idea.merged_into ? store.ideas.find(i => i.id === idea.merged_into) : undefined

  return (
    <>
      {editing ? (
        <EditIdea store={store} idea={idea} onChanged={onChanged} />
      ) : (
        <article className="flex flex-col gap-5">
          {/* Support sits beside the title, as on Kirby's idea page */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl leading-snug text-balance text-foreground">{idea.title}</h1>
              <p className="mt-1.5 text-xs text-muted-foreground">{idea.author_name}, {when(idea.created_at)}</p>
            </div>
            <VoteButton idea={idea} onVote={onVote} />
          </div>
          {idea.body && <Markdown className="text-base">{idea.body}</Markdown>}
          <TagList ids={idea.tag_ids} tags={store.tags} />
          {(idea.status_note || original) && (
            <div className="flex flex-col gap-1.5 border-l border-foreground pl-3">
              {original && (
                <button type="button" onClick={() => onOpen(original.id)} className="text-left text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
                  Duplicate of {original.title}. Support it there.
                </button>
              )}
              {idea.status_note && <Markdown>{idea.status_note}</Markdown>}
              {idea.status_by_name && idea.status_at && (
                <p className="text-xs text-muted-foreground">{idea.status_by_name}, {when(idea.status_at)}</p>
              )}
            </div>
          )}
        </article>
      )}


      <Comments idea={idea} me={me} onChanged={onChanged} copyLink={copyLink} />
    </>
  )
}

// Fider's "respond": pick a status, optionally say why. Status saves as soon as it's picked;
// a duplicate waits until you say which idea it duplicates. The note saves when you leave it.
export function StatusEditor({ idea, store, onSaved }: { idea: Idea; store: Store; onSaved: () => void }) {
  const [duplicate, setDuplicate] = useState(false)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const others = store.ideas.filter(i => i.id !== idea.id && i.status !== 'merged')
  const shown: Status = duplicate ? 'merged' : idea.status

  useEffect(() => {
    if (state !== 'saved') return
    const t = setTimeout(() => setState('idle'), 1600)
    return () => clearTimeout(t)
  }, [state])

  async function save(status: Status, into: number | null) {
    setState('saving')
    setError(null)
    try {
      await setStatus(idea.id, status, idea.status_note, into)
      setDuplicate(false)
      setState('saved')
      onSaved()
    } catch (e) {
      setState('idle')
      setError((e as Error).message)
    }
  }

  function pick(s: Status) {
    if (s === idea.status) return setDuplicate(false)
    if (s === 'merged') return setDuplicate(true)
    save(s, null)
  }

  return (
    <FieldGroup>
      <Field label="Status" aside={state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : undefined}>
        <Picker label="Status" value={shown} onChange={pick} options={STATUS_ORDER.map(s => ({ value: s, label: STATUS[s] }))} />
      </Field>
      {shown === 'merged' && (
        <Field label="Duplicate of">
          <Picker label="Duplicate of" value={String(idea.merged_into ?? '')}
            onChange={v => v && save('merged', Number(v))}
            options={[{ value: '', label: 'Choose the original' }, ...others.map(i => ({ value: String(i.id), label: i.title }))]} />
          <p className="px-1 text-xs text-muted-foreground">Support for this idea counts toward the original, and the people on it are told where it went.</p>
        </Field>
      )}
      <AutoTextarea label={NEEDS_NOTE.includes(shown) ? 'Reason' : 'Note to members'} value={idea.status_note ?? ''} className="min-h-14"
        onSave={v => setStatus(idea.id, idea.status, v || null, idea.merged_into).then(onSaved)} />
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </FieldGroup>
  )
}
