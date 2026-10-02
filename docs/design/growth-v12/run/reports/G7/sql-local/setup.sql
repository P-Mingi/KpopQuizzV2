-- G7 local test fixture: the shape of the existing tables (copied from migration 067) and minimal groups / songs.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create table public.duel_questions (
  id uuid primary key default gen_random_uuid(), group_slug text not null, question_type text not null, prompt text not null,
  entity_kind text not null check (entity_kind in ('idol', 'song', 'group')), min_votes int not null default 500,
  is_active boolean not null default true, created_at timestamptz not null default now(), unique (group_slug, question_type));
create table public.duel_votes (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.duel_questions(id) on delete cascade,
  option_a_id uuid not null, option_b_id uuid not null, winner_id uuid not null, voter_hash text, created_at timestamptz not null default now());
create table public.duel_ratings (
  question_id uuid not null references public.duel_questions(id) on delete cascade, entity_id uuid not null, entity_name text not null,
  entity_image text, elo numeric not null default 1500, wins int not null default 0, losses int not null default 0,
  last_delta int not null default 0, updated_at timestamptz not null default now(), primary key (question_id, entity_id));
create table public.groups (id serial primary key, slug text unique not null, name text not null);
create table public.songs (id uuid primary key default gen_random_uuid(), group_id int, title text not null, album_cover_big text, deezer_rank int, status text not null default 'active');

insert into public.groups (slug, name) values ('bts', 'BTS'), ('riize', 'RIIZE'), ('tiny', 'Tiny'), ('zzz-quarantine-hidden', 'Hidden'), ('general-kpop', 'K-pop');
-- bts: an older question with 3 songs whose ids are not songs.id, and 2 votes
insert into public.duel_questions (id, group_slug, question_type, prompt, entity_kind) values
  ('00000000-0000-0000-0000-0000000000b1', 'bts', 'songs', 'Best BTS song?', 'song'),
  ('00000000-0000-0000-0000-0000000000b2', 'bts', 'members', 'Who is your BTS bias?', 'idol');
insert into public.duel_ratings (question_id, entity_id, entity_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 'Dynamite'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Butter'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000c', 'Spring Day'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'Jin'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Suga');
insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'old1'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'old2');
-- songs: bts 20 (must be ignored: already has a question), riize 20 with one duplicate title, tiny 5, hidden 10, general 10
insert into public.songs (group_id, title, album_cover_big, deezer_rank)
  select g.id, 'Song ' || n, 'https://cdn-images.dzcdn.net/images/cover/x/500x500.jpg', n * 10
  from public.groups g, generate_series(1, 20) n
  where (g.slug in ('bts', 'riize')) or (g.slug = 'tiny' and n <= 5) or (g.slug in ('zzz-quarantine-hidden', 'general-kpop') and n <= 10);
insert into public.songs (group_id, title, album_cover_big, deezer_rank) select id, 'song 20 ', 'https://cdn-images.dzcdn.net/images/cover/y/500x500.jpg', 5 from public.groups where slug = 'riize';
insert into public.songs (group_id, title, album_cover_big, deezer_rank) select id, 'No cover', null, 999 from public.groups where slug = 'riize';
