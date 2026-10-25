// In-memory stand-in for lib/data.ts, so the app can be tried without Supabase. Same exports.
import { useCallback, useSyncExternalStore } from 'react'
import { ABOUT, CONDUCT, GUIDELINES } from './about'
import type { InviteRequest, Comment, Community, HideReason, Idea, IdeaRole, Invite, Notify, Person, Profile, ProfileDetails, Role, ForumCategory, ForumPost, ForumThread, Status, Tag, Goal, Update } from '@/lib/types'

export type Store = { me: Profile; community: Community; goals: Goal[]; tags: Tag[]; ideas: Idea[]; updates: Update[]; members: Profile[] }
export type IdeaInput = { title: string; body: string; goal_id: number | null }

const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString()
const n = { notify_comments: true, notify_status: true, notify_ideas: false, avatar_url: null as string | null, linkedin: '', bio: '', in_directory: true, show_email: false }
const members: Profile[] = [
  { id: 'me', email: 'you@example.ie', name: 'You', role: 'facilitator', ...n, organisation: 'Office of the Government Chief Information Officer (OGCIO)', job_title: 'Head of design', design_area: 'Design leadership' },
  { id: 'aoife', email: 'aoife@example.ie', name: 'Aoife', role: 'member', ...n, organisation: 'Department of Social Protection', job_title: 'Service designer', design_area: 'Service design', bio: 'Working on the jobseeker journey. Happy to talk about research with people in crisis.', show_email: true },
  { id: 'ciaran', email: 'ciaran@example.ie', name: 'Ciarán', role: 'member', ...n, organisation: 'Office of the Revenue Commissioners (Revenue)', job_title: 'Content designer', design_area: 'Content design', linkedin: 'https://www.linkedin.com/in/example' },
  { id: 'niamh', email: 'niamh@example.ie', name: 'Niamh', role: 'facilitator', ...n, organisation: 'Department of Social Protection', job_title: 'User researcher', design_area: 'User research' },
]
const nameOf = (id: string) => members.find(m => m.id === id)?.name ?? 'Someone'

