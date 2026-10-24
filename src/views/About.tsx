import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup } from '@/components/shell/Field'
import { Markdown } from '@/components/shell/Markdown'
import { loadAbout, requestInvite } from '@/lib/data'
import type { Community } from '@/lib/types'

// What the community is, how it works, its code of conduct, and (for anyone not yet in) a way to
// ask to join. Readable before signing in; facilitators edit the text in Admin.
export function About({ community, signedIn }: { community?: Community; signedIn: boolean }) {
  const [c, setC] = useState<Community | undefined>(community)
  useEffect(() => { if (!community) loadAbout().then(setC).catch(() => {}) }, [community])
  const shown = community ?? c

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-foreground">About {shown?.name ?? 'this community'}</h1>
        {shown?.about && <Markdown className="text-base">{shown.about}</Markdown>}
      </div>
      {shown?.guidelines && (
        <FieldGroup title="How it works">
          <Markdown className="px-1">{shown.guidelines}</Markdown>
        </FieldGroup>
      )}
      {shown?.conduct && (
        <FieldGroup title="Code of conduct">
          <Markdown className="px-1">{shown.conduct}</Markdown>
        </FieldGroup>
      )}
      {!signedIn && <RequestInvite />}
    </div>
  )
}

function RequestInvite() {
  const [form, setForm] = useState({ name: '', email: '', organisation: '', note: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)
    try {
      await requestInvite(form)
      setState('sent')
    } catch (err) {
      setError((err as Error).message)
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <FieldGroup title="Ask to join">
        <p className="px-1 text-sm text-foreground">Thanks. A facilitator will look at your request and email you an invitation if it’s a fit.</p>
      </FieldGroup>
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup title="Ask to join">
        <p className="-mt-1 px-1 text-sm text-muted-foreground">Membership is by invitation. Tell the facilitators who you are and they’ll be in touch.</p>
        <Field label="Name" htmlFor="req-name"><Input id="req-name" value={form.name} onChange={set('name')} required maxLength={120} autoComplete="name" enterKeyHint="next" /></Field>
        <Field label="Work email" htmlFor="req-email"><Input id="req-email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" enterKeyHint="next" /></Field>
        <Field label="Organisation and role" htmlFor="req-org"><Input id="req-org" value={form.organisation} onChange={set('organisation')} maxLength={160} enterKeyHint="next" /></Field>
        <Field label="Why you’d like to join" htmlFor="req-note"><Textarea id="req-note" value={form.note} onChange={set('note')} maxLength={1000} /></Field>
        {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={state === 'sending'} className="h-12 w-full rounded-xl text-base">{state === 'sending' ? 'Sending' : 'Ask to join'}</Button>
      </FieldGroup>
    </form>
  )
}
