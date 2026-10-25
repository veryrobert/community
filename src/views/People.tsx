import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BadgeCheck, ChevronDown, ChevronLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { onPathChange, readPath, useAddress } from '@/lib/route'
import { shortOrganisation } from '@/lib/organisations'
import { StatusLabel } from './IdeaRow'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/shell/Avatar'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { displayName, type Profile } from '@/lib/types'
import type { Store } from '@/lib/data'

const NO_ORG = '' // people who haven't given one

// The profile an idea was opened from, so coming back from the idea returns to it
let returnTo: string | null = null
// A person's id from the address; a number there is an idea opened from People, not a person
const personFromAddress = () => {
  const p = readPath()[1]
  const id = p && !/^\d+$/.test(p) ? p : returnTo
  returnTo = null
  return id ?? null
}
const ALL = '*'

// The member directory: everyone who hasn't opted out, A to Z, with what they've chosen to share.
// Filter by organisation; search covers names, organisations, titles, areas and bios. Each person
// opens as a profile page of their own (/people/<id>).
export function People({ store, onEditMe, onOpenIdea }: { store: Store; onEditMe: () => void; onOpenIdea: (id: number) => void }) {
  const [personId, setPersonId] = useState<string | null>(personFromAddress)
  useAddress(personId ? `people/${personId}` : 'people')
  useEffect(() => onPathChange(() => { if (readPath()[0] === 'people') setPersonId(personFromAddress()) }), [])
  const person = personId ? store.members.find(m => m.id === personId && (m.in_directory || m.id === store.me.id)) : undefined
  const [query, setQuery] = useState('')
  const [org, setOrg] = useState(ALL)
  const listed = useMemo(() => store.members.filter(m => m.in_directory), [store.members])

  // Organisations with how many listed people each, biggest first
  const orgs = useMemo(() => {
    const count = new Map<string, number>()
    listed.forEach(m => { const o = m.organisation || NO_ORG; count.set(o, (count.get(o) ?? 0) + 1) })
    return [...count].sort((a, b) => (a[0] === NO_ORG ? 1 : b[0] === NO_ORG ? -1 : b[1] - a[1] || a[0].localeCompare(b[0])))
  }, [listed])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listed
      .filter(m =>
        (org === ALL || (m.organisation || NO_ORG) === org) &&
        (!q || [displayName(m), m.organisation, m.job_title, m.design_area, m.bio].some(v => v.toLowerCase().includes(q))))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
  }, [listed, org, query])

  if (personId) {
    return <Profile key={personId} m={person} me={person?.id === store.me.id} store={store} onBack={() => setPersonId(null)} onEditMe={onEditMe}
      onOpenIdea={id => { returnTo = personId; onOpenIdea(id) }} />
  }

  const bar = 'inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground'
  return (
    <div className="mx-auto w-full max-w-2xl px-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h1 className="text-sm text-foreground">People</h1>
        <div className="-mr-3 flex items-center text-muted-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(bar, org !== ALL && 'text-foreground')}>
              <span className="max-w-48 truncate">{org === ALL ? 'All organisations' : org}</span>
              <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 min-w-60">
              <DropdownMenuRadioGroup value={org} onValueChange={setOrg}>
                <DropdownMenuRadioItem value={ALL} className="h-10 text-sm">All organisations</DropdownMenuRadioItem>
                {orgs.filter(([o]) => o !== NO_ORG).map(([o, n]) => (
                  <DropdownMenuRadioItem key={o} value={o} className="h-10 gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{o}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{n}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="pt-4">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people" aria-label="Search people" enterKeyHint="search" type="search" />
      </div>

      {shown.length ? (
        <ul className="flex flex-col gap-2 pt-6">{shown.map(m => <Person key={m.id} m={m} me={m.id === store.me.id} onOpen={() => setPersonId(m.id)} />)}</ul>
      ) : (
        <p className="px-1 pt-8 text-sm text-muted-foreground">{listed.length ? 'Nobody matches that.' : 'Nobody is listed yet.'}</p>
      )}
    </div>
  )
}

function Person({ m, me, onOpen }: { m: Profile; me: boolean; onOpen: () => void }) {
  const links = 'inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <li className="flex flex-col gap-2 py-3">
      {/* The photo centred against the name and title; bio and links below, in line with the name */}
      {/* Photo and name open the profile */}
      <button type="button" onClick={onOpen} className="group -mx-2 flex items-center gap-4 rounded-[2px] px-2 py-1 text-left outline-none transition-colors duration-300 ease-out hover:bg-card focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar name={displayName(m)} url={m.avatar_url} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
            <span>{displayName(m)}{me && <span className="text-muted-foreground"> (you)</span>}</span>
            {m.role === 'facilitator' && (
              <BadgeCheck className="size-4 text-muted-foreground" strokeWidth={1.5} role="img" aria-label="Facilitator"><title>Facilitator</title></BadgeCheck>
            )}
          </span>
          {(m.job_title || m.organisation) && (
            <span className="text-xs text-muted-foreground"><Role m={m} /></span>
          )}
          {m.design_area && <span className="text-xs text-muted-foreground">{m.design_area}</span>}
        </span>
      </button>
      <div className="flex flex-col gap-1 pl-14 empty:hidden">
        {m.bio && <p className="text-sm text-muted-foreground">{m.bio}</p>}
        {(m.linkedin || (m.show_email && m.email)) && (
          <p className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {m.linkedin && (
              <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className={links}>
                LinkedIn<ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
              </a>
            )}
            {m.show_email && m.email && (
              <a href={`mailto:${m.email}`} className={links}>
                <Mail className="size-3.5" strokeWidth={1.5} aria-hidden />{m.email}
              </a>
            )}
          </p>
        )}
      </div>
    </li>
  )
}

// One person's page: who they are, how to reach them if they've shared it, and the ideas they've posted
function Profile({ m, me, store, onBack, onEditMe, onOpenIdea }: {
  m: Profile | undefined; me: boolean; store: Store; onBack: () => void; onEditMe: () => void; onOpenIdea: (id: number) => void
}) {
  const ideas = m ? store.ideas.filter(i => i.author_id === m.id && i.status !== 'merged') : []
  const links = 'inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <div className="page-in mx-auto flex w-full max-w-2xl flex-col gap-8 px-5">
      <button type="button" onClick={onBack} className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />People
      </button>
      {!m ? (
        <p className="text-sm text-muted-foreground">This person isn’t in the directory.</p>
      ) : (<>
        <div className="flex items-center gap-5">
          <Avatar name={displayName(m)} url={m.avatar_url} className="size-20 text-base" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl text-foreground">
              {displayName(m)}
              {m.role === 'facilitator' && (
                <BadgeCheck className="size-5 text-muted-foreground" strokeWidth={1.5} role="img" aria-label="Facilitator"><title>Facilitator</title></BadgeCheck>
              )}
            </h1>
            {(m.job_title || m.organisation) && <p className="text-sm text-muted-foreground"><Role m={m} /></p>}
            {m.design_area && <p className="text-sm text-muted-foreground">{m.design_area}</p>}
          </div>
        </div>
        {m.bio && <p className="text-base text-foreground">{m.bio}</p>}
        {(m.linkedin || (m.show_email && m.email)) && (
          <p className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            {m.linkedin && (
              <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className={links}>
                LinkedIn<ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </a>
            )}
            {m.show_email && m.email && (
              <a href={`mailto:${m.email}`} className={links}>
                <Mail className="size-4" strokeWidth={1.5} aria-hidden />{m.email}
              </a>
            )}
          </p>
        )}
        {me && <Button variant="secondary" onClick={onEditMe} className="h-12 self-start rounded-xl px-5 text-base md:text-sm">Edit profile</Button>}
        <section className="flex flex-col">
          <h2 className="flex items-baseline justify-between border-b border-border px-1 pb-2 text-sm text-foreground">
            Ideas<span className="font-mono text-xs text-muted-foreground tabular-nums">{ideas.length}</span>
          </h2>
          {ideas.length ? (
            <ul className="flex flex-col">
              {ideas.map(i => (
                <li key={i.id}>
                  <button type="button" onClick={() => onOpenIdea(i.id)}
                    className="-mx-4 flex w-[calc(100%+2rem)] items-baseline justify-between gap-4 rounded-[2px] px-4 py-3 text-left outline-none transition-colors duration-300 ease-out hover:bg-card focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="text-sm text-foreground">{i.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {i.status === 'open' ? <span className="font-mono tabular-nums">{i.vote_count} supporting</span> : <StatusLabel status={i.status} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 pt-3 text-sm text-muted-foreground">{me ? 'You haven’t posted an idea yet.' : 'No ideas posted yet.'}</p>
          )}
        </section>
      </>)}
    </div>
  )
}

// Job title and the organisation's short form, with the full name on hover
function Role({ m }: { m: Profile }) {
  const short = m.organisation ? shortOrganisation(m.organisation) : ''
  return (<>
    {m.job_title}
    {m.job_title && short && ', '}
    {short && <abbr title={short === m.organisation ? undefined : m.organisation} className="no-underline">{short}</abbr>}
  </>)
}
