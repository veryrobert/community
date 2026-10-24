import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// One place for the app's confirm and rename dialogs, replacing window.confirm and window.prompt.
// As on GitHub: the dialog names the thing, says what will happen, Cancel on the left, the
// action on the right, worded as the action ("Delete idea", not "OK"), red when it destroys.
type Confirm = { title: string; body?: string; action: string; destructive?: boolean }
type Prompt = { title: string; label: string; value: string; action: string }
type Open =
  | ({ kind: 'confirm' } & Confirm)
  | ({ kind: 'prompt' } & Prompt)

type Api = { confirm: (c: Confirm) => Promise<boolean>; prompt: (p: Prompt) => Promise<string | null> }
const Ctx = createContext<Api | null>(null)

export function useDialogs() {
  const api = useContext(Ctx)
  if (!api) throw new Error('useDialogs needs DialogsProvider')
  return api
}

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null)
  const [text, setText] = useState('')
  const settle = useRef<(v: boolean | string | null) => void>(() => {})

  const confirm = useCallback((c: Confirm) => new Promise<boolean>(res => {
    settle.current = v => res(v === true)
    setOpen({ kind: 'confirm', ...c })
  }), [])

  const prompt = useCallback((p: Prompt) => new Promise<string | null>(res => {
    settle.current = v => res(typeof v === 'string' ? v : null)
    setText(p.value)
    setOpen({ kind: 'prompt', ...p })
  }), [])

  function close(v: boolean | string | null) {
    settle.current(v)
    setOpen(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim()) close(text.trim())
  }

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      <AlertDialog open={open !== null} onOpenChange={o => !o && close(open?.kind === 'prompt' ? null : false)}>
        {open && (
          <AlertDialogContent>
            <AlertDialogTitle>{open.title}</AlertDialogTitle>
            {open.kind === 'confirm' ? (<>
              {open.body ? <AlertDialogDescription>{open.body}</AlertDialogDescription> : <AlertDialogDescription className="sr-only">{open.title}</AlertDialogDescription>}
              <div className="flex justify-end gap-2 pt-1">
                <AlertDialogCancel asChild><Button variant="ghost">Cancel</Button></AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant={open.destructive ? 'destructive' : 'default'} onClick={() => close(true)}>{open.action}</Button>
                </AlertDialogAction>
              </div>
            </>) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <AlertDialogDescription className="sr-only">{open.label}</AlertDialogDescription>
                <Input aria-label={open.label} value={text} onChange={e => setText(e.target.value)} autoFocus enterKeyHint="done" onFocus={e => e.currentTarget.select()} />
                <div className="flex justify-end gap-2">
                  <AlertDialogCancel asChild><Button type="button" variant="ghost">Cancel</Button></AlertDialogCancel>
                  <Button type="submit" disabled={!text.trim()}>{open.action}</Button>
                </div>
              </form>
            )}
          </AlertDialogContent>
        )}
      </AlertDialog>
    </Ctx.Provider>
  )
}
