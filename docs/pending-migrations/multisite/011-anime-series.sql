-- 011-anime-series.sql (run O1, lane K1; manifest.md row 15; BACKLOG 4.1 rows 24, 25 and the entity_sources widening row 36 needs; schema.sql section "@file 011-anime-series")
--
-- What:   creates the anime catalogue tables series (1:1 with groups, PK group_id), arcs, characters, episodes, series_themes,
--         and the two per-user tables series_progress and favourite_characters, each with its checks, keys, indexes, RLS and
--         policies; the view favourite_character_counts (owner rights, counts from 30 picks only); adds quizzes.spoiler_arc_ord
--         and quizzes.spoiler_scope; widens trivia_entity_kind_check (series, character, arc, theme), adds
--         entity_sources.source_url and widens entity_sources_entity_type_check and entity_sources_source_check.
-- Why:    OtakuQuiz is built on series pages, spoiler-aware arcs and characters, themes (openings) and the oshi pick; the
--         catalogue rows are loaded at launch (L04, L05), so every table here ships empty.
-- Rows:   6 new tables, 1 new view, 3 new columns, 3 check constraints replaced by supersets; no row is inserted, no row of an
--         existing table is changed (the supersets accept every row that exists).
-- Access: RLS on everywhere. Everyone reads the published rows of series, arcs, characters, episodes and series_themes (a
--         series row needs published, the others status = 'published'); there is no write policy on them, so writes are
--         service role only. series_progress and favourite_characters: a signed-in user reads and writes only their own rows
--         (select, insert, update, delete policies on user_id = auth.uid()). The view is owner-rights on purpose (it counts
--         across users); anon and authenticated may select it, and it shows no pick count under 30.
-- Decisions where the contract is silent: the policies are created only when absent (a second run adds none), the three
--         check swaps are DROP CONSTRAINT then ADD CONSTRAINT (the new lists are supersets, so the swap cannot fail on data),
--         table grants are left to Supabase's default privileges as for every table of 003 to 008 (RLS, not grants, closes the
--         writes).
-- Verify: select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname in ('series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters') order by 1;   expect 7 rows, t
--         select tablename, policyname, cmd from pg_policies where schemaname = 'public' and tablename in ('series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters') order by 1, 2;   expect 5 select-published/public policies and 8 own-rows policies
--         select count(*) from public.series;   expect 0
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'trivia_entity_kind_check';   expect the ten kinds
-- Undo:   011-anime-series.rollback.sql (refused while any catalogue or user row, any spoiler column value or any widened
--         value exists).
-- Needs:  002a (groups.site_id and the other base tables), 001.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

-- Preconditions: the tables this file points at or widens must exist.
do $$
declare
  t text;
begin
  foreach t in array array['groups', 'profiles', 'quizzes', 'trivia', 'entity_sources'] loop
    if to_regclass('public.' || t) is null then
      raise exception '011-anime-series: public.% is missing', t;
    end if;
  end loop;
end $$;


-- series: the anime topic row of groups (site_id 'anime'), 1:1; every child references series(group_id).

