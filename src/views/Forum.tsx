import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, ChevronLeft, Ellipsis, Lock, Pin, Reply, X } from 'lucide-react'
import { Avatar } from '@/components/shell/Avatar'
import { Markdown, plain } from '@/components/shell/Markdown'
import { SendField } from '@/components/shell/SendField'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { addForumPost, followForumThread, hideForumPost, loadForumCategories, loadForumPosts, loadForumThread, loadForumThreads, markForumRead, setForumThread, watchForum } from '@/lib/data'
import { cn } from '@/lib/utils'
import { HIDE_REASONS, type ForumCategory, type ForumPost, type ForumThread } from '@/lib/types'
import type { Store } from '@/lib/data'

const ALL = 0

export function Forum({ store, threadId, onOpen, onBack }: { store: Store; threadId: string | null; onOpen: (slug: string) => void; onBack: () => void }) {
  return threadId ? <Thread store={store} slug={threadId} onBack={onBack} /> : <ForumList onOpen={onOpen} />
}

function ForumList({ onOpen }: { onOpen: (slug: string) => void }) {
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [category, setCategory] = useState(ALL)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { const [cs, ts] = await Promise.all([loadForumCategories(), loadForumThreads(category || undefined)]); setCategories(cs); setThreads(ts); setError(null) }
    catch (e) { setError((e as Error).message) }
  }, [category])
  useEffect(() => { load(); return watchForum(null, load) }, [load])
  const categoryName = (id: number) => categories.find(c => c.id === id)?.name ?? 'Discussion'
  return (
    <div className="mx-auto w-full max-w-2xl px-5">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h1 className="text-sm text-foreground">Forum</h1>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{threads.length} discussions</span>
      </div>
      <nav aria-label="Forum categories" className="-mx-1 flex gap-1 overflow-x-auto py-4">
        <CategoryButton active={category === ALL} onClick={() => setCategory(ALL)}>All</CategoryButton>
        {categories.map(c => <CategoryButton key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</CategoryButton>)}
      </nav>
      {category !== ALL && categories.find(c => c.id === category)?.description && <p className="pb-4 text-xs text-muted-foreground">{categories.find(c => c.id === category)?.description}</p>}
      {threads.length ? <ul className="flex flex-col">{threads.map(t => <li key={t.id}>
        <button type="button" onClick={() => onOpen(t.slug)} className="group -mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-[3px] px-3 py-4 text-left outline-none transition-colors duration-200 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar name={t.author_name} url={t.author_avatar} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm text-foreground">{t.title}</span>{t.pinned && <Pin className="size-3.5 text-muted-foreground" strokeWidth={1.5} aria-label="Pinned" />}{t.closed && <Lock className="size-3.5 text-muted-foreground" strokeWidth={1.5} aria-label="Closed" />}{t.unread && <span className="size-1.5 rounded-full bg-foreground" aria-label="Unread" />}</span>
            {t.body && <span className="mt-1 block truncate text-xs text-muted-foreground">{plain(t.body)}</span>}
            <span className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground"><span>{categoryName(t.category_id)}</span><span aria-hidden>·</span><span>{t.author_name}</span><span aria-hidden>·</span><span>{t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}</span>{t.last_reply_name && <><span aria-hidden>·</span><span>latest by {t.last_reply_name}</span></>}</span>
          </span>
        </button>
      </li>)}</ul> : <p className="pt-10 text-sm text-muted-foreground">No discussions here yet.</p>}
      {error && <p role="alert" className="pt-4 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className="shrink-0 rounded-md px-2 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:text-foreground">{children}</button>
}

function Thread({ store, slug, onBack }: { store: Store; slug: string; onBack: () => void }) {
  const [thread, setThread] = useState<ForumThread | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [replyingTo, setReplyingTo] = useState<ForumPost | null>(null)
  const [error, setError] = useState<string | null>(null)
  const facilitator = store.me.role === 'facilitator'
  const load = useCallback(async () => { try { const t = await loadForumThread(slug); const ps = await loadForumPosts(t.id); setThread(t); setPosts(ps); setError(null); markForumRead(t.id).catch(() => {}) } catch (e) { setError((e as Error).message) } }, [slug])
  useEffect(() => { load(); return watchForum(thread?.id ?? null, load) }, [thread?.id, load])
  const children = useMemo(() => { const m = new Map<number | null, ForumPost[]>(); posts.forEach(p => { const list = m.get(p.parent_id) ?? []; list.push(p); m.set(p.parent_id, list) }); return m }, [posts])
  async function reply(body: string) { await addForumPost(thread?.id ?? 0, body, replyingTo?.id ?? null); setReplyingTo(null) }
  if (error) return <div className="mx-auto max-w-2xl px-5"><button onClick={onBack} className="text-sm text-muted-foreground">Back to forum</button><p className="pt-8 text-sm text-destructive">{error}</p></div>
  if (!thread) return null
  return <div className="mx-auto w-full max-w-2xl px-5">
    <button type="button" onClick={onBack} className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ChevronLeft className="size-4" strokeWidth={1.5} />Forum</button>
    <article className="pt-8">
      <div className="flex items-start justify-between gap-4"><h1 className="text-xl text-foreground">{thread.title}</h1><ThreadMenu thread={thread} facilitator={facilitator} onChanged={load} /></div>
      <div className="mt-5 flex gap-4"><Avatar name={thread.author_name} url={thread.author_avatar} /><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{thread.author_name}</p>{thread.body && <Markdown className="mt-3 text-base">{thread.body}</Markdown>}</div></div>
    </article>
    <section className="mt-10 border-t border-border pt-2">
      {children.get(null)?.map(post => <PostBranch key={post.id} post={post} children={children} me={store.me.id} facilitator={facilitator} onReply={setReplyingTo} onChanged={load} depth={0} />)}
    </section>
    {!thread.closed && !thread.hidden && <div className="mt-6 border-t border-border pt-5"><div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{replyingTo ? `Replying to ${replyingTo.author_name}` : 'Add a reply'}</span>{replyingTo && <button onClick={() => setReplyingTo(null)} className="inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="size-3.5" />Cancel</button>}</div><SendField key={replyingTo?.id ?? 0} initialValue={replyingTo ? `> ${plain(replyingTo.body)}\n\n` : ''} label="Reply" placeholder="Write a reply" multiline onSend={reply} /></div>}
    {thread.closed && <p className="mt-6 text-xs text-muted-foreground">This discussion is closed to new replies.</p>}
  </div>
}

function PostBranch({ post, children, me, facilitator, onReply, onChanged, depth }: { post: ForumPost; children: Map<number | null, ForumPost[]>; me: string; facilitator: boolean; onReply: (post: ForumPost) => void; onChanged: () => void; depth: number }) {
  const nested = children.get(post.id) ?? []
  const mine = post.author_id === me
  return <div className={cn('relative', depth > 0 && 'ml-4 border-l border-border pl-4 sm:ml-7')}>
    <article className="group flex gap-4 py-5"><Avatar name={post.author_name} url={post.author_avatar} /><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{post.author_name}</p>{post.hidden ? <p className="mt-2 text-sm text-muted-foreground">Hidden as {HIDE_REASONS[post.hidden_reason ?? 'off-topic'].toLowerCase()}.</p> : <Markdown className="mt-2 text-base">{post.body}</Markdown>}<div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><button onClick={() => onReply(post)} className="inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Reply className="size-3.5" strokeWidth={1.5} />Reply</button>{(facilitator || mine) && <PostMenu post={post} facilitator={facilitator} onChanged={onChanged} />}</div></div></article>
    {nested.map(child => <PostBranch key={child.id} post={child} children={children} me={me} facilitator={facilitator} onReply={onReply} onChanged={onChanged} depth={depth + 1} />)}
  </div>
}

function ThreadMenu({ thread, facilitator, onChanged }: { thread: ForumThread; facilitator: boolean; onChanged: () => void }) {
  if (!facilitator) return thread.following ? <button onClick={() => followForumThread(thread.id, false).then(onChanged)} className="grid size-8 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Unfollow discussion"><Bell className="size-4" strokeWidth={1.5} /></button> : <button onClick={() => followForumThread(thread.id, true).then(onChanged)} className="grid size-8 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Follow discussion"><BellOff className="size-4" strokeWidth={1.5} /></button>
  return <DropdownMenu><DropdownMenuTrigger aria-label="Discussion options" className="grid size-8 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Ellipsis className="size-4" strokeWidth={1.5} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setForumThread(thread.id, { pinned: !thread.pinned }).then(onChanged)}>{thread.pinned ? 'Unpin discussion' : 'Pin discussion'}</DropdownMenuItem><DropdownMenuItem onSelect={() => setForumThread(thread.id, { closed: !thread.closed }).then(onChanged)}>{thread.closed ? 'Reopen discussion' : 'Close discussion'}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setForumThread(thread.id, { hidden: !thread.hidden }).then(onChanged)}>{thread.hidden ? 'Show discussion' : 'Hide discussion'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
}

function PostMenu({ post, facilitator, onChanged }: { post: ForumPost; facilitator: boolean; onChanged: () => void }) {
  if (!facilitator) return null
  return <DropdownMenu><DropdownMenuTrigger aria-label="Reply options" className="grid size-6 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Ellipsis className="size-3.5" strokeWidth={1.5} /></DropdownMenuTrigger><DropdownMenuContent align="end">{post.hidden ? <DropdownMenuItem onSelect={() => hideForumPost(post.id, null).then(onChanged)}>Unhide</DropdownMenuItem> : <DropdownMenuItem onSelect={() => hideForumPost(post.id, 'off-topic').then(onChanged)}>Hide reply</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
}
