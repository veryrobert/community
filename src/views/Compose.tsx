import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { ChevronDown, SquarePen, X } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
type Draft = { title: string; body: string; tags: number[]; category: number | null }
const empty: Draft = { title: '', body: '', tags: [], category: null }
const draftKey = (kind: ComposeKind) => `community:draft-${kind}`
function readDraft(kind: ComposeKind): Draft {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(draftKey(kind)) ?? '{}') } } catch { return empty }
}
function keepDraft(kind: ComposeKind, d: Draft | null) {
  try { if (d) localStorage.setItem(draftKey(kind), JSON.stringify(d)); else localStorage.removeItem(draftKey(kind)) } catch { /* private mode */ }
}

// Writing a new idea or forum discussion, as a page that takes over the screen
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
        ? await createIdea({ title: d.title.trim(), body: d.body.trim(), goal_id: null }, d.tags)
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="alertdialog"], [role="menu"]')) cancel() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const chosen = kind === 'discussion'
    ? categories.find(c => c.id === d.category)?.name
    : store.tags.filter(t => d.tags.includes(t.id)).map(t => t.name).join(', ')
  const row = 'flex w-full items-center gap-3 border-b border-border px-5'

  // Rows from top to bottom, each on a hairline, as in Discourse's composer: what this is and close;
  // where it goes; the title; the text, filling the space; formatting; Discard and Post
  return (
    <div className="page-in fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={LABEL[kind].name}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col sm:border-x sm:border-border">
        <header className={cn(row, 'h-14 justify-between pr-3')}>
          <h1 className="inline-flex items-center gap-2 text-sm text-foreground">
            <SquarePen className="size-4" strokeWidth={1.5} aria-hidden />{LABEL[kind].name}
          </h1>
          <ToolButton icon={X} label="Close" side="bottom" onClick={cancel} className="size-9 [&_svg]:size-4" />
        </header>

        {/* Where it goes: one category for a discussion, up to three areas for an idea */}
        {(kind === 'discussion' ? categories.length > 0 : store.tags.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(row, 'h-14 justify-between text-left text-base outline-none hover:bg-card focus-visible:bg-card md:text-sm data-[state=open]:bg-card')}>
              <span className={cn('truncate', chosen ? 'text-foreground' : 'text-muted-foreground')}>
                {chosen || (kind === 'discussion' ? 'Category…' : 'Discussion areas…')}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-(--radix-dropdown-menu-trigger-width)">
              {kind === 'discussion' ? (
                <DropdownMenuRadioGroup value={String(d.category ?? '')} onValueChange={v => set({ category: Number(v) })}>
                  {categories.map(c => (
                    <DropdownMenuRadioItem key={c.id} value={String(c.id)} className="py-2">
                      <span className="flex flex-col">
                        <span className="text-sm">{c.name}</span>
                        {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              ) : (<>
                {store.tags.map(t => {
                  const on = d.tags.includes(t.id)
                  return (
                    <DropdownMenuCheckboxItem key={t.id} checked={on} disabled={!on && d.tags.length >= MAX_TAGS_PER_IDEA} onSelect={e => e.preventDefault()}
                      onCheckedChange={c => set({ tags: c ? [...d.tags, t.id] : d.tags.filter(x => x !== t.id) })} className="h-10 text-sm">
                      {t.name}
                    </DropdownMenuCheckboxItem>
                  )
                })}
                <p className="px-3 py-1.5 text-xs text-muted-foreground">Up to {MAX_TAGS_PER_IDEA}</p>
              </>)}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <input value={d.title} onChange={e => set({ title: e.target.value })} maxLength={LABEL[kind].titleMax} autoFocus
          placeholder="Title" aria-label="Title" enterKeyHint="next"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector<HTMLTextAreaElement>('[aria-label="Details"]')?.focus() } }}
          className={cn(row, 'h-14 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground')} />

        {similar.length > 0 && (
          <div className="flex flex-col border-b border-border px-5 py-2">
            <p className="py-1 text-xs text-muted-foreground">Already suggested? Support it instead</p>
            {similar.map(i => (
              <button key={i.id} type="button" onClick={() => onOpen(i.id)}
                className="flex items-baseline justify-between gap-3 py-1.5 text-left text-sm text-foreground outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0 truncate">{i.title}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{i.vote_count}</span>
              </button>
            ))}
          </div>
        )}

        <MarkdownEditor label="Details" value={d.body} onChange={body => set({ body: body.slice(0, 12000) })} placeholder={LABEL[kind].placeholder} />

        <footer className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5">
          {error && <p role="alert" className="mr-auto pl-2 text-xs text-destructive">{error}</p>}
          {!error && started && <p className="mr-auto pl-2 text-xs text-muted-foreground">Draft kept on this device</p>}
          <Button variant="ghost" onClick={cancel} className="h-9 rounded-full px-4 text-sm">Discard</Button>
          <Button onClick={post} disabled={busy || d.title.trim().length < 3 || (kind === 'discussion' && !d.category)} className="h-9 rounded-full px-5 text-sm">
            {busy ? 'Posting' : 'Post'}
          </Button>
        </footer>
      </div>
    </div>
  )
}

