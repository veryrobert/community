import { useState } from 'react'
import { cn } from '@/lib/utils'

// A member's photo, or their initials on the field fill when there's none (or it fails to load)
export function Avatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  const [broken, setBroken] = useState(false)
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs text-muted-foreground', className)}>
      {url && !broken ? <img src={url} alt="" className="size-full object-cover" onError={() => setBroken(true)} /> : initials}
    </span>
  )
}
