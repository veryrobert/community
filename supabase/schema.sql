-- community: schema, row level security and the invite gate.
-- Run once in the Supabase SQL editor. Then run seed.sql.

create type idea_status as enum ('open', 'review', 'planned', 'progress', 'done', 'hold', 'declined', 'merged');
create type idea_role as enum ('follower', 'contributor', 'lead');

-- Who may sign in, and as what. A new auth user is refused unless their email is here.
create table invites (
  email text primary key,
  role text not null default 'member' check (role in ('member', 'facilitator')),
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  avatar_url text, -- a photo the member uploaded, or their GitHub picture
  role text not null default 'member' check (role in ('member', 'facilitator')),
  -- Email preferences, one per kind of event
  notify_comments boolean not null default true,
  notify_status boolean not null default true,
  notify_ideas boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row: the community's name and vision statement
create table community (
  id int primary key default 1 check (id = 1),
  name text not null default 'community',
  vision text not null default '',
  -- The About page: what the community is, how it works, and the code of conduct (markdown)
  about text not null default '',
  guidelines text not null default '',
  conduct text not null default '',
  updated_at timestamptz not null default now()
);

create table goals (
  id bigint generated always as identity primary key,
  title text not null,
  position int not null default 0
);

-- One shared set of tags, kept by facilitators. Members tag ideas from this list; they can't add to it.
create table tags (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 32),
  position int not null default 0
);
create unique index tags_name_unique on tags (lower(name));

