import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { displayName, type Tag, type Comment, type Community, type InviteRequest, type JoinRequest, type Goal, type Idea, type HideReason, type IdeaRole, type Invite, type Notify, type Person, type Profile, type ProfileDetails, type Role, type Status, type Update } from './types'

// Turns a Supabase error into something worth showing
function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

export { signOut } from './auth'

// Everything the board needs, loaded together and refreshed after each change
export type Store = {
  me: Profile
  community: Community
  goals: Goal[]
  tags: Tag[]
  ideas: Idea[]
  updates: Update[]
  members: Profile[]
}

export function useStore(userId: string | undefined) {
  const [store, setStore] = useState<Store | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      // Emails come separately: the database only gives out your own, those members chose to show,
      // and (to facilitators) everyone's. The rest are left blank.
      const [profiles, emails, community, goals, tags, ideas, updates] = await Promise.all([
        supabase.from('profiles').select('id, name, role, avatar_url, notify_comments, notify_status, notify_ideas, organisation, job_title, design_area, linkedin, bio, in_directory, show_email').order('name').then(check),
        supabase.rpc('member_emails').then(check),
        supabase.from('community').select('name, vision, about, guidelines, conduct').single().then(check),
        supabase.from('goals').select('*').order('position').then(check),
        supabase.from('tags').select('*').order('position').order('name').then(check),
        supabase.from('idea_list').select('*').order('created_at', { ascending: false }).then(check),
        supabase.from('updates').select('id, title, body, created_at, update_ideas(idea_id)').order('created_at', { ascending: false }).then(check),
      ])
      const emailOf = new Map((emails as { id: string; email: string }[]).map(e => [e.id, e.email]))
      const members = (profiles as Omit<Profile, 'email'>[]).map(p => ({ ...p, email: emailOf.get(p.id) ?? '' })) as Profile[]
      const me = members.find(m => m.id === userId)
      if (!me) throw new Error('Your account isn’t set up. Ask a facilitator to invite you again.')
      setStore({
        me,
        members,
        community: community as Community,
        goals: goals as Goal[],
        tags: tags as Tag[],
        ideas: ideas as Idea[],
        updates: updates as Update[],
      })
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  // Live: any change someone else makes reloads the store, batched so a burst is one reload
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel('community')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(timer.current)
        timer.current = setTimeout(load, 400)
      })
      .subscribe()
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel) }
  }, [userId, load])

  // Voting changes the list straight away and settles with the server after
  const vote = useCallback(async (idea: Idea) => {
    setStore(s => s && {
      ...s,
      ideas: s.ideas.map(i => i.id === idea.id ? { ...i, voted: !i.voted, vote_count: i.vote_count + (i.voted ? -1 : 1) } : i),
    })
    const res = idea.voted
      ? await supabase.from('votes').delete().match({ idea_id: idea.id, user_id: userId })
      : await supabase.from('votes').insert({ idea_id: idea.id })
    if (res.error) load()
  }, [userId, load])

  return { store, error, load, vote }
}

export type IdeaInput = { title: string; body: string; goal_id: number | null }

export async function createIdea(input: IdeaInput, tagIds: number[]) {
  const row = check(await supabase.from('ideas').insert(input).select('id').single())
  const id = row!.id as number
  if (tagIds.length) check(await supabase.from('idea_tags').insert(tagIds.map(tag_id => ({ idea_id: id, tag_id }))))
  return id
}

// Changes an idea's tags to exactly these
export async function setIdeaTags(ideaId: number, before: number[], after: number[]) {
  const gone = before.filter(t => !after.includes(t))
  const added = after.filter(t => !before.includes(t))
  if (gone.length) check(await supabase.from('idea_tags').delete().eq('idea_id', ideaId).in('tag_id', gone))
  if (added.length) check(await supabase.from('idea_tags').insert(added.map(tag_id => ({ idea_id: ideaId, tag_id }))))
}

export async function editIdea(id: number, input: Partial<IdeaInput>) {
  check(await supabase.from('ideas').update(input).eq('id', id))
}

export async function deleteIdea(id: number) {
  check(await supabase.from('ideas').delete().eq('id', id))
}

export async function setStatus(id: number, status: Status, note: string | null, mergedInto: number | null) {
  check(await supabase.from('ideas').update({ status, status_note: note || null, merged_into: status === 'merged' ? mergedInto : null }).eq('id', id))
}

export async function loadPeople(ideaId: number) {
  const rows = check(await supabase.from('idea_people').select('user_id, role, created_at, profiles(name)').eq('idea_id', ideaId).order('created_at')) as unknown as
    { user_id: string; role: IdeaRole; profiles: { name: string | null } }[]
  return rows.map(r => ({ user_id: r.user_id, role: r.role, name: displayName({ name: r.profiles.name, email: '' }) })) as Person[]
}

export async function joinIdea(ideaId: number, userId: string, role: IdeaRole) {
  check(await supabase.from('idea_people').upsert({ idea_id: ideaId, user_id: userId, role }, { onConflict: 'idea_id,user_id' }))
}

export async function leaveIdea(ideaId: number, userId: string) {
  check(await supabase.from('idea_people').delete().match({ idea_id: ideaId, user_id: userId }))
}

export async function loadComments(ideaId: number) {
  return check(await supabase.from('comment_list').select('*').eq('idea_id', ideaId).order('created_at')) as Comment[]
}

