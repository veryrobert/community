export type Role = 'member' | 'facilitator'

export type Status = 'open' | 'review' | 'planned' | 'progress' | 'done' | 'hold' | 'declined' | 'merged'

export const STATUS: Record<Status, string> = {
  open: 'Suggested',
  review: 'Under review',
  planned: 'Planned',
  progress: 'In progress',
  done: 'Done',
  hold: 'On hold',
  declined: 'Not proceeding',
  merged: 'Duplicate',
}

export const STATUS_ORDER: Status[] = ['open', 'review', 'planned', 'progress', 'done', 'hold', 'declined', 'merged']
export const ROADMAP: Status[] = ['review', 'planned', 'progress', 'done']
export const ACTIVE: Status[] = ['open', 'review', 'planned', 'progress']
// Statuses that ask the facilitator for a short reason
export const NEEDS_NOTE: Status[] = ['hold', 'declined', 'merged']

export type IdeaRole = 'follower' | 'contributor' | 'lead'
export const ROLE: Record<IdeaRole, string> = { lead: 'Lead', contributor: 'Contributor', follower: 'Follower' }
export const ROLE_ORDER: IdeaRole[] = ['follower', 'contributor', 'lead']
export type Person = { user_id: string; role: IdeaRole; name: string }

export type Notify = { notify_comments: boolean; notify_status: boolean; notify_ideas: boolean }
export type Profile = { id: string; email: string; name: string | null; role: Role; avatar_url: string | null } & Notify & ProfileDetails
// What members say about themselves for the People directory
export type ProfileDetails = {
  organisation: string; job_title: string; design_area: string; linkedin: string; bio: string
  in_directory: boolean; show_email: boolean
}

// Areas of design, offered on the join form and in profiles; stored as written
export const DESIGN_AREAS = ['Service design', 'User research', 'Content design', 'Interaction and UX design', 'Visual and graphic design', 'Product design', 'Accessibility', 'Design leadership', 'Something else']
export type Community = { name: string; vision: string; about: string; guidelines: string; conduct: string }
export type InviteRequest = {
  id: number; name: string; email: string; email_kind: 'work' | 'personal'; organisation: string; role: string
  design_area: string; practice: string; note: string; heard: string; created_at: string
}
export type JoinRequest = Omit<InviteRequest, 'id' | 'created_at'>
export type Goal = { id: number; title: string; position: number }
export type Tag = { id: number; name: string; position: number }

export type Idea = {
  id: number
  title: string
  body: string
  tag_ids: number[]
  goal_id: number | null
  status: Status
  status_note: string | null
  merged_into: number | null
  status_by_name: string | null
  status_at: string | null
  duplicate_count: number
  author_id: string
  author_name: string
  created_at: string
  updated_at: string
  vote_count: number
  comment_count: number
  voted: boolean
  my_role: IdeaRole | null
  leads: string[]
}

export type Comment = {
  id: number
  idea_id: number
  author_id: string
  author_name: string
  author_avatar: string | null
  like_count: number
  liked: boolean
  body: string
  hidden: boolean
  hidden_reason: HideReason | null
  edited_at: string | null
  created_at: string
}

// GitHub's reasons for hiding a comment
export type HideReason = 'off-topic' | 'outdated' | 'duplicate' | 'resolved' | 'abuse' | 'spam'
export const HIDE_REASONS: Record<HideReason, string> = {
  'off-topic': 'Off topic', outdated: 'Outdated', duplicate: 'Duplicate', resolved: 'Resolved', abuse: 'Abuse', spam: 'Spam',
}

export type Update = {
  id: number
  title: string
  body: string
  created_at: string
  update_ideas: { idea_id: number }[]
}

export type ForumCategory = {
  id: number
  name: string
  description: string
  position: number
}

// A discussion is deliberately separate from an idea: ideas are proposals to support; these are
// conversations to take part in. The list view carries the small amount of denormalised metadata
// it needs, keeping a forum page to one query.
export type ForumThread = {
  id: number
  slug: string
  category_id: number
  title: string
  body: string
  author_id: string
  author_name: string
  author_avatar: string | null
  pinned: boolean
  closed: boolean
  hidden: boolean
  created_at: string
  last_activity_at: string
  reply_count: number
  last_reply_name: string | null
  following: boolean
  unread: boolean
}

export type ForumPost = {
  id: number
  thread_id: number
  parent_id: number | null
  author_id: string
  author_name: string
  author_avatar: string | null
  body: string
  hidden: boolean
  hidden_reason: HideReason | null
  edited_at: string | null
  created_at: string
}

export type Invite = { email: string; role: Role; created_at: string }

// A member's name, or the start of their email if it's one you can see, or Member
export function displayName(p: Pick<Profile, 'name' | 'email'>) {
  return p.name || p.email.split('@')[0] || 'Member'
}

const day = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short' })
const dayYear = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })

export function when(iso: string) {
  const d = new Date(iso)
  const mins = (Date.now() - d.getTime()) / 60000
  if (mins < 1) return 'now'
  if (mins < 60) return `${Math.floor(mins)}m`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`
  if (mins < 60 * 24 * 7) return `${Math.floor(mins / 1440)}d`
  return d.getFullYear() === new Date().getFullYear() ? day.format(d) : dayYear.format(d)
}

export function date(iso: string) {
  return dayYear.format(new Date(iso))
}
