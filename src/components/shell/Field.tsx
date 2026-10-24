import type { ReactNode } from 'react'

// A labelled row inside a sheet. The label sits above the field in grey; aside goes on the right
// of the label row, for a count or a "Saved".
export function Field({ label, aside, htmlFor, children }: { label: string; aside?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1 text-xs text-muted-foreground">
        <label htmlFor={htmlFor}>{label}</label>
        {aside && <span aria-live="polite">{aside}</span>}
      </div>
      {children}
    </div>
  )
}

export function FieldGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      {title && <h3 className="-mb-1 border-t border-border px-1 pt-4 text-xs text-foreground">{title}</h3>}
      {children}
    </section>
  )
}
