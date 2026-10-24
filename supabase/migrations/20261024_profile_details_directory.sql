-- Profile details for the People directory: organisation, job title, area of design, LinkedIn and a
-- short bio. Everyone is listed unless they opt out; email shows only if they opt in. Run once on an
-- existing project; schema.sql already includes it for new ones.
alter table profiles
  add column organisation text not null default '' check (char_length(organisation) <= 160),
  add column job_title text not null default '' check (char_length(job_title) <= 120),
  add column design_area text not null default '' check (char_length(design_area) <= 80),
  add column linkedin text not null default '' check (linkedin = '' or linkedin ~ '^https://([a-z]+\.)?linkedin\.com/'),
  add column bio text not null default '' check (char_length(bio) <= 280),
  add column in_directory boolean not null default true,
  add column show_email boolean not null default false;
