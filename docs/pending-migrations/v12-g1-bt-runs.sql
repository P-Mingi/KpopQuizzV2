-- v12-g1-bt-runs.sql  (V12 run, agent G1 Tracking + scores). NOT APPLIED.
--
-- WHAT
--   1. Table  public.bt_runs               one row per blindtest run (SYSTEM.md section 1).
--   2. View   public.bt_song_stats         per song: plays, correct rate, median answer time
--                                          (security_invoker, test runs excluded).
--   3. Func   public.bt_bump_song_plays    +1 on songs.play_count for the songs of a real run,
--                                          one call per run, service role only.
--   4. Func   public.bt_runs_admin_stats   the numbers of /admin/blind-tests/runs in one
--                                          call (aggregated in SQL, so the 1000-row
--                                          PostgREST cap never undercounts), service role only.
--
-- WHY
--   Nothing records a blindtest run today: blind_test_plays last row 2026-06-05 (140
--   rows in all), bt_plays 1 row, songs.play_count = 0 on all 4,120 songs (read
--   2026-10-02). The site ranks for "kpop blind test" and cannot see one run.
--
-- ROWS
--   None written by this file. No backfill, no change to an existing table, row,
--   policy or function. songs.play_count starts moving only when the app calls
--   bt_bump_song_plays (production runs only, never a test run).
--
-- WHAT IT UNLOCKS
--   POST /api/track/bt-run starts writing (it answers 200 {"ok":false,"reason":
--   "not_live"} and writes nothing until this file is applied), guest runs become
--   claimable through /api/claim-runs, and /admin/blind-tests/runs shows numbers
--   instead of its "not applied yet" line. All three also need
--   NEXT_PUBLIC_BT_TRACKING=1 at build.
--
-- SAFETY
--   Additive only. RLS is on and there is NO policy: anon and authenticated can
--   neither read nor write, every access goes through the service role in
--   app/api/track/bt-run, app/api/claim-runs and the admin page (after isAdmin).
--   No personal data: no IP, no user agent string, no email. anon_id is the random
--   per-browser id that plays.anon_id already carries (migration 155).
--   is_test is set by the server from VERCEL_ENV (true unless 'production'): the dev
--   server and the previews write to this same database and must never count.
--
-- ORDER
--   Independent of every other v12 file. Apply before turning NEXT_PUBLIC_BT_TRACKING on.
--
-- VERIFY (read only, after apply)
--   select count(*) from public.bt_runs;                                   -- 0
--   select relrowsecurity from pg_class where oid = 'public.bt_runs'::regclass;   -- t
--   select count(*) from pg_policies where tablename = 'bt_runs';          -- 0
--   select has_table_privilege('anon', 'public.bt_runs', 'select'),
--          has_table_privilege('authenticated', 'public.bt_runs', 'insert');      -- f, f
--   select has_function_privilege('anon', 'public.bt_bump_song_plays(uuid[])', 'execute'),
--          has_function_privilege('authenticated', 'public.bt_bump_song_plays(uuid[])', 'execute'),
--          has_function_privilege('service_role', 'public.bt_bump_song_plays(uuid[])', 'execute');  -- f, f, t
--   select reloptions from pg_class where oid = 'public.bt_song_stats'::regclass; -- {security_invoker=true}
--   select public.bt_runs_admin_stats(30);    -- as service role: totals.runs = 0
--
-- UNDO
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.bt_runs_admin_stats(integer);
--   DROP FUNCTION IF EXISTS public.bt_bump_song_plays(uuid[]);
--   DROP VIEW IF EXISTS public.bt_song_stats;
--   DROP TABLE IF EXISTS public.bt_runs;
--   COMMIT;
--   (songs.play_count keeps what was counted; reset with
--    UPDATE public.songs SET play_count = 0 WHERE play_count <> 0;  only if wanted.)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. bt_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bt_runs (
  id                uuid PRIMARY KEY,                       -- made by the browser (crypto.randomUUID)
  created_at        timestamptz NOT NULL DEFAULT now(),     -- the first clip played
  finished_at       timestamptz,                            -- results screen, quit or page left
  player_id         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  anon_id           uuid,                                   -- same id as plays.anon_id
  playlist          text NOT NULL,                          -- all | group:<slug> | theme:<slug> | daily:<date> | challenge:<code> | live:<room>
  mode              text NOT NULL,
  source            text NOT NULL DEFAULT 'other',
  locale            text NOT NULL DEFAULT 'en',
  rounds            smallint NOT NULL,
  answered          smallint NOT NULL DEFAULT 0,
  correct           smallint NOT NULL DEFAULT 0,
  score             integer NOT NULL DEFAULT 0,
  best_combo        smallint NOT NULL DEFAULT 0,
  duration_ms       integer,
  completed         boolean NOT NULL DEFAULT false,
  songs             jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{song_id, kind: 'title'|'artist', correct, ms}]
  user_agent_class  text NOT NULL DEFAULT 'desktop',
  is_test           boolean NOT NULL DEFAULT false,
  CONSTRAINT bt_runs_mode_chk CHECK (mode IN ('classic', 'intro', 'speed', 'verse', 'bridge', 'ranked')),
  CONSTRAINT bt_runs_source_chk CHECK (source IN ('hub', 'landing-en', 'landing-fr', 'landing-es', 'landing-id', 'group-hub', 'daily', 'challenge', 'live', 'share', 'other')),
  CONSTRAINT bt_runs_ua_chk CHECK (user_agent_class IN ('mobile', 'desktop', 'bot')),
  CONSTRAINT bt_runs_playlist_chk CHECK (char_length(playlist) BETWEEN 1 AND 96),
  CONSTRAINT bt_runs_counts_chk CHECK (rounds BETWEEN 1 AND 50 AND answered BETWEEN 0 AND rounds AND correct BETWEEN 0 AND answered AND best_combo BETWEEN 0 AND rounds AND score >= 0),
  CONSTRAINT bt_runs_songs_chk CHECK (jsonb_typeof(songs) = 'array')
);

