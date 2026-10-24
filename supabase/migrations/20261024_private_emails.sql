-- Emails are private unless a member chooses to show them. Signed-in members can no longer read
-- profiles.email directly; member_emails() returns their own, facilitators get everyone's (Admin
-- needs them), and everyone gets those who turned show_email on. Run once on an existing project;
-- schema.sql already includes it for new ones.

-- Names no longer fall back to part of the email address
create or replace view idea_list with (security_invoker = true) as
select
  i.*,
  coalesce(p.name, 'Member') as author_name,
  -- Support from duplicates counts toward the idea they duplicate, each person once.
  -- Counted, not moved, so marking something a duplicate by mistake loses nothing.
  (select count(distinct v.user_id) from votes v
    where v.idea_id = i.id or v.idea_id in (select d.id from ideas d where d.merged_into = i.id))::int as vote_count,
  (select count(*) from comments c where c.idea_id = i.id and not c.hidden)::int as comment_count,
  exists (select 1 from votes v where v.user_id = auth.uid()
    and (v.idea_id = i.id or v.idea_id in (select d.id from ideas d where d.merged_into = i.id))) as voted,
  (select count(*) from ideas d where d.merged_into = i.id)::int as duplicate_count,
  (select coalesce(sp.name, 'Member') from profiles sp where sp.id = i.status_by) as status_by_name,
  array(select it.tag_id from idea_tags it where it.idea_id = i.id order by it.tag_id) as tag_ids,
  (select ip.role from idea_people ip where ip.idea_id = i.id and ip.user_id = auth.uid()) as my_role,
  array(
    select coalesce(lp.name, 'Member')
    from idea_people ip join profiles lp on lp.id = ip.user_id
    where ip.idea_id = i.id and ip.role = 'lead'
    order by ip.created_at
  ) as leads
from ideas i
left join profiles p on p.id = i.author_id;

create or replace view comment_list with (security_invoker = true) as
select c.*,
  coalesce(p.name, 'Member') as author_name,
  p.avatar_url as author_avatar,
  (select count(*) from comment_likes l where l.comment_id = c.id)::int as like_count,
  exists (select 1 from comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()) as liked
from comments c
left join profiles p on p.id = c.author_id;

-- Every profile column but email
revoke select on profiles from authenticated;
grant select (id, name, avatar_url, role, notify_comments, notify_status, notify_ideas, organisation, job_title,
  design_area, linkedin, bio, in_directory, show_email, created_at) on profiles to authenticated;

-- The only way members read emails. Same session rules as every table (two_factor_ok, signed_in_recently).
create function member_emails() returns table (id uuid, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.email from profiles p
  where is_member() and two_factor_ok() and signed_in_recently()
    and (p.id = auth.uid() or p.show_email or is_facilitator())
$$;
revoke all on function member_emails() from public, anon;
grant execute on function member_emails() to authenticated;

-- Live updates send whole rows, so profiles leave them; name and photo changes arrive with the next reload
alter publication supabase_realtime drop table profiles;