export async function addComment(ideaId: number, body: string) {
  check(await supabase.from('comments').insert({ idea_id: ideaId, body }))
}

export async function hideComment(id: number, reason: HideReason | null) {
  check(await supabase.from('comments').update({ hidden: reason !== null, hidden_reason: reason }).eq('id', id))
}

export async function likeComment(id: number, userId: string, on: boolean) {
  check(on
    ? await supabase.from('comment_likes').insert({ comment_id: id })
    : await supabase.from('comment_likes').delete().match({ comment_id: id, user_id: userId }))
}

// Profile photo: cropped square and shrunk to 256px in the browser, so uploads stay small
async function squareWebp(file: File) {
  const img = await createImageBitmap(file)
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256)
  return new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('That image couldn’t be read.')), 'image/webp', 0.85))
}

export async function uploadAvatar(userId: string, file: File) {
  const path = `${userId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('avatars').upload(path, await squareWebp(file), { contentType: 'image/webp' })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  check(await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId))
}

export async function removeAvatar(userId: string) {
  check(await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId))
}

export async function editComment(id: number, body: string) {
  check(await supabase.from('comments').update({ body }).eq('id', id))
}

// Changes on one idea's comments, for the open idea panel
export function watchComments(ideaId: number, onChange: () => void) {
  const channel = supabase.channel(`comments-${ideaId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `idea_id=eq.${ideaId}` }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export async function setNotify(id: string, prefs: Partial<Notify>) {
  check(await supabase.from('profiles').update(prefs).eq('id', id))
}

export async function deleteComment(id: number) {
  check(await supabase.from('comments').delete().eq('id', id))
}

export async function publishUpdate(title: string, body: string, ideaIds: number[]) {
  const row = check(await supabase.from('updates').insert({ title, body }).select('id').single())
  if (ideaIds.length) check(await supabase.from('update_ideas').insert(ideaIds.map(idea_id => ({ update_id: row!.id, idea_id }))))
}

export async function deleteUpdate(id: number) {
  check(await supabase.from('updates').delete().eq('id', id))
}

// Directory details and opt-outs; LinkedIn gets https:// if it was left off
export async function saveProfile(id: string, details: Partial<ProfileDetails>) {
  const d = { ...details }
  if (typeof d.linkedin === 'string') {
    const v = d.linkedin.trim()
    d.linkedin = !v ? '' : /^https?:\/\//.test(v) ? v.replace(/^http:/, 'https:') : `https://${v}`
  }
  const { error } = await supabase.from('profiles').update(d).eq('id', id)
  if (error) throw new Error(/linkedin/i.test(error.message) ? 'Use your LinkedIn profile address, e.g. linkedin.com/in/yourname' : error.message)
}

export async function saveName(id: string, name: string) {
  check(await supabase.from('profiles').update({ name: name.trim() }).eq('id', id))
}

export async function setRole(id: string, role: Role) {
  check(await supabase.from('profiles').update({ role }).eq('id', id))
}

export async function saveCommunity(c: Community) {
  check(await supabase.from('community').update({ ...c, updated_at: new Date().toISOString() }).eq('id', 1))
}

export async function addGoal(title: string, position: number) {
  check(await supabase.from('goals').insert({ title, position }))
}

export async function removeGoal(id: number) {
  check(await supabase.from('goals').delete().eq('id', id))
}

// Tag names are tidied the same way the database does, so duplicates are caught before saving
export const tidyTag = (name: string) => name.trim().replace(/\s+/g, ' ')

function checkTag(res: { data: unknown; error: { message: string } | null }) {
  if (res.error && /duplicate|unique/i.test(res.error.message)) throw new Error('That tag already exists.')
  check(res)
}

export async function addTag(name: string, position: number) {
  checkTag(await supabase.from('tags').insert({ name: tidyTag(name), position }))
}

export async function renameTag(id: number, name: string) {
  checkTag(await supabase.from('tags').update({ name: tidyTag(name) }).eq('id', id))
}

export async function removeTag(id: number) {
  check(await supabase.from('tags').delete().eq('id', id))
}

export async function loadInvites() {
  return check(await supabase.from('invites').select('email, role, created_at').order('created_at', { ascending: false })) as Invite[]
}

export async function invite(email: string, role: Role) {
  const { data } = await supabase.auth.getUser()
  check(await supabase.from('invites').upsert({ email: email.trim().toLowerCase(), role, invited_by: data.user?.id }))
}

// The About page, readable before signing in
export async function loadAbout() {
  const { data, error } = await supabase.rpc('about')
  if (error) throw new Error(error.message)
  return (data as Community[])[0]
}

export async function requestInvite(r: JoinRequest) {
  const { error } = await supabase.rpc('request_invite', {
    p_name: r.name, p_email: r.email, p_organisation: r.organisation, p_note: r.note, p_email_kind: r.email_kind,
    p_role: r.role, p_design_area: r.design_area, p_practice: r.practice, p_heard: r.heard,
  })
  if (error) throw new Error(error.message)
}

export async function loadRequests() {
  return check(await supabase.from('invite_requests').select('*').order('created_at', { ascending: false })) as InviteRequest[]
}

export async function clearRequest(id: number) {
  check(await supabase.from('invite_requests').delete().eq('id', id))
}

export async function uninvite(email: string) {
  check(await supabase.from('invites').delete().eq('email', email))
}
