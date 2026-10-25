import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Columns3, Ellipsis, Info, Shield, Lightbulb, Megaphone, MessageCircle, Plus, Share2, Users } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DialogsProvider, useDialogs } from '@/components/shell/Dialogs'
import { Button } from '@/components/ui/button'
import { ToolButton } from '@/components/shell/ToolButton'
import { Toolbar } from '@/components/shell/Toolbar'
import { Splash } from '@/components/shell/Splash'
import { TopBar } from '@/components/shell/TopBar'
import { SendField } from '@/components/shell/SendField'
import { PanelSheet } from '@/components/shell/PanelSheet'
import { ActionDock } from '@/components/shell/ActionDock'
import { PANEL_W, SAFE_BOTTOM, usePhone } from '@/components/shell/layout'
import { configured } from '@/lib/supabase'
import { linkTo, onPathChange, readPath, writePath } from '@/lib/route'
import { cn } from '@/lib/utils'
import { deleteIdea, saveName, signOut, useSession, useStore, type Store } from '@/lib/data'
import { useGate, useSessionLimits } from '@/lib/auth'
import { TwoFactorVerify } from '@/views/TwoFactor'
import { displayName, type Idea } from '@/lib/types'
import { SignIn } from '@/views/SignIn'
import { Board } from '@/views/Board'
import { Roadmap } from '@/views/Roadmap'
import { Updates } from '@/views/Updates'
import { Admin } from '@/views/Admin'
import { About } from '@/views/About'
import { People } from '@/views/People'
import { Compose } from '@/views/Compose'
import { Forum } from '@/views/Forum'
import { IdeaSheet, StatusEditor } from '@/sheets/IdeaSheet'
import { IdeaPage } from '@/sheets/IdeaPage'
import { NewIdea } from '@/sheets/IdeaForm'
import { UPDATE_FORM, UpdateForm } from '@/sheets/UpdateForm'
import { Settings } from '@/sheets/Settings'
import { NewForumThread } from '@/sheets/ForumThreadForm'

type View = 'ideas' | 'roadmap' | 'updates' | 'forum' | 'people' | 'about' | 'admin' | 'new' | 'new-discussion'
type Panel =
  | { kind: 'idea'; id: number; editing?: boolean }
  | { kind: 'status'; id: number }
  | { kind: 'new-idea' }
  | { kind: 'new-thread' }
  | { kind: 'new-update' }
  | { kind: 'settings' }

// The address is / for the ideas list, /view for the others, and /view/ideaId for an idea opened
// from that view (see lib/route.ts)
// The forum is only in the demo until its tables are in the database (VITE_FORUM=on turns it on)
const FORUM = import.meta.env.VITE_FORUM === 'on'

function readAddress(): { view: View; idea: number | null; thread: string | null } {
  const [v, id] = readPath()
  const forumView = v === 'forum' || v === 'new-discussion'
  const view: View = (forumView && FORUM) || v === 'roadmap' || v === 'updates' || v === 'people' || v === 'about' || v === 'admin' || v === 'new' ? v : 'ideas'
  const idNumber = id && /^\d+$/.test(id) ? Number(id) : null
  return { view, idea: view === 'forum' ? null : idNumber, thread: view === 'forum' && id ? id : null }
}

function writeAddress(view: View, idea: number | null, thread: string | null) {
  // Admin and People keep their own page in the address (/admin/people, /people/<id>); they write that part
  if ((view === 'admin' || view === 'people') && !idea && readPath()[1]) return
  writePath(thread ? `forum/${thread}` : idea ? `${view}/${idea}` : view === 'ideas' ? '' : view)
}

const mark = (
  <Splash label="Loading">
    {/* A Venn diagram: two circles of practice, overlapping */}
    <path pathLength={1} d="M12 8a8 8 0 1 0 0 16a8 8 0 1 0 0-16" />
    <path pathLength={1} d="M20 8a8 8 0 1 1 0 16a8 8 0 1 1 0-16" />
  </Splash>
)

export default function App() {
  const session = useSession()
  return (
    <TooltipProvider delayDuration={400}>
      <DialogsProvider>
      {mark}
      {!configured ? (
        <Message>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.</Message>
      ) : session === undefined ? null : session ? (
        <Gated userId={session.user.id} />
      ) : (
        <SignIn />
      )}
      </DialogsProvider>
    </TooltipProvider>
  )
}

// Nothing loads until the session has passed two-factor; the database enforces the same rule
function Gated({ userId }: { userId: string }) {
  const { gate, recheck } = useGate(userId)
  if (gate === 'loading') return null
  if (gate === 'verify') return <TwoFactorVerify onDone={recheck} />
  return <Signed userId={userId} />
}