create table ideas (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 140),
  body text not null default '',
  goal_id bigint references goals on delete set null,
  status idea_status not null default 'open',
  status_note text,
  merged_into bigint references ideas on delete set null,
  -- Who last set the status or its note, and when (shown with the note)
  status_by uuid references profiles on delete set null,
  status_at timestamptz,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table votes (
  idea_id bigint not null references ideas on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create table idea_tags (
  idea_id bigint not null references ideas on delete cascade,
  tag_id bigint not null references tags on delete cascade,
  primary key (idea_id, tag_id)
);

-- People who have put themselves on an idea, one role each
create table idea_people (
  idea_id bigint not null references ideas on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  role idea_role not null default 'follower',
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create table comments (
  id bigint generated always as identity primary key,
  idea_id bigint not null references ideas on delete cascade,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  hidden boolean not null default false,
  hidden_reason text check (hidden_reason in ('off-topic', 'outdated', 'duplicate', 'resolved', 'abuse', 'spam')),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create table comment_likes (
  comment_id bigint not null references comments on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- People asking to join, from the About page. Written only through request_invite() below.
create table invite_requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  organisation text not null default '' check (char_length(organisation) <= 160),
  note text not null default '' check (char_length(note) <= 1000),
  email_kind text not null default 'work' check (email_kind in ('work', 'personal')),
  role text not null default '' check (char_length(role) <= 120),
  design_area text not null default '' check (char_length(design_area) <= 80),
  practice text not null default '' check (char_length(practice) <= 80),
  heard text not null default '' check (char_length(heard) <= 200),
  created_at timestamptz not null default now()
);

-- Things to email about. Triggers add rows; the notify Edge Function sends them. Invites carry the
-- invited address in email instead of an idea. No policies, so members can neither read nor write it.
create table outbox (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('comment', 'status', 'idea', 'invite')),
  idea_id bigint references ideas on delete cascade,
  email text,
  comment_id bigint references comments on delete cascade,
  actor_id uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table updates (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  author_id uuid default auth.uid() references profiles on delete set null,
  created_at timestamptz not null default now()
);

create table update_ideas (
  update_id bigint not null references updates on delete cascade,
  idea_id bigint not null references ideas on delete cascade,
  primary key (update_id, idea_id)
);

create index on ideas (status);
create index on votes (user_id);
create index on idea_people (user_id);
create index on idea_tags (tag_id);
create index on comments (idea_id);

-- Helpers. security definer so they can read profiles under RLS.
create function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid())
$$;

create function is_facilitator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'facilitator')
$$;

-- The invite gate: runs when Supabase creates a user from a magic link
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select role into r from invites where lower(email) = lower(new.email);
  if r is null then
    raise exception 'not invited';
  end if;
  -- GitHub sign-in brings a picture; email sign-in starts without one
  insert into profiles (id, email, role, avatar_url)
  values (new.id, lower(new.email), r, new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Members can't promote themselves or change their email
create function guard_profile() returns trigger
language plpgsql as $$
begin
  if not is_facilitator() and (new.role <> old.role or new.email <> old.email) then
    raise exception 'only facilitators can change roles';
  end if;
  return new;
end $$;

create trigger guard_profile before update on profiles
  for each row execute function guard_profile();

-- Members can edit their own idea's text, not its status
create function guard_idea() returns trigger
language plpgsql as $$
begin
  if not is_facilitator() then
    if tg_op = 'INSERT' then
      new.status := 'open';
      new.status_note := null;
      new.merged_into := null;
      new.author_id := auth.uid();
    elsif new.status <> old.status
      or new.status_note is distinct from old.status_note
      or new.merged_into is distinct from old.merged_into
      or new.author_id <> old.author_id then
      raise exception 'only facilitators can change an idea''s status';
    end if;
  end if;
  if new.status = 'merged' and (new.merged_into is null or new.merged_into = new.id) then
    raise exception 'Choose the idea this duplicates.';
  end if;
  if new.status <> 'merged' then
    new.merged_into := null;
  end if;
  if tg_op = 'UPDATE' and (new.status <> old.status or new.status_note is distinct from old.status_note or new.merged_into is distinct from old.merged_into) then
    new.status_by := auth.uid();
    new.status_at := now();
  elsif tg_op = 'UPDATE' then
    new.status_by := old.status_by;
    new.status_at := old.status_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger guard_idea before insert or update on ideas
  for each row execute function guard_idea();

-- Limits that keep tags in hand: at most 20 tags overall, 3 on any idea.
-- Names are tidied (trimmed, single spaces) and unique regardless of case.
create function guard_tag() returns trigger
language plpgsql as $$
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  if tg_op = 'INSERT' and (select count(*) from tags) >= 20 then
    raise exception 'There are already 20 tags. Remove one first.';
  end if;
  return new;
end $$;

create trigger guard_tag before insert or update on tags
  for each row execute function guard_tag();

create function guard_idea_tags() returns trigger
language plpgsql as $$
begin
  if (select count(*) from idea_tags where idea_id = new.idea_id) >= 3 then
    raise exception 'An idea can have up to 3 tags.';
  end if;
  return new;
end $$;

create trigger guard_idea_tags before insert on idea_tags
  for each row execute function guard_idea_tags();

-- Supporting or commenting on an idea follows it, as in Fider. Leaving the idea undoes that.
create function follow_on_activity() returns trigger
language plpgsql as $$
begin
  insert into idea_people (idea_id, user_id, role)
  values (new.idea_id, auth.uid(), 'follower')
  on conflict do nothing;
  return new;
end $$;

create trigger follow_on_vote after insert on votes
  for each row execute function follow_on_activity();
create trigger follow_on_comment after insert on comments
  for each row execute function follow_on_activity();

-- Queue emails. security definer: members can't write to the outbox themselves.
create function queue_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into outbox (kind, idea_id, comment_id, actor_id) values ('comment', new.idea_id, new.id, new.author_id);
  return new;
end $$;

create trigger queue_comment after insert on comments
  for each row execute function queue_comment();

create function queue_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into outbox (kind, email, actor_id) values ('invite', new.email, auth.uid());
  return new;
end $$;

create trigger queue_invite after insert on invites
  for each row execute function queue_invite();

create function queue_idea() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into outbox (kind, idea_id, actor_id) values ('idea', new.id, new.author_id);
  elsif new.status <> old.status or new.merged_into is distinct from old.merged_into then
    -- Only a real change of status is worth an email, not an edit to the note
    insert into outbox (kind, idea_id, actor_id) values ('status', new.id, auth.uid());
  end if;
  return new;
end $$;

create trigger queue_idea after insert or update on ideas
  for each row execute function queue_idea();

-- Whoever posts an idea follows it
create function follow_own_idea() returns trigger
language plpgsql as $$
begin
  insert into idea_people (idea_id, user_id, role) values (new.id, new.author_id, 'follower') on conflict do nothing;
  return new;
end $$;

create trigger follow_own_idea after insert on ideas
  for each row execute function follow_own_idea();

-- Members can't unhide comments
create function guard_comment() returns trigger
language plpgsql as $$
begin
  if not is_facilitator() and (new.hidden <> old.hidden or new.hidden_reason is distinct from old.hidden_reason) then
    raise exception 'only facilitators can hide comments';
  end if;
  if new.body <> old.body then
    new.edited_at := now();
  end if;
  if not new.hidden then
    new.hidden_reason := null;
  end if;
  return new;
end $$;

create trigger guard_comment before update on comments
  for each row execute function guard_comment();

-- Ideas with their counts, for lists. security_invoker keeps RLS in force.
create view idea_list with (security_invoker = true) as
select
  i.*,
  coalesce(p.name, split_part(p.email, '@', 1)) as author_name,
  -- Support from duplicates counts toward the idea they duplicate, each person once.
  -- Counted, not moved, so marking something a duplicate by mistake loses nothing.
  (select count(distinct v.user_id) from votes v
    where v.idea_id = i.id or v.idea_id in (select d.id from ideas d where d.merged_into = i.id))::int as vote_count,
  (select count(*) from comments c where c.idea_id = i.id and not c.hidden)::int as comment_count,
  exists (select 1 from votes v where v.user_id = auth.uid()
    and (v.idea_id = i.id or v.idea_id in (select d.id from ideas d where d.merged_into = i.id))) as voted,
  (select count(*) from ideas d where d.merged_into = i.id)::int as duplicate_count,
  (select coalesce(sp.name, split_part(sp.email, '@', 1)) from profiles sp where sp.id = i.status_by) as status_by_name,
  array(select it.tag_id from idea_tags it where it.idea_id = i.id order by it.tag_id) as tag_ids,
  (select ip.role from idea_people ip where ip.idea_id = i.id and ip.user_id = auth.uid()) as my_role,
  array(
    select coalesce(lp.name, split_part(lp.email, '@', 1))
    from idea_people ip join profiles lp on lp.id = ip.user_id
    where ip.idea_id = i.id and ip.role = 'lead'
    order by ip.created_at
  ) as leads
from ideas i
left join profiles p on p.id = i.author_id;

create view comment_list with (security_invoker = true) as
select c.*,
  coalesce(p.name, split_part(p.email, '@', 1)) as author_name,
  p.avatar_url as author_avatar,
  (select count(*) from comment_likes l where l.comment_id = c.id)::int as like_count,
  exists (select 1 from comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()) as liked
from comments c
left join profiles p on p.id = c.author_id;

-- Row level security
alter table invites enable row level security;
alter table profiles enable row level security;
alter table community enable row level security;
alter table goals enable row level security;
alter table tags enable row level security;
alter table idea_tags enable row level security;
alter table ideas enable row level security;
alter table votes enable row level security;
alter table idea_people enable row level security;
alter table comments enable row level security;
alter table updates enable row level security;
alter table update_ideas enable row level security;
alter table outbox enable row level security;
alter table invite_requests enable row level security;
alter table comment_likes enable row level security;

create policy "facilitators manage invites" on invites for all to authenticated
  using (is_facilitator()) with check (is_facilitator());

create policy "members see members" on profiles for select to authenticated using (is_member());
create policy "edit own profile" on profiles for update to authenticated
  using (id = auth.uid() or is_facilitator()) with check (id = auth.uid() or is_facilitator());

create policy "members read community" on community for select to authenticated using (is_member());
create policy "facilitators edit community" on community for update to authenticated
  using (is_facilitator()) with check (is_facilitator());

create policy "members read goals" on goals for select to authenticated using (is_member());
create policy "facilitators manage goals" on goals for all to authenticated
  using (is_facilitator()) with check (is_facilitator());

create policy "members read tags" on tags for select to authenticated using (is_member());
create policy "facilitators manage tags" on tags for all to authenticated
  using (is_facilitator()) with check (is_facilitator());

create policy "members read idea tags" on idea_tags for select to authenticated using (is_member());
create policy "authors and facilitators tag ideas" on idea_tags for insert to authenticated
  with check (is_facilitator() or exists (select 1 from ideas where id = idea_id and author_id = auth.uid()));
create policy "authors and facilitators untag ideas" on idea_tags for delete to authenticated
  using (is_facilitator() or exists (select 1 from ideas where id = idea_id and author_id = auth.uid()));

create policy "members read ideas" on ideas for select to authenticated using (is_member());
create policy "members post ideas" on ideas for insert to authenticated with check (is_member());
create policy "authors and facilitators edit ideas" on ideas for update to authenticated
  using (author_id = auth.uid() or is_facilitator()) with check (author_id = auth.uid() or is_facilitator());
create policy "authors and facilitators delete ideas" on ideas for delete to authenticated
  using (author_id = auth.uid() or is_facilitator());

create policy "members read votes" on votes for select to authenticated using (is_member());
create policy "members vote" on votes for insert to authenticated
  with check (is_member() and user_id = auth.uid()
    and not exists (select 1 from ideas where id = idea_id and status = 'merged'));
create policy "members unvote" on votes for delete to authenticated using (user_id = auth.uid());

create policy "members read idea people" on idea_people for select to authenticated using (is_member());
create policy "members join ideas" on idea_people for insert to authenticated
  with check (is_member() and (user_id = auth.uid() or is_facilitator()));
create policy "change own role" on idea_people for update to authenticated
  using (user_id = auth.uid() or is_facilitator()) with check (user_id = auth.uid() or is_facilitator());
create policy "leave ideas" on idea_people for delete to authenticated
  using (user_id = auth.uid() or is_facilitator());

create policy "facilitators see requests" on invite_requests for select to authenticated using (is_facilitator());
create policy "facilitators clear requests" on invite_requests for delete to authenticated using (is_facilitator());

create policy "members read likes" on comment_likes for select to authenticated using (is_member());
create policy "members like" on comment_likes for insert to authenticated with check (is_member() and user_id = auth.uid());
create policy "members unlike" on comment_likes for delete to authenticated using (user_id = auth.uid());

create policy "members read comments" on comments for select to authenticated
  using (is_member() and (not hidden or author_id = auth.uid() or is_facilitator()));
create policy "members comment" on comments for insert to authenticated
  with check (is_member() and author_id = auth.uid());
create policy "authors and facilitators edit comments" on comments for update to authenticated
  using (author_id = auth.uid() or is_facilitator()) with check (author_id = auth.uid() or is_facilitator());
create policy "authors and facilitators delete comments" on comments for delete to authenticated
  using (author_id = auth.uid() or is_facilitator());

create policy "members read updates" on updates for select to authenticated using (is_member());
create policy "facilitators manage updates" on updates for all to authenticated
  using (is_facilitator()) with check (is_facilitator());

create policy "members read update links" on update_ideas for select to authenticated using (is_member());
create policy "facilitators manage update links" on update_ideas for all to authenticated
  using (is_facilitator()) with check (is_facilitator());

-- Session time limit, enforced here so it doesn't depend on the app or a paid plan.
-- The token lists when each sign-in step happened (amr); the oldest must be within 12 hours.
-- Keep in step with SESSION_HOURS in src/lib/auth.ts.
create function signed_in_recently() returns boolean
language sql stable as $$
  select coalesce(
    (select min((m ->> 'timestamp')::bigint) from jsonb_array_elements(auth.jwt() -> 'amr') m)
      > extract(epoch from now()) - 12 * 3600,
    false)
$$;

-- Two-factor, within the time limit, is required to touch any data. Every table gets a restrictive
-- policy, which is ANDed with the policies above: whatever they allow, the session must also have
-- passed 2FA (aal2) in the last 12 hours. So a stolen email login, GitHub session or old token reads nothing.
do $$
declare t text;
begin
  foreach t in array array['invites', 'profiles', 'community', 'goals', 'tags', 'idea_tags', 'ideas', 'votes',
    'idea_people', 'comments', 'comment_likes', 'updates', 'update_ideas', 'outbox', 'invite_requests']
  loop
    execute format(
      'create policy "requires recent two-factor" on %I as restrictive for all to authenticated
         using ((select auth.jwt() ->> %L) = %L and (select signed_in_recently()))
         with check ((select auth.jwt() ->> %L) = %L and (select signed_in_recently()))',
      t, 'aal', 'aal2', 'aal', 'aal2');
  end loop;
end $$;

-- Live updates: the app reloads when any of these change. Realtime respects the policies above.
alter publication supabase_realtime add table
  ideas, votes, comments, comment_likes, idea_people, idea_tags, tags, goals, updates, update_ideas, community, profiles;

-- Profile photos. A public bucket, so pictures load without signing each URL, but files sit under
-- random names in each member's own folder, and only that member can write there.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png']);

