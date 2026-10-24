-- Email people when a facilitator invites them. Invites queue an 'invite' row in the outbox (with the
-- invited address instead of an idea); the notify Edge Function sends it. Run once on an existing
-- project; schema.sql already includes it for new ones.
alter table outbox alter column idea_id drop not null;
alter table outbox add column email text;
alter table outbox drop constraint outbox_kind_check;
alter table outbox add constraint outbox_kind_check check (kind in ('comment', 'status', 'idea', 'invite'));

create function queue_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into outbox (kind, email, actor_id) values ('invite', new.email, auth.uid());
  return new;
end $$;

create trigger queue_invite after insert on invites
  for each row execute function queue_invite();