function Signed({ userId }: { userId: string }) {
  const { store, error, load, vote } = useStore(userId)
  useSessionLimits()
  if (error && !store) {
    return (
      <Message>
        {error}
        <Button variant="outline" onClick={() => signOut()} className="mt-4">Sign out</Button>
      </Message>
    )
  }
  if (!store) return null
  if (!store.me.name) return <Welcome store={store} onDone={load} />
  return <Main store={store} load={load} vote={vote} />
}

function Main({ store, load, vote }: { store: Store; load: () => Promise<void>; vote: (i: Idea) => void }) {
  const phone = usePhone()
  const initial = readAddress()
  const [view, setView] = useState<View>(initial.view)
  const [panel, setPanel] = useState<Panel | null>(initial.idea ? { kind: 'idea', id: initial.idea } : null)
  const [forumThread, setForumThread] = useState<string | null>(initial.thread)
  const [flash, setFlash] = useState<string | null>(null)
  const facilitator = store.me.role === 'facilitator'
  const name = store.community.name
  const { confirm } = useDialogs()

  useEffect(() => { document.title = store.community.name || 'community' }, [store.community.name])

  const openIdea = panel?.kind === 'idea' || panel?.kind === 'status' ? panel.id : null
  useEffect(() => writeAddress(view, openIdea, forumThread), [view, openIdea, forumThread])
  useEffect(() => onPathChange(() => {
    const a = readAddress()
    setView(a.view)
    setPanel(a.idea ? { kind: 'idea', id: a.idea } : null)
    setForumThread(a.thread)
  }), [])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 2400)
    return () => clearTimeout(t)
  }, [flash])

  // Opening an idea replaces the view; back returns to the same scroll position
  const mainRef = useRef<HTMLElement>(null)
  const scrollMemo = useRef(0)
  const open = useCallback((id: number) => {
    if (panel?.kind !== 'idea' && panel?.kind !== 'status' && mainRef.current) scrollMemo.current = mainRef.current.scrollTop
    setPanel({ kind: 'idea', id })
    mainRef.current?.scrollTo({ top: 0 })
  }, [panel])
  const back = () => setPanel(null)
  useLayoutEffect(() => {
    if (panel === null && mainRef.current) mainRef.current.scrollTop = scrollMemo.current
  }, [panel])
  // Closing the status panel goes back to its idea; closing anything else goes back to the list
  const close = () => setPanel(p => p?.kind === 'status' ? { kind: 'idea', id: p.id } : null)

  const idea = panel?.kind === 'idea' || panel?.kind === 'status' ? store.ideas.find(i => i.id === panel.id) : undefined
  const editing = panel?.kind === 'idea' && !!panel.editing
  const canEdit = !!idea && (facilitator || idea.author_id === store.me.id)
  const title =
    panel?.kind === 'settings' ? 'Settings'
    : panel?.kind === 'new-idea' ? 'New idea'
    : panel?.kind === 'new-thread' ? 'New discussion'
    : panel?.kind === 'new-update' ? 'New update'
    : panel?.kind === 'status' ? 'Status'
    : undefined
  const sheetOpen = panel !== null && panel.kind !== 'idea'

  // The phone's share sheet where there is one; otherwise copy the link
  async function share() {
    if (!idea) return
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: idea.title, url: linkTo(`ideas/${idea.id}`) }) } catch { /* dismissed */ }
      return
    }
    copyLink()
  }

  async function copyLink() {
    if (!idea) return
    try {
      await navigator.clipboard.writeText(linkTo(`ideas/${idea.id}`))
      setFlash('Link copied')
    } catch {
      setFlash('Couldn’t copy the link')
    }
  }

  async function removeIdea() {
    if (!idea) return
    const ok = await confirm({
      title: 'Delete idea?',
      body: facilitator && idea.author_id !== store.me.id
        ? 'Its comments, support and people go with it, and this can’t be undone. To close it with a reason instead, set its status to Not proceeding or Duplicate.'
        : 'Its comments, support and people go with it. This can’t be undone.',
      action: 'Delete idea',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIdea(idea.id)
      close()
      load()
      setFlash('Idea deleted')
    } catch (e) {
      setFlash((e as Error).message)
    }
  }

  // The panel header holds the panel's one action, beside close: a check to post, publish or
  // finish editing; otherwise a ⋯ menu as on a GitHub issue, with the destructive item last
  const done = 'size-8 bg-primary text-primary-foreground hover:bg-primary/80 [&_svg]:size-4'
  const sheetAction =
    panel?.kind === 'new-update' ? <ToolButton icon={Check} label="Publish update" side="bottom" type="submit" form={UPDATE_FORM} className={done} />
    : undefined
  const ideaAction =
    panel?.kind === 'idea' && editing ? <ToolButton icon={Check} label="Done" side="bottom" className={done} onClick={() => setPanel({ kind: 'idea', id: panel.id })} />
    : panel?.kind === 'idea' && idea ? (
      <div className="flex items-center gap-1">
      <ToolButton icon={Share2} label="Share" side="bottom" className="size-8 [&_svg]:size-4" onClick={share} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span><ToolButton icon={Ellipsis} label="Idea options" side="bottom" className="size-8 [&_svg]:size-4" /></span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {canEdit && <DropdownMenuItem onSelect={() => setPanel({ kind: 'idea', id: idea.id, editing: true })}>Edit</DropdownMenuItem>}
          {facilitator && <DropdownMenuItem onSelect={() => setPanel({ kind: 'status', id: idea.id })}>Change status</DropdownMenuItem>}
          <DropdownMenuItem onSelect={copyLink}>Copy link</DropdownMenuItem>
          {canEdit && (<>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={removeIdea}>Delete</DropdownMenuItem>
          </>)}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    )
    : undefined

  // Going to a place; choosing the one you're already on takes it back to its start (People's list
  // from a profile, Admin's list from a section)
  const [resets, setResets] = useState(0)
  function go(to: View) {
    if (view === to && panel?.kind !== 'idea') {
      writePath(to === 'ideas' ? '' : to)
      setResets(r => r + 1)
    }
    setView(to)
    setForumThread(null)
    if (panel?.kind === 'idea') setPanel(null)
  }

  const places = ([
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'roadmap', label: 'Roadmap', icon: Columns3 },
    { id: 'updates', label: 'Updates', icon: Megaphone },
    { id: 'forum', label: 'Forum', icon: MessageCircle },
    { id: 'people', label: 'People', icon: Users },
    { id: 'about', label: 'About', icon: Info },
  ] as const).filter(p => FORUM || p.id !== 'forum').map(p => ({ ...p, active: view === p.id && panel?.kind !== 'idea', onClick: () => go(p.id) }))
  // Facilitators reach Admin from its own button in the top bar, not the menu
  const admin = facilitator
    ? { id: 'admin', label: 'Admin', icon: Shield, active: view === 'admin' && panel?.kind !== 'idea', onClick: () => go('admin') }
    : undefined

  // Home is the ideas list in its default view: a new key resets its order, filters and search
  const [homes, setHomes] = useState(0)
  function home() {
    setView('ideas')
    setPanel(null)
    setForumThread(null)
    setSearching(false)
    setHomes(h => h + 1)
    mainRef.current?.scrollTo({ top: 0 })
  }

  // Search lives on the ideas list; from anywhere else it goes there first
  const [searching, setSearching] = useState(false)
  function toggleSearch() {
    if (view !== 'ideas' || openIdea !== null) {
      setView('ideas')
      setPanel(null)
      setSearching(true)
    } else setSearching(s => !s)
    mainRef.current?.scrollTo({ top: 0 })
  }

  // New idea only on the ideas list; New update on Updates for facilitators; nothing elsewhere
  const action =
    view === 'ideas' ? { label: 'New idea', onClick: () => setView('new') }
    : view === 'forum' && !forumThread ? { label: 'New discussion', onClick: () => setView('new-discussion') }
    : view === 'updates' && facilitator ? { label: 'New update', onClick: () => setPanel({ kind: 'new-update' }) }
    : null

  return (
    <>
      <main
        ref={mainRef}
        // With a panel open the page fades and blurs behind it, so the panel is a place of its own
        className={cn('fixed inset-0 overflow-y-auto [transition:right_200ms_ease-out,opacity_500ms_cubic-bezier(0.25,0.1,0.25,1),filter_500ms_cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none',
          sheetOpen && 'opacity-45 blur-[2px]')}
        style={phone
          ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 72px)', paddingBottom: `calc(${SAFE_BOTTOM} + 96px)` }
          : { right: sheetOpen ? PANEL_W : 0, paddingTop: 96, paddingBottom: 112 }}
      >
        {/* Keyed by where you are, so each change of page plays its entrance (see .page-in in index.css) */}
        <div key={openIdea !== null ? `idea-${openIdea}` : view} className="page-in" data-push={openIdea !== null || undefined}>
        {panel?.kind === 'idea' || panel?.kind === 'status' ? (
          <IdeaPage onBack={back} actions={ideaAction}>
            {idea ? (
              <IdeaSheet key={idea.id} idea={idea} store={store} editing={editing} onVote={vote} onOpen={open} onChanged={load} copyLink={copyLink} />
            ) : (
              <p className="text-sm text-muted-foreground">This idea has been deleted.</p>
            )}
          </IdeaPage>
        ) : (<>
        {view === 'ideas' && <Board key={homes} store={store} onOpen={open} onVote={vote} searching={searching} onHome={home} />}
        {view === 'roadmap' && <Roadmap store={store} onOpen={open} openId={openIdea} onError={setFlash} />}
        {view === 'updates' && <Updates store={store} onOpen={open} onChanged={load} />}
        {view === 'forum' && <Forum store={store} threadId={forumThread} onOpen={setForumThread} onBack={() => setForumThread(null)} />}
        {view === 'people' && <People key={resets} store={store} onEditMe={() => setPanel({ kind: 'settings' })} onOpenIdea={open} />}
        {view === 'about' && <About community={store.community} signedIn />}
        {view === 'admin' && (facilitator ? <Admin key={resets} store={store} onChanged={load} /> : <p className="mx-auto max-w-2xl px-5 text-sm text-muted-foreground">Only facilitators can see this.</p>)}
        </>)}
        </div>
      </main>

      {/* Writing a new idea (/new) or forum discussion (/new-discussion) takes over the screen */}
      {view === 'new' && (
        <Compose kind="idea" store={store} onClose={() => setView('ideas')} onOpen={open}
          onPosted={id => { load().then(() => { setView('ideas'); setPanel({ kind: 'idea', id: id as number }) }); setFlash('Idea posted') }} />
      )}
      {view === 'new-discussion' && (
        <Compose kind="discussion" store={store} onClose={() => setView('forum')} onOpen={open}
          onPosted={slug => { setForumThread(slug as string); setView('forum'); setFlash('Discussion posted') }} />
      )}

      <TopBar name={name} onHome={home} places={places} admin={admin}
        me={{ name: displayName(store.me), email: store.me.email, avatar: store.me.avatar_url }} onSettings={() => setPanel({ kind: 'settings' })} onSignOut={() => signOut()}
        searching={searching && view === 'ideas' && openIdea === null}
        onSearch={toggleSearch} phone={phone} panelOpen={sheetOpen} />

      <PanelSheet open={sheetOpen} title={title} action={sheetAction} onClose={close} phone={phone}>
        {panel?.kind === 'new-idea' && (
          <NewIdea store={store} onOpen={open} onPosted={id => { load().then(() => setPanel({ kind: 'idea', id })); setFlash('Idea posted') }} />
        )}
        {panel?.kind === 'new-thread' && (
          <NewForumThread onPosted={id => { setForumThread(id); close(); setFlash('Discussion posted') }} />
        )}
        {panel?.kind === 'new-update' && (
          <UpdateForm store={store} onDone={() => { load(); close(); setFlash('Update published') }} />
        )}
        {panel?.kind === 'settings' && <Settings store={store} onChanged={load} />}
        {panel?.kind === 'status' && idea && <StatusEditor key={idea.id} idea={idea} store={store} onSaved={load} />}
      </PanelSheet>

      <ActionDock phone={phone} panelOpen={sheetOpen}>
        {flash && <p role="status" className="panel rounded-full px-3 py-1.5 text-xs text-foreground motion-safe:animate-in motion-safe:fade-in-0">{flash}</p>}
        {action && openIdea === null && forumThread === null && (
          // One button, so no padding: its hover fills the whole circle.
          // Fades with the page while a panel is open; a click there falls through and closes the panel
          <Toolbar aria-label="Actions" className={cn('overflow-hidden p-0 transition-[opacity,filter] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none max-sm:border-border max-sm:bg-[var(--panel)] max-sm:backdrop-blur-xl!',
            sheetOpen && 'pointer-events-none! opacity-45 blur-[2px]')}>
            <ToolButton icon={Plus} label={action.label} side="top" className="size-12" onClick={action.onClick} active={sheetOpen && (panel?.kind === 'new-idea' || panel?.kind === 'new-update')} />
          </Toolbar>
        )}
      </ActionDock>
    </>
  )
}

// First sign-in: a name for comments and ideas
function Welcome({ store, onDone }: { store: Store; onDone: () => Promise<void> }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <p className="px-1 text-sm text-foreground">Your name, as other members will see it</p>
        <SendField label="Continue" placeholder="Name" autoComplete="name" enterKeyHint="go" icon={ArrowRight} autoFocus clearOnSend={false}
          onSend={async v => { await saveName(store.me.id, v); await onDone() }} />
      </div>
    </main>
  )
}

function Message({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-xs flex-col items-start text-sm text-muted-foreground">{children}</div>
    </main>
  )
}
