import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/shell/MarkdownEditor'
import { ToolButton } from '@/components/shell/ToolButton'
import { MAX_TAGS_PER_IDEA } from '@/components/shell/Tags'
import { useDialogs } from '@/components/shell/Dialogs'
import { createForumThread, createIdea, loadForumCategories, type Store } from '@/lib/data'
import type { ForumCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ComposeKind = 'idea' | 'discussion'
const LABEL: Record<ComposeKind, { name: string; titleMax: number; placeholder: string }> = {
  idea: { name: 'New idea', titleMax: 140, placeholder: 'What would change, and who would it help? Add any background, examples or links.' },
  discussion: { name: 'New discussion', titleMax: 180, placeholder: 'What would you like to talk about? Share the context, what you’ve tried, and what you’d like to hear from others.' },
}

// The draft is kept on this device until it's posted or discarded, so leaving loses nothing
type Draft = { title: string; body: string; tags: number[]; goal: string; category: number | null }
const empty: Draft = { title: '', body: '', tags: [], goal: '', category: null }
const draftKey = (kind: ComposeKind) => `community:draft-${kind}`
function readDraft(kind: ComposeKind): Draft {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(draftKey(kind)) ?? '{}') } } catch { return empty }
}
function keepDraft(kind: ComposeKind, d: Draft | null) {
  try { if (d) localStorage.setItem(draftKey(kind), JSON.stringify(d)); else localStorage.removeItem(draftKey(kind)) } catch { /* private mode */ }
}