create table if not exists public.series (
  group_id integer constraint series_pkey primary key constraint series_group_id_fkey references public.groups(id) on delete cascade,
  type text not null constraint series_type_check check (type in ('anime_manga', 'manga', 'webtoon', 'anime_original', 'franchise')),
  title_en text not null,
  title_native text,
  title_romaji text,
  aliases text[] not null default '{}',
  studios jsonb not null default '[]'::jsonb,
  director text,
  authors jsonb not null default '[]'::jsonb,
  magazine text,
  publisher text,
  anime_start_year smallint,
  anime_end_year smallint,
  manga_start_year smallint,
  manga_end_year smallint,
  status text not null constraint series_status_check check (status in ('airing', 'between_seasons', 'finished', 'ongoing', 'hiatus')),
  episodes integer,
  seasons smallint,
  volumes smallint,
  chapters integer,
  chapters_approx boolean not null default false,
  official_url text,
  airing jsonb,
  wikidata_qid text constraint series_wikidata_qid_check check (wikidata_qid ~ '^Q[0-9]+$'),
  tier text constraint series_tier_check check (tier in ('A', 'B', 'C')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint series_studios_check check (jsonb_typeof(studios) = 'array'),
  constraint series_authors_check check (jsonb_typeof(authors) = 'array')
);
alter table public.series enable row level security;

create table if not exists public.arcs (
  id integer generated always as identity constraint arcs_pkey primary key,
  group_id integer not null constraint arcs_group_id_fkey references public.series(group_id) on delete cascade,
  ord smallint not null constraint arcs_ord_check check (ord >= 1),
  name text not null,
  kind text not null constraint arcs_kind_check check (kind in ('saga', 'arc', 'season', 'part', 'cour')),
  parent_id integer constraint arcs_parent_id_fkey references public.arcs(id) on delete set null,
  episode_from integer, episode_to integer,
  chapter_from integer, chapter_to integer,
  volume_from smallint, volume_to smallint,
  manga_only boolean not null default false,
  anime_only boolean not null default false,
  source_url text,
  status text not null default 'draft' constraint arcs_status_check check (status in ('draft', 'published', 'hidden')),
  constraint arcs_series_ord_key unique (group_id, ord)
);
alter table public.arcs enable row level security;

create table if not exists public.characters (
  id integer generated always as identity constraint characters_pkey primary key,
  group_id integer not null constraint characters_group_id_fkey references public.series(group_id) on delete cascade,
  slug text not null constraint characters_slug_check check (slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null,
  name_native text,
  aliases text[] not null default '{}',
  role text not null constraint characters_role_check check (role in ('main', 'supporting', 'antagonist', 'other')),
  affiliation text,
  debut_arc_ord smallint,
  debut_medium text constraint characters_debut_medium_check check (debut_medium in ('anime', 'manga', 'both')),
  description text constraint characters_description_check check (char_length(description) <= 140),
  wikidata_qid text constraint characters_wikidata_qid_check check (wikidata_qid ~ '^Q[0-9]+$'),
  source_url text,
  spoiler_level smallint not null default 0 constraint characters_spoiler_level_check check (spoiler_level >= 0),
  identity_spoiler boolean not null default false,
  ord integer not null default 0,
  status text not null default 'draft' constraint characters_status_check check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  constraint characters_series_slug_key unique (group_id, slug)
);
create index if not exists characters_series_ord_idx on public.characters (group_id, ord);
alter table public.characters enable row level security;

create table if not exists public.episodes (
  id integer generated always as identity constraint episodes_pkey primary key,
  group_id integer not null constraint episodes_group_id_fkey references public.series(group_id) on delete cascade,
  number integer not null constraint episodes_number_check check (number >= 1),
  season smallint,
  title text,
  aired_on date,
  arc_id integer constraint episodes_arc_id_fkey references public.arcs(id) on delete set null,
  source_url text,
  status text not null default 'draft' constraint episodes_status_check check (status in ('draft', 'published', 'hidden')),
  constraint episodes_series_number_key unique (group_id, number)
);
alter table public.episodes enable row level security;

create table if not exists public.series_themes (
  id integer generated always as identity constraint series_themes_pkey primary key,
  group_id integer not null constraint series_themes_group_id_fkey references public.series(group_id) on delete cascade,
  kind text not null constraint series_themes_kind_check check (kind in ('op', 'ed', 'insert')),
  number smallint not null constraint series_themes_number_check check (number >= 1),
  title text not null,
  artist text not null,
  season smallint,
  episode_from integer, episode_to integer,
  mb_recording_id uuid,
  mb_artist_id uuid,
  deezer_track_id bigint,
  deezer_playable boolean,
  deezer_checked_at timestamptz,
  kpop_group_slug text,
  idol_sung boolean not null default false,
  source_url text,
  status text not null default 'draft' constraint series_themes_status_check check (status in ('draft', 'published', 'hidden')),
  constraint series_themes_slot_key unique (group_id, kind, number)
);
create index if not exists series_themes_deezer_idx on public.series_themes (deezer_track_id) where deezer_track_id is not null;
alter table public.series_themes enable row level security;

create table if not exists public.series_progress (
  user_id uuid not null constraint series_progress_user_id_fkey references public.profiles(id) on delete cascade,
  group_id integer not null constraint series_progress_group_id_fkey references public.series(group_id) on delete cascade,
  medium text not null default 'anime' constraint series_progress_medium_check check (medium in ('anime', 'manga')),
  arc_ord smallint not null default 0 constraint series_progress_arc_ord_check check (arc_ord >= 0),
  updated_at timestamptz not null default now(),
  constraint series_progress_pkey primary key (user_id, group_id)
);
alter table public.series_progress enable row level security;

create table if not exists public.favourite_characters (
  user_id uuid not null constraint favourite_characters_user_id_fkey references public.profiles(id) on delete cascade,
  group_id integer not null constraint favourite_characters_group_id_fkey references public.series(group_id) on delete cascade,
  character_id integer not null constraint favourite_characters_character_id_fkey references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favourite_characters_pkey primary key (user_id, group_id)
);
create index if not exists favourite_characters_character_idx on public.favourite_characters (character_id);
alter table public.favourite_characters enable row level security;


-- policies, each created only when absent
do $$
declare
  p record;
begin
  for p in select * from (values
    -- policy: everyone reads a published series row.
    ('series', 'series_select_published',
     'create policy series_select_published on public.series for select using (published)'),
    -- policy: everyone reads published arcs.
    ('arcs', 'arcs_select_published',
     'create policy arcs_select_published on public.arcs for select using (status = ''published'')'),
    -- policy: everyone reads published characters.
    ('characters', 'characters_select_published',
     'create policy characters_select_published on public.characters for select using (status = ''published'')'),
    -- policy: everyone reads published episodes.
    ('episodes', 'episodes_select_published',
     'create policy episodes_select_published on public.episodes for select using (status = ''published'')'),
    -- policy: everyone reads published themes (titles, artists, ids; never audio, cover or lyrics).
    ('series_themes', 'series_themes_select_published',
     'create policy series_themes_select_published on public.series_themes for select using (status = ''published'')'),
    -- policy: a signed-in user reads and writes only their own progress.
    ('series_progress', 'series_progress_select_own',
     'create policy series_progress_select_own on public.series_progress for select to authenticated using (user_id = auth.uid())'),
    ('series_progress', 'series_progress_insert_own',
     'create policy series_progress_insert_own on public.series_progress for insert to authenticated with check (user_id = auth.uid())'),
    ('series_progress', 'series_progress_update_own',
     'create policy series_progress_update_own on public.series_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())'),
    ('series_progress', 'series_progress_delete_own',
     'create policy series_progress_delete_own on public.series_progress for delete to authenticated using (user_id = auth.uid())'),
    -- policy: a signed-in user reads and writes only their own oshi rows (one per series); counts go through the view.
    ('favourite_characters', 'favourite_characters_select_own',
     'create policy favourite_characters_select_own on public.favourite_characters for select to authenticated using (user_id = auth.uid())'),
    ('favourite_characters', 'favourite_characters_insert_own',
     'create policy favourite_characters_insert_own on public.favourite_characters for insert to authenticated with check (user_id = auth.uid())'),
    ('favourite_characters', 'favourite_characters_update_own',
     'create policy favourite_characters_update_own on public.favourite_characters for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())'),
    ('favourite_characters', 'favourite_characters_delete_own',
     'create policy favourite_characters_delete_own on public.favourite_characters for delete to authenticated using (user_id = auth.uid())')
  ) v(tbl, pol, ddl) loop
    if not exists (select 1 from pg_policy where polrelid = ('public.' || p.tbl)::regclass and polname = p.pol) then
      execute p.ddl;
    end if;
  end loop;
end $$;


-- favourite_character_counts: owner-rights view (reads across users), counts only from 30 picks (the threshold rule).
create or replace view public.favourite_character_counts as
select fc.group_id, fc.character_id, count(*)::integer as picks
from public.favourite_characters fc
group by fc.group_id, fc.character_id
having count(*) >= 30;
revoke all on public.favourite_character_counts from anon, authenticated;
grant select on public.favourite_character_counts to anon, authenticated, service_role;


-- quizzes: the spoiler position of a quiz (015 adds spoiler_cover_until)
alter table public.quizzes add column if not exists spoiler_arc_ord smallint constraint quizzes_spoiler_arc_ord_check check (spoiler_arc_ord >= 0);
alter table public.quizzes add column if not exists spoiler_scope text constraint quizzes_spoiler_scope_check check (spoiler_scope in ('anime', 'manga', 'both'));


-- trivia and entity_sources: the new entity kinds, types and sources (supersets of today's lists)
alter table public.trivia drop constraint if exists trivia_entity_kind_check;
alter table public.trivia add constraint trivia_entity_kind_check check (entity_kind in
  ('group', 'idol', 'album', 'track', 'era', 'award', 'series', 'character', 'arc', 'theme'));

alter table public.entity_sources add column if not exists source_url text;
alter table public.entity_sources drop constraint if exists entity_sources_entity_type_check;
alter table public.entity_sources add constraint entity_sources_entity_type_check check (entity_type in
  ('group', 'group_unit', 'idol', 'album', 'album_track', 'song', 'series', 'character', 'arc', 'episode', 'series_theme'));
alter table public.entity_sources drop constraint if exists entity_sources_source_check;
alter table public.entity_sources add constraint entity_sources_source_check check (source in
  ('wikidata', 'musicbrainz', 'wikipedia', 'official'));
