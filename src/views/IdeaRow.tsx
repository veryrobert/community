import { Check, Triangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS, type Idea } from '@/lib/types'
import { plain } from '@/components/shell/Markdown'

// Support as a pill: arrow and count side by side, as on Kirby's board. Filled when you support it.
export function VoteButton({ idea, onVote }: { idea: Idea; onVote: (i: Idea) => void }) {
  // A duplicate's support counts toward its original, so it takes no more of its own
  const closed = idea.status === 'merged'
  return (
    <button
      type="button"
      disabled={closed}
      title={closed ? 'Duplicate: support the original' : undefined}
      onClick={e => { e.stopPropagation(); onVote(idea) }}
      aria-pressed={idea.voted}
      aria-label={closed ? `Duplicate, ${idea.vote_count} supported it` : idea.voted ? `Remove support, ${idea.vote_count} supporting` : `Support, ${idea.vote_count} supporting`}
      className={cn(
        // One small size everywhere; voted or not, the box is identical and only the fill changes
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] border px-2.5 font-mono text-xs tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        idea.voted ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-accent',
        closed && 'opacity-40 hover:bg-transparent',
      )}
    >
      <Triangle className={cn('size-3', idea.voted && 'fill-current')} strokeWidth={1.5} aria-hidden />
      {idea.vote_count}
    </button>
  )
}

// A status reads as text; done gets a tick
export function StatusLabel({ status }: { status: Idea['status'] }) {
  return (
    <span className={cn('inline-flex items-center gap-1', status === 'done' ? 'text-foreground' : 'text-muted-foreground')}>
      {status === 'done' && <Check className="size-3.5" strokeWidth={1.5} aria-hidden />}
      {STATUS[status]}
    </span>
  )
}

// Title, one line of its text, then support and status
export function IdeaRow({ idea, onOpen, onVote }: { idea: Idea; onOpen: (id: number) => void; onVote: (i: Idea) => void }) {
  return (
    // A barely-off-black wash on hover (mouse only), widened past the text so nothing moves.
    // The top is 2px short of the bottom to make up for the title's line height, so they look even.
    // The whole row opens the idea (the title is the button for keyboards); support stops the click
    <li onClick={() => onOpen(idea.id)} className="-mx-4 cursor-pointer rounded-[2px] px-4 pt-[22px] pb-6 transition-colors duration-300 ease-out hover:bg-card">
      <button type="button" onClick={e => { e.stopPropagation(); onOpen(idea.id) }} className="block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="block text-base leading-snug text-foreground">{idea.title}</span>
        {idea.body && <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground">{plain(idea.body)}</span>}
      </button>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <VoteButton idea={idea} onVote={onVote} />
        {idea.status !== 'open' && <StatusLabel status={idea.status} />}
      </div>
    </li>
  )
}
