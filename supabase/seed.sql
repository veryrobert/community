-- Run after schema.sql. Change the email on the last line to your own before running:
-- it's the first facilitator, who can invite everyone else from Settings.

insert into community (id, name, vision, about, guidelines, conduct) values (1, 'Design for Public', '',
$about$Design for Public is a community of practice for people doing design work in the Irish public and civil service: service designers, user researchers, content and interaction designers, and anyone else shaping how public services work.

This site is where the community decides what to do next. Members suggest ideas, such as events, guides, shared tools or training, support the ones they'd find most useful, and follow them as facilitators take them from suggestion to done. Everything here is private to members.$about$,
$guide$- **Check the ideas list first.** Someone may already have suggested something similar. If so, support it and add a comment so it gathers momentum.
- **Share one idea at a time.** A line on what would change and who it would help is plenty.
- **Support the ideas that matter to you.** We're looking for what the community sees as a priority, and support is how we find it.
- **Follow along on the roadmap.** Facilitators review every idea, move it through the roadmap and explain why, including when something isn't going ahead.$guide$,
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