type IdeaRow = { id: number; title: string; body: string; goal_id: number | null; status: Status; status_note: string | null; merged_into: number | null; status_by: string | null; status_at: string | null; author_id: string; created_at: string; updated_at: string }
let nextId = 100
const db = {
  community: { name: 'Design for Public', vision: 'A connected community of designers across the public service, sharing what works so services improve for the people who use them.', about: ABOUT, guidelines: GUIDELINES, conduct: CONDUCT } as Community,
  requests: [{ id: 1, name: 'Sinéad', email: 'sinead@example.ie', email_kind: 'work', organisation: 'Department of Social Protection', role: 'Senior service designer', design_area: 'Service design', practice: 'I practise design day to day', heard: 'A colleague', note: 'Working on the jobseeker journey and would love to share what we’ve learned.', created_at: ago(8) }] as InviteRequest[],
  goals: [{ id: 1, title: 'Share methods and tools across departments', position: 1 }, { id: 2, title: 'Build design capability in every team', position: 2 }] as Goal[],
  tags: [{ id: 1, name: 'Research', position: 1 }, { id: 2, name: 'Training', position: 2 }, { id: 3, name: 'Tools', position: 3 }, { id: 4, name: 'Events', position: 4 }] as Tag[],
  ideas: [
    { id: 1, title: 'Create a shared learning library', body: 'One place for **case studies, templates and research reports** from across departments, searchable by service and method.', goal_id: 1, status: 'progress', status_note: 'Started with the templates from the Life Events work.', merged_into: null, status_by: 'niamh', status_at: ago(30), author_id: 'aoife', created_at: ago(400), updated_at: ago(30) },
    { id: 2, title: 'Introduce monthly peer sessions', body: 'One hour a month where a team presents work in progress and gets feedback from designers in other departments.', goal_id: 2, status: 'planned', status_note: null, merged_into: null, status_by: null, status_at: null, author_id: 'ciaran', created_at: ago(300), updated_at: ago(60) },
    { id: 3, title: 'Practical guidance on research with the public', body: 'Short how-to guides covering consent, data protection and paying participants.', goal_id: 1, status: 'review', status_note: null, merged_into: null, status_by: null, status_at: null, author_id: 'niamh', created_at: ago(200), updated_at: ago(90) },
    { id: 4, title: 'Mentoring for new public service designers', body: '', goal_id: 2, status: 'open', status_note: null, merged_into: null, status_by: null, status_at: null, author_id: 'aoife', created_at: ago(20), updated_at: ago(20) },
    { id: 5, title: 'Shared research participant panel', body: 'Recruiting participants is slow. A shared panel across departments would cut weeks off each project.', goal_id: null, status: 'done', status_note: 'Live since September. Twelve departments signed up.', merged_into: null, status_by: 'niamh', status_at: ago(100), author_id: 'ciaran', created_at: ago(900), updated_at: ago(100) },
    { id: 6, title: 'A library for design case studies', body: 'Somewhere to find what other teams have done.', goal_id: 1, status: 'merged', status_note: null, merged_into: 1, status_by: 'niamh', status_at: ago(50), author_id: 'ciaran', created_at: ago(380), updated_at: ago(50) },
  ] as IdeaRow[],
  votes: [[1, 'aoife'], [1, 'ciaran'], [1, 'niamh'], [6, 'me'], [2, 'aoife'], [2, 'me'], [3, 'ciaran'], [4, 'niamh'], [5, 'aoife'], [5, 'ciaran'], [5, 'niamh'], [5, 'me']] as [number, string][],
  ideaTags: [[1, 1], [1, 3], [2, 2], [2, 4], [3, 1], [4, 2], [5, 1]] as [number, number][],
  people: [[1, 'aoife', 'lead'], [1, 'me', 'contributor'], [2, 'ciaran', 'lead'], [2, 'aoife', 'follower'], [3, 'niamh', 'follower'], [5, 'ciaran', 'follower']] as [number, string, IdeaRole][],
  comments: [
    { id: 1, idea_id: 1, author_id: 'ciaran', body: 'We tried something like this in Revenue. A fixed owner for each section made it stick.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(26) },
    { id: 2, idea_id: 1, author_id: 'aoife', body: 'Agreed. Could the Life Events templates go in first?', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(20) },
    { id: 3, idea_id: 2, author_id: 'niamh', body: 'Happy to host the first one.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(40) },
  ] as Omit<Comment, 'author_name' | 'author_avatar' | 'like_count' | 'liked'>[],
  likes: [[1, 'aoife'], [1, 'me'], [1, 'niamh'], [2, 'ciaran'], [3, 'aoife']] as [number, string][],
  updates: [{ id: 1, title: 'The participant panel is live', body: 'Teams can now request participants through the shared panel. *Twelve departments* have signed up so far.', created_at: ago(100), update_ideas: [{ idea_id: 5 }] }] as Update[],
  invites: [{ email: 'sean@example.ie', role: 'member', created_at: ago(5) }] as Invite[],
}

// Derives what the idea_list view would return, for the signed-in demo user
function ideaList(): Idea[] {
  return db.ideas.map(i => {
    const dupes = db.ideas.filter(d => d.merged_into === i.id).map(d => d.id)
    const voters = new Set(db.votes.filter(([id]) => id === i.id || dupes.includes(id)).map(([, u]) => u))
    return {
      ...i,
      author_name: nameOf(i.author_id),
      status_by_name: i.status_by ? nameOf(i.status_by) : null,
      vote_count: voters.size,
      voted: voters.has('me'),
      comment_count: db.comments.filter(c => c.idea_id === i.id && !c.hidden).length,
      duplicate_count: dupes.length,
      tag_ids: db.ideaTags.filter(([id]) => id === i.id).map(([, t]) => t).sort(),
      my_role: db.people.find(([id, u]) => id === i.id && u === 'me')?.[2] ?? null,
      leads: db.people.filter(([id, , r]) => id === i.id && r === 'lead').map(([, u]) => nameOf(u)),
    }
  }).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

let snapshot: Store
const listeners = new Set<() => void>()
function commit() {
  snapshot = {
    me: members[0], members: [...members], community: { ...db.community }, goals: [...db.goals], tags: [...db.tags],
    ideas: ideaList(), updates: [...db.updates].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
  listeners.forEach(l => l())
}
commit()
const changed = () => { commit(); return Promise.resolve() }
const commentWatchers = new Map<number, Set<() => void>>()

export { useSession } from './auth'

// A new person signing in for the first time: no name yet, so the app asks for one
export function becomeNewMember(email: string) {
  Object.assign(members[0], { email: email.trim().toLowerCase(), name: null, role: 'member', avatar_url: null })
  commit()
}
export function useStore(_userId?: string) {
  const store = useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l) }, () => snapshot)
  const vote = useCallback((idea: Idea) => {
    if (idea.voted) db.votes = db.votes.filter(([id, u]) => !(u === 'me' && (id === idea.id || db.ideas.find(d => d.id === id)?.merged_into === idea.id)))
    else {
      db.votes.push([idea.id, 'me'])
      if (!db.people.some(([id, u]) => id === idea.id && u === 'me')) db.people.push([idea.id, 'me', 'follower'])
    }
    commit()
  }, [])
  return { store, error: null as string | null, load: changed, vote }
}

export async function createIdea(input: IdeaInput, tagIds: number[]) {
  const id = nextId++
  db.ideas.push({ id, ...input, status: 'open', status_note: null, merged_into: null, status_by: null, status_at: null, author_id: 'me', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  tagIds.forEach(t => db.ideaTags.push([id, t]))
  db.people.push([id, 'me', 'follower'])
  db.votes.push([id, 'me']) // an idea starts with its author's support
  commit()
  return id
}
export async function setIdeaTags(ideaId: number, _before: number[], after: number[]) {
  db.ideaTags = db.ideaTags.filter(([id]) => id !== ideaId).concat(after.map(t => [ideaId, t] as [number, number]))
  commit()
}
export async function editIdea(id: number, input: Partial<IdeaInput>) { Object.assign(db.ideas.find(i => i.id === id)!, input); commit() }
export async function deleteIdea(id: number) { db.ideas = db.ideas.filter(i => i.id !== id); commit() }
export async function setStatus(id: number, status: Status, note: string | null, mergedInto: number | null) {
  const i = db.ideas.find(x => x.id === id)!
  Object.assign(i, { status, status_note: note || null, merged_into: status === 'merged' ? mergedInto : null, status_by: 'me', status_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  commit()
}

export async function loadPeople(ideaId: number): Promise<Person[]> {
  return db.people.filter(([id]) => id === ideaId).map(([, u, role]) => ({ user_id: u, role, name: nameOf(u) }))
}
export async function joinIdea(ideaId: number, userId: string, role: IdeaRole) {
  db.people = db.people.filter(([id, u]) => !(id === ideaId && u === userId)).concat([[ideaId, userId, role]])
  commit()
}
export async function leaveIdea(ideaId: number, userId: string) { db.people = db.people.filter(([id, u]) => !(id === ideaId && u === userId)); commit() }

export async function loadComments(ideaId: number): Promise<Comment[]> {
  return db.comments.filter(c => c.idea_id === ideaId).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(c => ({
    ...c, author_name: nameOf(c.author_id), author_avatar: members.find(m => m.id === c.author_id)?.avatar_url ?? null,
    like_count: db.likes.filter(([id]) => id === c.id).length, liked: db.likes.some(([id, u]) => id === c.id && u === 'me'),
  }))
}
export async function likeComment(id: number, _userId: string, on: boolean) {
  db.likes = db.likes.filter(([c, u]) => !(c === id && u === 'me'))
  if (on) db.likes.push([id, 'me'])
}
export async function uploadAvatar(id: string, file: File) { members.find(m => m.id === id)!.avatar_url = URL.createObjectURL(file); commit() }
export async function removeAvatar(id: string) { members.find(m => m.id === id)!.avatar_url = null; commit() }
function touchComments(ideaId: number) { commentWatchers.get(ideaId)?.forEach(f => f()); commit() }
export async function addComment(ideaId: number, body: string) {
  db.comments.push({ id: nextId++, idea_id: ideaId, author_id: 'me', body, hidden: false, hidden_reason: null, edited_at: null, created_at: new Date().toISOString() })
  if (!db.people.some(([id, u]) => id === ideaId && u === 'me')) db.people.push([ideaId, 'me', 'follower'])
  touchComments(ideaId)
}
export async function editComment(id: number, body: string) { const c = db.comments.find(x => x.id === id)!; c.body = body; c.edited_at = new Date().toISOString(); touchComments(c.idea_id) }
export async function hideComment(id: number, reason: HideReason | null) { const c = db.comments.find(x => x.id === id)!; c.hidden = reason !== null; c.hidden_reason = reason; touchComments(c.idea_id) }
export async function deleteComment(id: number) { const c = db.comments.find(x => x.id === id)!; db.comments = db.comments.filter(x => x.id !== id); touchComments(c.idea_id) }
export function watchComments(ideaId: number, onChange: () => void) {
  if (!commentWatchers.has(ideaId)) commentWatchers.set(ideaId, new Set())
  commentWatchers.get(ideaId)!.add(onChange)
  return () => { commentWatchers.get(ideaId)?.delete(onChange) }
}

export async function publishUpdate(title: string, body: string, ideaIds: number[]) {
  db.updates.push({ id: nextId++, title, body, created_at: new Date().toISOString(), update_ideas: ideaIds.map(idea_id => ({ idea_id })) })
  commit()
}
export async function deleteUpdate(id: number) { db.updates = db.updates.filter(u => u.id !== id); commit() }

export async function saveProfile(id: string, details: Partial<ProfileDetails>) {
  const d = { ...details }
  if (typeof d.linkedin === 'string' && d.linkedin.trim() && !/^https?:\/\//.test(d.linkedin.trim())) d.linkedin = `https://${d.linkedin.trim()}`
  Object.assign(members.find(m => m.id === id)!, d)
  commit()
}
export async function saveName(id: string, name: string) { members.find(m => m.id === id)!.name = name.trim(); commit() }
export async function setRole(id: string, role: Role) { members.find(m => m.id === id)!.role = role; commit() }
export async function setNotify(id: string, prefs: Partial<Notify>) { Object.assign(members.find(m => m.id === id)!, prefs); commit() }
export async function saveCommunity(c: Community) { db.community = { ...c }; commit() }
export async function addGoal(title: string, position: number) { db.goals.push({ id: nextId++, title, position }); commit() }
export async function removeGoal(id: number) { db.goals = db.goals.filter(g => g.id !== id); db.ideas.forEach(i => { if (i.goal_id === id) i.goal_id = null }); commit() }

export const tidyTag = (name: string) => name.trim().replace(/\s+/g, ' ')
export async function addTag(name: string, position: number) {
  if (db.tags.length >= 20) throw new Error('There are already 20 tags. Remove one first.')
  db.tags.push({ id: nextId++, name: tidyTag(name), position }); commit()
}
export async function renameTag(id: number, name: string) {
  if (db.tags.some(t => t.id !== id && t.name.toLowerCase() === tidyTag(name).toLowerCase())) throw new Error('That tag already exists.')
  db.tags.find(t => t.id === id)!.name = tidyTag(name); commit()
}
export async function removeTag(id: number) { db.tags = db.tags.filter(t => t.id !== id); db.ideaTags = db.ideaTags.filter(([, t]) => t !== id); commit() }

export async function loadInvites() { return [...db.invites] }
export async function invite(email: string, role: Role) { db.invites = db.invites.filter(i => i.email !== email).concat([{ email: email.trim().toLowerCase(), role, created_at: new Date().toISOString() }]) }
export async function uninvite(email: string) { db.invites = db.invites.filter(i => i.email !== email) }

export async function loadAbout() { return { ...db.community } }
export async function requestInvite() {}
export async function loadRequests() { return [...db.requests] }
export async function clearRequest(id: number) { db.requests = db.requests.filter(r => r.id !== id) }

export { signOut } from './auth'

// Forum: a few categories and discussions, held in memory like everything else here
const forum = {
  categories: [
    { id: 1, name: 'General', description: 'Anything about design in the public service', position: 1 },
    { id: 2, name: 'Research', description: 'Methods, recruitment, consent and ethics', position: 2 },
    { id: 3, name: 'Accessibility', description: 'Making services work for everyone', position: 3 },
    { id: 4, name: 'Events', description: 'Meetups, talks and training', position: 4 },
  ] as ForumCategory[],
  threads: [
    { id: 1, slug: 'recruiting-research-participants-who-arent-online', category_id: 2, title: 'Recruiting research participants who aren’t online', body: 'We keep hearing from the same digitally confident people. How are others reaching people who rarely use online services?', author_id: 'aoife', pinned: false, closed: false, hidden: false, created_at: ago(30), last_activity_at: ago(4) },
    { id: 2, slug: 'welcome-introduce-yourself', category_id: 1, title: 'Welcome: introduce yourself', body: 'Say hello, where you work and what you’re working on.', author_id: 'me', pinned: true, closed: false, hidden: false, created_at: ago(200), last_activity_at: ago(20) },
    { id: 3, slug: 'screen-reader-testing-on-a-budget', category_id: 3, title: 'Screen reader testing on a budget', body: 'Which tools and set-ups have worked for you without a big spend?', author_id: 'ciaran', pinned: false, closed: false, hidden: false, created_at: ago(60), last_activity_at: ago(50) },
  ],
  posts: [
    { id: 1, thread_id: 1, parent_id: null, author_id: 'niamh', body: 'Libraries and Intreo offices have been great for us. Ask the staff to help you meet people face to face.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(10) },
    { id: 2, thread_id: 1, parent_id: 1, author_id: 'aoife', body: 'Good shout. Did you need approval from the office manager first?', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(4) },
    { id: 4, thread_id: 1, parent_id: 2, author_id: 'niamh', body: 'No, the staff were glad to help. We just rang ahead the week before.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(3) },
    { id: 5, thread_id: 1, parent_id: 4, author_id: 'ciaran', body: 'Same at Revenue public offices. Bring printed consent forms; not everyone wants to sign on a tablet.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(2) },
    { id: 6, thread_id: 1, parent_id: null, author_id: 'ciaran', body: 'Has anyone tried paying for travel? It made a big difference for rural participants.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(1) },
    { id: 3, thread_id: 2, parent_id: null, author_id: 'ciaran', body: 'Hi all, content designer at Revenue, working on PAYE guidance.', hidden: false, hidden_reason: null, edited_at: null, created_at: ago(20) },
  ] as Omit<ForumPost, 'author_name' | 'author_avatar'>[],
  follows: new Set<number>([2]),
}
const avatarOf = (id: string) => members.find(m => m.id === id)?.avatar_url ?? null
const threadView = (t: typeof forum.threads[number]): ForumThread => {
  const replies = forum.posts.filter(p => p.thread_id === t.id)
  const last = replies.at(-1)
  return { ...t, author_name: nameOf(t.author_id), author_avatar: avatarOf(t.author_id), reply_count: replies.length, last_reply_name: last ? nameOf(last.author_id) : null, following: forum.follows.has(t.id), unread: false }
}
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export async function loadForumCategories() { return [...forum.categories] }
export async function loadForumThreads(categoryId?: number) {
  return forum.threads.filter(t => !categoryId || t.category_id === categoryId).map(threadView)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.last_activity_at.localeCompare(a.last_activity_at))
}
export async function loadForumThread(slug: string) {
  const t = forum.threads.find(x => x.slug === slug)
  if (!t) throw new Error('That discussion has gone.')
  return threadView(t)
}
export async function loadForumPosts(threadId: number) {
  return forum.posts.filter(p => p.thread_id === threadId).map(p => ({ ...p, author_name: nameOf(p.author_id), author_avatar: avatarOf(p.author_id) })) as ForumPost[]
}
export async function createForumThread(input: { category_id: number; title: string; body: string }) {
  let slug = slugify(input.title) || 'discussion'
  if (forum.threads.some(t => t.slug === slug)) slug += `-${forum.threads.length + 1}`
  const now = new Date().toISOString()
  forum.threads.push({ id: forum.threads.length + 1, slug, ...input, author_id: 'me', pinned: false, closed: false, hidden: false, created_at: now, last_activity_at: now })
  forum.follows.add(forum.threads.length)
  return slug
}
export async function addForumPost(threadId: number, body: string, parentId: number | null = null) {
  const now = new Date().toISOString()
  forum.posts.push({ id: Math.max(0, ...forum.posts.map(p => p.id)) + 1, thread_id: threadId, parent_id: parentId, author_id: 'me', body, hidden: false, hidden_reason: null, edited_at: null, created_at: now })
  const t = forum.threads.find(x => x.id === threadId); if (t) t.last_activity_at = now
}
export async function editForumPost(id: number, body: string) { const p = forum.posts.find(x => x.id === id); if (p) p.body = body }
export async function deleteForumPost(id: number) { forum.posts = forum.posts.filter(p => p.id !== id) }
export async function hideForumPost(id: number, reason: HideReason | null) { const p = forum.posts.find(x => x.id === id); if (p) Object.assign(p, { hidden: reason !== null, hidden_reason: reason }) }
export async function setForumThread(id: number, changes: Partial<Pick<ForumThread, 'pinned' | 'closed' | 'hidden'>>) { const t = forum.threads.find(x => x.id === id); if (t) Object.assign(t, changes) }
export async function followForumThread(threadId: number, following: boolean) { if (following) forum.follows.add(threadId); else forum.follows.delete(threadId) }
export async function markForumRead() {}
export function watchForum() { return () => {} }
