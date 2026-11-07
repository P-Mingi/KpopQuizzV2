-- D03-dev-reapply-019-023.sql (run O1, lot DEV-PREVIEW, CR-026 and CR-027)
-- DEV ONLY. NEVER FOR PRODUCTION. Not in docs/launch/o1/SQL-ORDER.md, not in session.sh, not in the production order of manifest.md section 2.
--
-- What:   brings o1-dev, which holds 019 and 023 as they were on 2026-11-03 (f967743), to the two files as they are now on o1/integration, then rebuilds the
--         four banks, in ONE transaction. migrate-dev.sh skips a path it already applied, so a file changed in place cannot go through it twice: this file runs
--         them (psql \ir, the paths below are relative to this folder, so run the file by its path, never from stdin). Two files changed in place:
--         019-dle-core.sql  CR-027: the bank in blocks (dle_build_bank, marker 'bank-blocks-v1'; dle_window only has a new comment, it reads as the gap).
--                           One function body changes, same signature; no table, no view, no grant moves.
--         023-dle-otakudle.sql  CR-026: Otakudle without "How far are you?". The view dle_src_anime_character loses the CTE columns seen_anime, seen_manga and
--                           seen_beginner and attrs loses 'seen_at'; can_be_target is "featured and the Japanese voice actor has a value" (178 targets on the
--                           real data, 113 before).
--         Runs, in this order:
--         (1) guards, as D01 and D02 (refuse, nothing changed).
--         (2) the drop, ONLY when it is needed: a create or replace view cannot drop or rename an output column. The seen_* of the old 023 are columns of a CTE,
--             not of the view (the view has the 8 output columns entity_id, name, search, attrs, hints, thumb_path, balance_key, can_be_target on o1-dev and in
--             the new 023), so on o1-dev the replace goes through and nothing is dropped. If the view on the database does not start with those 8 columns, it is
--             dropped (no CASCADE): when another object depends on it the file refuses and names it, so that nothing 023 or 024 does not recreate is lost. The
--             only things that read the view are the dle functions, by name at run time (dle_refresh_entities builds its statement from dle_games.source_view),
--             so there is no dependent in the catalogue; 024's two views do not read it.
--         (3) 019-dle-core.sql, then 023-dle-otakudle.sql, as they are now (both are create or replace / if not exists, idempotent, single transaction, no
--             transaction control, no "o1-transaction: none"). Not re-run: 024 (its views and tables read nothing that changed: they read characters, series,
--             character_game_facts, entity_images; 019 changed only function bodies), L13 and L15 (data, unchanged; the facts are not rewritten), L14 (the games
--             stay on: epoch and active are never touched).
--         (4) D02-dev-rebuild-banks.sql of this folder (\ir; it is not a manifest row, so migrate-dev.sh never runs it alone): for each game with a bank, the
--             snapshot of the pool (dle_refresh_entities, which drops seen_at from the snapshot and puts the new targets in) then dle_build_bank(game) from bank
--             day 1 in blocks; a game already in blocks, with the gap held and its pool, is left alone. It refuses unless dle_build_bank carries the marker,
--             which (3) has just put there.
--         (5) a last check that stops the transaction when the result is not what the preview needs: no seen_at left in any Otakudle row, and, for every game that
--             is on, 365 days, the bank matching its pool, no target twice in a block of N days from day 1, the gap held.
-- Why:    the preview shows the banks of CR-027 and Otakudle of CR-026 (one character of the day for everyone, no progress selector).
-- Guards: the file refuses, with nothing changed, when the database does not look like o1-dev: more than 200 profiles (production has real members; o1-dev has
--         50 fixtures), or the anime or hub site already live, or public.sites, public.profiles, the dle tables, character_facts or entity_images missing
--         (same guards as D01-dev-catchup.sql and D02-dev-rebuild-banks.sql).
-- Rows:   dle_schedule: 365 rows rewritten for each game rebuilt; dle_entities (the snapshot of each game with a bank); dle_games.pool_hash. No other table.
--         Objects: the body of dle_build_bank (019), the view dle_src_anime_character (023). The other functions of 019 are replaced by themselves. Nothing is
--         dropped while the view keeps its 8 columns.
-- Verify: select count(*) from public.dle_schedule where game_id = 'otakudle';   expect 365 (and each of the four games)
--         select count(*) from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool;   expect 178
--         select count(*) from public.dle_entities where attrs ? 'seen_at';   expect 0
--         docs/launch/o1/checks/V-L14.sql checks 2 to 8 (check 8: start 1), V-023.sql (check 13), V-019.sql checks 1 to 5 (check 6 is for a database with no game on)
-- Undo:   none. D03-dev-reapply-019-023.rollback.sql refuses and says why; o1-dev is reset from the dashboard, not by a file.
-- Needs:  L14 (the end of the files o1-dev already holds: the four games are on), and the files 019, 023 and D02 of this folder as they are on o1/integration.
-- o1-transaction: single (psql --single-transaction). A second run changes nothing: the view keeps its columns, the functions are replaced by themselves, the
--         banks are already in blocks and are left alone (D02 says "0 bank(s) rebuilt").

