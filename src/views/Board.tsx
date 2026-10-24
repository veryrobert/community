import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { ArrowDownUp, ChevronDown, ListFilter } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ACTIVE, type Idea } from '@/lib/types'
import type { Store } from '@/lib/data'
import { IdeaRow } from './IdeaRow'

type Show = 'open' | 'done' | 'closed' | 'all'
type Order = 'votes' | 'new' | 'updated' | 'discussed'

const ORDER: Record<Order, string> = { votes: 'Top', new: 'Newest', updated: 'Updated', discussed: 'Most comments' }
const SHOW: Record<Show, string> = { open: 'Open', done: 'Done', closed: 'Not proceeding', all: 'All' }

// The list. A bar above it orders and filters, as on Kirby's board; search opens from the top bar.
export function Board({ store, onOpen, onVote, searching, onHome }: { store: Store; onOpen: (id: number) => void; onVote: (i: Idea) => void; searching: boolean; onHome: () => void }) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<Show>('open')
  const [order, setOrder] = useState<Order>('votes')
  const [tags, setTags] = useState<number[]>([])
  const [mine, setMine] = useState(false)

  const ideas = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.ideas
      .filter(i => show === 'all' || (show === 'open' ? ACTIVE.includes(i.status) : show === 'done' ? i.status === 'done' : ['hold', 'declined', 'merged'].includes(i.status)))
      .filter(i => !tags.length || tags.some(t => i.tag_ids.includes(t)))
      .filter(i => !mine || i.my_role !== null || i.voted)
      .filter(i => !q || i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q))
      .sort((a, b) =>
        order === 'new' ? b.created_at.localeCompare(a.created_at)
        : order === 'updated' ? b.updated_at.localeCompare(a.updated_at)
        : order === 'discussed' ? b.comment_count - a.comment_count || b.vote_count - a.vote_count
        : b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at))
  }, [store.ideas, query, show, order, tags, mine])

  const active = (show !== 'open' ? 1 : 0) + tags.length + (mine ? 1 : 0)
  const bar = 'inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground'

  return (
    <div className="mx-auto w-full max-w-2xl px-5">
      {searching && (
        <div className="pb-2">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ideas" aria-label="Search ideas" enterKeyHint="search" autoFocus />
        </div>
      )}

      {/* Title on the left; order and filters on the right */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h1 className="text-sm text-foreground">
          {/* Back to the default view: Top, no filters, no search, at the top */}
          <button type="button" onClick={onHome} className="-ml-1 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">Ideas</button>
        </h1>
        <div className="-mr-3 flex items-center gap-1 text-muted-foreground">
        <DropdownMenu>
          <DropdownMenuTrigger className={bar}>
            <ArrowDownUp className="size-4" strokeWidth={1.5} aria-hidden />
            {ORDER[order]}
            <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuRadioGroup value={order} onValueChange={v => setOrder(v as Order)}>
              {(Object.keys(ORDER) as Order[]).map(o => <DropdownMenuRadioItem key={o} value={o} className="h-10 text-sm">{ORDER[o]}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(bar, active > 0 && 'text-foreground')}>
            <ListFilter className="size-4" strokeWidth={1.5} aria-hidden />
            Filter{active > 0 && <span className="font-mono text-xs tabular-nums">{active}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={show} onValueChange={v => setShow(v as Show)}>
              {(Object.keys(SHOW) as Show[]).map(o => <DropdownMenuRadioItem key={o} value={o} className="h-10 text-sm">{SHOW[o]}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
            {store.tags.length > 0 && (<>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Tags</DropdownMenuLabel>
              {store.tags.map(t => (
                <DropdownMenuCheckboxItem key={t.id} className="h-10 text-sm" checked={tags.includes(t.id)} onSelect={e => e.preventDefault()}
                  onCheckedChange={on => setTags(ts => on ? [...ts, t.id] : ts.filter(x => x !== t.id))}>{t.name}</DropdownMenuCheckboxItem>
              ))}
            </>)}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem className="h-10 text-sm" checked={mine} onSelect={e => e.preventDefault()} onCheckedChange={setMine}>Following</DropdownMenuCheckboxItem>
            {active > 0 && (<>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="h-10 text-sm" onSelect={() => { setShow('open'); setTags([]); setMine(false) }}>Clear filters</DropdownMenuItem>
            </>)}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {ideas.length ? (
        <ul className="pt-3">
          {ideas.map(i => <IdeaRow key={i.id} idea={i} onOpen={onOpen} onVote={onVote} />)}
        </ul>
      ) : (
        <p className="py-10 text-sm text-muted-foreground">
          {store.ideas.length ? 'No ideas match.' : 'No ideas yet. Post the first one with the plus below.'}
        </p>
      )}
    </div>
  )
}
