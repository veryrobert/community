-- Join requests: work or personal email, role apart from organisation, area of design, how they
-- practise, and how they heard about the community. Run once on an existing project; schema.sql
-- already includes it for new ones.
alter table invite_requests
  add column email_kind text not null default 'work' check (email_kind in ('work', 'personal')),
  add column role text not null default '' check (char_length(role) <= 120),
  add column design_area text not null default '' check (char_length(design_area) <= 80),
  add column practice text not null default '' check (char_length(practice) <= 80),
  add column heard text not null default '' check (char_length(heard) <= 200);

drop function request_invite(text, text, text, text);

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

revoke all on function request_invite(text, text, text, text, text, text, text, text, text) from public;
grant execute on function request_invite(text, text, text, text, text, text, text, text, text) to anon, authenticated;
