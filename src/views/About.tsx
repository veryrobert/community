import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup } from '@/components/shell/Field'
import { Picker } from '@/components/shell/Picker'
import { Segmented } from '@/components/shell/Segmented'
import { Markdown } from '@/components/shell/Markdown'
import { loadAbout, requestInvite } from '@/lib/data'
import type { Community, JoinRequest } from '@/lib/types'

// What the community is, how it works, its code of conduct, and (for anyone not yet in) a way to
// ask to join. Readable before signing in; facilitators edit the text in Admin.
export function About({ community, signedIn, onJoin }: { community?: Community; signedIn: boolean; onJoin?: () => void }) {
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
      {!signedIn && onJoin && <PageLink onClick={onJoin}>How to join</PageLink>}
    </div>
  )
}

// Who to write to about joining. A placeholder until the community has its own address.
const CONTACT_EMAIL = 'hello@example.com'

const STEPS = [
  { title: 'Ask to join', body: 'Tell us a little about yourself using the form below.' },
  { title: 'We’ll take a look', body: 'A facilitator will review your request, usually within a week.' },
  { title: 'Welcome in', body: 'You’ll get an email invite. Sign in with that address and the code we email you.' },
]

// How to join, for people not yet in: three steps, then the request form and who to contact. Links back to About.
export function Join({ onAbout }: { onAbout: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-foreground">How to join</h1>
        <p className="text-base text-muted-foreground">Design for Public is open to anyone doing design work in the Irish public and civil service. Joining is free and takes three quick steps.</p>
      </div>
      {/* 1 → 2 → 3: across on desktop, stacked on phones */}
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex flex-col gap-2 rounded-[2px] border border-border p-4">
            <span className="grid size-7 place-items-center rounded-full border border-border font-mono text-xs text-foreground tabular-nums">{i + 1}</span>
            <span className="text-sm text-foreground">{step.title}</span>
            <span className="text-xs text-muted-foreground">{step.body}</span>
            {i < STEPS.length - 1 && <ChevronRight aria-hidden strokeWidth={1.5} className="absolute top-1/2 -right-3 hidden size-4 -translate-y-1/2 bg-background text-muted-foreground sm:block" />}
          </li>
        ))}
      </ol>
      <RequestInvite />
      <FieldGroup title="Questions">
        <p className="px-1 text-sm text-muted-foreground">
          Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">{CONTACT_EMAIL}</a> and we’ll be happy to help.
        </p>
      </FieldGroup>
      <PageLink onClick={onAbout}>About the community</PageLink>
    </div>
  )
}

function PageLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 self-start px-1 text-sm text-muted-foreground hover:text-foreground">
      {children}
      <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
    </button>
  )
}

// The choices offered for area of design and how someone practises; stored as written
const AREAS = ['Service design', 'User research', 'Content design', 'Interaction and UX design', 'Visual and graphic design', 'Product design', 'Accessibility', 'Design leadership', 'Something else']
const PRACTICE = ['I practise design day to day', 'I lead or manage design work', 'I work closely with designers', 'I’m moving into design']

function RequestInvite() {
  const [form, setForm] = useState<JoinRequest>({ name: '', email: '', email_kind: 'work', organisation: '', role: '', design_area: '', practice: '', note: '', heard: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof JoinRequest) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))
  const pick = (k: keyof JoinRequest) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.design_area || !form.practice) { setError('Choose your area of design and how you work with design.'); return }
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
      <FieldGroup title="1. Ask to join">
        <p className="px-1 text-sm text-foreground">Thanks, that’s with us. A facilitator will review it and email you an invite if it’s a fit.</p>
      </FieldGroup>
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup title="1. Ask to join">
        <Field label="Name" htmlFor="req-name"><Input id="req-name" value={form.name} onChange={set('name')} required maxLength={120} autoComplete="name" enterKeyHint="next" /></Field>
        <div className="flex flex-col gap-2">
          <Segmented<'work' | 'personal'> label="Email type" value={form.email_kind} onChange={pick('email_kind')}
            options={[{ value: 'work', label: 'Work email' }, { value: 'personal', label: 'Personal email' }]} />
          <Input id="req-email" aria-label={form.email_kind === 'work' ? 'Work email' : 'Personal email'} type="email" value={form.email} onChange={set('email')} required autoComplete="email" enterKeyHint="next"
            placeholder={form.email_kind === 'work' ? 'name@department.gov.ie' : 'name@example.com'} />
          <p className="px-1 text-xs text-muted-foreground">A work email is easiest for us to check, but some workplaces block outside emails. A personal one is fine too.</p>
        </div>
        <Field label="Organisation" htmlFor="req-org"><Input id="req-org" value={form.organisation} onChange={set('organisation')} required maxLength={160} autoComplete="organization" enterKeyHint="next" /></Field>
        <Field label="Role" htmlFor="req-role"><Input id="req-role" value={form.role} onChange={set('role')} required maxLength={120} autoComplete="organization-title" enterKeyHint="next" /></Field>
        <Field label="Area of design">
          <Picker label="Area of design" value={form.design_area} onChange={pick('design_area')}
            options={[{ value: '', label: 'Choose one' }, ...AREAS.map(a => ({ value: a, label: a }))]} />
        </Field>
        <Field label="How you work with design">
          <Picker label="How you work with design" value={form.practice} onChange={pick('practice')}
            options={[{ value: '', label: 'Choose one' }, ...PRACTICE.map(p => ({ value: p, label: p }))]} />
        </Field>
        <Field label="Why you’d like to join" htmlFor="req-note"><Textarea id="req-note" value={form.note} onChange={set('note')} maxLength={1000} /></Field>
        <Field label="How did you hear about us? (optional)" htmlFor="req-heard"><Input id="req-heard" value={form.heard} onChange={set('heard')} maxLength={200} enterKeyHint="done" /></Field>
        {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={state === 'sending'} className="h-12 w-full rounded-xl text-base">{state === 'sending' ? 'Sending' : 'Ask to join'}</Button>
      </FieldGroup>
    </form>
  )
}
