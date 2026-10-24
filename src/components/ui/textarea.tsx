import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("field-sizing-content min-h-24 resize-none py-3.5 leading-relaxed w-full min-w-0 rounded-xl border-0 bg-secondary px-4 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-1 aria-invalid:ring-destructive/60 md:text-sm", className)}
      {...props}
    />
  )
}

export { Textarea }
