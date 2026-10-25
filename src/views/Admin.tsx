import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Facilitation, type AdminSection } from '@/sheets/Settings'
import { loadRequests, type Store } from '@/lib/data'
import { readPath, writePath } from '@/lib/route'

const SECTIONS: { id: AdminSection; title: string; about: string }[] = [
  { id: 'community', title: 'Community', about: 'Name, vision and the About page' },
  { id: 'tags', title: 'Goals and tags', about: 'What ideas can be grouped under' },
  { id: 'people', title: 'People', about: 'Requests to join, invites and members' },
]

const fromAddress = (): AdminSection | null => {
  const s = readPath()[1]
  return SECTIONS.some(x => x.id === s) ? (s as AdminSection) : null
}

// Facilitators' own area, separate from anyone's personal Settings. A short list of sections,
// each opening as its own page (/admin/people) with a way back.
export function Admin({ store, onChanged }: { store: Store; onChanged: () => void }) {
  const [section, setSection] = useState<AdminSection | null>(fromAddress)
  const [waiting, setWaiting] = useState(0)
  useEffect(() => { loadRequests().then(r => setWaiting(r.length)).catch(() => {}) }, [section])
  useEffect(() => {
    writePath(section ? `admin/${section}` : 'admin')
  }, [section])

  const open = SECTIONS.find(s => s.id === section)
  if (open) {
    return (
      <div key={open.id} className="page-in mx-auto flex w-full max-w-2xl flex-col gap-10 px-5">
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setSection(null)} className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />Admin
          </button>
          <h1 className="text-xl text-foreground">{open.title}</h1>
        </div>
        <Facilitation store={store} onChanged={onChanged} section={open.id} />
      </div>
    )
  }

  return (
    <div key="admin" className="page-in mx-auto flex w-full max-w-2xl flex-col gap-6 px-5">
      <h1 className="text-xl text-foreground">Admin</h1>
      <ul className="flex flex-col border-t border-border">
        {SECTIONS.map(s => (
          <li key={s.id} className="border-b border-border">
            <button type="button" onClick={() => setSection(s.id)}
              className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-4 rounded-[2px] px-4 py-5 text-left outline-none transition-colors duration-300 ease-out hover:bg-card focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm text-foreground">{s.title}</span>
                <span className="text-xs text-muted-foreground">
                  {s.id === 'people' && waiting > 0 ? `${waiting} asking to join · ${s.about}` : s.about}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