COMMENT ON TABLE public.bt_runs IS 'V12: one row per blindtest run. Written only by the service role (POST /api/track/bt-run). is_test rows never count.';

CREATE INDEX IF NOT EXISTS bt_runs_created_at_idx ON public.bt_runs (created_at);
CREATE INDEX IF NOT EXISTS bt_runs_playlist_created_idx ON public.bt_runs (playlist, created_at);
CREATE INDEX IF NOT EXISTS bt_runs_player_idx ON public.bt_runs (player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bt_runs_anon_idx ON public.bt_runs (anon_id) WHERE anon_id IS NOT NULL;

ALTER TABLE public.bt_runs ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: with RLS on and no policy, anon and authenticated see and
-- write nothing. The service role bypasses RLS.
REVOKE ALL ON TABLE public.bt_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.bt_runs TO service_role;

-- ---------------------------------------------------------------------------
-- 2. bt_song_stats: per song, over every real (not test) run.
--    security_invoker: the view reads bt_runs with the CALLER's rights, so it is as
--    closed as the table (a definer view would have opened it to everyone).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.bt_song_stats
WITH (security_invoker = true) AS
SELECT
  (s.value ->> 'song_id')::uuid                                              AS song_id,
  count(*)::integer                                                          AS plays,
  count(*) FILTER (WHERE (s.value ->> 'correct')::boolean)::integer          AS correct,
  round(count(*) FILTER (WHERE (s.value ->> 'correct')::boolean)::numeric / count(*), 4) AS correct_rate,
  (percentile_cont(0.5) WITHIN GROUP (ORDER BY (s.value ->> 'ms')::integer))::integer    AS median_ms
FROM public.bt_runs r
CROSS JOIN LATERAL jsonb_array_elements(r.songs) AS s(value)
WHERE r.is_test = false
  AND (s.value ->> 'song_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND (s.value ->> 'ms') ~ '^[0-9]{1,6}$'
  AND (s.value ->> 'correct') IN ('true', 'false')
GROUP BY 1;

COMMENT ON VIEW public.bt_song_stats IS 'V12: per song plays, correct rate, median answer ms over real blindtest runs (is_test excluded).';

REVOKE ALL ON public.bt_song_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bt_song_stats TO service_role;

-- ---------------------------------------------------------------------------
-- 3. bt_bump_song_plays: one statement for a whole run. The route calls it once,
--    after the finish row is written, and never for a test run.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bt_bump_song_plays(p_song_ids uuid[])
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH bumped AS (
    UPDATE public.songs AS s
       SET play_count = coalesce(s.play_count, 0) + 1
     WHERE s.id = ANY (
       -- distinct, and never more than one run can hold
       SELECT DISTINCT x FROM unnest(p_song_ids[1:50]) AS x
     )
    RETURNING 1
  )
  SELECT count(*)::integer FROM bumped;
$$;

REVOKE ALL ON FUNCTION public.bt_bump_song_plays(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bt_bump_song_plays(uuid[]) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. bt_runs_admin_stats: everything /admin/blind-tests/runs shows, test runs
--    excluded, no personal data (counts only; a "player" is a distinct
--    coalesce(player_id, anon_id), never shown).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bt_runs_admin_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH win AS (
    SELECT r.*, coalesce(r.player_id, r.anon_id) AS who
    FROM public.bt_runs r
    WHERE r.is_test = false
      AND r.user_agent_class <> 'bot'
      AND r.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365))
  ),
  per_player AS (
    SELECT who, count(*) AS n FROM win WHERE who IS NOT NULL GROUP BY who
  ),
  song_stats AS (
    SELECT st.song_id, st.plays, st.correct, st.correct_rate, st.median_ms, so.title, so.artist_name
    FROM public.bt_song_stats st
    JOIN public.songs so ON so.id = st.song_id
  )
  SELECT jsonb_build_object(
    'days', least(greatest(coalesce(p_days, 30), 1), 365),
    'generated_at', now(),
    'totals', (
      SELECT jsonb_build_object(
        'runs', count(*),
        'finished', count(*) FILTER (WHERE finished_at IS NOT NULL),
        'completed', count(*) FILTER (WHERE completed),
        'signed_in_runs', count(*) FILTER (WHERE player_id IS NOT NULL),
        'guest_runs', count(*) FILTER (WHERE player_id IS NULL),
        'players', count(DISTINCT who),
        'today', count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc')
      ) FROM win
    ),
    'by_day', coalesce((
      SELECT jsonb_agg(d ORDER BY d ->> 'day' DESC) FROM (
        SELECT jsonb_build_object(
          'day', to_char((created_at AT TIME ZONE 'utc')::date, 'YYYY-MM-DD'),
          'runs', count(*),
          'completed', count(*) FILTER (WHERE completed),
          'players', count(DISTINCT who)
        ) AS d
        FROM win GROUP BY (created_at AT TIME ZONE 'utc')::date
      ) x
    ), '[]'::jsonb),
    'by_source', coalesce((
      SELECT jsonb_agg(d ORDER BY (d ->> 'runs')::bigint DESC, d ->> 'source') FROM (
        SELECT jsonb_build_object('source', source, 'runs', count(*), 'completed', count(*) FILTER (WHERE completed)) AS d
        FROM win GROUP BY source
      ) x
    ), '[]'::jsonb),
    'by_playlist', coalesce((
      SELECT jsonb_agg(d ORDER BY (d ->> 'runs')::bigint DESC, d ->> 'playlist') FROM (
        SELECT jsonb_build_object('playlist', playlist, 'runs', count(*), 'completed', count(*) FILTER (WHERE completed)) AS d
        FROM win GROUP BY playlist ORDER BY count(*) DESC, playlist LIMIT 50
      ) x
    ), '[]'::jsonb),
    'by_mode', coalesce((
      SELECT jsonb_agg(d ORDER BY (d ->> 'runs')::bigint DESC, d ->> 'mode') FROM (
        SELECT jsonb_build_object('mode', mode, 'runs', count(*), 'completed', count(*) FILTER (WHERE completed)) AS d
        FROM win GROUP BY mode
      ) x
    ), '[]'::jsonb),
    'runs_per_player', (
      SELECT jsonb_build_object(
        'players', count(*),
        'one', count(*) FILTER (WHERE n = 1),
        'two_to_four', count(*) FILTER (WHERE n BETWEEN 2 AND 4),
        'five_to_nine', count(*) FILTER (WHERE n BETWEEN 5 AND 9),
        'ten_plus', count(*) FILTER (WHERE n >= 10),
        'max', coalesce(max(n), 0)
      ) FROM per_player
    ),
    -- Song lists are over every real run (bt_song_stats is not windowed).
    'top_songs', coalesce((
      SELECT jsonb_agg(d) FROM (
        SELECT jsonb_build_object('title', title, 'artist', artist_name, 'plays', plays, 'correct_rate', correct_rate, 'median_ms', median_ms) AS d
        FROM song_stats ORDER BY plays DESC, title LIMIT 20
      ) x
    ), '[]'::jsonb),
    'hardest_songs', coalesce((
      SELECT jsonb_agg(d) FROM (
        SELECT jsonb_build_object('title', title, 'artist', artist_name, 'plays', plays, 'correct_rate', correct_rate, 'median_ms', median_ms) AS d
        FROM song_stats WHERE plays >= 10 ORDER BY correct_rate ASC, plays DESC, title LIMIT 20
      ) x
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.bt_runs_admin_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bt_runs_admin_stats(integer) TO service_role;

COMMIT;
