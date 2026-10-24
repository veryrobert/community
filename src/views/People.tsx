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

const NO_ORG = 'Organisation not given'
const ALL = ''

// The member directory: everyone who hasn't opted out, grouped by organisation, with what they've
// chosen to share. Search covers names, organisations, titles, areas and bios.
export function People({ store }: { store: Store }) {
  const [query, setQuery] = useState('')
  const [org, setOrg] = useState(ALL)
  const listed = useMemo(() => store.members.filter(m => m.in_directory), [store.members])

  // Organisations with how many listed people each, biggest first
  const orgs = useMemo(() => {
    const count = new Map<string, number>()
    listed.forEach(m => { const o = m.organisation || NO_ORG; count.set(o, (count.get(o) ?? 0) + 1) })
    return [...count].sort((a, b) => (a[0] === NO_ORG ? 1 : b[0] === NO_ORG ? -1 : b[1] - a[1] || a[0].localeCompare(b[0])))
  }, [listed])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const shown = listed.filter(m =>
      (org === ALL || (m.organisation || NO_ORG) === org) &&
      (!q || [displayName(m), m.organisation, m.job_title, m.design_area, m.bio].some(v => v.toLowerCase().includes(q))))
    return orgs
      .map(([o]) => [o, shown.filter(m => (m.organisation || NO_ORG) === o).sort((a, b) => displayName(a).localeCompare(displayName(b)))] as const)
      .filter(([, people]) => people.length)
  }, [listed, orgs, org, query])

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
                {orgs.map(([o, n]) => (
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

      {groups.length ? groups.map(([o, people]) => (
        <section key={o} className="pt-8">
          <h2 className="flex items-baseline justify-between px-1 pb-1 text-xs text-muted-foreground">
            {o}<span className="font-mono tabular-nums">{people.length}</span>
          </h2>
          <ul>{people.map(m => <Person key={m.id} m={m} me={m.id === store.me.id} />)}</ul>
        </section>
      )) : (
        <p className="px-1 pt-8 text-sm text-muted-foreground">{listed.length ? 'Nobody matches that.' : 'Nobody is listed yet.'}</p>
      )}
    </div>
  )
}

function Person({ m, me }: { m: Profile; me: boolean }) {
  const links = 'inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <li className="flex gap-4 border-t border-border py-4">
      <Avatar name={displayName(m)} url={m.avatar_url} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm text-foreground">
          {displayName(m)}
          {me && <span className="text-muted-foreground"> (you)</span>}
        </p>
        {(m.job_title || m.design_area) && (
          <p className="text-xs text-muted-foreground">{[m.job_title, m.design_area].filter(Boolean).join(' · ')}</p>
        )}
        {m.bio && <p className="pt-1 text-sm text-muted-foreground">{m.bio}</p>}
        {(m.linkedin || m.show_email) && (
          <p className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
            {m.linkedin && (
              <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className={links}>
                LinkedIn<ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
              </a>
            )}
            {m.show_email && (
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
