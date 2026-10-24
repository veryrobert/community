import { ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// Choose one from a list too long for Segmented
export function Picker<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  const current = options.find(o => o.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={label} className="flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-secondary px-4 text-left text-base text-foreground outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring/40 md:text-sm">
          <span className="truncate">{current?.label}</span>
          <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuRadioGroup value={value} onValueChange={v => onChange(v as T)}>
          {options.map(o => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
