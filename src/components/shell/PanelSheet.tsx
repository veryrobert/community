import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PANEL_W, SAFE_BOTTOM } from './layout'

// A non-modal panel (closes when you click off it): from the right on desktop. On phones it rises
// nearly to the top, like an iOS sheet, with a grab bar: drag the bar or the header down to close.
export function PanelSheet({
  open,
  title,
  action,
  onClose,
  phone,
  children,
}: {
  open: boolean
  title?: string
  action?: ReactNode // one icon button in the header, beside close: Post, Publish, Done
  onClose: () => void
  phone: boolean
  children: ReactNode
}) {
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null)

  function down(e: PointerEvent) {
    if (!phone || (e.target as Element).closest('button')) return
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (!drag.current || !sheet.current) return
    const dy = Math.max(0, e.clientY - drag.current.y)
    drag.current.dy = dy
    sheet.current.style.transition = 'none'
    sheet.current.style.transform = `translateY(${dy}px)`
  }
  function up() {
    const d = drag.current
    drag.current = null
    if (!d || !sheet.current) return
    const speed = d.dy / Math.max(1, performance.now() - d.t) // px per ms
    sheet.current.style.transition = 'transform 200ms ease-out'
    if (d.dy > 120 || (d.dy > 30 && speed > 0.5)) {
      sheet.current.style.transform = 'translateY(100%)'
      setTimeout(() => { onClose(); if (sheet.current) { sheet.current.style.transform = ''; sheet.current.style.transition = '' } }, 200)
    } else {
      sheet.current.style.transform = ''
    }
  }

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()} modal={false}>
      <SheetContent
        ref={sheet}
        side={phone ? 'bottom' : 'right'}
        className="panel gap-0 data-[side=bottom]:rounded-t-3xl data-[side=bottom]:border-x-0 data-[side=right]:sm:max-w-none"
        style={phone ? { height: 'calc(100dvh - env(safe-area-inset-top, 0px) - 12px)' } : { width: `min(${PANEL_W}px, 86vw)` }}
        // Focus stays where it was; forms inside autofocus their first field
        onOpenAutoFocus={e => e.preventDefault()}
        // A field that uses Escape itself (to cancel an edit) marks itself, so Escape doesn't also close the panel
        onEscapeKeyDown={e => { if ((document.activeElement as Element | null)?.closest('[data-own-escape]')) e.preventDefault() }}
        // Clicking off the panel closes it, except on the top bar (it switches panels) and in
        // anything opened from the panel, like a dialog, menu or tooltip
        onInteractOutside={e => {
          const t = e.target as Element | null
          if (t?.closest('header, [role="dialog"], [role="alertdialog"], [role="menu"], [data-radix-popper-content-wrapper]')) e.preventDefault()
        }}
      >
        <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className={phone ? 'touch-none' : undefined}>
          {phone && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/40" />}
          <SheetHeader className="min-h-14 flex-row items-center justify-between gap-2 px-5 py-2 pr-14">
            <SheetTitle>{title}</SheetTitle>
            {action}
            <SheetDescription className="sr-only">{title} options</SheetDescription>
          </SheetHeader>
        </div>
        <div className="flex flex-col gap-10 overflow-y-auto px-5 pt-4" style={{ paddingBottom: phone ? `calc(${SAFE_BOTTOM} + 32px)` : 32 }}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
