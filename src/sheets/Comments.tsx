import { useCallback, useEffect, useRef, useState } from 'react'
import { Ellipsis, Heart } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup } from '@/components/shell/Field'
import { SendField } from '@/components/shell/SendField'
import { Markdown } from '@/components/shell/Markdown'
import { useDialogs } from '@/components/shell/Dialogs'
import { Avatar } from '@/components/shell/Avatar'
import { cn } from '@/lib/utils'
import { addComment, deleteComment, editComment, hideComment, likeComment, loadComments, watchComments } from '@/lib/data'
import { HIDE_REASONS, type Comment, type HideReason, type Idea, type Profile } from '@/lib/types'

// Comments as on GitHub: one quiet ⋯ per comment holds its actions (it fades in on hover where
// there's a mouse, and stays visible on touch). Edit happens in place; delete asks first.
export function Comments({ idea, me, onChanged, copyLink }: { idea: Idea; me: Profile; onChanged: () => void; copyLink: () => void }) {
  const facilitator = me.role === 'facilitator'
  const { confirm } = useDialogs()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [quote, setQuote] = useState({ key: 0, text: '' })
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => loadComments(idea.id).then(setComments).catch(e => setError(e.message)), [idea.id])
  useEffect(() => { refresh(); return watchComments(idea.id, refresh) }, [idea.id, refresh])

  async function run(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await refresh()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Likes change straight away, then settle with the server
  function like(c: Comment) {
    setComments(cs => cs && cs.map(x => x.id === c.id ? { ...x, liked: !x.liked, like_count: x.like_count + (x.liked ? -1 : 1) } : x))
    likeComment(c.id, me.id, !c.liked).catch(() => refresh())
  }

  return (
    <FieldGroup title="Comments">
      {comments && comments.length > 0 && (
        <ul className="-mt-2 flex flex-col">
          {comments.map(c => {
            const mine = c.author_id === me.id
            return (
              <li key={c.id} className="group flex gap-4 px-1 py-5">
                <Avatar name={c.author_name} url={c.author_avatar} />
                <div className="min-w-0 flex-1">
                {c.hidden ? (
                  <p className={cn('mt-1 text-sm text-muted-foreground')}>
                    Hidden as {HIDE_REASONS[c.hidden_reason ?? 'off-topic'].toLowerCase()}. Only {facilitator ? 'the author and facilitators' : 'you and facilitators'} can see it.
                  </p>
                ) : editing === c.id ? (
                  <EditComment comment={c} onDone={body => { setEditing(null); if (body !== null && body !== c.body) run(() => editComment(c.id, body)) }} />
                ) : (
                  <Markdown className="text-base">{c.body}</Markdown>
                )}
                {c.hidden && (facilitator || mine) && <Markdown className="mt-2 opacity-50">{c.body}</Markdown>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{c.author_name}</span>
                    <span aria-hidden>·</span>
                    <button type="button" onClick={() => like(c)} aria-pressed={c.liked} aria-label={`${c.liked ? "Unlike" : "Like"}, ${c.like_count} ${c.like_count === 1 ? "like" : "likes"}`}
                      className={cn('-my-2 inline-flex h-8 items-center gap-1.5 rounded-full px-1.5 font-mono tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', c.liked && 'text-foreground')}>
                      <Heart className={cn('size-4', c.liked && 'fill-current')} strokeWidth={1.5} aria-hidden />
                      {c.like_count > 0 && c.like_count}
                    </button>
                    <span className="flex-1" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={`Comment options, ${c.author_name}`}
                        className="-my-2 -mr-2 grid size-8 shrink-0 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:data-[state=open]:opacity-100">
                        <Ellipsis className="size-4" strokeWidth={1.5} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      <DropdownMenuItem onSelect={copyLink}>Copy link</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setQuote(q => ({ key: q.key + 1, text: c.body.split('\n').map(l => `> ${l}`).join('\n') + '\n\n' }))}>Quote reply</DropdownMenuItem>
                      {mine && !c.hidden && <DropdownMenuItem onSelect={() => setEditing(c.id)}>Edit</DropdownMenuItem>}
                      {(facilitator || mine) && <DropdownMenuSeparator />}
                      {facilitator && (c.hidden ? (
                        <DropdownMenuItem onSelect={() => run(() => hideComment(c.id, null))}>Unhide</DropdownMenuItem>
                      ) : (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Hide</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {(Object.keys(HIDE_REASONS) as HideReason[]).map(r => (
                              <DropdownMenuItem key={r} onSelect={() => run(() => hideComment(c.id, r))}>{HIDE_REASONS[r]}</DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))}
                      {(facilitator || mine) && (
                        <DropdownMenuItem variant="destructive" onSelect={async () => {
                          if (await confirm({ title: 'Delete comment?', body: 'This can’t be undone.', action: 'Delete comment', destructive: true })) run(() => deleteComment(c.id))
                        }}>Delete</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {comments?.length === 0 && <p className="px-1 text-xs text-muted-foreground">No comments yet</p>}
      <SendField key={quote.key} initialValue={quote.text} label="Comment" placeholder="Add a comment" multiline autoFocus={quote.key > 0}
        onSend={v => run(() => addComment(idea.id, v))} />
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </FieldGroup>
  )
}

// Edits in place: leaving the field saves, Escape cancels
function EditComment({ comment, onDone }: { comment: Comment; onDone: (body: string | null) => void }) {
  const [body, setBody] = useState(comment.body)
  const cancelled = useRef(false)
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <Textarea value={body} onChange={e => setBody(e.target.value)} autoFocus aria-label="Edit comment" data-own-escape=""
        onKeyDown={e => { if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() } }}
        onBlur={() => onDone(cancelled.current || !body.trim() ? null : body.trim())} />
      <p className="px-1 text-xs text-muted-foreground">Saves when you leave the field</p>
    </div>
  )
}
