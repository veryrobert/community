import type { ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type RowAction = { label: string; onSelect: () => void; destructive?: boolean }

// A list row whose actions come from tapping it, instead of an icon on every row.
// With no actions it's a plain row.
export function RowMenu({ actions, label, className, children }: { actions: RowAction[]; label: string; className?: string; children: ReactNode }) {
  if (!actions.length) return <div className={className}>{children}</div>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={label}
          className={cn('w-full rounded-md text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent', className)}>
          {children}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {actions.map(a => (
          <DropdownMenuItem key={a.label} variant={a.destructive ? 'destructive' : 'default'} onSelect={a.onSelect}>{a.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