// Writing a new idea or forum discussion, as a page that takes over the screen: a wide column for
// the title, where it goes (discussion areas for an idea, one category for a discussion) and the
// text, with Cancel at the top and Post at the bottom, both kept in view
export function Compose({ kind, store, onClose, onPosted, onOpen }: {
  kind: ComposeKind
  store: Store
  onClose: () => void
  onPosted: (where: number | string) => void // the new idea's id, or the discussion's slug
  onOpen: (id: number) => void
}) {
  const [d, setD] = useState<Draft>(() => readDraft(kind))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ForumCategory[]>([])
  useEffect(() => {
    if (kind === 'discussion') loadForumCategories().then(setCategories).catch(e => setError((e as Error).message))
  }, [kind])
  const { confirm } = useDialogs()
  const set = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }))
  const started = !!(d.title.trim() || d.body.trim())
  useEffect(() => { keepDraft(kind, started ? d : null) }, [kind, d, started])

  // Similar ideas as the title is typed, so people support what's there instead of posting it again
  const fuse = useMemo(() => new Fuse(store.ideas.filter(i => i.status !== 'merged' && i.status !== 'declined'), {
    keys: [{ name: 'title', weight: 0.7 }, { name: 'body', weight: 0.3 }], threshold: 0.4, ignoreLocation: true, minMatchCharLength: 3,
  }), [store.ideas])
  const similar = kind === 'idea' && d.title.trim().length >= 4 ? fuse.search(d.title.trim(), { limit: 3 }).map(r => r.item) : []

  async function cancel() {
    if (started && !(await confirm({ title: kind === 'idea' ? 'Discard this idea?' : 'Discard this discussion?', body: 'What you’ve written here is deleted.', action: 'Discard', destructive: true }))) return
    keepDraft(kind, null)
    onClose()
  }

  async function post() {
    if (busy) return
    if (d.title.trim().length < 3) { setError('Give it a title.'); return }
    if (kind === 'discussion' && !d.category) { setError('Choose a category.'); return }
    setBusy(true)
    setError(null)
    try {
      const where = kind === 'idea'
        ? await createIdea({ title: d.title.trim(), body: d.body.trim(), goal_id: d.goal ? Number(d.goal) : null }, d.tags)
        : await createForumThread({ category_id: d.category!, title: d.title.trim(), body: d.body.trim() })
      keepDraft(kind, null)
      onPosted(where)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  // Escape cancels, as the X does
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) cancel() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <div className="page-in fixed inset-0 z-50 overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label={LABEL[kind].name}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-background/90 px-5 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}>
        <ToolButton icon={X} label="Cancel" side="bottom" onClick={cancel} className="-ml-2" />
        <p className="truncate text-sm text-muted-foreground">{started ? 'Draft kept on this device' : LABEL[kind].name}</p>
        <span className="size-10" aria-hidden />
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pt-6 pb-6">
        <textarea value={d.title} onChange={e => set({ title: e.target.value.replace(/\n/g, ' ') })} maxLength={LABEL[kind].titleMax} rows={1} autoFocus
          placeholder="Title" aria-label="Title" enterKeyHint="next"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector<HTMLTextAreaElement>('[aria-label="Details"]')?.focus() } }}
          className="field-sizing-content w-full resize-none bg-transparent text-[length:calc(var(--text-sm)*1.75)] leading-tight text-foreground outline-none placeholder:text-muted-foreground" />

        {similar.length > 0 && (
          <div className="-mt-2 flex flex-col">
            <p className="pb-1 text-xs text-muted-foreground">Already suggested? Support it instead</p>
            {similar.map(i => (
              <button key={i.id} type="button" onClick={() => onOpen(i.id)}
                className="flex items-baseline justify-between gap-3 border-t border-border py-2.5 text-left text-sm text-foreground outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0">{i.title}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{i.vote_count}</span>
              </button>
            ))}
          </div>
        )}

        {kind === 'discussion' && categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Category</p>
            <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
              {categories.map(c => (
                <Chip key={c.id} role="radio" on={d.category === c.id} title={c.description || undefined} onClick={() => set({ category: c.id })}>{c.name}</Chip>
              ))}
            </div>
            {d.category && <p className="text-xs text-muted-foreground">{categories.find(c => c.id === d.category)?.description}</p>}
          </div>
        )}

        {kind === 'idea' && (store.tags.length > 0 || store.goals.length > 0) && (
          <div className="flex flex-col gap-4">
            {store.tags.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Discussion area <span className="font-mono tabular-nums">{d.tags.length}/{MAX_TAGS_PER_IDEA}</span></p>
                <div role="group" aria-label="Discussion area" className="flex flex-wrap gap-2">
                  {store.tags.map(t => {
                    const on = d.tags.includes(t.id)
                    return (
                      <Chip key={t.id} on={on} disabled={!on && d.tags.length >= MAX_TAGS_PER_IDEA}
                        onClick={() => set({ tags: on ? d.tags.filter(x => x !== t.id) : [...d.tags, t.id] })}>{t.name}</Chip>
                    )
                  })}
                </div>
              </div>
            )}
            {store.goals.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Goal</p>
                <div role="radiogroup" aria-label="Goal" className="flex flex-wrap gap-2">
                  {store.goals.map(g => (
                    <Chip key={g.id} role="radio" on={d.goal === String(g.id)} onClick={() => set({ goal: d.goal === String(g.id) ? '' : String(g.id) })}>{g.title}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <MarkdownEditor label="Details" value={d.body} onChange={body => set({ body: body.slice(0, 12000) })} minRows={16}
          placeholder={LABEL[kind].placeholder}
          toolbarClassName="sticky top-[calc(env(safe-area-inset-top,0px)+64px)] z-[5] border-t" />

      </div>

      {/* Post, at the end of the writing column, kept in view at the bottom */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-4 px-5 py-3">
          {error && <p role="alert" className="mr-auto text-xs text-destructive">{error}</p>}
          <Button onClick={post} disabled={busy || d.title.trim().length < 3 || (kind === 'discussion' && !d.category)} className="h-9 rounded-full px-5 text-sm">
            {busy ? 'Posting' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// A small choice chip: filled when chosen
function Chip({ on, role, children, ...props }: { on: boolean; role?: 'radio' } & Omit<React.ComponentProps<'button'>, 'role'>) {
  return (
    <button type="button" role={role} aria-checked={role ? on : undefined} aria-pressed={role ? undefined : on} {...props}
      className={cn('h-7 rounded-full border px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30',
        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-accent')}>
      {children}
    </button>
  )
}
