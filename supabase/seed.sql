-- Run after schema.sql. Change the email on the last line to your own before running:
-- it's the first facilitator, who can invite everyone else from Settings.

insert into community (id, name, vision, about, guidelines, conduct) values (1, 'community', '',
$about$A community of practice for people doing design work in and with the Irish public service: service designers, researchers, content and interaction designers, and anyone else shaping how services work.

Members suggest what the community should do next, support the ideas they want, and follow them through to done.$about$,
$guide$- **Search first.** If someone has already suggested it, support theirs and add a comment rather than posting it again.
- **One idea per post.** Say what would change and who it would help.
- **Support what you'd use or help with.** Support is how facilitators see what matters most.
- **Expect an answer.** Facilitators review ideas, set their status and say why, including when something isn't going ahead.$guide$,
$conduct$- Be respectful and assume good intent.
- Question ideas, not people.
- No harassment, discrimination or personal attacks.
- Don't share confidential information, or personal details about service users, colleagues or members of the public.
- Facilitators can hide comments that break these rules and will say why. If something concerns you, tell a facilitator.$conduct$);

insert into tags (name, position) values
  ('Knowledge sharing', 1),
  ('Collaboration', 2),
  ('Resources', 3);

insert into invites (email, role) values ('hello@robertfarrelly.com', 'facilitator');
