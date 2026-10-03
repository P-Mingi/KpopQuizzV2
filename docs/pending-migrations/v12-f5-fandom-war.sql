-- v12-f5-fandom-war.sql  (V12 run, agent F5b). NOT APPLIED. Apply only after the owner types
-- `go v12-f5-fandom-war.sql`, and only after v12-g9-editorial.sql (it calls public.is_editorial).
--
-- WHAT
--   One new function, public.get_fandom_war_map_v12(p_limit int default 30): the fandom war map of
--   migration 107 (get_fandom_war_map) with the plays of editorial accounts left out
--   (public.is_editorial(player_id) true). Same columns, same windows (7 days, previous 7 days), same
--   order, same limit. Anonymous plays (player_id null) still count, as in 107.
--   The existing public.get_fandom_war_map(int) is NOT touched: same name, signature, body and
--   result. A new name rather than an extra defaulted parameter on the old one, because a second
--   overload of get_fandom_war_map would make today's PostgREST call ({p_limit}) ambiguous.
--
-- WHY
--   Owner decision 2026-10-03 (F5 brief, rule 2): editorial (team) accounts never act as fans and
--   are left out of the fandom war. Only the v12 code calls this function, and only when the v12
--   flag is on and at least one editorial account exists (src/lib/editorial/surfaces/war.ts). With
--   the flag off the app calls get_fandom_war_map exactly as today. While this file is not applied,
--   the v12 code falls back to get_fandom_war_map (PGRST202 / 42883).
--
-- ROWS
--   None. No table is created, altered or written. Read-only function (STABLE, SECURITY INVOKER
--   like 107: it reads plays, quizzes and groups as the caller; is_editorial is the G9 SECURITY
--   DEFINER boolean, so the closed editorial_accounts table stays closed).
--
-- VERIFY
--   SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc
--    WHERE proname IN ('get_fandom_war_map','get_fandom_war_map_v12');
--                                   -- two rows: (p_limit integer) each; 107 unchanged
--   SELECT * FROM public.get_fandom_war_map_v12(5);   -- at most 5 rows
--   -- equal to the old map when no editorial account played in the last 14 days:
--   SELECT count(*) FROM (SELECT * FROM public.get_fandom_war_map(90)
--                         EXCEPT SELECT * FROM public.get_fandom_war_map_v12(90)) d;
--                                   -- 0 when the team has no play in the window, else > 0
--
-- UNDO
--   DROP FUNCTION IF EXISTS public.get_fandom_war_map_v12(int);
--   NOTIFY pgrst, 'reload schema';

BEGIN;

CREATE OR REPLACE FUNCTION public.get_fandom_war_map_v12(p_limit int DEFAULT 30)
RETURNS TABLE (
  group_id      int,
  name          text,
  slug          text,
  logo_url      text,
  display_color text,
  plays_week    bigint,
  fans_week     bigint,
  plays_prev    bigint
)
LANGUAGE sql
STABLE
AS $$
  with windowed_all as (
    select q.group_id as gid, p.player_id, p.created_at
    from public.plays p
    join public.quizzes q on q.id = p.quiz_id
    where p.created_at > now() - interval '14 days'
      and q.group_id is not null
  ),
  -- is_editorial runs once per distinct signed-in player of the window, not once per play.
  team as (
    select d.player_id
    from (select distinct w.player_id from windowed_all w where w.player_id is not null) d
    where public.is_editorial(d.player_id)
  ),
  windowed as (
    select w.gid, w.player_id, w.created_at
    from windowed_all w
    where w.player_id is null
       or not exists (select 1 from team t where t.player_id = w.player_id)
  ),
  agg as (
    select
      w.gid,
      count(*) filter (where w.created_at > now() - interval '7 days')                as plays_week,
      count(distinct w.player_id) filter (where w.created_at > now() - interval '7 days') as fans_week,
      count(*) filter (where w.created_at <= now() - interval '7 days')               as plays_prev
    from windowed w
    group by w.gid
  )
  select g.id, g.name, g.slug, g.logo_url, g.display_color,
         a.plays_week, a.fans_week, a.plays_prev
  from agg a
  join public.groups g on g.id = a.gid
  where a.plays_week > 0
  order by a.plays_week desc, g.name asc
  limit p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_fandom_war_map_v12(int) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
