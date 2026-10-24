import { useState, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { ROADMAP, STATUS, type Idea, type Status } from '@/lib/types'
import { setStatus, type Store } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Triangle } from 'lucide-react'

// Facilitators drag a card to another column to change its status. On phones it's a press and
// hold, so a quick swipe still scrolls the columns. Keyboard: focus a card's handle, Space, arrows, Space.
export function Roadmap({ store, onOpen, openId, onError }: {
  store: Store
  onOpen: (id: number) => void
  openId: number | null
  onError: (message: string) => void
}) {
  const facilitator = store.me.role === 'facilitator'
  const [moved, setMoved] = useState<Record<number, Status>>({}) // shown straight away, until the reload lands
  const [dragging, setDragging] = useState<Idea | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] } }),
  )

  const statusOf = (i: Idea) => moved[i.id] ?? i.status

  async function drop(e: DragEndEvent) {
    setDragging(null)
    const idea = store.ideas.find(i => i.id === e.active.id)
    const to = e.over?.id as Status | undefined
    if (!idea || !to || to === statusOf(idea)) return
    setMoved(m => ({ ...m, [idea.id]: to }))
    try {
      await setStatus(idea.id, to, idea.status_note, null)
    } catch (err) {
      onError((err as Error).message)
    } finally {
      setMoved(m => { const { [idea.id]: _, ...rest } = m; return rest })
    }
  }

  const board = (
    <div className="flex snap-x snap-mandatory scroll-px-5 gap-6 overflow-x-auto px-5 pb-6 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pr-20">
      {ROADMAP.map(status => {
        const ideas = store.ideas
          .filter(i => statusOf(i) === status)
          .sort((a, b) => status === 'done' ? b.updated_at.localeCompare(a.updated_at) : b.vote_count - a.vote_count)
        return (
          <Column key={status} status={status} count={ideas.length} enabled={facilitator}>
            {ideas.length ? (
              <ul className="flex flex-col gap-2 pt-3">
                {ideas.map(i => (
                  <Card key={i.id} idea={i} enabled={facilitator} selected={openId === i.id} onOpen={onOpen} />
                ))}
              </ul>
            ) : (
              <p className="py-3 text-xs text-muted-foreground">{facilitator ? 'Drag ideas here' : 'Nothing here yet'}</p>
            )}
          </Column>
        )
      })}
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-6xl">
      {facilitator ? (
        <DndContext sensors={sensors} onDragStart={e => setDragging(store.ideas.find(i => i.id === e.active.id) ?? null)} onDragEnd={drop} onDragCancel={() => setDragging(null)}>
          {board}
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className="flex h-28 rounded-[2px] border border-border bg-accent p-4 text-sm leading-snug text-foreground"><span className="line-clamp-3">{dragging.title}</span></div>
            )}
          </DragOverlay>
        </DndContext>
      ) : board}
    </div>
  )
}

function Column({ status, count, enabled, children }: { status: Status; count: number; enabled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !enabled })
  return (
    <section ref={setNodeRef} aria-label={STATUS[status]} className={cn('w-[78vw] shrink-0 snap-start rounded-lg transition-colors sm:w-auto', isOver && 'bg-accent/50')}>
      <h2 className="flex items-baseline justify-between border-b border-border pb-2 text-sm text-foreground">
        {STATUS[status]}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  )
}

// A card is one outlined rectangle, all the same height, that opens the idea; support shows as a count, voted on the idea's page
function Card({ idea, enabled, selected, onOpen }: { idea: Idea; enabled: boolean; selected: boolean; onOpen: (id: number) => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: idea.id, disabled: !enabled })
  return (
    <li ref={setNodeRef} className={cn(isDragging && 'opacity-30')}>
      <button type="button" onClick={() => onOpen(idea.id)}
        {...(enabled ? { ...listeners, ...attributes, 'aria-roledescription': 'draggable idea' } : {})}
        className={cn('flex h-28 w-full flex-col justify-between gap-3 rounded-[2px] border border-border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          selected ? 'bg-accent' : 'hover:bg-accent', enabled && 'touch-manipulation')}>
        <span className="line-clamp-3 text-sm leading-snug text-foreground">{idea.title}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums" aria-label={`${idea.vote_count} supporting${idea.voted ? ', including you' : ''}`}>
          <Triangle className={cn('size-3', idea.voted && 'fill-current text-foreground')} strokeWidth={1.5} aria-hidden />
          {idea.vote_count}
        </span>
      </button>
    </li>
  )
}
