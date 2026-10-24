import { cn } from '@/lib/utils'

// The app's mark: two overlapping circles, as drawn by the splash (App.tsx) and the favicon
export function VennMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-10 text-foreground', className)}
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 8a8 8 0 1 0 0 16a8 8 0 1 0 0-16" />
      <path d="M20 8a8 8 0 1 1 0 16a8 8 0 1 1 0-16" />
    </svg>
  )
}
