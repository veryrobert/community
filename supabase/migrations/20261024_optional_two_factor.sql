-- Two-factor becomes optional. The emailed code is enough to sign in; anyone who has added an
-- authenticator must still pass it (aal2), so adding one keeps protecting them. Sign-in lasts
-- 30 days. Run once on an existing project; schema.sql already includes it for new ones.

-- Keep in step with SESSION_DAYS in src/lib/auth.ts
create or replace function signed_in_recently() returns boolean
language sql stable as $$
  select coalesce(
    (select min((m ->> 'timestamp')::bigint) from jsonb_array_elements(auth.jwt() -> 'amr') m)
      > extract(epoch from now()) - 30 * 24 * 3600,
    false)
$$;

create function has_authenticator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified')
$$;

-- Passed two-factor, or hasn't set it up
create function two_factor_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' or not has_authenticator()
$$;

do $$
declare t text;
begin
  foreach t in array array['invites', 'profiles', 'community', 'goals', 'tags', 'idea_tags', 'ideas', 'votes',
    'idea_people', 'comments', 'comment_likes', 'updates', 'update_ideas', 'outbox', 'invite_requests']
  loop
    execute format('drop policy "requires recent two-factor" on %I', t);
    execute format(
      'create policy "requires recent sign-in" on %I as restrictive for all to authenticated
         using ((select two_factor_ok()) and (select signed_in_recently()))
         with check ((select two_factor_ok()) and (select signed_in_recently()))', t);
  end loop;
end $$;

drop policy "members add their photo" on storage.objects;
drop policy "members replace their photo" on storage.objects;
drop policy "members remove their photo" on storage.objects;
create policy "members add their photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and (select public.two_factor_ok()));
create policy "members replace their photo" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and (select public.two_factor_ok()));
create policy "members remove their photo" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and (select public.two_factor_ok()));
