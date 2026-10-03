-- v12-g6-name-all.sql  (V12 run, agent G6, SYSTEM.md 5.1)
--
-- WHAT
--   1. name_all_member_results.found_order    new nullable column: 1 for the first
--                                             member a round named, 2 for the second...
--                                             NULL when the member was not found.
--   2. name_all_member_results.round_seconds  new nullable column: how long the round
--                                             took (0 to 60). NULL on every row written
--                                             before v12, which is how a v12 round is
--                                             told from an older one.
--   3. idx_namr_v12_group_round               partial index on (group_id, round_id) for
--                                             the v12 rounds only.
--   4. name_all_round_stats(p_group_id)       new function, service role only: for one
--                                             group, the number of finished v12 rounds,
--                                             how many of them named everyone, and how
--                                             many times each member was named first.
--
-- WHY
--   The Name them all result prints two community lines, both positive: "N% of rounds
--   named all 8" and "Named first most often: <member>". The table of migration 126
--   stores one row per member per finished round (found yes / no) with no order and
--   no time, so "named first" cannot be computed from it, and its older rounds were
--   played with other timers (30 to 180 seconds), so they cannot be mixed with the
--   60 second rounds.
--
-- EXISTING DATA
--   name_all_member_results (7,524 rows on 2026-10-02) is NOT dropped, rewritten,
--   cleaned or updated. Both columns are nullable with no default: Postgres adds them
--   as a catalogue change only, no table rewrite, no row touched. The existing rows
--   keep NULL in both and are ignored by name_all_round_stats(). verse_name_recognition()
--   (migration 126) is left as it is and keeps reading every row, old and new.
--
-- ROWS
--   0 rows inserted, updated or deleted by this file.
--
-- UNTIL APPLIED
--   POST /api/name-all/result stores a round in the four columns of migration 126
--   (lib/name-all/server.ts falls back when the two columns are missing), and the
--   result screen prints no community line. Nothing fails.
--
-- AFTER APPLIED
--   Rounds are stored with their order and time. A community line appears for a group
--   once it has 30 finished v12 rounds (STATS_MIN_ROUNDS in lib/name-all/round.ts).
--
-- VERIFY (read only)
--   select column_name, data_type, is_nullable from information_schema.columns
--    where table_schema = 'public' and table_name = 'name_all_member_results'
--    order by ordinal_position;                       -- 8 columns, the two new ones nullable
--   select count(*) from public.name_all_member_results;   -- unchanged by this file
--   select public.name_all_round_stats(3);            -- {"rounds": 0, "perfect_rounds": 0, "firsts": []}
--   select has_function_privilege('anon', 'public.name_all_round_stats(integer)', 'execute');  -- false
--
-- UNDO
--   drop function if exists public.name_all_round_stats(integer);
--   drop index if exists public.idx_namr_v12_group_round;
--   alter table public.name_all_member_results drop column if exists found_order,
--                                               drop column if exists round_seconds;
--   (the undo of the two columns loses the order and time of the v12 rounds stored
--    since; the found yes / no rows themselves stay.)
--
-- Idempotent: safe to run twice.

alter table public.name_all_member_results add column if not exists found_order smallint;
alter table public.name_all_member_results add column if not exists round_seconds smallint;

comment on column public.name_all_member_results.found_order is
  'v12: 1 for the first member named in the round, 2 for the second... NULL when not found, and on rows older than v12.';
comment on column public.name_all_member_results.round_seconds is
  'v12: seconds the round took (0 to 60). NULL on rows older than v12.';

create index if not exists idx_namr_v12_group_round
  on public.name_all_member_results (group_id, round_id)
  where round_seconds is not null;

-- Aggregates only, and only positive ones: nothing here says who is named least.
create or replace function public.name_all_round_stats(p_group_id integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with v12 as (
    select round_id, member_name, found, found_order
      from public.name_all_member_results
     where group_id = p_group_id
       and round_seconds is not null
  ),
  per_round as (
    select round_id, bool_and(found) as perfect
      from v12
     group by round_id
  ),
  firsts as (
    select member_name, count(*) as n
      from v12
     where found and found_order = 1
     group by member_name
  )
  select jsonb_build_object(
    'rounds', (select count(*) from per_round),
    'perfect_rounds', (select count(*) from per_round where perfect),
    'firsts', coalesce((select jsonb_agg(jsonb_build_object('member_name', member_name, 'n', n) order by n desc, member_name) from firsts), '[]'::jsonb)
  );
$$;

revoke all on function public.name_all_round_stats(integer) from public;
revoke all on function public.name_all_round_stats(integer) from anon, authenticated;
grant execute on function public.name_all_round_stats(integer) to service_role;

notify pgrst, 'reload schema';
