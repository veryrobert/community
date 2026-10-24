import { Check, Ellipsis } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Markdown } from '@/components/shell/Markdown'
import { useDialogs } from '@/components/shell/Dialogs'
import { deleteUpdate } from '@/lib/data'
import { date } from '@/lib/types'
import type { Store } from '@/lib/data'

export function Updates({ store, onOpen, onChanged }: { store: Store; onOpen: (id: number) => void; onChanged: () => void }) {
  const { confirm } = useDialogs()
  const idea = new Map(store.ideas.map(i => [i.id, i]))
  const facilitator = store.me.role === 'facilitator'

  if (!store.updates.length) {
    return (
      <p className="mx-auto max-w-2xl px-5 text-sm text-muted-foreground">
        {facilitator ? 'No updates yet. Publish the first one with the plus below.' : 'No updates yet. Facilitators post progress here.'}
      </p>
    )
  }

  return (
    <ol className="mx-auto w-full max-w-2xl px-5">
      {store.updates.map(u => (
        <li key={u.id} className="group grid gap-x-8 gap-y-2 border-t border-border py-8 sm:grid-cols-[7rem_1fr]">
          <time dateTime={u.created_at} className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{date(u.created_at)}</time>
          <article className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg leading-snug text-foreground">{u.title}</h2>
              {facilitator && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={`Update options, ${u.title}`}
                      className="-mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:data-[state=open]:opacity-100">
                      <Ellipsis className="size-4" strokeWidth={1.5} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-40">
                    <DropdownMenuItem variant="destructive" onSelect={async () => {
                      if (await confirm({ title: 'Delete update?', body: 'The ideas it mentions stay as they are.', action: 'Delete update', destructive: true })) deleteUpdate(u.id).then(onChanged)
                    }}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {u.body && <Markdown className="mt-2 max-w-[62ch] text-muted-foreground">{u.body}</Markdown>}
            {u.update_ideas.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {u.update_ideas.map(({ idea_id }) => {
                  const i = idea.get(idea_id)
                  return i && (
                    <li key={idea_id}>
                      <button type="button" onClick={() => onOpen(i.id)} className="inline-flex items-start gap-1.5 rounded text-left text-sm text-foreground underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring">
                        {i.status === 'done' && <Check className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />}
                        {i.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ol>
  )
}
