import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/shell/Avatar'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { displayName, type Profile } from '@/lib/types'
import type { Store } from '@/lib/data'

const NO_ORG = '' // people who haven't given one
const ALL = '*'

// The member directory: everyone who hasn't opted out, A to Z, with what they've chosen to share.
// Filter by organisation; search covers names, organisations, titles, areas and bios.
export function People({ store, onEditMe }: { store: Store; onEditMe: () => void }) {
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
        <ul className="pt-6">{shown.map(m => <Person key={m.id} m={m} me={m.id === store.me.id} onEditMe={onEditMe} />)}</ul>
      ) : (
        <p className="px-1 pt-8 text-sm text-muted-foreground">{listed.length ? 'Nobody matches that.' : 'Nobody is listed yet.'}</p>
      )}
    </div>
  )
}

function Person({ m, me, onEditMe }: { m: Profile; me: boolean; onEditMe: () => void }) {
  const links = 'inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <li className="flex flex-col gap-2 border-t border-border py-4">
      {/* The photo centred against the name and title; bio and links below, in line with the name */}
      <div className="flex items-center gap-4">
        <Avatar name={displayName(m)} url={m.avatar_url} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
            {me ? (
              <button type="button" onClick={onEditMe} title="Edit your profile" className="rounded-sm text-left outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                {displayName(m)}<span className="text-muted-foreground"> (you)</span>
              </button>
            ) : <span>{displayName(m)}</span>}
            {m.role === 'facilitator' && (
              <span className="rounded-full border border-border px-2 py-px text-xs text-muted-foreground">Facilitator</span>
            )}
          </p>
          {(m.job_title || m.organisation) && (
            <p className="text-xs text-muted-foreground">{[m.job_title, m.organisation].filter(Boolean).join(', ')}</p>
          )}
          {m.design_area && <p className="text-xs text-muted-foreground">{m.design_area}</p>}
        </div>
      </div>
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
