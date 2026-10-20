-- 013-formats.sql (run O1, lane K1 (the brief of lot (e) part 1 builds the SQL of O5's row); manifest.md row 17; BACKLOG 4.1 row 27; schema.sql section "@file 013-formats")
--
-- What:   adds personality_profiles.character_id (FK characters, on delete set null) for the "which character are you" results,
--         and creates games_game_type_check: the three kpop game types of today (this_or_that, blind_test, name_all_members)
--         plus name_all_songs, name_top_songs, name_all_groups, name_all_idols and name_all_characters.
-- Why:    the anime formats (name all characters, which character are you) need a character link and a game type the kpop
--         catalogue does not carry. Production has no check on games.game_type today (G3, 2026-10-17).
-- Rows:   1 new nullable column; reads games once to validate the check; no row is written.
-- Decisions where the contract is silent: the check is added NOT VALID then validated in the same transaction (as schema.sql
--         says), after a query that lists any game_type outside the list: nothing is added when one exists, so a production
--         value nobody listed stops the file with its name instead of a bare constraint error. The drop IF EXISTS keeps the
--         file re-runnable.
-- Verify: select game_type, count(*) from public.games group by 1 order by 1;                       expect only the eight listed types
--         select convalidated from pg_constraint where conname = 'games_game_type_check';          expect t
--         select count(*) from pg_attribute where attrelid = 'public.personality_profiles'::regclass and attname = 'character_id' and not attisdropped;   expect 1
-- Undo:   013-formats.rollback.sql (refused while a personality profile points at a character).
-- Needs:  011 (characters), 002a (personality_profiles.site_id).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  bad text;
begin
  if to_regclass('public.characters') is null then
    raise exception '013-formats: public.characters is missing (apply 011 first)';
  end if;
  if to_regclass('public.personality_profiles') is null or to_regclass('public.games') is null then
    raise exception '013-formats: public.personality_profiles or public.games is missing';
  end if;
  select string_agg(distinct game_type, ', ' order by game_type) into bad
    from public.games
   where game_type not in ('this_or_that', 'blind_test', 'name_all_members', 'name_all_songs', 'name_top_songs', 'name_all_groups', 'name_all_idols', 'name_all_characters');
  if bad is not null then
    raise exception '013-formats: games holds game types outside games_game_type_check: %; fix those rows first', bad;
  end if;
end $$;

alter table public.personality_profiles add column if not exists character_id integer
  constraint personality_profiles_character_id_fkey references public.characters(id) on delete set null;

alter table public.games drop constraint if exists games_game_type_check;
alter table public.games add constraint games_game_type_check check (game_type in ('this_or_that', 'blind_test',
  'name_all_members', 'name_all_songs', 'name_top_songs', 'name_all_groups', 'name_all_idols', 'name_all_characters')) not valid;
alter table public.games validate constraint games_game_type_check;
