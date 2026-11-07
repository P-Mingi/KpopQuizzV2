-- 023-dle-otakudle.sql (run O1, Otakudle for launch day; contract docs/o1/contracts/dle-a1-characters.md, CR-017; RAPPORT-JEUX-DU-JOUR-v2.md 5.5)
--
-- What:   the tables lot A1 fills (character_facts, series_facts: RLS on, no policy, closed to anon and authenticated), the view
--         dle_src_anime_character (the facts as the 7 columns of Otakudle) and the game row otakudle with its columns, switched off (active
--         false, no epoch, no bank). Nothing is shown to players.
--         The pool of the view: the characters lot A1 gave facts to, published (owner, 2026-11-02: spoiler_level and identity_spoiler no longer exclude a character, CR-023; only the columns describe the character as first met), in a published anime
--         series. Columns: series (single; near: same franchise, read through to_jsonb because series has no such column yet, and no two
--         launch series share one), gender, species, role (the role at the first appearance), demographic (single), year (number, near 2:
--         manga_start_year, or anime_start_year for an anime original), studio (multi, near: one in common: the series.studios entries whose
--         seasons contain 1; when no entry does, the entries with no seasons, which is the studio of One Piece, Naruto, Dragon Ball and Bleach.
--         'Studio Pierrot' and 'Pierrot' of L04 are one studio). Hints after 5 and 10 errors: Japanese voice actor, initial (owner, 2026-11-02, CR-020: the first appearance
--         hint is removed for launch; character_facts.first_appearance and its L13 data stay, it is just never served).
--         Who can be the target (CR-026, owner 2026-11-03: Otakudle has no "How far are you?", one character of the day for everyone, so the
--         view has no seen_anime, seen_manga or seen_beginner and attrs has no seen_at): character_facts.featured is true AND the voice actor hint
--         has a value, and every column of the game has a value (019 checks that one in dle_refresh_entities). The first 365 days draw only from the 200 best known characters
--         (TOP200 of lot A2): L13 sets featured for those 200, the bank of L14 is drawn from them, and everyone else of the pool stays guessable. A year
--         later the owner widens the draw with one statement, update public.character_facts set featured = true, and the nightly maintenance rebuilds
--         the bank (it keeps today and the 7 days after it, 019). No engine change: the view's can_be_target is the only place the rule lives.
--         A licensed 96 px picture when entity_images has one; otherwise null and the client shows the initials.
-- Why:    Otakudle opens on launch day. Owner decision of 2026-10-30.
-- When:   session G, right after 022: the tables and the view. The game row needs the anime row of public.sites (dle_games.universe), which only
--         L01 adds on launch day, so while that row is missing this file leaves the game out; session.sh J4 runs the file again before L13 and the
--         game row is added then (CR-017). Activation is launch/L14-O1-dle-on.sql, never this file.
-- Rows:   none in session G; in J4, 1 dle_games row and 7 dle_attributes rows.
-- Needs:  019-dle-core.sql, 011-anime-series.sql, 018-entity-images.sql.
-- Verify: docs/launch/o1/checks/V-023.sql (session.sh G and J4)
--         select has_table_privilege('anon', 'public.character_facts', 'select'), has_table_privilege('authenticated', 'public.dle_src_anime_character', 'select');   expect f, f
-- Undo:   023-dle-otakudle.rollback.sql (refused once the game has a play, and while lot A1's rows are in the tables).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regprocedure('public.dle_build_bank(text, date, double precision)') is null then
    raise exception '023-dle-otakudle: the dle engine is missing (apply 019 first)';
  end if;
  if to_regclass('public.series') is null or to_regclass('public.characters') is null then
    raise exception '023-dle-otakudle: the anime tables are missing (apply 011 first)';
  end if;
  if to_regclass('public.entity_images') is null then
    raise exception '023-dle-otakudle: public.entity_images is missing (apply 018 first)';
  end if;
end $$;

-- The DDL of the contract, part 2, exactly.
create table if not exists public.character_facts (
  character_id integer primary key references public.characters(id) on delete cascade,
  gender text check (gender in ('female', 'male')),
  species text check (species ~ '^[a-z][a-z0-9-]{0,39}$'),
  role_at_debut text check (role_at_debut in ('main', 'supporting', 'antagonist', 'other')),
  first_appearance text check (char_length(first_appearance) between 1 and 80),
  voice_actor_ja text check (char_length(voice_actor_ja) between 1 and 80),
  featured boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.series_facts (
  group_id integer primary key references public.series(group_id) on delete cascade,
  demographic text not null check (demographic in ('shonen', 'shojo', 'seinen', 'josei', 'kodomo', 'none')),
  updated_at timestamptz not null default now()
);

alter table public.character_facts enable row level security;
alter table public.series_facts enable row level security;

-- Supabase grants every new table to anon and authenticated by default: the browser reads the pool only through dle_pool.
revoke all on table public.character_facts, public.series_facts from public, anon, authenticated;
grant all on table public.character_facts, public.series_facts to service_role;

create or replace view public.dle_src_anime_character with (security_invoker = true) as
with first_studio as (
  select s.group_id,
    coalesce(
      nullif(array(
        select distinct case when e ->> 'name' = 'Studio Pierrot' then 'Pierrot' else e ->> 'name' end
        from jsonb_array_elements(s.studios) as e
        where (e -> 'seasons') @> '[1]'::jsonb
      ), '{}'),
      nullif(array(
        select distinct case when e ->> 'name' = 'Studio Pierrot' then 'Pierrot' else e ->> 'name' end
        from jsonb_array_elements(s.studios) as e
        where coalesce(jsonb_array_length(case when jsonb_typeof(e -> 'seasons') = 'array' then e -> 'seasons' end), 0) = 0
      ), '{}')
    ) as studios
  from public.series s
), pool as (
  select c.id, c.name, c.name_native, c.aliases, c.slug,
    f.gender, f.species, f.role_at_debut, f.first_appearance, f.voice_actor_ja, f.featured,
    g.slug as series_slug, s.title_en, s.aliases as series_aliases, sf.demographic,
    nullif(btrim(to_jsonb(s) ->> 'franchise'), '') as franchise,
    case when s.type = 'anime_original' then s.anime_start_year else s.manga_start_year end as work_year,
    fs.studios
  from public.characters c
  join public.character_facts f on f.character_id = c.id
  join public.series s on s.group_id = c.group_id and s.published
  join public.groups g on g.id = c.group_id and g.site_id = 'anime'
  join first_studio fs on fs.group_id = s.group_id
  left join public.series_facts sf on sf.group_id = s.group_id
  where c.status = 'published'
)
select
  p.id::text as entity_id,
  p.name,
  array(select distinct n from unnest(array[p.name, p.name_native, p.title_en] || p.aliases || p.series_aliases) as n where nullif(btrim(n), '') is not null) as search,
  jsonb_build_object(
    'series', jsonb_build_object('v', p.title_en, 'p', case when p.franchise is not null then jsonb_build_array(p.franchise) end),
    'gender', jsonb_build_object('v', p.gender),
    'species', jsonb_build_object('v', p.species),
    'role', jsonb_build_object('v', p.role_at_debut),
    'demographic', jsonb_build_object('v', p.demographic),
    'year', jsonb_build_object('v', p.work_year),
    'studio', jsonb_build_object('v', to_jsonb(p.studios))
  ) as attrs,
  jsonb_strip_nulls(jsonb_build_object('voice_actor_ja', p.voice_actor_ja, 'initial', upper(left(p.name, 1)))) as hints,
  (select ei.thumb_path from public.entity_images ei
    where ei.site_id = 'anime' and ei.kind = 'character' and ei.slug = p.series_slug || '/' || p.slug and ei.license_verified and ei.thumb_path is not null) as thumb_path,
  p.series_slug as balance_key,
  p.featured and p.voice_actor_ja is not null as can_be_target
from pool p;

-- A view is readable by anon and authenticated by default on Supabase and runs with its owner's rights unless security_invoker:
-- only the dle functions (as their owner) and the service role read it.
revoke all on table public.dle_src_anime_character from public, anon, authenticated;
grant select on table public.dle_src_anime_character to service_role;

-- The game: only once L01 added the anime site (dle_games.universe). Never touches a row that is already there, so a run after the activation changes nothing.
insert into public.dle_games (id, universe, entity_kind, source_view, no_repeat_days, min_pool, hint_keys, hint_after, active)
select 'otakudle', 'anime', 'character', 'dle_src_anime_character', 120, 40, '{voice_actor_ja,initial}', '{5,10}', false
where exists (select 1 from public.sites where id = 'anime')
on conflict (id) do nothing;

insert into public.dle_attributes (game_id, key, kind, position, near)
select a.game_id, a.key, a.kind, a.position, a.near
from (values
  ('otakudle', 'series', 'single', 1::smallint, null::numeric),
  ('otakudle', 'gender', 'single', 2::smallint, null::numeric),
  ('otakudle', 'species', 'single', 3::smallint, null::numeric),
  ('otakudle', 'role', 'single', 4::smallint, null::numeric),
  ('otakudle', 'demographic', 'single', 5::smallint, null::numeric),
  ('otakudle', 'year', 'number', 6::smallint, 2::numeric),
  ('otakudle', 'studio', 'multi', 7::smallint, null::numeric)
) as a(game_id, key, kind, position, near)
where exists (select 1 from public.dle_games g where g.id = a.game_id)
on conflict (game_id, key) do nothing;

-- Self-check: closed to the browser roles, the game (when it is there) complete, the published rule in the view.
do $$
begin
  if has_table_privilege('anon', 'public.character_facts', 'select') or has_table_privilege('authenticated', 'public.character_facts', 'select')
    or has_table_privilege('anon', 'public.series_facts', 'select') or has_table_privilege('authenticated', 'public.series_facts', 'select') then
    raise exception '023-dle-otakudle: a facts table is readable by a browser role';
  end if;
  if has_table_privilege('anon', 'public.dle_src_anime_character', 'select') or has_table_privilege('authenticated', 'public.dle_src_anime_character', 'select') then
    raise exception '023-dle-otakudle: dle_src_anime_character is readable by a browser role';
  end if;
  if exists (select 1 from public.dle_games where id = 'otakudle') and (select count(*) from public.dle_attributes where game_id = 'otakudle') <> 7 then
    raise exception '023-dle-otakudle: otakudle does not have 7 columns';
  end if;
  if pg_get_viewdef('public.dle_src_anime_character'::regclass) !~ 'published' or pg_get_viewdef('public.dle_src_anime_character'::regclass) ~ '(spoiler_level = 0|NOT c.identity_spoiler|not c.identity_spoiler)' then
    raise exception '023-dle-otakudle: the view lost its published rule, or filters on a spoiler again';
  end if;
end $$;

notify pgrst, 'reload schema';
