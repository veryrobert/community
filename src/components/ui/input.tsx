import * as React from "react"
import { cn } from "cn"

// Filled field, no outline: a barely-lighter surface on the black, with room inside.
// text-base keeps fields at 16px on phones so iOS doesn't zoom when one is focused.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("h-12 w-full min-w-0 rounded-xl border-0 bg-secondary px-4 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-1 aria-invalid:ring-destructive/60 md:text-sm", className)}
      {...props}
    />
  )
}

export { Input }
