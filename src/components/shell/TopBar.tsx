import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { LogOut, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from './Avatar'
import { PANEL_W } from './layout'

export type NavItem = { id: string; label: string; icon: LucideIcon; active: boolean; onClick: () => void }

const iconButton = 'grid size-9 place-items-center rounded-full outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent'

// One bar across the top, the same on every screen: the community's name (tap for home) on the
// left; search, Admin for facilitators, one menu icon holding the places, and your photo
// (Settings, Sign out) on the right.
export function TopBar({ name, onHome, places, admin, me, onSettings, onSignOut, searching, onSearch, phone, panelOpen }: {
  name: string
  onHome: () => void
  places: NavItem[]
  admin?: NavItem // facilitators only: its own button, beside the menu
  me: { name: string; email: string; avatar: string | null }
  onSettings: () => void
  onSignOut: () => void
  searching: boolean
  onSearch: () => void
  phone: boolean
  panelOpen: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header
      className="fixed top-0 left-0 z-40 flex items-center justify-between gap-4 bg-background/90 px-5 backdrop-blur transition-[right] duration-200"
      style={{ right: !phone && panelOpen ? PANEL_W : 0, paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
    >
      <button type="button" onClick={onHome} className="-ml-1 min-w-0 truncate rounded-md px-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{name}</button>
      <nav aria-label="Main" className="-mr-1.5 flex items-center gap-1">
        <button type="button" aria-label="Search" aria-pressed={searching} onClick={onSearch}
          className={cn(iconButton, searching && 'bg-primary text-primary-foreground hover:bg-primary')}>
          <Search className="size-5" strokeWidth={1.5} />
        </button>
        {admin && (
          <button type="button" aria-label={admin.label} title={admin.label} aria-current={admin.active ? 'page' : undefined} onClick={admin.onClick}
            className={cn(iconButton, admin.active && 'bg-accent')}>
            <admin.icon className="size-5" strokeWidth={1.5} />
          </button>
        )}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger aria-label="Menu" className={iconButton}>
            <MenuIcon open={menuOpen} />
          </DropdownMenuTrigger>
          {/* The current page is highlighted only while nothing else is, so hovering another never shows two */}
          <DropdownMenuContent align="end" className="min-w-48 [&:not(:has([data-highlighted]))_[aria-current=page]]:bg-accent">
            {places.map(p => {
              const Icon = p.icon
              return (
                <DropdownMenuItem key={p.id} onSelect={p.onClick} aria-current={p.active ? 'page' : undefined} className="h-10 gap-3">
                  <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                  {p.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Your account" className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar name={me.name} url={me.avatar} className="size-8" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="text-sm text-foreground">{me.name}</span>
              <span className="truncate text-xs text-muted-foreground">{me.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSettings} className="h-10 gap-3">
              <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSignOut} className="h-10 gap-3">
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  )
}

// Lucide's Menu drawn as three lines, so the outer two can turn into an X while the menu is open
function MenuIcon({ open }: { open: boolean }) {
  const line = 'origin-center transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] [transform-box:fill-box] motion-reduce:transition-none'
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
      <path d="M4 6h16" className={line} style={{ transform: open ? 'translateY(6px) rotate(45deg)' : undefined }} />
      <path d="M4 12h16" className={line} style={{ opacity: open ? 0 : 1 }} />
      <path d="M4 18h16" className={line} style={{ transform: open ? 'translateY(-6px) rotate(-45deg)' : undefined }} />
    </svg>
  )
}
