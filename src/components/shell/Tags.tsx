import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/lib/types'

export const MAX_TAGS_PER_IDEA = 3
export const MAX_TAGS = 20

// The one look for a tag everywhere: a hairline pill. Selected inverts, as in Segmented.
export function TagChip({ selected, className, ...props }: ComponentProps<'span'> & { selected?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 items-center rounded-full border px-3.5 text-xs whitespace-nowrap',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

// Read-only tags for an idea, in the shared order
export function TagList({ ids, tags, className }: { ids: number[]; tags: Tag[]; className?: string }) {
  const shown = tags.filter(t => ids.includes(t.id))
  if (!shown.length) return null
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map(t => <TagChip key={t.id}>{t.name}</TagChip>)}
    </span>
  )
}

// Choose tags from the shared list. Nothing can be typed in, so the list stays as facilitators keep it.
export function TagPicker({
  tags, value, onChange, max = MAX_TAGS_PER_IDEA, label,
}: {
  tags: Tag[]
  value: number[]
  onChange: (ids: number[]) => void
  max?: number
  label: string
}) {
  const full = value.length >= max
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {tags.map(t => {
        const on = value.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            disabled={!on && full}
            onClick={() => onChange(on ? value.filter(v => v !== t.id) : [...value, t.id])}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            <TagChip selected={on} className={cn('text-sm', !on && 'text-foreground hover:bg-accent')}>{t.name}</TagChip>
          </button>
        )
      })}
    </div>
  )
}
