-- Proper member discussions. This reuses the existing invite gate, profile directory and
-- facilitator role: there is no second account system or public forum surface.

create table forum_categories (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 48),
  description text not null default '' check (char_length(description) <= 180),
  position int not null default 0
);
create unique index forum_categories_name_unique on forum_categories (lower(name));

create table forum_threads (
  id bigint generated always as identity primary key,
  slug text not null default '' unique,
  category_id bigint not null references forum_categories on delete restrict,
  title text not null check (char_length(title) between 3 and 180),
  body text not null default '' check (char_length(body) <= 12000),
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  pinned boolean not null default false,
  closed boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index forum_threads_category_activity on forum_threads (category_id, last_activity_at desc);

create table forum_posts (
  id bigint generated always as identity primary key,
  thread_id bigint not null references forum_threads on delete cascade,
  -- Reddit-style reply trees. A constraint below prevents a reply being attached to another thread.
  parent_id bigint references forum_posts on delete cascade,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 12000),
  hidden boolean not null default false,
  hidden_reason text check (hidden_reason in ('off-topic', 'outdated', 'duplicate', 'resolved', 'abuse', 'spam')),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index forum_posts_thread_created on forum_posts (thread_id, created_at);
create index forum_posts_parent on forum_posts (parent_id, created_at);

create table forum_follows (
  thread_id bigint not null references forum_threads on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table forum_reads (
  thread_id bigint not null references forum_threads on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- The link is title-shaped and stays stable if a title is edited. Collisions receive -2, -3, etc.
create function forum_slug(value text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(trim(value)), '[^a-z0-9]+', '-', 'g'))
$$;

create function guard_forum_thread() returns trigger language plpgsql as $$
declare base text; candidate text; suffix int := 2;
begin
  if tg_op = 'INSERT' then
    base := left(forum_slug(new.title), 72);
    if base = '' then base := 'discussion'; end if;
    candidate := base;
    while exists (select 1 from forum_threads where slug = candidate) loop
      candidate := left(base, 68) || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;
    new.slug := candidate;
  elsif new.slug <> old.slug then
    -- Links are permanent. A renamed discussion keeps the address members may have shared.
    new.slug := old.slug;
  end if;
  if not is_facilitator() then
    if tg_op = 'INSERT' then new.author_id := auth.uid(); new.pinned := false; new.closed := false; new.hidden := false;
    elsif new.author_id <> old.author_id or new.pinned <> old.pinned or new.closed <> old.closed or new.hidden <> old.hidden then
      raise exception 'only facilitators can manage a discussion';
    end if;
  end if;
  return new;
end $$;
create trigger guard_forum_thread before insert or update on forum_threads for each row execute function guard_forum_thread();

create function guard_forum_post() returns trigger language plpgsql as $$
begin
  if new.parent_id is not null and not exists (select 1 from forum_posts where id = new.parent_id and thread_id = new.thread_id) then
    raise exception 'a reply must belong to the same discussion';
  end if;
  if not is_facilitator() and (new.hidden <> old.hidden or new.hidden_reason is distinct from old.hidden_reason) then
    raise exception 'only facilitators can hide replies';
  end if;
  if new.body <> old.body then new.edited_at := now(); end if;
  if not new.hidden then new.hidden_reason := null; end if;
  return new;
end $$;
create trigger guard_forum_post before update on forum_posts for each row execute function guard_forum_post();

-- A new thread begins followed and read by its author. Any reply keeps the thread current.
create function forum_thread_after_insert() returns trigger language plpgsql as $$
begin
  insert into forum_follows (thread_id, user_id) values (new.id, new.author_id) on conflict do nothing;
  insert into forum_reads (thread_id, user_id) values (new.id, new.author_id) on conflict do nothing;
  return new;
end $$;
create trigger forum_thread_after_insert after insert on forum_threads for each row execute function forum_thread_after_insert();

create function forum_post_after_insert() returns trigger language plpgsql as $$
begin
  update forum_threads set last_activity_at = new.created_at where id = new.thread_id;
  insert into forum_follows (thread_id, user_id) values (new.thread_id, new.author_id) on conflict do nothing;
  insert into forum_reads (thread_id, user_id, read_at) values (new.thread_id, new.author_id, new.created_at)
    on conflict (thread_id, user_id) do update set read_at = excluded.read_at;
  return new;
end $$;
create trigger forum_post_after_insert after insert on forum_posts for each row execute function forum_post_after_insert();

create view forum_thread_list with (security_invoker = true) as
select t.*, coalesce(a.name, 'Member') as author_name, a.avatar_url as author_avatar,
  (select count(*) from forum_posts p where p.thread_id = t.id and not p.hidden)::int as reply_count,
  (select coalesce(p.name, 'Member') from forum_posts fp join profiles p on p.id = fp.author_id where fp.thread_id = t.id and not fp.hidden order by fp.created_at desc limit 1) as last_reply_name,
  exists (select 1 from forum_follows f where f.thread_id = t.id and f.user_id = auth.uid()) as following,
  exists (select 1 from forum_posts fp left join forum_reads r on r.thread_id = fp.thread_id and r.user_id = auth.uid()
    where fp.thread_id = t.id and fp.author_id <> auth.uid() and fp.created_at > coalesce(r.read_at, t.created_at)) as unread
from forum_threads t join profiles a on a.id = t.author_id;

create view forum_post_list with (security_invoker = true) as
select p.*, coalesce(a.name, 'Member') as author_name, a.avatar_url as author_avatar
from forum_posts p join profiles a on a.id = p.author_id;

alter table forum_categories enable row level security;
alter table forum_threads enable row level security;
alter table forum_posts enable row level security;
alter table forum_follows enable row level security;
alter table forum_reads enable row level security;

create policy "members read forum categories" on forum_categories for select to authenticated using (is_member());
create policy "facilitators manage forum categories" on forum_categories for all to authenticated using (is_facilitator()) with check (is_facilitator());
create policy "members read forum threads" on forum_threads for select to authenticated using (is_member() and (not hidden or author_id = auth.uid() or is_facilitator()));
create policy "members start forum threads" on forum_threads for insert to authenticated with check (is_member() and author_id = auth.uid());
create policy "authors and facilitators edit forum threads" on forum_threads for update to authenticated using (author_id = auth.uid() or is_facilitator()) with check (author_id = auth.uid() or is_facilitator());
create policy "authors and facilitators delete forum threads" on forum_threads for delete to authenticated using (author_id = auth.uid() or is_facilitator());
create policy "members read forum posts" on forum_posts for select to authenticated using (is_member() and (not hidden or author_id = auth.uid() or is_facilitator()));
create policy "members reply in open discussions" on forum_posts for insert to authenticated with check (is_member() and author_id = auth.uid() and exists (select 1 from forum_threads where id = thread_id and not closed and not hidden));
create policy "authors and facilitators edit forum replies" on forum_posts for update to authenticated using (author_id = auth.uid() or is_facilitator()) with check (author_id = auth.uid() or is_facilitator());
create policy "authors and facilitators delete forum replies" on forum_posts for delete to authenticated using (author_id = auth.uid() or is_facilitator());
create policy "members see own forum follows" on forum_follows for select to authenticated using (user_id = auth.uid());
create policy "members follow discussions" on forum_follows for insert to authenticated with check (is_member() and user_id = auth.uid());
create policy "members unfollow discussions" on forum_follows for delete to authenticated using (user_id = auth.uid());
create policy "members see own forum reads" on forum_reads for select to authenticated using (user_id = auth.uid());
create policy "members update forum reads" on forum_reads for insert to authenticated with check (is_member() and user_id = auth.uid());
create policy "members change own forum reads" on forum_reads for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['forum_categories', 'forum_threads', 'forum_posts', 'forum_follows', 'forum_reads'] loop
    execute format('create policy "requires recent sign-in" on %I as restrictive for all to authenticated using ((select two_factor_ok()) and (select signed_in_recently())) with check ((select two_factor_ok()) and (select signed_in_recently()))', t);
  end loop;
end $$;

-- Thread and reply lists update live in open tabs, using the same subscription model as ideas.
alter publication supabase_realtime add table forum_threads, forum_posts;

-- A quiet default set. Facilitators can rename, add or remove these in the database until a small
-- category manager is added to Admin.
insert into forum_categories (name, description, position) values
  ('General', 'Conversations for the community.', 1),
  ('Practice', 'Questions and learning from design practice.', 2),
  ('Events and opportunities', 'Things worth sharing with the community.', 3),
  ('Research and reading', 'Useful work, links and reflections.', 4),
  ('Announcements', 'News from Design for Public.', 5);
