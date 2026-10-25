import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, ChevronLeft, Ellipsis, Lock, Minus, Pin, Plus, Reply } from 'lucide-react'
import { Avatar } from '@/components/shell/Avatar'
import { Markdown, plain } from '@/components/shell/Markdown'
import { Button } from '@/components/ui/button'
import { Compose } from './Compose'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { followForumThread, hideForumPost, loadForumCategories, loadForumPosts, loadForumThread, loadForumThreads, markForumRead, setForumThread, watchForum } from '@/lib/data'
import { cn } from '@/lib/utils'
import { HIDE_REASONS, when, type ForumCategory, type ForumPost, type ForumThread } from '@/lib/types'
import type { Store } from '@/lib/data'

const ALL = 0
const COMPACT = 'community:forum-compact' // compact replies, remembered on this device
const MAX_INDENT = 6 // deeper replies stop indenting, so text keeps room

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

// A discussion, as in Discourse: the title and where it sits, then one stream of posts oldest first,
// the opening post and replies alike. Replying opens the full-screen editor, quoting the post replied to.
function Thread({ store, slug, onBack }: { store: Store; slug: string; onBack: () => void }) {
  const [thread, setThread] = useState<ForumThread | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [replying, setReplying] = useState<{ parent: ForumPost | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const facilitator = store.me.role === 'facilitator'
  const load = useCallback(async () => {
    try {
      const t = await loadForumThread(slug)
      const [ps, cs] = await Promise.all([loadForumPosts(t.id), loadForumCategories()])
      setThread(t); setPosts(ps); setCategories(cs); setError(null)
      markForumRead(t.id).catch(() => {})
    } catch (e) { setError((e as Error).message) }
  }, [slug])
  useEffect(() => { load(); return watchForum(thread?.id ?? null, load) }, [thread?.id, load])
  // Replies by the post they answer; the top level is null
  const children = useMemo(() => {
    const m = new Map<number | null, ForumPost[]>()
    posts.forEach(p => m.set(p.parent_id, [...(m.get(p.parent_id) ?? []), p]))
    return m
  }, [posts])
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const toggle = (id: number) => setCollapsed(c => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const [compact, setCompactState] = useState(() => { try { return localStorage.getItem(COMPACT) === '1' } catch { return false } })
  const setCompact = (v: boolean) => { setCompactState(v); try { localStorage.setItem(COMPACT, v ? '1' : '0') } catch { /* private mode */ } }

  const back = (
    <button type="button" onClick={onBack} className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />Forum
    </button>
  )
  if (error) return <div className="mx-auto flex max-w-3xl flex-col px-5">{back}<p className="pt-8 text-sm text-destructive">{error}</p></div>
  if (!thread) return null
  const open = !thread.closed && !thread.hidden
  const category = categories.find(c => c.id === thread.category_id)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-5">
      {back}
      <header className="flex items-start justify-between gap-4 border-b border-border pt-6 pb-5">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-xl leading-snug text-foreground">{thread.title}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {category && <span className="rounded-full border border-border px-2 py-px text-foreground">{category.name}</span>}
            <span>{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
            <span aria-hidden>·</span>
            <span>Started {when(thread.created_at)}</span>
            {thread.pinned && <><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><Pin className="size-3" strokeWidth={1.5} aria-hidden />Pinned</span></>}
            {thread.closed && <><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><Lock className="size-3" strokeWidth={1.5} aria-hidden />Closed</span></>}
          </p>
        </div>
        <ThreadMenu thread={thread} facilitator={facilitator} onChanged={load} />
      </header>

      <ol className="flex flex-col">
        <Post id="post-0" author={thread.author_name} avatar={thread.author_avatar} at={thread.created_at} body={thread.body}
          onReply={open ? () => setReplying({ parent: null }) : undefined} />
      </ol>

      {/* Replies as a thread: each under the post it answers, foldable, roomy or compact */}
      {posts.length > 0 && (<>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4 pb-1">
          <p className="text-xs text-muted-foreground">{posts.length} {posts.length === 1 ? 'reply' : 'replies'}</p>
          <button type="button" aria-pressed={compact} onClick={() => setCompact(!compact)}
            className="h-8 rounded-full px-3 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:text-foreground">
            Compact
          </button>
        </div>
        <ol className="flex flex-col pb-2">
          {(children.get(null) ?? []).map(post => (
            <Comment key={post.id} post={post} tree={children} depth={0} compact={compact}
              collapsed={collapsed} onToggle={toggle} canReply={open} facilitator={facilitator}
              onReply={p => setReplying({ parent: p })} onChanged={load} />
          ))}
        </ol>
      </>)}

      <div className="flex items-center justify-between gap-4 border-t border-border py-5">
        {open ? (<>
          <p className="text-xs text-muted-foreground">{thread.following ? 'You’re following this discussion' : 'Join the discussion'}</p>
          <Button onClick={() => setReplying({ parent: null })} className="h-9 gap-2 rounded-full px-5 text-sm">
            <Reply className="size-4" strokeWidth={1.5} aria-hidden />Reply
          </Button>
        </>) : <p className="text-xs text-muted-foreground">This discussion is closed to new replies.</p>}
      </div>

      {replying && (
        <Compose kind="reply" store={store} reply={{ threadId: thread.id, threadTitle: thread.title, parent: replying.parent }}
          onClose={() => setReplying(null)} onOpen={() => {}}
          onPosted={() => { setReplying(null); load().then(() => requestAnimationFrame(() => document.querySelector('main')?.scrollTo({ top: 1e6, behavior: 'smooth' }))) }} />
      )}
    </div>
  )
}

// The opening post: photo, name and when, then the text, then Reply
function Post({ id, author, avatar, at, body, hiddenReason, onReply, menu }: {
  id: string; author: string; avatar: string | null; at: string; body: string | null; hiddenReason?: string
  onReply?: () => void; menu?: React.ReactNode
}) {
  const action = 'inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <li id={id} className="flex scroll-mt-24 gap-4 border-b border-border py-6 last:border-b-0">
      <Avatar name={author} url={avatar} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-foreground">{author}</span>
          <span className="text-xs text-muted-foreground">{when(at)}</span>
        </p>
        {body === null
          ? <p className="text-sm text-muted-foreground">Hidden as {hiddenReason?.toLowerCase()}.</p>
          : body ? <Markdown className="text-base">{body}</Markdown> : null}
        {(onReply || menu) && (
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
            {onReply && <button type="button" onClick={onReply} className={action}><Reply className="size-3.5" strokeWidth={1.5} aria-hidden />Reply</button>}
            {menu}
          </div>
        )}
      </div>
    </li>
  )
}

// One reply and the replies under it. The line down the left (and the –) folds the branch away to one
// line. Compact drops the photo and puts name, time and actions on one small line.
function Comment({ post, tree, depth, compact, collapsed, onToggle, canReply, facilitator, onReply, onChanged }: {
  post: ForumPost; tree: Map<number | null, ForumPost[]>; depth: number; compact: boolean
  collapsed: Set<number>; onToggle: (id: number) => void; canReply: boolean; facilitator: boolean
  onReply: (p: ForumPost) => void; onChanged: () => void
}) {
  const replies = tree.get(post.id) ?? []
  const folded = collapsed.has(post.id)
  const count = (p: ForumPost): number => (tree.get(p.id) ?? []).reduce((n, c) => n + 1 + count(c), 0)
  const hidden = folded ? count(post) : 0
  const action = 'inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  const indent = depth > 0 && depth <= MAX_INDENT
  return (
    <li id={`post-${post.id}`} className={cn('relative scroll-mt-24', indent && 'ml-4 sm:ml-6')}>
      {/* The thread line: tap to fold this branch */}
      {replies.length > 0 && !folded && (
        <button type="button" aria-label={`Fold ${post.author_name}’s reply`} onClick={() => onToggle(post.id)}
          className={cn('group absolute bottom-2 w-4 outline-none', compact ? 'top-8 -left-0.5' : 'top-14 left-2.5')}>
          <span className="mx-auto block h-full w-px bg-border transition-colors group-hover:bg-muted-foreground" />
        </button>
      )}
      <article className={cn('flex gap-3', compact ? 'py-2' : 'py-4')}>
        {!compact && <Avatar name={post.author_name} url={post.author_avatar} className="size-9 shrink-0" />}
        <div className={cn('flex min-w-0 flex-1 flex-col', compact ? 'gap-1' : 'gap-1.5')}>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <button type="button" onClick={() => onToggle(post.id)} aria-label={folded ? 'Unfold' : 'Fold'} aria-expanded={!folded}
              className="-ml-0.5 grid size-4 place-items-center rounded-sm border border-border outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              {folded ? <Plus className="size-3" strokeWidth={1.5} /> : <Minus className="size-3" strokeWidth={1.5} />}
            </button>
            <span className="text-sm text-foreground">{post.author_name}</span>
            <span>{when(post.created_at)}</span>
            {folded && hidden > 0 && <span>· {hidden} more {hidden === 1 ? 'reply' : 'replies'}</span>}
            {compact && !folded && canReply && !post.hidden && (
              <button type="button" onClick={() => onReply(post)} className={action}>Reply</button>
            )}
            {compact && !folded && facilitator && <PostMenu post={post} facilitator={facilitator} onChanged={onChanged} />}
          </p>
          {/* Compact: the text lines up with the name, clear of the thread line under the fold button */}
          {!folded && (<div className={cn('flex flex-col gap-1.5', compact && 'pl-6')}>
            {post.hidden
              ? <p className="text-sm text-muted-foreground">Hidden as {HIDE_REASONS[post.hidden_reason ?? 'off-topic'].toLowerCase()}.</p>
              : <Markdown className={compact ? 'text-sm' : 'text-base'}>{post.body}</Markdown>}
            {!compact && (canReply || facilitator) && (
              <div className="flex items-center gap-4 pt-0.5 text-xs text-muted-foreground">
                {canReply && !post.hidden && <button type="button" onClick={() => onReply(post)} className={action}><Reply className="size-3.5" strokeWidth={1.5} aria-hidden />Reply</button>}
                {facilitator && <PostMenu post={post} facilitator={facilitator} onChanged={onChanged} />}
              </div>
            )}
          </div>)}
        </div>
      </article>
      {!folded && replies.length > 0 && (
        <ol className={cn('flex flex-col', !compact && 'pl-0')}>
          {replies.map(r => (
            <Comment key={r.id} post={r} tree={tree} depth={depth + 1} compact={compact} collapsed={collapsed} onToggle={onToggle}
              canReply={canReply} facilitator={facilitator} onReply={onReply} onChanged={onChanged} />
          ))}
        </ol>
      )}
    </li>
  )
}

function ThreadMenu({ thread, facilitator, onChanged }: { thread: ForumThread; facilitator: boolean; onChanged: () => void }) {
  if (!facilitator) return thread.following ? <button onClick={() => followForumThread(thread.id, false).then(onChanged)} className="grid size-8 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Unfollow discussion"><Bell className="size-4" strokeWidth={1.5} /></button> : <button onClick={() => followForumThread(thread.id, true).then(onChanged)} className="grid size-8 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Follow discussion"><BellOff className="size-4" strokeWidth={1.5} /></button>
  return <DropdownMenu><DropdownMenuTrigger aria-label="Discussion options" className="grid size-8 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Ellipsis className="size-4" strokeWidth={1.5} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setForumThread(thread.id, { pinned: !thread.pinned }).then(onChanged)}>{thread.pinned ? 'Unpin discussion' : 'Pin discussion'}</DropdownMenuItem><DropdownMenuItem onSelect={() => setForumThread(thread.id, { closed: !thread.closed }).then(onChanged)}>{thread.closed ? 'Reopen discussion' : 'Close discussion'}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setForumThread(thread.id, { hidden: !thread.hidden }).then(onChanged)}>{thread.hidden ? 'Show discussion' : 'Hide discussion'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
}

function PostMenu({ post, facilitator, onChanged }: { post: ForumPost; facilitator: boolean; onChanged: () => void }) {
  if (!facilitator) return null
  return <DropdownMenu><DropdownMenuTrigger aria-label="Reply options" className="grid size-6 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Ellipsis className="size-3.5" strokeWidth={1.5} /></DropdownMenuTrigger><DropdownMenuContent align="end">{post.hidden ? <DropdownMenuItem onSelect={() => hideForumPost(post.id, null).then(onChanged)}>Unhide</DropdownMenuItem> : <DropdownMenuItem onSelect={() => hideForumPost(post.id, 'off-topic').then(onChanged)}>Hide reply</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
}
