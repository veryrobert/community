// Sends the emails queued in the outbox table. Called by a Database Webhook on outbox inserts.
// Invitations go to the address a facilitator added. For ideas, who gets what follows Fider: people on an idea hear about its comments and status changes,
// each person can turn each kind off in Settings, and nobody is emailed about their own action.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = Deno.env.get('NOTIFY_FROM')! // e.g. community <hello@yourdomain>
const SITE = Deno.env.get('SITE_URL')!.replace(/\/$/, '')
const SECRET = Deno.env.get('WEBHOOK_SECRET')!

const STATUS: Record<string, string> = {
  open: 'Suggested', review: 'Under review', planned: 'Planned', progress: 'In progress',
  done: 'Done', hold: 'On hold', declined: 'Not proceeding', merged: 'Duplicate',
}

type Person = { email: string; name: string | null }
type Row = { id: number; kind: 'comment' | 'status' | 'idea' | 'invite'; idea_id: number | null; email: string | null; comment_id: number | null; actor_id: string | null }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const name = (p?: Person | null) => p?.name || p?.email.split('@')[0] || 'Someone'

// People on the idea (any role) who want this kind of email, minus whoever acted
async function onIdea(ideaId: number, pref: 'notify_comments' | 'notify_status', actor: string | null) {
  const { data } = await db.from('idea_people').select(`user_id, profiles(email, name, ${pref})`).eq('idea_id', ideaId)
  return (data ?? [])
    .filter(r => r.user_id !== actor && (r.profiles as Record<string, unknown>)?.[pref])
    .map(r => r.profiles as unknown as Person)
}

Deno.serve(async req => {
  if (req.headers.get('x-webhook-secret') !== SECRET) return new Response('Forbidden', { status: 403 })
  const { record } = await req.json() as { record: Row }
  if (record.kind === 'invite') return invite(record)

  const { data: idea } = await db.from('ideas').select('id, title, status, status_note, merged_into').eq('id', record.idea_id!).single()
  if (!idea) return done(record.id)
  const { data: actor } = record.actor_id ? await db.from('profiles').select('email, name').eq('id', record.actor_id).single() : { data: null }
  const link = `${SITE}/#ideas/${idea.id}`

  let to: Person[] = []
  let subject = ''
  let lines: string[] = []

  if (record.kind === 'comment') {
    const { data: c } = await db.from('comments').select('body, hidden').eq('id', record.comment_id).single()
    if (!c || c.hidden) return done(record.id)
    to = await onIdea(idea.id, 'notify_comments', record.actor_id)
    subject = `${name(actor)} commented on ${idea.title}`
    lines = [`${name(actor)} commented on “${idea.title}”:`, '', c.body]
  } else if (record.kind === 'status') {
    to = await onIdea(idea.id, 'notify_status', record.actor_id)
    subject = `${idea.title}: ${STATUS[idea.status]}`
    lines = [`${name(actor)} changed “${idea.title}” to ${STATUS[idea.status]}.`]
    if (idea.status === 'merged' && idea.merged_into) {
      const { data: original } = await db.from('ideas').select('id, title').eq('id', idea.merged_into).single()
      if (original) lines.push('', `It duplicates “${original.title}”. Your support now counts there: ${SITE}/#ideas/${original.id}`)
    }
    if (idea.status_note) lines.push('', idea.status_note)
  } else {
    const { data } = await db.from('profiles').select('id, email, name').eq('notify_ideas', true)
    to = (data ?? []).filter(p => p.id !== record.actor_id)
    subject = `New idea: ${idea.title}`
    lines = [`${name(actor)} posted “${idea.title}”.`]
  }

  if (to.length) {
    const footer = ['', link, '', 'Change what you’re emailed about in Settings, or leave the idea to stop hearing about it.']
    const text = [...lines, ...footer].join('\n')
    const html = [...lines, ...footer].map(l => l ? `<p style="margin:0 0 12px">${esc(l).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>` : '').join('')
    // One email per person, so nobody sees anyone else's address; Resend takes up to 100 per batch
    for (let i = 0; i < to.length; i += 100) {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(to.slice(i, i + 100).map(p => ({ from: FROM, to: [p.email], subject, text, html }))),
      })
      if (!res.ok) return new Response(await res.text(), { status: 502 })
    }
  }
  return done(record.id)
})

// The invitation: who asked them, what the community is, and the three steps to get in
async function invite(record: Row) {
  if (!record.email) return done(record.id)
  const { data: community } = await db.from('community').select('name').single()
  const { data: actor } = record.actor_id ? await db.from('profiles').select('email, name').eq('id', record.actor_id).single() : { data: null }
  const title = community?.name || 'the community'
  const lines = [
    `${record.actor_id ? name(actor) : 'A facilitator'} has invited you to join ${title}, a community for designers in the Irish public and civil service.`,
    '',
    'To join:',
    `1. Go to ${SITE}`,
    `2. Enter this email address (${record.email})`,
    '3. Type in the 6-digit code we email you',
    '',
    'See you there.',
  ]
  const text = lines.join('\n')
  const html = lines.map(l => l ? `<p style="margin:0 0 12px">${esc(l).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>` : '').join('')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [record.email], subject: `You’re invited to ${title}`, text, html }),
  })
  if (!res.ok) return new Response(await res.text(), { status: 502 })
  return done(record.id)
}

async function done(id: number) {
  await db.from('outbox').update({ sent_at: new Date().toISOString() }).eq('id', id)
  return new Response('ok')
}
