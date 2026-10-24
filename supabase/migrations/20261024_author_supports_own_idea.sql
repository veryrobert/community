-- An idea starts with one supporter: whoever posted it. Run once on an existing project; schema.sql
-- already includes the trigger for new ones. The last part gives existing ideas their author's
-- support (with the follow trigger off, since it follows as the current user, which here is nobody).
create function support_own_idea() returns trigger
language plpgsql as $$
begin
  insert into votes (idea_id, user_id) values (new.id, new.author_id) on conflict do nothing;
  return new;
end $$;

create trigger support_own_idea after insert on ideas
  for each row execute function support_own_idea();

alter table votes disable trigger follow_on_vote;
insert into votes (idea_id, user_id)
  select id, author_id from ideas where author_id is not null and status <> 'merged'
  on conflict do nothing;
alter table votes enable trigger follow_on_vote;
