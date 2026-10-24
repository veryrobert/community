import * as React from "react"
import { cn } from "cn"
import { AlertDialog as P } from "radix-ui"

// shadcn's alert dialog, on the app's tokens: frosted panel, hairline border, no shadow
function AlertDialog(props: React.ComponentProps<typeof P.Root>) {
  return <P.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Overlay className="fixed inset-0 z-[70] bg-black/60 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <P.Content
        className={cn(
          "panel fixed top-1/2 left-1/2 z-[70] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl p-5 text-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0",
          className
        )}
        {...props}
      />
    </P.Portal>
  )
}

const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<typeof P.Title>) => (
  <P.Title className={cn("text-base font-medium text-foreground", className)} {...props} />
)
const AlertDialogDescription = ({ className, ...props }: React.ComponentProps<typeof P.Description>) => (
  <P.Description className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
)
const AlertDialogCancel = P.Cancel
const AlertDialogAction = P.Action

export { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction }
