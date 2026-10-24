import { useEffect, useRef, useState } from 'react'
import { LogOut, Plus } from 'lucide-react'
import { Field, FieldGroup } from '@/components/shell/Field'
import { AutoInput, AutoTextarea } from '@/components/shell/Auto'
import { SendField } from '@/components/shell/SendField'
import { OnOff, Segmented } from '@/components/shell/Segmented'
import { useDialogs } from '@/components/shell/Dialogs'
import { resetTwoFactor } from '@/lib/auth'
import { Security } from './Security'
import { ToolButton } from '@/components/shell/ToolButton'
import { RowMenu } from '@/components/shell/RowMenu'
import { Avatar } from '@/components/shell/Avatar'
import { getTheme, setTheme, type Theme } from '@/lib/theme'
import { MAX_TAGS, TagChip } from '@/components/shell/Tags'
import {
  addGoal, addTag, invite, loadInvites, removeGoal, removeTag, renameTag, tidyTag, saveCommunity, clearRequest, loadRequests, removeAvatar, saveName, setNotify, uploadAvatar, setRole, signOut, uninvite, type Store,
} from '@/lib/data'
import { displayName, type Invite, type InviteRequest, type Profile, type Role } from '@/lib/types'

export function Settings({ store, onChanged }: { store: Store; onChanged: () => void }) {
  const { me } = store
  const save = (fn: () => Promise<unknown>) => fn().then(onChanged)

  return (
    <>
      <FieldGroup title="You">
        <Photo me={me} onChanged={onChanged} />
        <AutoInput label="Name" value={me.name ?? ''} required autoComplete="name" onSave={v => save(() => saveName(me.id, v))} />
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="min-w-0 truncate text-xs text-muted-foreground">{me.email}, {me.role}</p>
          <ToolButton icon={LogOut} label="Sign out" side="left" className="shrink-0" onClick={() => signOut()} />
        </div>
      </FieldGroup>
      <FieldGroup title="Appearance">
        <Appearance />
      </FieldGroup>
      <FieldGroup title="Email me about">
        <Field label="Comments on ideas I’m on">
          <OnOff label="Comments" value={me.notify_comments} onChange={v => save(() => setNotify(me.id, { notify_comments: v }))} />
        </Field>
        <Field label="Status changes on ideas I’m on">
          <OnOff label="Status changes" value={me.notify_status} onChange={v => save(() => setNotify(me.id, { notify_status: v }))} />
        </Field>
        <Field label="Every new idea">
          <OnOff label="New ideas" value={me.notify_ideas} onChange={v => save(() => setNotify(me.id, { notify_ideas: v }))} />
        </Field>
        <p className="px-1 text-xs text-muted-foreground">Supporting or commenting on an idea puts you on it as a follower. Tap your role on an idea again to leave it.</p>
      </FieldGroup>
      <Security />
    </>
  )
}

export type AdminSection = 'community' | 'tags' | 'people'

// The admin area's sections, for facilitators. Rendered by views/Admin.tsx, one section at a time.
export function Facilitation({ store, onChanged, section }: { store: Store; onChanged: () => void; section: AdminSection }) {
  const [role, setNewRole] = useState<Role>('member')
  const [invites, setInvites] = useState<Invite[]>([])
  const [error, setError] = useState<string | null>(null)
  const { community } = store
  const { confirm, prompt } = useDialogs()

  const [requests, setRequests] = useState<InviteRequest[]>([])
  const refreshInvites = () => loadInvites().then(setInvites).catch(() => {})
  const refreshAll = () => { refreshInvites(); return loadRequests().then(setRequests).catch(() => {}) }
  useEffect(() => { refreshAll() }, [])

  const save = (fn: () => Promise<unknown>) => fn().then(onChanged)
  // For one-tap actions (remove, change role), which have no field to show an error beside
  const act = (fn: () => Promise<unknown>) => { setError(null); fn().then(onChanged).catch(e => setError(e.message)) }

  const joined = new Set(store.members.map(m => m.email))
  const pending = invites.filter(i => !joined.has(i.email))

  return (
    <>
      {section === 'community' && (
      <FieldGroup title="Community">
        <AutoInput label="Community name" value={community.name} required onSave={v => save(() => saveCommunity({ ...community, name: v }))} />
        <AutoTextarea label="Vision statement" value={community.vision} count={400} onSave={v => save(() => saveCommunity({ ...community, vision: v }))} />
        <AutoTextarea label="About" value={community.about} className="min-h-32" onSave={v => save(() => saveCommunity({ ...community, about: v }))} />
        <AutoTextarea label="How it works" value={community.guidelines} className="min-h-32" onSave={v => save(() => saveCommunity({ ...community, guidelines: v }))} />
        <AutoTextarea label="Code of conduct" value={community.conduct} className="min-h-32" onSave={v => save(() => saveCommunity({ ...community, conduct: v }))} />
        <p className="px-1 text-xs text-muted-foreground">These make up the About page, which anyone can read before signing in. Markdown works.</p>
      </FieldGroup>
      )}

      {section === 'tags' && (
      <FieldGroup title="Goals">
        <List items={store.goals.map(g => ({ key: g.id, label: g.title }))} label="goal" onRemove={async id => {
          const used = store.ideas.filter(i => i.goal_id === id).length
          if (!used || await confirm({ title: 'Remove goal?', body: `${used} idea${used === 1 ? ' is' : 's are'} linked to it. The ideas stay; the link goes.`, action: 'Remove goal', destructive: true })) act(() => removeGoal(id))
        }} />
        <SendField label="Add goal" placeholder="Add a goal" icon={Plus} enterKeyHint="done" onSend={v => save(() => addGoal(v, store.goals.length + 1))} />
      </FieldGroup>
      )}

      {section === 'tags' && (
      <FieldGroup title={`Tags ${store.tags.length}/${MAX_TAGS}`}>
        <p className="px-1 text-xs text-muted-foreground">One shared list. Members tag ideas from it, up to 3 each, and can’t add their own. Tap a tag to rename or remove it.</p>
        {store.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {store.tags.map(t => {
              const used = store.ideas.filter(i => i.tag_ids.includes(t.id)).length
              return (
                <li key={t.id}>
                  <RowMenu label={`${t.name}, on ${used} ideas`} className="rounded-full hover:bg-transparent data-[state=open]:bg-transparent"
                    actions={[
                      { label: 'Rename', onSelect: async () => {
                        const name = await prompt({ title: 'Rename tag', label: 'Tag name', value: t.name, action: 'Rename tag' })
                        if (name && tidyTag(name) !== t.name) act(() => renameTag(t.id, name))
                      } },
                      { label: 'Remove', destructive: true, onSelect: async () => {
                        if (!used || await confirm({ title: `Remove ${t.name}?`, body: `It comes off ${used} idea${used === 1 ? '' : 's'}. This can’t be undone.`, action: 'Remove tag', destructive: true })) act(() => removeTag(t.id))
                      } },
                    ]}>
                    <TagChip className="gap-1.5 text-sm text-foreground hover:bg-accent">
                      {t.name}
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{used}</span>
                    </TagChip>
                  </RowMenu>
                </li>
              )
            })}
          </ul>
        )}
        {store.tags.length < MAX_TAGS && (
          <SendField label="Add tag" placeholder="Add a tag" icon={Plus} enterKeyHint="done"
            onSend={v => {
              if (store.tags.some(t => t.name.toLowerCase() === tidyTag(v).toLowerCase())) return Promise.reject(new Error('That tag already exists.'))
              return save(() => addTag(v, store.tags.length + 1))
            }} />
        )}
      </FieldGroup>
      )}

      {section === 'people' && requests.length > 0 && (
      <FieldGroup title={`Asking to join ${requests.length}`}>
        <ul className="flex flex-col">
          {requests.map(r => (
            <li key={r.id} className="border-t border-border py-1">
              <RowMenu label={`${r.name}, ${r.email}`} className="flex flex-col gap-0.5 px-1 py-2"
                actions={[
                  { label: 'Invite as member', onSelect: () => act(() => invite(r.email, 'member').then(() => clearRequest(r.id)).then(refreshAll)) },
                  { label: 'Invite as facilitator', onSelect: () => act(() => invite(r.email, 'facilitator').then(() => clearRequest(r.id)).then(refreshAll)) },
                  { label: 'Decline', destructive: true, onSelect: () => act(() => clearRequest(r.id).then(refreshAll)) },
                ]}>
                <span className="text-sm text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.email}{r.email_kind === 'personal' ? ' (personal)' : ''}</span>
                <span className="text-xs text-muted-foreground">{[r.role, r.organisation].filter(Boolean).join(', ')}</span>
                <span className="text-xs text-muted-foreground">{[r.design_area, r.practice].filter(Boolean).join(' · ')}</span>
                {r.note && <span className="mt-1 text-sm text-muted-foreground">{r.note}</span>}
                {r.heard && <span className="text-xs text-muted-foreground">Heard via {r.heard}</span>}
              </RowMenu>
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs text-muted-foreground">Tap a request to invite or decline. Invited people still need this site’s address from you.</p>
      </FieldGroup>
      )}
      {section === 'people' && (
      <FieldGroup title="Invite">
        <Field label="As">
          <Segmented label="Invite as" value={role} onChange={setNewRole} options={[{ value: 'member', label: 'Member' }, { value: 'facilitator', label: 'Facilitator' }]} />
        </Field>
        <SendField label="Add invite" placeholder="Email address" type="email" autoComplete="off" icon={Plus}
          onSend={v => invite(v, role).then(refreshInvites)} />
        <p className="px-1 text-xs text-muted-foreground">Then send them this site’s address. They sign in with the invited email.</p>
        {pending.length > 0 && (
          <List items={pending.map(i => ({ key: i.email, label: i.email, note: i.role === 'facilitator' ? 'facilitator' : undefined }))} label="invite"
            onRemove={e => act(() => uninvite(e).then(refreshInvites))} />
        )}
      </FieldGroup>
      )}

      {section === 'people' && (
      <FieldGroup title={`Members ${store.members.length}`}>
        <ul className="flex flex-col">
          {store.members.map(m => {
            const other = m.role === 'facilitator' ? 'member' : 'facilitator'
            return (
              <li key={m.id} className="border-t border-border py-1">
                <RowMenu label={`${displayName(m)}, ${m.role}`} className="flex items-center justify-between gap-3 px-1 py-2"
                  actions={m.id === store.me.id ? [] : [
                    { label: `Make ${other}`, onSelect: () => act(() => setRole(m.id, other)) },
                    { label: 'Reset two-factor', destructive: true, onSelect: async () => {
                      if (await confirm({ title: `Reset ${displayName(m)}’s two-factor?`, body: 'Their authenticators are removed. Next time they sign in, they set up a new one. Do this only once you’re sure it’s them asking.', action: 'Reset two-factor', destructive: true })) {
                        act(() => resetTwoFactor(m.id))
                      }
                    } },
                  ]}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{displayName(m)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{m.id === store.me.id ? 'You' : m.role === 'facilitator' ? 'Facilitator' : ''}</span>
                </RowMenu>
              </li>
            )
          })}
        </ul>
      </FieldGroup>
      )}
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </>
  )
}

function List<K extends string | number>({ items, label, onRemove }: { items: { key: K; label: string; note?: string }[]; label: string; onRemove: (key: K) => unknown }) {
  if (!items.length) return null
  return (
    <ul className="flex flex-col">
      {items.map(i => (
        <li key={i.key} className="border-t border-border py-1">
          <RowMenu label={i.label} className="px-1 py-2 text-sm text-foreground" actions={[{ label: `Remove ${label}`, destructive: true, onSelect: () => onRemove(i.key) }]}>
            {i.label}
            {i.note && <span className="text-muted-foreground">, {i.note}</span>}
          </RowMenu>
        </li>
      ))}
    </ul>
  )
}

// Tap the photo to choose a new one; a picture from GitHub sign-in is used until then
function Photo({ me, onChanged }: { me: Profile; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try { await fn(); onChanged() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-4 px-1">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Change photo"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <Avatar name={displayName(me)} url={me.avatar_url} className="size-16 text-sm" />
      </button>
      <div className="flex flex-col items-start gap-1 text-sm">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          {busy ? 'Uploading' : me.avatar_url ? 'Change photo' : 'Add a photo'}
        </button>
        {me.avatar_url && !busy && (
          <button type="button" onClick={() => run(() => removeAvatar(me.id))} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
        )}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(() => uploadAvatar(me.id, f)) }} />
    </div>
  )
}

// Dark, light or the device's setting; saved on this device
function Appearance() {
  const [theme, set] = useState<Theme>(getTheme)
  return (
    <Segmented<Theme> label="Appearance" value={theme} onChange={t => { set(t); setTheme(t) }}
      options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'Device' }]} />
  )
}
