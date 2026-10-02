-- v12-g1-bt-fans-today.sql  (V12 run, agent G1 follow-up, requested by G3 R1). NOT APPLIED.
--
-- WHAT
--   Func  public.bt_fans_today()   one integer: distinct players (signed in, else the
--                                  browser's anon id) with a blindtest run started
--                                  during the current UTC day. Test runs (localhost,
--                                  previews) and bots never count.
--
-- WHY
--   The line "N fans playing today" on the four blindtest landings comes only from
--   bt_runs (SYSTEM.md 4). bt_runs has row level security and no policy
--   (v12-g1-bt-runs.sql), so the anon key reads nothing, and the public pages do not
--   use the service role. A definer function that returns one integer is the
--   smallest door: no row, no id, no playlist leaves the table.
--   Reader: getFansToday() in apps/quiz/src/lib/growth/bt-data.ts (G3). Until this
--   file is applied the call fails and the line is not rendered at all.
--
-- ROWS
--   None written. No table, row, policy or existing function is changed.
--
-- WHAT IT UNLOCKS
--   The eyebrow of the four landings, as soon as the count is above zero, with no
--   code change (v12 flag on; the count stays 0 until NEXT_PUBLIC_BT_TRACKING=1
--   writes production runs).
--
-- SAFETY
--   Additive only. SECURITY DEFINER with a pinned search_path; the body is one
--   aggregate over public.bt_runs and takes no argument, so a caller cannot steer it.
--   Executable by anon, authenticated and service_role; PUBLIC is revoked first.
--   The day boundary is 00:00 UTC, like the daily blindtest.
--   Editorial accounts: the tracking route never writes their runs, so they are not
--   in the count.
--
-- ORDER
--   After v12-g1-bt-runs.sql (the function body names public.bt_runs; a LANGUAGE sql
--   function is checked at creation, so this file fails cleanly if the table is missing).
--
-- VERIFY (read only, after apply)
--   select public.bt_fans_today();                                                  -- an integer, 0 on a fresh table
--   select has_function_privilege('anon', 'public.bt_fans_today()', 'execute');     -- t
--   select prosecdef, proconfig from pg_proc where oid = 'public.bt_fans_today()'::regprocedure;
--                                                                -- t, {search_path=public, pg_temp}
--
-- UNDO
--   DROP FUNCTION IF EXISTS public.bt_fans_today();

BEGIN;

-- "N fans playing today" on the blindtest landings: distinct players with a run started
-- during the current UTC day. One integer, no row, no id: safe for the anon key.
-- Test runs (localhost, previews) and bots never count.
CREATE OR REPLACE FUNCTION public.bt_fans_today()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(DISTINCT coalesce(player_id, anon_id))::integer
  FROM public.bt_runs
  WHERE is_test = false
    AND user_agent_class <> 'bot'
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
$$;

REVOKE ALL ON FUNCTION public.bt_fans_today() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bt_fans_today() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.bt_fans_today() IS 'V12: distinct blindtest players of the current UTC day (test runs and bots excluded). One integer for the landings.';

COMMIT;