set lock_timeout = '5s';
set client_min_messages = warning;

-- (1) guards
do $$
begin
  if to_regclass('public.sites') is null or to_regclass('public.profiles') is null or to_regclass('public.dle_games') is null
     or to_regclass('public.dle_schedule') is null or to_regclass('public.dle_entities') is null
     or to_regclass('public.character_facts') is null or to_regclass('public.entity_images') is null then
    raise exception 'D03-dev-reapply-019-023: public.sites, public.profiles, the dle tables, character_facts or entity_images is missing (files 001 to L14 first)';
  end if;
  if (select count(*) from public.profiles) > 200 then
    raise exception 'D03-dev-reapply-019-023: refused, this database holds more than 200 profiles: it is not o1-dev. This file is for the dev branch only, never for production';
  end if;
  if exists (select 1 from public.sites where id in ('anime', 'hub') and status = 'live') then
    raise exception 'D03-dev-reapply-019-023: refused, the anime or hub site is live: this file is for the dev branch only, never for production';
  end if;
end $$;

-- (2) the old view, only when 023 cannot replace it
do $$
declare
  v_new constant text[] := array['entity_id', 'name', 'search', 'attrs', 'hints', 'thumb_path', 'balance_key', 'can_be_target'];
  v_old text[];
  v_dep text;
begin
  if to_regclass('public.dle_src_anime_character') is null then
    return;
  end if;
  select array_agg(a.attname::text order by a.attnum) into v_old
  from pg_attribute a
  where a.attrelid = 'public.dle_src_anime_character'::regclass and a.attnum > 0 and not a.attisdropped;
  if v_old = v_new[1:cardinality(v_old)] then
    return;   -- create or replace view of 023 goes through: the columns are the first of the new ones, in the same order
  end if;
  select string_agg(pg_describe_object(d.classid, d.objid, d.objsubid), '; ') into v_dep
  from pg_depend d
  where d.refclassid = 'pg_class'::regclass and d.refobjid = 'public.dle_src_anime_character'::regclass and d.deptype <> 'i';
  if v_dep is not null then
    raise exception 'D03-dev-reapply-019-023: dle_src_anime_character has other columns than the new 023 and cannot be replaced, and it cannot be dropped because % depend(s) on it: add the file that makes it to this one (no CASCADE)', v_dep;
  end if;
  drop view public.dle_src_anime_character;
end $$;

-- (3) the two files changed in place, as they are on o1/integration now
\ir ../019-dle-core.sql
\ir ../023-dle-otakudle.sql

-- (4) the four banks, from bank day 1, in blocks
\ir D02-dev-rebuild-banks.sql

-- (5) the result, game by game; the transaction stops here when it is not what the preview needs
set client_min_messages = warning;
do $$
declare
  g record;
  v_n integer;
begin
  if exists (select 1 from public.dle_entities where attrs ? 'seen_at')
     or pg_get_viewdef('public.dle_src_anime_character'::regclass) ~ 'seen_' then
    raise exception 'D03-dev-reapply-019-023: Otakudle still reads "How far are you?" (seen_at in the snapshot or seen_ in the view)';
  end if;
  for g in select id, pool_hash from public.dle_games where active order by id loop
    select count(*) into v_n from public.dle_entities where game_id = g.id and can_be_target and in_pool;
    if (select count(*) from public.dle_schedule where game_id = g.id) <> 365
       or g.pool_hash is distinct from public.dle_pool_hash(g.id)
       or exists (select 1 from public.dle_schedule s where s.game_id = g.id
                  group by s.entity_id, (s.bank_day - 1) / greatest(1, least(365, v_n)) having count(*) > 1)
       or exists (select 1 from public.dle_schedule a join public.dle_schedule b on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day < b.bank_day
                  where a.game_id = g.id and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < public.dle_window(g.id)) then
      raise exception 'D03-dev-reapply-019-023: the bank of % is not 365 days in blocks, held to its gap, for its pool', g.id;
    end if;
  end loop;
end $$;