create policy "members add their photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
    and (select auth.jwt() ->> 'aal') = 'aal2');
create policy "members replace their photo" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and (select auth.jwt() ->> 'aal') = 'aal2');
create policy "members remove their photo" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and (select auth.jwt() ->> 'aal') = 'aal2');

-- Nothing for signed-out visitors
revoke all on all tables in schema public from anon;

-- Except these two doors, for the About page, which anyone can read before signing in.
-- What the community is about, and its rules: nothing about members or ideas.
create function about() returns table (name text, vision text, about text, guidelines text, conduct text)
language sql stable security definer set search_path = public as $$
  select name, vision, about, guidelines, conduct from community where id = 1
$$;

-- Asking to join. Quietly does nothing for someone already invited, a member, or anyone who asked
-- in the last day, so it can't be used to find out who's in the community or to flood the list.
create function request_invite(
  p_name text, p_email text, p_organisation text, p_note text,
  p_email_kind text default 'work', p_role text default '', p_design_area text default '',
  p_practice text default '', p_heard text default ''
) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address.'; end if;
  if exists (select 1 from invites where email = e)
    or exists (select 1 from invite_requests where email = e and created_at > now() - interval '1 day')
    or (select count(*) from invite_requests where created_at > now() - interval '1 hour') > 30 then
    return;
  end if;
  insert into invite_requests (name, email, organisation, note, email_kind, role, design_area, practice, heard)
  values (trim(p_name), e, coalesce(trim(p_organisation), ''), coalesce(trim(p_note), ''),
    case when p_email_kind = 'personal' then 'personal' else 'work' end,
    coalesce(trim(p_role), ''), coalesce(trim(p_design_area), ''), coalesce(trim(p_practice), ''), coalesce(trim(p_heard), ''));
end $$;

revoke all on function about(), request_invite(text, text, text, text, text, text, text, text, text) from public;
grant execute on function about(), request_invite(text, text, text, text, text, text, text, text, text) to anon, authenticated;
