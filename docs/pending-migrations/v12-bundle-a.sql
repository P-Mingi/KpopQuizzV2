-- V12 bundle A (owner request, 2026-10-03): files 1 to 5, 7 and 9 to 18 of docs/design/growth-v12/run/SQL-PENDING.md,
-- in that order, each in its own transaction (each file already opens and commits its own; file 14 is wrapped here).
-- NOT in this bundle: 6 (use v12-g2-03b-releases-2026-filtered.sql, the 2026 releases without the 5 flagged titles),
-- 8 (years backfill: waits for the owner after the 30-row sample), 19 (editorial accounts: after the owner creates them).
-- Each file is copied verbatim below between "FILE n" markers; the sources stay in docs/pending-migrations/.
-- If one transaction fails, the ones before it stay applied and the ones after it do not run in the SQL editor
-- (the editor stops at the first error): fix and re-run from that file; every file is idempotent.
-- File 9 (title tracks) also flags songs that file 6 inserts: those updates match nothing until 6 is applied.
-- Re-run file 9 (v12-g2-06-title-tracks.sql, idempotent) after the filtered file 6.
-- File 16 counts pairs on the catalogue as it is; it is idempotent.
-- The verification grid at the end is read only. Every line should read ok = true.

-- ====================================================================================================
-- FILE 1: v12-g1-bt-runs.sql
-- ====================================================================================================
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

-- ====================================================================================================
-- FILE 2: v12-g1-bt-fans-today.sql
-- ====================================================================================================
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

-- ====================================================================================================
-- FILE 3: v12-g1-quiz-score-stats.sql
-- ====================================================================================================
-- v12-g1-quiz-score-stats.sql  (V12 run, agent G1 Tracking + scores). NOT APPLIED.
--
-- WHAT
--   View public.quiz_score_stats (quiz_id, plays, avg_pct, median_pct): the average
--   and the median score of a quiz as a percentage of the MAXIMUM of a run, 0..100.
--
-- WHY
--   plays.score holds points. A guess_from_clues question is worth up to 3 points,
--   every other type 1, while plays.total_questions is the question count. Dividing
--   one by the other gave averages of 189% and 240% and labels like "18/6" (read
--   2026-10-02: 6 of the 11 published clue quizzes were above 100%, 0 after the
--   rule below). This view is the SQL twin of lib/quiz/scoring.ts (maxScore,
--   avgScorePct): keep the two in step. Stored rows are not rewritten.
--
-- THE RULE
--   max of a run = total_questions x (3 when quizzes.quiz_type = 'guess_from_clues', else 1)
--   pct of a run = score / max, kept inside 0..1
--   avg_pct      = round(avg(pct) x 100), median_pct = round(median(pct) x 100)
--
-- ROWS
--   None. A view: no table, no row, no policy and no function is changed.
--
-- WHAT IT UNLOCKS
--   One source for "Average", "You beat X%", the quiz of the day average and the
--   hall of fame percentage once their readers switch to it. The app already shows
--   correct averages without it (the TypeScript helpers compute the same value from
--   quizzes.total_score_sum / total_completions); the view adds the median and the
--   per-run truth. Nothing in the code fails while it is missing.
--
-- SAFETY
--   security_invoker = true: the view reads plays and quizzes with the caller's own
--   rights, so it shows exactly what the caller could already compute from those
--   tables and nothing more. No player column is exposed (aggregates per quiz only).
--
-- DRY RUN (read only, 2026-10-02, the SELECT below run as a plain query)
--   438 quizzes with plays, avg_pct between 23 and 100, median_pct at most 100;
--   on the 11 published clue quizzes avg_pct equals
--   round(total_score_sum / total_completions / (question_count x 3) x 100) on every one.
--
-- VERIFY (read only, after apply)
--   select count(*), max(avg_pct), max(median_pct), min(avg_pct) from public.quiz_score_stats;
--     -- max(avg_pct) <= 100 and max(median_pct) <= 100
--   select reloptions from pg_class where oid = 'public.quiz_score_stats'::regclass;
--     -- {security_invoker=true}
--
-- UNDO
--   DROP VIEW IF EXISTS public.quiz_score_stats;

BEGIN;

CREATE OR REPLACE VIEW public.quiz_score_stats
WITH (security_invoker = true) AS
SELECT
  q.id AS quiz_id,
  count(p.id)::integer AS plays,
  round(avg(
    least(1, greatest(0, p.score::numeric / (p.total_questions * CASE WHEN q.quiz_type = 'guess_from_clues' THEN 3 ELSE 1 END)))
  ) * 100)::integer AS avg_pct,
  round((percentile_cont(0.5) WITHIN GROUP (ORDER BY
    least(1, greatest(0, p.score::numeric / (p.total_questions * CASE WHEN q.quiz_type = 'guess_from_clues' THEN 3 ELSE 1 END)))
  ) * 100)::numeric)::integer AS median_pct
FROM public.quizzes q
JOIN public.plays p ON p.quiz_id = q.id
WHERE p.score IS NOT NULL
  AND p.total_questions > 0
GROUP BY q.id;

COMMENT ON VIEW public.quiz_score_stats IS 'V12: per quiz plays, average and median score as a percentage of the run maximum (guess_from_clues = 3 points a question). Twin of lib/quiz/scoring.ts.';

GRANT SELECT ON public.quiz_score_stats TO anon, authenticated, service_role;

COMMIT;

-- ====================================================================================================
-- FILE 4: v12-g2-01-groups.sql
-- ====================================================================================================
-- WHAT: add the groups RESCENE and NCT WISH to `groups`.
-- WHY: growth v12, SYSTEM.md 3 (catalogue completion). Without a group row their songs can never become a
--   group playlist (lib/blind-test-playlists.ts needs a group with at least 10 clean songs linked to it).
-- ROWS: 2 inserts into groups. No update, no delete.
-- FACTS: every non-default value below is confirmed by two sources that were opened on 2026-10-02 (an official
--   or label source, or a major outlet quoting the label, plus a reference wiki). The sources and the quotes are
--   in docs/growth/catalogue/v12-g2-01-groups.md. A fact that two sources did not confirm is left NULL:
--   generation (both), origin_country (both), official_website (both). See the report for each one.
--   display_color / text_color are the catalogue's neutral default pair (the one NCT DREAM and NCT 127 carry),
--   not facts. seo_intro and logo_url stay NULL: typographic cover until the owner adds a photo.
-- IDEMPOTENT: on conflict do nothing (groups.name and groups.slug are both unique). Safe to run twice.
-- APPLY ORDER: first of the v12-g2 files. v12-g2-02-songs-new-groups.sql resolves group_id from these slugs.
-- VERIFY: select id, name, slug, fandom_name, inception_date, record_label from groups where slug in ('rescene', 'nct-wish');  -- 2 rows
-- UNDO (only while no song, quiz or page points at them):
--   update songs set group_id = null where group_id in (select id from groups where slug in ('rescene', 'nct-wish'));
--   delete from groups where slug in ('rescene', 'nct-wish') and quiz_count = 0;

begin;

insert into groups (
  name, slug, fandom_name, display_color, text_color, is_custom, created_by_user, needs_review,
  inception_date, record_label, wikidata_qid, musicbrainz_mbid, spotify_artist_id, deezer_artist_id
) values
  ('RESCENE', 'rescene', 'REMINE', '#F1EFE8', '#444441', false, false, false,
   '2024-03-26', 'The Muze Entertainment', 'Q124856415', 'a54fd8e2-d319-44a6-aa60-21adf17751bf', '5deOsjuFTKrNMJW3rKuL8S', 256312822),
  ('NCT WISH', 'nct-wish', 'NCTzen', '#F1EFE8', '#444441', false, false, false,
   '2024-02-21', 'SM Entertainment', 'Q122575981', 'fb175979-152f-4f32-bf8b-08aa86c24fe3', '4FqmqIspLaUGtxAFFLsZxc', 250913622)
on conflict do nothing;

commit;

-- ====================================================================================================
-- FILE 5: v12-g2-02-songs-new-groups.sql
-- ====================================================================================================
-- WHAT: Songs for KickFlip and RESCENE (10 clean songs each) and group links for Hearts2Hearts and NCT WISH
-- WHY: Each of the four acts needs 10 clean songs linked to its group row to get its own blindtest playlist (growth v12, SYSTEM.md 3).
-- ROWS: 20 insert(s) into songs, 2 update statement(s) linking stored songs to their group row.
--   Source of every row: the public Deezer API (track id, title, album, cover, preview, rank, release year).
-- GENERATED: apps/quiz/scripts/ingest-blindtest-songs.mts, dry run with the anon key, 2026-10-02T16:42:14.166Z.
--   Nothing was written to the database by the script. Report: the .md file of the same name in docs/growth/catalogue/.
-- IDEMPOTENT: each insert re-checks deezer_track_id (unique) and ends with on conflict do nothing; each update only
--   touches rows whose group_id is still null. Safe to run twice.
-- APPLY ORDER: after v12-g2-01-groups.sql (the inserts resolve group_id from the group slug).
-- VERIFY: select count(*) from songs where deezer_track_id in (3882940861, 3188858021, 3188858011, 3561319281, 3937976471, 3188858041, 3937976491, 3188858061, 3561319291, 3937976521, 2966352091, 3211215061, 3426703371, 2966352111, 3651343562, 3622618822, 2722856182, 2682281622, 3211215051, 2966352081);  -- expect 20
-- UNDO: delete from songs where deezer_track_id in (3882940861, 3188858021, 3188858011, 3561319281, 3937976471, 3188858041, 3937976491, 3188858061, 3561319291, 3937976521, 2966352091, 3211215061, 3426703371, 2966352111, 3651343562, 3622618822, 2722856182, 2682281622, 3211215051, 2966352081);
--   and, to unlink (these acts had no linked song before): update songs set group_id = null where artist_name in ('NCT WISH', 'Hearts2Hearts');

begin;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3882940861, 'Twenty', 'KickFlip', 'Twenty', 'https://cdn-images.dzcdn.net/images/cover/600866eb6876764c7bf951086cc9218b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/600866eb6876764c7bf951086cc9218b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/600866eb6876764c7bf951086cc9218b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/5/c/0/55c06082df78392e9f41fb1381c5a3bf.mp3?hdnea=exp=1790960229~acl=/api/1/1/5/5/c/0/55c06082df78392e9f41fb1381c5a3bf.mp3*~data=user_id=0,application_id=42~hmac=30fd9696136f64c702cffc1036c11f4178824894814b4af8c31f55e55bf6b2da', 190, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 445177
where not exists (select 1 from songs where deezer_track_id = 3882940861)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3188858021, 'Umm Great', 'KickFlip', 'Flip it, Kick it!', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/5/2/0/6528c4d25df8b0da1c2f5230edaa81ba.mp3?hdnea=exp=1790960229~acl=/api/1/1/6/5/2/0/6528c4d25df8b0da1c2f5230edaa81ba.mp3*~data=user_id=0,application_id=42~hmac=28eb8e7259f33d3fd7db4b5a4269f6e5e72cb476f55a022bfae60a8c18104929', 141, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, NULL, 'korean', '{}', '{}', 'active', true, 'iconic', 371599
where not exists (select 1 from songs where deezer_track_id = 3188858021)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3188858011, 'Mama Said', 'KickFlip', 'Flip it, Kick it!', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/3/3/0/4337fb671cb5b32d40f4d411864c22aa.mp3?hdnea=exp=1790960229~acl=/api/1/1/4/3/3/0/4337fb671cb5b32d40f4d411864c22aa.mp3*~data=user_id=0,application_id=42~hmac=f238717fe9b2516a08f0cebfcb71861dec4e03b0c881f144d8392dc6312375b4', 176, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, NULL, 'korean', '{}', '{}', 'active', true, 'iconic', 365450
where not exists (select 1 from songs where deezer_track_id = 3188858011)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3561319281, 'My First Love Song', 'KickFlip', 'My First Flip', 'https://cdn-images.dzcdn.net/images/cover/e0c82db8d3c2b55264c13d3b7b737159/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0c82db8d3c2b55264c13d3b7b737159/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0c82db8d3c2b55264c13d3b7b737159/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/7/4/0/c7419d2d1ca64d6c8b18eac5eb83f0af.mp3?hdnea=exp=1790960229~acl=/api/1/1/c/7/4/0/c7419d2d1ca64d6c8b18eac5eb83f0af.mp3*~data=user_id=0,application_id=42~hmac=d59010a17a96a684a1beb2d6c12a14e3ce02dae782cdec7cc80bdda4b602b952', 164, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'iconic', 322421
where not exists (select 1 from songs where deezer_track_id = 3561319281)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3937976471, 'Eye-Poppin’', 'KickFlip', 'My First Kick', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/a/6/0/1a68ef366a766924345c673cac7f6a61.mp3?hdnea=exp=1790960229~acl=/api/1/1/1/a/6/0/1a68ef366a766924345c673cac7f6a61.mp3*~data=user_id=0,application_id=42~hmac=6ed1666164e347d2593f10a3d5d596eb2dc015861fa1b434ef84ffd7d142394a', 162, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 317362
where not exists (select 1 from songs where deezer_track_id = 3937976471)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3188858041, 'Knock Knock', 'KickFlip', 'Flip it, Kick it!', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/d/4/0/fd4933980fbc0b52d15a9de01f2a3f3f.mp3?hdnea=exp=1790960229~acl=/api/1/1/f/d/4/0/fd4933980fbc0b52d15a9de01f2a3f3f.mp3*~data=user_id=0,application_id=42~hmac=b68283d2eaf0abc9e771713d41c5a8191af0c36deeeb8460e21ec4ee6d4eb1b4', 167, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, NULL, 'korean', '{}', '{}', 'active', true, 'popular', 305667
where not exists (select 1 from songs where deezer_track_id = 3188858041)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3937976491, 'Stup!d', 'KickFlip', 'My First Kick', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/0/4/0/3043b97a953ca8173530da5077cc3f89.mp3?hdnea=exp=1790960229~acl=/api/1/1/3/0/4/0/3043b97a953ca8173530da5077cc3f89.mp3*~data=user_id=0,application_id=42~hmac=f9b4adfdfc8bcacf17d380599cc9d6216ec3f631fe3ba9a47835bff0e29e7f01', 156, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 285262
where not exists (select 1 from songs where deezer_track_id = 3937976491)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3188858061, 'See You On Tomorrow', 'KickFlip', 'Flip it, Kick it!', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/29650a6974414ff0b8b3e38b1a9a9611/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/7/3/0/273dabdafd905629cb3f546c7997a8d9.mp3?hdnea=exp=1790960229~acl=/api/1/1/2/7/3/0/273dabdafd905629cb3f546c7997a8d9.mp3*~data=user_id=0,application_id=42~hmac=43214505bb850ccfc8f41acdf28f81a029269bccd52287e064e151d1e4a8dc0d', 197, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, NULL, 'korean', '{}', '{}', 'active', true, 'popular', 279030
where not exists (select 1 from songs where deezer_track_id = 3188858061)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3561319291, 'Band-Aid', 'KickFlip', 'My First Flip', 'https://cdn-images.dzcdn.net/images/cover/e0c82db8d3c2b55264c13d3b7b737159/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0c82db8d3c2b55264c13d3b7b737159/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0c82db8d3c2b55264c13d3b7b737159/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/d/3/0/3d3f3b44e8e59ec6c572c759514145cf.mp3?hdnea=exp=1790960229~acl=/api/1/1/3/d/3/0/3d3f3b44e8e59ec6c572c759514145cf.mp3*~data=user_id=0,application_id=42~hmac=3da3b54d96b088fe4a19b1bbfefd8010074dfc43dd40cc86eeb4911dd072c49c', 173, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'popular', 269009
where not exists (select 1 from songs where deezer_track_id = 3561319291)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3937976521, 'Roar', 'KickFlip', 'My First Kick', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e3e8d4d4566cc29762ca11f38319d175/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/8/0/0/8803a31841396ca1f3e836908ef8553d.mp3?hdnea=exp=1790960229~acl=/api/1/1/8/8/0/0/8803a31841396ca1f3e836908ef8553d.mp3*~data=user_id=0,application_id=42~hmac=8caf092a089395941c3a00ffab33b4bf435d65d3417ba2edae24e6e24aa713c6', 167, (select id from groups where slug = 'kickflip'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 268816
where not exists (select 1 from songs where deezer_track_id = 3937976521)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 2966352091, 'LOVE ATTACK', 'RESCENE', 'SCENEDROME', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/b/9/0/ab9768e6e63cccf9e681d19adebcfd48.mp3?hdnea=exp=1790960231~acl=/api/1/1/a/b/9/0/ab9768e6e63cccf9e681d19adebcfd48.mp3*~data=user_id=0,application_id=42~hmac=60901d65e0c04abb0f8904ad924946f8bbc7b13e2b725fecdf50a4d5b6da3480', 181, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2024, 'korean', '{}', '{}', 'active', true, 'iconic', 455469
where not exists (select 1 from songs where deezer_track_id = 2966352091)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3211215061, 'Glow Up', 'RESCENE', 'Glow Up', 'https://cdn-images.dzcdn.net/images/cover/8c48d8e7eb632b69b8cfe735eed4cf87/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c48d8e7eb632b69b8cfe735eed4cf87/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c48d8e7eb632b69b8cfe735eed4cf87/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/6/c/0/c6c90651781e54dcfe31c868ec2199e7.mp3?hdnea=exp=1790960231~acl=/api/1/1/c/6/c/0/c6c90651781e54dcfe31c868ec2199e7.mp3*~data=user_id=0,application_id=42~hmac=8840ff042c801e30ba7f1dd2f1264030f8e906c494f49d47ed5f5f2dad00ac62', 148, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'iconic', 372939
where not exists (select 1 from songs where deezer_track_id = 3211215061)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3426703371, 'Deja Vu', 'RESCENE', 'Dearest', 'https://cdn-images.dzcdn.net/images/cover/dfa32ae4a069acfb537c45cc622fde4c/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/dfa32ae4a069acfb537c45cc622fde4c/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/dfa32ae4a069acfb537c45cc622fde4c/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/0/9/0/e09938283beb271ed0a4b30c18175eda.mp3?hdnea=exp=1790960231~acl=/api/1/1/e/0/9/0/e09938283beb271ed0a4b30c18175eda.mp3*~data=user_id=0,application_id=42~hmac=219f690634d60568f2256f9ece477fadfbd769cd3a4ffe380cce38c1a9be817b', 184, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'iconic', 370146
where not exists (select 1 from songs where deezer_track_id = 3426703371)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 2966352111, 'Pinball', 'RESCENE', 'SCENEDROME', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/9/8/0/3982156e2ac1a26cf893db0dfd887fb3.mp3?hdnea=exp=1790960231~acl=/api/1/1/3/9/8/0/3982156e2ac1a26cf893db0dfd887fb3.mp3*~data=user_id=0,application_id=42~hmac=cf9476acd92aff94ccc64211033015c5ddf89369784d2c7b5ad7e915e833243e', 193, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2024, 'korean', '{}', '{}', 'active', true, 'iconic', 326138
where not exists (select 1 from songs where deezer_track_id = 2966352111)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3651343562, 'Bloom', 'RESCENE', 'lip bomb', 'https://cdn-images.dzcdn.net/images/cover/063a2f6853c4091f6898e9b1fe0545c5/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/063a2f6853c4091f6898e9b1fe0545c5/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/063a2f6853c4091f6898e9b1fe0545c5/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/a/6/0/ea6194463d276cef633c33e92353f759.mp3?hdnea=exp=1790960231~acl=/api/1/1/e/a/6/0/ea6194463d276cef633c33e92353f759.mp3*~data=user_id=0,application_id=42~hmac=14308f425e37090adc7a11804d310a5e605c2c9b9550f4f0c32e3cb06db0d00b', 176, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'iconic', 314817
where not exists (select 1 from songs where deezer_track_id = 3651343562)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3622618822, 'Heart Drop', 'RESCENE', 'Heart Drop', 'https://cdn-images.dzcdn.net/images/cover/42b800278e1b8df649120c7957111dc7/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/42b800278e1b8df649120c7957111dc7/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/42b800278e1b8df649120c7957111dc7/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/9/f/0/49f5b59576228fb54cab266c35d0620d.mp3?hdnea=exp=1790960231~acl=/api/1/1/4/9/f/0/49f5b59576228fb54cab266c35d0620d.mp3*~data=user_id=0,application_id=42~hmac=a8824528bb349c8dbd184a735e30f3924d4d2193969afea38846b66cf137593c', 183, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'popular', 299749
where not exists (select 1 from songs where deezer_track_id = 3622618822)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 2722856182, 'UhUh', 'RESCENE', 'Re:Scene', 'https://cdn-images.dzcdn.net/images/cover/8ceb9e54660dcfd956cb154e3e898803/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8ceb9e54660dcfd956cb154e3e898803/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8ceb9e54660dcfd956cb154e3e898803/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/d/c/0/ddc6c210544adc65fdd4fa4a5196246c.mp3?hdnea=exp=1790960231~acl=/api/1/1/d/d/c/0/ddc6c210544adc65fdd4fa4a5196246c.mp3*~data=user_id=0,application_id=42~hmac=3689de8b40dde8359804e367e5d10a2a26150fdb525f4a05c1cfcad7c391c1d3', 202, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2024, 'korean', '{}', '{}', 'active', true, 'popular', 271215
where not exists (select 1 from songs where deezer_track_id = 2722856182)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 2682281622, 'YoYo', 'RESCENE', 'YoYo', 'https://cdn-images.dzcdn.net/images/cover/fe2dca57346f719a13fbf8b83b756975/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/fe2dca57346f719a13fbf8b83b756975/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/fe2dca57346f719a13fbf8b83b756975/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/0/f/0/00f9934dcce4c91219256fb22b140447.mp3?hdnea=exp=1790960231~acl=/api/1/1/0/0/f/0/00f9934dcce4c91219256fb22b140447.mp3*~data=user_id=0,application_id=42~hmac=f759397d1bfb130499afd8cb08a59a8619959cdf34219343c9b7e521ef7b27e6', 210, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2024, 'korean', '{}', '{}', 'active', true, 'popular', 257711
where not exists (select 1 from songs where deezer_track_id = 2682281622)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3211215051, 'CRASH', 'RESCENE', 'Glow Up', 'https://cdn-images.dzcdn.net/images/cover/8c48d8e7eb632b69b8cfe735eed4cf87/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c48d8e7eb632b69b8cfe735eed4cf87/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c48d8e7eb632b69b8cfe735eed4cf87/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/5/5/0/455c67c7969188ad3f90fd34b8c23295.mp3?hdnea=exp=1790960231~acl=/api/1/1/4/5/5/0/455c67c7969188ad3f90fd34b8c23295.mp3*~data=user_id=0,application_id=42~hmac=a0bd67812b12f503a410841a6a0447f2c5e44ebc12cff24b40165bd668304f92', 191, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2025, 'korean', '{}', '{}', 'active', true, 'popular', 238145
where not exists (select 1 from songs where deezer_track_id = 3211215051)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 2966352081, 'Lucky you', 'RESCENE', 'SCENEDROME', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/35e9daf5630bf36c84de5a8e2ca7b5a6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/6/7/0/4676d129040200e0171389b59c870983.mp3?hdnea=exp=1790960231~acl=/api/1/1/4/6/7/0/4676d129040200e0171389b59c870983.mp3*~data=user_id=0,application_id=42~hmac=6997d347a206ff15d567adae7b387ba49b7e23afc93a85b73e8cd08825b5814f', 128, (select id from groups where slug = 'rescene'), 'gg', '5th', NULL, 2024, 'korean', '{}', '{}', 'active', true, 'popular', 225791
where not exists (select 1 from songs where deezer_track_id = 2966352081)
on conflict do nothing;

-- NCT WISH: 22 stored song(s) without a group
update songs set group_id = (select id from groups where slug = 'nct-wish')
where group_id is null and artist_name = 'NCT WISH' and exists (select 1 from groups where slug = 'nct-wish');

-- Hearts2Hearts: 14 stored song(s) without a group
update songs set group_id = (select id from groups where slug = 'hearts2hearts')
where group_id is null and artist_name = 'Hearts2Hearts' and exists (select 1 from groups where slug = 'hearts2hearts');

commit;

-- ====================================================================================================
-- FILE 7: v12-g2-04-years-fix.sql
-- ====================================================================================================
-- WHAT: correct songs.year where the stored year is the act's debut year, not the release year
-- WHY: generate now serves year ranges (kpop-hits-2026, kpop-hits-2025, recent-hits, kpop-legends). The year column
--   is NULL on 3,964 of 4,120 songs, and the 156 rows the ingestion script wrote before V12 carry the act's debut
--   year instead of the release year (growth v12, SYSTEM.md 3; v11 decision 33).
-- ROWS: 98 update(s) of songs.year. No insert, no delete.
-- SOURCE: the public Deezer API, per track: release_date and ISRC. A year is written only when the release year is
--   the ISRC registration year; every other track is left untouched.
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-years-sql.mts (anon key, nothing written), 2026-10-02T16:42:47.558Z.
--   Report: docs/growth/catalogue/v12-g2-04-05-years.md.
-- IDEMPOTENT: each row is matched on deezer_track_id AND on the year it holds today; a second run matches nothing.
-- APPLY ORDER: any time. Independent of the other v12-g2 files.
-- VERIFY: select year, count(*) from songs where deezer_track_id in (select d from (values (3953618771), (3315036911), (4048845611)) v(d)) group by 1;
-- UNDO: run the same statement with the two year columns of the values list swapped.

begin;
update songs s set year = v.new_year, updated_at = now()
from (values
  (3953618771, 2022, 2026),
  (3315036911, 2024, 2025),
  (4048845611, 2024, 2026),
  (3616742702, 2022, 2025),
  (3758369882, 2025, 2026),
  (4048845571, 2024, 2026),
  (3994187961, 2025, 2026),
  (3323050681, 2022, 2025),
  (4167424952, 2024, 2026),
  (3976692951, 2024, 2026),
  (3487140241, 2024, 2025),
  (4063736061, 2024, 2026),
  (3976692941, 2024, 2026),
  (3391965331, 2024, 2025),
  (4063736091, 2024, 2026),
  (3976692931, 2024, 2026),
  (3595814332, 2024, 2025),
  (3953618761, 2022, 2026),
  (4183906482, 2025, 2026),
  (3600774572, 2024, 2025),
  (2480160341, 2024, 2023),
  (3293899871, 2024, 2025),
  (4087604431, 2025, 2026),
  (3135697471, 2022, 2024),
  (4048845601, 2024, 2026),
  (3293899911, 2024, 2025),
  (3827175291, 2025, 2026),
  (3758369842, 2025, 2026),
  (3473951211, 2024, 2025),
  (3337521651, 2024, 2025),
  (4087604451, 2025, 2026),
  (4063736101, 2024, 2026),
  (3315036921, 2024, 2025),
  (3861932031, 2024, 2026),
  (3758369872, 2025, 2026),
  (3514913031, 2024, 2025),
  (2503980621, 2024, 2023),
  (3948103531, 2025, 2026),
  (3323050691, 2022, 2025),
  (3863988651, 2025, 2026),
  (3391965351, 2024, 2025),
  (3514912991, 2024, 2025),
  (3293899881, 2024, 2025),
  (4157164272, 2024, 2026),
  (3827375541, 2025, 2026),
  (3976692981, 2024, 2026),
  (3514913001, 2024, 2025),
  (4121008511, 2024, 2026),
  (3976692961, 2024, 2026),
  (3660524502, 2024, 2025),
  (3758369862, 2025, 2026),
  (4178804282, 2022, 2026),
  (4048845591, 2024, 2026),
  (4089668491, 2024, 2026),
  (2533931101, 2022, 2023),
  (3570119161, 2024, 2025),
  (3313211751, 2022, 2025),
  (3946155671, 2024, 2026),
  (3616742712, 2022, 2025),
  (3047609601, 2022, 2024),
  (3994187941, 2025, 2026),
  (3994187931, 2025, 2026),
  (4063736081, 2024, 2026),
  (3994187951, 2025, 2026),
  (3324968701, 2024, 2025),
  (3135697521, 2022, 2024),
  (3875168411, 2024, 2026),
  (4048845581, 2024, 2026),
  (2533931091, 2022, 2023),
  (3946155651, 2024, 2026),
  (3395330901, 2024, 2025),
  (2533931111, 2022, 2023),
  (3391965341, 2024, 2025),
  (3946155661, 2024, 2026),
  (3337521611, 2024, 2025),
  (4087604471, 2025, 2026),
  (3994187911, 2025, 2026),
  (3758369852, 2025, 2026),
  (4087604461, 2025, 2026),
  (4157164282, 2024, 2026),
  (3315036901, 2024, 2025),
  (2317353675, 2022, 2023),
  (3391965361, 2024, 2025),
  (2503980631, 2024, 2023),
  (4087604441, 2025, 2026),
  (3616742692, 2022, 2025),
  (4063736051, 2024, 2026),
  (3315036931, 2024, 2025),
  (3964491871, 2025, 2026),
  (3315036941, 2024, 2025),
  (3135697481, 2022, 2024),
  (3293899901, 2024, 2025),
  (3616742682, 2022, 2025),
  (4131564511, 2024, 2026),
  (3616742732, 2022, 2025)
) as v(deezer_id, old_year, new_year)
where s.deezer_track_id = v.deezer_id and s.year = v.old_year;

-- Stored year that neither the release date nor the ISRC supports (the debut year the old script wrote): removed.
update songs s set year = null, updated_at = now()
from (values
  (3536330211, 2024),
  (3683657342, 2024),
  (3166346511, 2022)
) as v(deezer_id, old_year)
where s.deezer_track_id = v.deezer_id and s.year = v.old_year;

commit;

-- ====================================================================================================
-- FILE 9: v12-g2-06-title-tracks.sql
-- ====================================================================================================
-- WHAT: flag sourced title tracks (songs.is_title_track = true).
-- WHY: only 45 songs are flagged today and none of them is in the curated subset, so the "Title tracks only" playlist
--   is empty (v11 decision 33). Growth v12 flags the title tracks of the new songs and of the hits playlists, each from a
--   cited source (SYSTEM.md 3). A full backfill of the catalogue needs a sourced list and stays an owner decision.
-- ROWS: 41 update(s), one per song. No insert, no delete. A song that is not in the table yet (it comes with
--   v12-g2-02 or v12-g2-03) is simply not matched if those files are not applied first.
-- SOURCES: one public page per song, quoted in docs/growth/catalogue/v12-g2-06-title-tracks.md. Every page was fetched
--   and the quoted words were found on it (apps/quiz/scripts/v12/catalogue/verify-source.mts).
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-title-tracks-sql.mts (anon key, nothing written), 2026-10-02T16:54:44.810Z.
-- IDEMPOTENT: each update only touches a row that is not flagged yet. Safe to run twice.
-- APPLY ORDER: after v12-g2-02-songs-new-groups.sql and v12-g2-03-releases-2026.sql.
-- VERIFY: select count(*) from songs where is_title_track and deezer_track_id in (3234208281, 3407280351, 3570464781, 3827375541, 4087604431, 3188858011, 3561319281, 3937976471, 2722856182, 2966352091, 3211215061, 3426703371, 3622618822, 3651343562, 2671407212, 2842874062, 2990968051, 3293899871, 3514912991, 3946155661, 4089668491, 4131564511, 4232461262, 4204153972, 4103855641, 4027935751, 4149903382, 3986645071, 4204204872, 4178965332, 4090868561, 4208809742, 4258718131, 4143495621, 4051286221, 4285321022, 4049214851, 4157622882, 4018650521, 3920191761, 4223440872);  -- 41
-- UNDO: update songs set is_title_track = null where deezer_track_id in (<the same ids>);
--   (the rows held NULL or false before; the report lists the previous value of each stored row)

begin;

-- Hearts2Hearts, The Chase. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3234208281 and is_title_track is distinct from true;

-- Hearts2Hearts, STYLE. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3407280351 and is_title_track is distinct from true;

-- Hearts2Hearts, FOCUS. Source: https://en.wikipedia.org/wiki/Focus_(Hearts2Hearts_EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3570464781 and is_title_track is distinct from true;

-- Hearts2Hearts, RUDE!. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3827375541 and is_title_track is distinct from true;

-- Hearts2Hearts, Lemon Tang. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4087604431 and is_title_track is distinct from true;

-- KickFlip, Mama Said. Source: https://en.wikipedia.org/wiki/KickFlip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3188858011 and is_title_track is distinct from true;

-- KickFlip, My First Love Song. Source: https://kpop.fandom.com/wiki/My_First_Flip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3561319281 and is_title_track is distinct from true;

-- KickFlip, Eye-Poppin'. Source: https://en.wikipedia.org/wiki/KickFlip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3937976471 and is_title_track is distinct from true;

-- RESCENE, UhUh. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2722856182 and is_title_track is distinct from true;

-- RESCENE, LOVE ATTACK. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2966352091 and is_title_track is distinct from true;

-- RESCENE, Glow Up. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3211215061 and is_title_track is distinct from true;

-- RESCENE, Deja Vu. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3426703371 and is_title_track is distinct from true;

-- RESCENE, Heart Drop. Source: https://www.koreatimes.co.kr/amp/entertainment/k-pop/20251125/rescene-bottles-up-berry-scent-on-new-mini-album-lip-bomb
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3622618822 and is_title_track is distinct from true;

-- RESCENE, Bloom. Source: https://www.koreatimes.co.kr/amp/entertainment/k-pop/20251125/rescene-bottles-up-berry-scent-on-new-mini-album-lip-bomb
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3651343562 and is_title_track is distinct from true;

-- NCT WISH, WISH (Korean Ver.). Source: https://en.wikipedia.org/wiki/Wish_(NCT_Wish_song)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2671407212 and is_title_track is distinct from true;

-- NCT WISH, Songbird (Korean Version). Source: https://en.wikipedia.org/wiki/NCT_Wish
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2842874062 and is_title_track is distinct from true;

-- NCT WISH, Steady. Source: https://en.wikipedia.org/wiki/Steady_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2990968051 and is_title_track is distinct from true;

-- NCT WISH, poppop. Source: https://kpop.fandom.com/wiki/Poppop
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3293899871 and is_title_track is distinct from true;

-- NCT WISH, COLOR. Source: https://kpop.fandom.com/wiki/Color_(NCT_WISH)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3514912991 and is_title_track is distinct from true;

-- NCT WISH, Ode to Love. Source: https://kpop.fandom.com/wiki/Ode_to_Love
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3946155661 and is_title_track is distinct from true;

-- NCT WISH, BOY MEETS GIRL. Source: https://www.smentertainment.com/newsroom/nct-wish-%e6%97%a5-%ec%8b%b1%ea%b8%80-%eb%8d%94%eb%b8%94-%ed%83%80%ec%9d%b4%ed%8b%80%ea%b3%a1-boy-meets-girl-%ec%98%a4%eb%8a%9822%ec%9d%bc-%eb%b0%9c%eb%a7%a4-%ed%99%94%ec%a0%9c/
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4089668491 and is_title_track is distinct from true;

-- NCT WISH, YO-I-DON!. Source: https://www.smentertainment.com/newsroom/nct-wish-%e6%97%a5-%ed%8c%ac%eb%af%b8%ed%8c%85-%ec%a0%84%ec%84%9d-%eb%a7%a4%ec%a7%84-%e2%86%92-%ec%8b%a0%ea%b3%a1-yo-i-don-%ec%98%a4%eb%8a%9813%ec%9d%bc-%ea%b3%b5%ea%b0%9c/
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4131564511 and is_title_track is distinct from true;

-- ENHYPEN, Bloody Paradise. Source: https://en.wikipedia.org/wiki/The_Sin:_Bliss
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4232461262 and is_title_track is distinct from true;

-- Stray Kids, This & That. Source: https://en.wikipedia.org/wiki/This_%26_That_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4204153972 and is_title_track is distinct from true;

-- Stray Kids, RUN IT. Source: https://en.wikipedia.org/wiki/Stray_Kids
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4103855641 and is_title_track is distinct from true;

-- ATEEZ, BAD. Source: https://en.wikipedia.org/wiki/Ateez
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4027935751 and is_title_track is distinct from true;

-- aespa, KISS N TELL. Source: https://en.wikipedia.org/wiki/Aespa
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4149903382 and is_title_track is distinct from true;

-- BABYMONSTER, CHOOM. Source: https://en.wikipedia.org/wiki/Choom_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3986645071 and is_title_track is distinct from true;

-- KiiiKiii, Pop Off Pop Off. Source: https://en.wikipedia.org/wiki/WhyKiiiKiii
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4204204872 and is_title_track is distinct from true;

-- Red Velvet, Surfin' Boy. Source: https://en.wikipedia.org/wiki/Velvet_Summer
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4178965332 and is_title_track is distinct from true;

-- (G)I-DLE, Gimme Dat Love. Source: https://en.wikipedia.org/wiki/We_Made
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4090868561 and is_title_track is distinct from true;

-- NCT 127, Blingy. Source: https://en.wikipedia.org/wiki/Blingy
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4208809742 and is_title_track is distinct from true;

-- MONSTA X, MAGIC. Source: https://en.wikipedia.org/wiki/The_Phase_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4258718131 and is_title_track is distinct from true;

-- ARTMS, Born Stunner. Source: https://en.wikipedia.org/wiki/Artms
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4143495621 and is_title_track is distinct from true;

-- RIIZE, Do your dance. Source: https://en.wikipedia.org/wiki/Riize
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4051286221 and is_title_track is distinct from true;

-- CRAVITY, LOUDER. Source: https://en.wikipedia.org/wiki/Cravity
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4285321022 and is_title_track is distinct from true;

-- TREASURE, IF I. Source: https://en.wikipedia.org/wiki/Treasure_(band)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4049214851 and is_title_track is distinct from true;

-- fromis_9, Vitamin ME. Source: https://en.wikipedia.org/wiki/Fromis_9
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4157622882 and is_title_track is distinct from true;

-- IVE, LUCID DREAM. Source: https://en.wikipedia.org/wiki/Ive_(group)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4018650521 and is_title_track is distinct from true;

-- AKMU, Joy, Sorrow, A Beautiful Heart. Source: https://en.wikipedia.org/wiki/Flowering_(album)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3920191761 and is_title_track is distinct from true;

-- ONEWE, Scenario. Source: https://en.wikipedia.org/wiki/面:_Unknown_Atlas
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4223440872 and is_title_track is distinct from true;

commit;

-- ====================================================================================================
-- FILE 10: v12-g2-07-kpdh.sql
-- ====================================================================================================
-- WHAT: the KPop Demon Hunters soundtrack songs, with their own non-active status 'soundtrack'.
-- WHY: the kpop-demon-hunters blindtest playlist (growth v12, SYSTEM.md 4). The songs of the film's fictional acts
--   (HUNTR/X, Saja Boys, Rumi and Jinu) and the two soundtrack songs by acts that are not in the catalogue
--   (MeloMance, Jokers) must be playable in that playlist only: never in the daily, the all-songs pool, a group
--   playlist, ranked, search or a song count. Every one of those readers asks for status = 'active'
--   (proof: docs/design/growth-v12/run/reports/G2.md, "Reader proof"), so a status of their own keeps them out.
--   The two TWICE songs of the soundtrack are already active TWICE rows; they keep their group and are not touched.
-- ROWS: 1 constraint change (songs.status may also be 'soundtrack'), 10 insert(s) into songs.
-- SOURCE: track list = the label's store pages and the soundtrack's reference article (docs/growth/catalogue/v12-g2-07-kpdh.md);
--   every row value = the public Deezer API.
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-kpdh-sql.mts (anon key, nothing written), 2026-10-02T16:42:06.743Z.
-- IDEMPOTENT: the constraint block drops and re-adds the same check; each insert re-checks deezer_track_id and ends
--   with on conflict do nothing. Safe to run twice.
-- APPLY ORDER: any time, before or after the feat/v12 merge. origin/main (a94d77c) and feat/v12 carry the same
--   readers of `songs`, and none of them can show a row of this status (same proof). With the v12 flag off the
--   rows are simply unread.
-- VERIFY: select status, count(*) from songs where deezer_track_id in (3412534551, 3412534561, 3412534581, 3412534601, 3412534611, 3412534621, 3412534631, 3541756631, 3412534641, 3412534651) group by 1;  -- soundtrack, 10
--   select count(*) from songs where status = 'soundtrack' and (group_id is not null or is_curated);  -- 0
-- UNDO: delete from songs where status = 'soundtrack';
--   then: alter table public.songs drop constraint songs_status_check;
--         alter table public.songs add constraint songs_status_check check (status in ('active', 'inactive', 'review'));

begin;

-- 1. Allow the new status. The check was created inline (status IN ('active', 'inactive', 'review')); it is found
--    by its definition, whatever its name, then re-created under the default name.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.songs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~* '\mstatus\M'
  loop
    execute format('alter table public.songs drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.songs add constraint songs_status_check check (status in ('active', 'inactive', 'review', 'soundtrack'));

-- 2. The songs.

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534551, 'How It’s Done', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/3/5/0/735284bd0bce17bd5a972d24ca4b2303.mp3?hdnea=exp=1790960225~acl=/api/1/1/7/3/5/0/735284bd0bce17bd5a972d24ca4b2303.mp3*~data=user_id=0,application_id=42~hmac=21c2b876e031a33cbefa721770ed57eead7eacf122fc4a73747c9a777cc3f0b3', 176, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 855958
where not exists (select 1 from songs where deezer_track_id = 3412534551)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534561, 'Soda Pop', 'Saja Boys', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/5/8/0/f589f90d66f196a10adfb6c67f5400eb.mp3?hdnea=exp=1790960225~acl=/api/1/1/f/5/8/0/f589f90d66f196a10adfb6c67f5400eb.mp3*~data=user_id=0,application_id=42~hmac=9c2d96924fb5cf16c98853cbf247f072d3dcd19812bf3320801fc0bde8b895f8', 150, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 806817
where not exists (select 1 from songs where deezer_track_id = 3412534561)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534581, 'Golden', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/2/4/0/4248b99b2d0450e4cb0e4c811e422d1b.mp3?hdnea=exp=1790960226~acl=/api/1/1/4/2/4/0/4248b99b2d0450e4cb0e4c811e422d1b.mp3*~data=user_id=0,application_id=42~hmac=100dfbb40f2be26d85dd98af85040352e63abc0737605230cd740a9f3b07c177', 192, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 979012
where not exists (select 1 from songs where deezer_track_id = 3412534581)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534601, 'Takedown', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/9/7/0/d972e7cbb1347d1e34a57d4fcaf99c8b.mp3?hdnea=exp=1790960226~acl=/api/1/1/d/9/7/0/d972e7cbb1347d1e34a57d4fcaf99c8b.mp3*~data=user_id=0,application_id=42~hmac=19c36303573fc6ebe2d43cb99483910d9663bab74a13ffb4ffdbc24f300849b7', 182, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 832269
where not exists (select 1 from songs where deezer_track_id = 3412534601)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534611, 'Your Idol', 'Saja Boys', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/d/2/0/ed234040dbc27743451ee476b23df85b.mp3?hdnea=exp=1790960226~acl=/api/1/1/e/d/2/0/ed234040dbc27743451ee476b23df85b.mp3*~data=user_id=0,application_id=42~hmac=2dc29a36735307d3743d5838665d04ca977523483ce7d3a9ffd3f9fcc48959ed', 191, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 814735
where not exists (select 1 from songs where deezer_track_id = 3412534611)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534621, 'Free', 'Rumi and Jinu', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/c/9/0/cc9f7a2df799005a405dd9b49fc759ef.mp3?hdnea=exp=1790960226~acl=/api/1/1/c/c/9/0/cc9f7a2df799005a405dd9b49fc759ef.mp3*~data=user_id=0,application_id=42~hmac=4918be22da17089fca267f49924bbb3ffdae569ab6ada95551dbea2b3a475358', 187, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 817645
where not exists (select 1 from songs where deezer_track_id = 3412534621)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534631, 'What It Sounds Like', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/9/6/0/696ad5ce7cdd962cbbc5480cdead1c73.mp3?hdnea=exp=1790960226~acl=/api/1/1/6/9/6/0/696ad5ce7cdd962cbbc5480cdead1c73.mp3*~data=user_id=0,application_id=42~hmac=d36b4117f830cb0b4833a5bd92053c7742898edfc9422d33c2ce4d2f94cb2d8d', 250, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 819584
where not exists (select 1 from songs where deezer_track_id = 3412534631)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3541756631, 'Jinu’s Lament', 'Jinu', 'KPop Demon Hunters (Soundtrack from the Netflix Film / Deluxe Version)', 'https://cdn-images.dzcdn.net/images/cover/434f1fffb44056916ce763de4ce3c10a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/434f1fffb44056916ce763de4ce3c10a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/434f1fffb44056916ce763de4ce3c10a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/1/f/0/d1fcadb2d9b43ca4ad3b5d010a649684.mp3?hdnea=exp=1790960226~acl=/api/1/1/d/1/f/0/d1fcadb2d9b43ca4ad3b5d010a649684.mp3*~data=user_id=0,application_id=42~hmac=0e89b9e98f7b6d288f38ca167ea52351a4a803141d8691ff0c06aabadf40d975', 47, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 423236
where not exists (select 1 from songs where deezer_track_id = 3541756631)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534641, '사랑인가 봐 Love, Maybe', 'MeloMance', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/c/0/0/dc054201c585b816f94a1d8c72ec473e.mp3?hdnea=exp=1790960226~acl=/api/1/1/d/c/0/0/dc054201c585b816f94a1d8c72ec473e.mp3*~data=user_id=0,application_id=42~hmac=8d6d3eed6730463fe327f205496dfa45a12b89d025d86a81642ba1427730131f', 185, NULL, NULL, NULL, NULL, NULL, 'korean', '{}', '{}', 'soundtrack', false, NULL, 577013
where not exists (select 1 from songs where deezer_track_id = 3412534641)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534651, '오솔길 Path', 'Jokers', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/3/7/0/237da26c7a5d2e2d44f71c3ecf6bdecd.mp3?hdnea=exp=1790960226~acl=/api/1/1/2/3/7/0/237da26c7a5d2e2d44f71c3ecf6bdecd.mp3*~data=user_id=0,application_id=42~hmac=91162a58a1c216ba01c38d3d284ab60fc4c0040e8d9149253f55dbb08f114eed', 223, NULL, NULL, NULL, NULL, NULL, 'korean', '{}', '{}', 'soundtrack', false, NULL, 510058
where not exists (select 1 from songs where deezer_track_id = 3412534651)
on conflict do nothing;

commit;

-- ====================================================================================================
-- FILE 11: v12-g2-08-language.sql
-- ====================================================================================================
-- WHAT: one spelling for songs.language: the 156 rows that say 'ko' become 'korean'.
-- WHY: the column mixes 'korean' (3,964 rows, the column's own default) and 'ko' (156 rows, written by the
--   ingestion script before V12). PROPOSAL, owner decision: nothing is broken today, this only removes the mix.
-- READERS CHECKED (origin/main a94d77c and feat/v12, same code): the column has exactly one reader,
--   apps/quiz/src/app/(site)/verse/[slug]/songs/[id]/page.tsx (the select on L34, printed on L141 as the
--   "Language" line of the song page, upper-cased by CSS). No filter, no index, no policy, no SQL function and no
--   other page reads it. Proof and the full grep: docs/growth/catalogue/v12-g2-08-language.md.
-- WHY 'korean' AND NOT 'ko': it is the default of the column and the value of 96% of the rows; the one reader
--   prints the value as it is, so the 3,964 rows already show "KOREAN". Going the other way would rewrite 3,964
--   rows and change that line on every song page that shows it. The ingestion script now writes 'korean'.
-- VISIBLE EFFECT (flags on or off): the "Language" line of a song page goes from "KO" to "KOREAN" for the rows that
--   are linked to a group: 13 today (the Cortis songs), plus the Hearts2Hearts and NCT WISH songs once
--   v12-g2-02 links them. The other rows have no group, so no song page.
-- NOT IN THIS FILE: whether each song really is in Korean. The value is a default, not a checked fact (English and
--   Japanese releases carry it too). Fixing that needs a per-song source and is a separate owner decision.
-- ROWS: 156 updates (count read with the anon key on 2026-10-02). No insert, no delete.
-- IDEMPOTENT: only rows that still say 'ko' are touched; a second run matches nothing.
-- APPLY ORDER: any time. Independent of the other v12-g2 files.
-- VERIFY: select language, count(*) from songs group by 1;  -- one line: korean (plus NULL for the soundtrack rows of v12-g2-07)
-- UNDO: not needed in practice; to restore the mix exactly, the 156 rows are the ones this script wrote:
--   update songs set language = 'ko' where language = 'korean' and deezer_track_id in (<ids listed in the report>);

begin;

update songs set language = 'korean', updated_at = now() where language = 'ko';

commit;

-- ====================================================================================================
-- FILE 12: v12-g4-live.sql
-- ====================================================================================================
-- V12 G4 (2026-10): live blindtest. Rooms, players, answers, the functions the API calls,
-- and the Realtime Authorization policy of the room channels.
--
-- NOT APPLIED. Apply only after the owner types "go v12-g4-live.sql". Nothing else must be
-- applied first. Until then every /api/live route answers 503 "not_live" and /live and /join
-- say the mode is not open yet (the code reads the missing table as "not live").
--
-- What it creates
--   public.live_rooms     one row per room: 6 character code, hashed host token, the questions
--                         (server only: they hold the right answers), the round clock, is_test
--   public.live_players   one row per phone: hashed player token, nickname, colour, score, streak
--   public.live_answers   one row per player and round: the choice and the time, measured by
--                         the database clock from the round start
--   13 functions live_*   each one atomic step of a game (create, read, join, start a round,
--                         answer, close a round, apply the scores, move on, settings, play
--                         again, remove a player, close, expire)
--   1 policy on realtime.messages: anyone may RECEIVE broadcasts on the private topic
--                         live:<room id> while that room is open. No INSERT policy: a browser
--                         can never send on a room channel. The server sends with the service role.
--
-- Why this shape
--   RLS is on for the three tables and there is NO policy: the anon key and a signed-in user
--   read and write nothing. Every read and write goes through the API with the service role
--   (it bypasses RLS). EXECUTE on every function but live_topic_open is service_role only.
--   The answer time is clock_timestamp() - round_started_at, both taken by the database: no
--   browser clock and no API server clock decides a score. A late answer (after `seconds`) and
--   a second answer are refused inside the same statement that would store them.
--   The room id is the channel secret: it is never shown, a phone gets it after it joined.
--
-- Rows touched: none (new, empty tables). Existing tables: none changed.
-- Rows it will hold: a room, at most 50 players, at most 50 x 20 answers per game. Rooms older
-- than two hours are emptied by GET /api/cron/live-expire (test rooms are deleted, the others
-- keep one closed row with no question, no token and no player: rooms per week, players per
-- room and rounds played stay countable).
--
-- Verify: the three queries at the end. Undo: the commented block at the very end.

BEGIN;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_rooms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL CHECK (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  host_token_hash  text NOT NULL,
  playlist         text NOT NULL DEFAULT 'all',
  label            text NOT NULL DEFAULT 'All K-pop',
  rounds           smallint NOT NULL CHECK (rounds BETWEEN 1 AND 20),
  seconds          smallint NOT NULL CHECK (seconds BETWEEN 5 AND 30),
  questions        jsonb NOT NULL DEFAULT '[]'::jsonb,
  status           text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'round', 'reveal', 'board', 'ended', 'closed')),
  game             smallint NOT NULL DEFAULT 1,
  round            smallint NOT NULL DEFAULT 0,
  round_started_at timestamptz,
  scored_round     smallint NOT NULL DEFAULT 0,
  seq              integer NOT NULL DEFAULT 1,
  players_peak     smallint NOT NULL DEFAULT 0,
  rounds_played    smallint NOT NULL DEFAULT 0,
  is_test          boolean NOT NULL DEFAULT false,
  ip_hash          text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  closed_at        timestamptz
);

-- A code is unique among open rooms only: it can be given again once a room is closed.
CREATE UNIQUE INDEX IF NOT EXISTS live_rooms_open_code_idx ON public.live_rooms (code) WHERE status <> 'closed';
CREATE INDEX IF NOT EXISTS live_rooms_expires_idx ON public.live_rooms (expires_at) WHERE status <> 'closed';
CREATE INDEX IF NOT EXISTS live_rooms_ip_idx ON public.live_rooms (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS public.live_players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  nickname    text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 16),
  colour      smallint NOT NULL DEFAULT 0 CHECK (colour BETWEEN 0 AND 3),
  score       integer NOT NULL DEFAULT 0,
  streak      smallint NOT NULL DEFAULT 0,
  correct     smallint NOT NULL DEFAULT 0,
  answered    smallint NOT NULL DEFAULT 0,
  total_ms    integer NOT NULL DEFAULT 0,
  last_gain   integer NOT NULL DEFAULT 0,
  last_bonus  integer NOT NULL DEFAULT 0,
  last_result text CHECK (last_result IS NULL OR last_result IN ('ok', 'no', 'none')),
  removed_at  timestamptz,
  joined_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  is_test     boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS live_players_token_idx ON public.live_players (room_id, token_hash);
-- Two players of a room never show the same name (the second "mingi" becomes "mingi 2").
CREATE UNIQUE INDEX IF NOT EXISTS live_players_name_idx ON public.live_players (room_id, lower(nickname)) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.live_answers (
  room_id    uuid NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  game       smallint NOT NULL,
  round      smallint NOT NULL,
  player_id  uuid NOT NULL REFERENCES public.live_players(id) ON DELETE CASCADE,
  choice     smallint NOT NULL CHECK (choice BETWEEN 0 AND 3),
  ms         integer NOT NULL CHECK (ms >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  is_test    boolean NOT NULL DEFAULT false,
  -- One answer per player and round: a second one hits this key and is refused.
  PRIMARY KEY (room_id, game, round, player_id)
);

CREATE INDEX IF NOT EXISTS live_answers_player_idx ON public.live_answers (player_id);

-- RLS on, no policy: the anon key and signed-in users get nothing. The service role bypasses RLS.
ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.live_rooms, public.live_players, public.live_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_rooms, public.live_players, public.live_answers TO service_role;

-- ---------------------------------------------------------------------------
-- Functions (service role only). search_path is empty: every name is qualified.
-- ---------------------------------------------------------------------------

-- Open a room. Returns its id, or NULL when the code belongs to another open room.
CREATE OR REPLACE FUNCTION public.live_create_room(
  p_code text, p_host_token_hash text, p_playlist text, p_label text,
  p_rounds integer, p_seconds integer, p_questions jsonb, p_is_test boolean, p_ip_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- A room past its two hours that the cron has not closed yet gives its code back.
  UPDATE public.live_rooms SET status = 'closed', closed_at = now()
  WHERE code = p_code AND status <> 'closed' AND expires_at <= now();

  INSERT INTO public.live_rooms (code, host_token_hash, playlist, label, rounds, seconds, questions, is_test, ip_hash)
  VALUES (p_code, p_host_token_hash, p_playlist, p_label, p_rounds, p_seconds, p_questions, p_is_test, p_ip_hash)
  ON CONFLICT (code) WHERE status <> 'closed' DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Everything the API needs about an open room, in one read. NULL when no open room has the code.
CREATE OR REPLACE FUNCTION public.live_room_state(p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v public.live_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.live_rooms r
  WHERE r.code = p_code AND r.status <> 'closed' AND r.expires_at > now();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'room', jsonb_build_object(
      'id', v.id, 'code', v.code, 'host_token_hash', v.host_token_hash, 'playlist', v.playlist, 'label', v.label,
      'rounds', v.rounds, 'seconds', v.seconds, 'status', v.status, 'game', v.game, 'round', v.round,
      'round_started_at', (extract(epoch FROM v.round_started_at) * 1000)::bigint,
      'scored_round', v.scored_round, 'seq', v.seq, 'is_test', v.is_test,
      'expires_at', (extract(epoch FROM v.expires_at) * 1000)::bigint
    ),
    'question', CASE WHEN v.round > 0 THEN v.questions -> (v.round - 1) ELSE NULL END,
    'next', v.questions -> (v.round::integer),
    'players', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'token_hash', p.token_hash, 'nickname', p.nickname, 'colour', p.colour, 'score', p.score,
        'streak', p.streak, 'correct', p.correct, 'answered', p.answered, 'total_ms', p.total_ms,
        'last_gain', p.last_gain, 'last_bonus', p.last_bonus, 'last_result', p.last_result,
        'removed_at', (extract(epoch FROM p.removed_at) * 1000)::bigint,
        'joined_at', (extract(epoch FROM p.joined_at) * 1000000)::bigint
      ) ORDER BY p.joined_at, p.id)
      FROM public.live_players p WHERE p.room_id = v.id
    ), '[]'::jsonb),
    'answers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('player_id', a.player_id, 'choice', a.choice, 'ms', a.ms))
      FROM public.live_answers a WHERE a.room_id = v.id AND a.game = v.game AND a.round = v.round
    ), '[]'::jsonb),
    'now', (extract(epoch FROM clock_timestamp()) * 1000)::bigint
  );
END;
$$;

-- A phone joins. The cap and the name are decided under the room's row lock, so 60 phones
-- scanning at once never make 51 players or two "mingi".
CREATE OR REPLACE FUNCTION public.live_join(
  p_room uuid, p_token_hash text, p_nickname text, p_colour integer, p_max integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_room public.live_rooms%ROWTYPE;
  v_player public.live_players%ROWTYPE;
  v_count integer;
  v_name text := p_nickname;
  v_n integer := 1;
  v_suffix text;
BEGIN
  SELECT * INTO v_room FROM public.live_rooms r
  WHERE r.id = p_room AND r.status <> 'closed' AND r.expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'gone');
  END IF;

  SELECT count(*) INTO v_count FROM public.live_players p WHERE p.room_id = p_room AND p.removed_at IS NULL;
  IF v_count >= p_max THEN
    RETURN jsonb_build_object('status', 'full');
  END IF;

  WHILE v_n < 1000 AND EXISTS (
    SELECT 1 FROM public.live_players p
    WHERE p.room_id = p_room AND p.removed_at IS NULL AND lower(p.nickname) = lower(v_name)
  ) LOOP
    v_n := v_n + 1;
    v_suffix := ' ' || v_n::text;
    v_name := rtrim(left(p_nickname, 16 - char_length(v_suffix))) || v_suffix;
  END LOOP;

  INSERT INTO public.live_players (room_id, token_hash, nickname, colour, is_test)
  VALUES (p_room, p_token_hash, v_name, p_colour, v_room.is_test)
  RETURNING * INTO v_player;

  UPDATE public.live_rooms SET players_peak = GREATEST(players_peak, v_count + 1) WHERE id = p_room;

  RETURN jsonb_build_object('status', 'ok', 'player', jsonb_build_object(
    'id', v_player.id, 'token_hash', v_player.token_hash, 'nickname', v_player.nickname, 'colour', v_player.colour,
    'score', 0, 'streak', 0, 'correct', 0, 'answered', 0, 'total_ms', 0, 'last_gain', 0, 'last_bonus', 0,
    'last_result', NULL, 'removed_at', NULL,
    'joined_at', (extract(epoch FROM v_player.joined_at) * 1000000)::bigint
  ));
END;
$$;

-- lobby -> round 1, or the leaderboard of round n-1 -> round n. The round clock starts here.
CREATE OR REPLACE FUNCTION public.live_start_round(p_room uuid, p_game integer, p_round integer) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_rooms r
  SET status = 'round', round = p_round, round_started_at = clock_timestamp(), seq = r.seq + 1
  WHERE r.id = p_room AND r.game = p_game AND r.status <> 'closed' AND r.expires_at > now()
    AND p_round <= r.rounds AND p_round <= jsonb_array_length(r.questions)
    AND ((r.status = 'lobby' AND p_round = 1) OR (r.status = 'board' AND p_round = r.round + 1));
  RETURN FOUND;
END;
$$;

-- One answer. The player is found by token hash, the time is the database's, a late or a
-- second answer is refused. FOR SHARE on the room: answers do not block each other, and
-- live_close_round waits for the answers in flight before it flips the status.
CREATE OR REPLACE FUNCTION public.live_submit_answer(p_code text, p_token_hash text, p_choice integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_room public.live_rooms%ROWTYPE;
  v_player public.live_players%ROWTYPE;
  v_ms integer;
BEGIN
  SELECT * INTO v_room FROM public.live_rooms r
  WHERE r.code = p_code AND r.status <> 'closed' AND r.expires_at > now()
  FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'gone');
  END IF;

  SELECT * INTO v_player FROM public.live_players p WHERE p.room_id = v_room.id AND p.token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;
  IF v_player.removed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'removed');
  END IF;
  IF v_room.status <> 'round' OR v_room.round_started_at IS NULL THEN
    RETURN jsonb_build_object('status', 'not_open');
  END IF;

  v_ms := GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - v_room.round_started_at)) * 1000))::integer;
  IF v_ms > v_room.seconds * 1000 THEN
    RETURN jsonb_build_object('status', 'late');
  END IF;

  INSERT INTO public.live_answers (room_id, game, round, player_id, choice, ms, is_test)
  VALUES (v_room.id, v_room.game, v_room.round, v_player.id, p_choice, v_ms, v_room.is_test)
  ON CONFLICT (room_id, game, round, player_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'ms', v_ms, 'round', v_room.round);
END;
$$;

-- round -> reveal. False when the room was not in that round (a second click, a retry).
CREATE OR REPLACE FUNCTION public.live_close_round(p_room uuid, p_game integer, p_round integer) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_rooms r SET status = 'reveal', seq = r.seq + 1
  WHERE r.id = p_room AND r.game = p_game AND r.round = p_round AND r.status = 'round'
    AND r.expires_at > now();
  RETURN FOUND;
END;
$$;

-- The scores of a round, computed by the API (lib/live/scoring.ts), written in one
-- transaction and once only: scored_round is the guard.
CREATE OR REPLACE FUNCTION public.live_apply_scores(p_room uuid, p_game integer, p_round integer, p_rows jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_rooms r
  SET scored_round = p_round, seq = r.seq + 1, rounds_played = r.rounds_played + 1
  WHERE r.id = p_room AND r.game = p_game AND r.round = p_round AND r.status = 'reveal'
    AND r.scored_round < p_round AND r.expires_at > now();
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.live_players p
  SET score = x.score, streak = x.streak, correct = x.correct, answered = x.answered, total_ms = x.total_ms,
      last_gain = x.gain, last_bonus = x.bonus, last_result = x.result
  FROM jsonb_to_recordset(p_rows) AS x(
    player_id uuid, score integer, streak integer, correct integer, answered integer, total_ms integer,
    gain integer, bonus integer, result text
  )
  WHERE p.id = x.player_id AND p.room_id = p_room;
  RETURN true;
END;
$$;

-- reveal -> board (the leaderboard) and board -> ended (the podium). Nothing else.
CREATE OR REPLACE FUNCTION public.live_move_status(p_room uuid, p_from text, p_to text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF NOT ((p_from = 'reveal' AND p_to = 'board') OR (p_from = 'board' AND p_to = 'ended')) THEN
    RETURN false;
  END IF;
  UPDATE public.live_rooms r SET status = p_to, seq = r.seq + 1
  WHERE r.id = p_room AND r.status = p_from AND r.expires_at > now();
  RETURN FOUND;
END;
$$;

-- Lobby only: the host changed the playlist, the rounds or the time.
CREATE OR REPLACE FUNCTION public.live_update_settings(
  p_room uuid, p_playlist text, p_label text, p_rounds integer, p_seconds integer, p_questions jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_rooms r
  SET playlist = p_playlist, label = p_label, rounds = p_rounds, seconds = p_seconds, questions = p_questions, seq = r.seq + 1
  WHERE r.id = p_room AND r.status = 'lobby' AND r.expires_at > now();
  RETURN FOUND;
END;
$$;

-- "Play again": ended -> lobby, the next game, scores back to zero, new questions. Players stay.
CREATE OR REPLACE FUNCTION public.live_reset_game(
  p_room uuid, p_playlist text, p_label text, p_rounds integer, p_seconds integer, p_questions jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_rooms r
  SET playlist = p_playlist, label = p_label, rounds = p_rounds, seconds = p_seconds, questions = p_questions,
      status = 'lobby', game = r.game + 1, round = 0, round_started_at = NULL, scored_round = 0, seq = r.seq + 1
  WHERE r.id = p_room AND r.status = 'ended' AND r.expires_at > now();
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  UPDATE public.live_players p
  SET score = 0, streak = 0, correct = 0, answered = 0, total_ms = 0, last_gain = 0, last_bonus = 0, last_result = NULL
  WHERE p.room_id = p_room;
  RETURN true;
END;
$$;

-- The host removes a player: the row stays (its token is then refused), the name is free again.
CREATE OR REPLACE FUNCTION public.live_remove_player(p_room uuid, p_player uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_players p SET removed_at = now()
  WHERE p.id = p_player AND p.room_id = p_room AND p.removed_at IS NULL
    AND EXISTS (SELECT 1 FROM public.live_rooms r WHERE r.id = p_room AND r.status <> 'closed' AND r.expires_at > now());
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  UPDATE public.live_rooms r SET seq = r.seq + 1 WHERE r.id = p_room;
  RETURN true;
END;
$$;

-- The host closes the room: no question, no token and no player is kept.
CREATE OR REPLACE FUNCTION public.live_close_room(p_room uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  UPDATE public.live_rooms r
  SET status = 'closed', closed_at = now(), questions = '[]'::jsonb, host_token_hash = '', seq = r.seq + 1
  WHERE r.id = p_room AND r.status <> 'closed';
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  DELETE FROM public.live_players p WHERE p.room_id = p_room;
  RETURN true;
END;
$$;

-- Rooms past their two hours. Test rooms (the load test, previews, localhost) are deleted
-- with their players and answers; real rooms keep one closed row and nothing personal.
CREATE OR REPLACE FUNCTION public.live_expire_rooms() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
  v_closed integer;
BEGIN
  DELETE FROM public.live_rooms r WHERE r.is_test AND r.expires_at <= now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  WITH gone AS (
    UPDATE public.live_rooms r
    SET status = 'closed', closed_at = COALESCE(r.closed_at, now()), questions = '[]'::jsonb, host_token_hash = ''
    WHERE NOT r.is_test AND r.expires_at <= now() AND (r.status <> 'closed' OR r.host_token_hash <> '')
    RETURNING r.id
  ), wiped AS (
    DELETE FROM public.live_players p WHERE p.room_id IN (SELECT id FROM gone)
  )
  SELECT count(*) INTO v_closed FROM gone;

  RETURN jsonb_build_object('closed', v_closed, 'deleted', v_deleted);
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.live_create_room(text, text, text, text, integer, integer, jsonb, boolean, text),
  public.live_room_state(text),
  public.live_join(uuid, text, text, integer, integer),
  public.live_start_round(uuid, integer, integer),
  public.live_submit_answer(text, text, integer),
  public.live_close_round(uuid, integer, integer),
  public.live_apply_scores(uuid, integer, integer, jsonb),
  public.live_move_status(uuid, text, text),
  public.live_update_settings(uuid, text, text, integer, integer, jsonb),
  public.live_reset_game(uuid, text, text, integer, integer, jsonb),
  public.live_remove_player(uuid, uuid),
  public.live_close_room(uuid),
  public.live_expire_rooms()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.live_create_room(text, text, text, text, integer, integer, jsonb, boolean, text),
  public.live_room_state(text),
  public.live_join(uuid, text, text, integer, integer),
  public.live_start_round(uuid, integer, integer),
  public.live_submit_answer(text, text, integer),
  public.live_close_round(uuid, integer, integer),
  public.live_apply_scores(uuid, integer, integer, jsonb),
  public.live_move_status(uuid, text, text),
  public.live_update_settings(uuid, text, text, integer, integer, jsonb),
  public.live_reset_game(uuid, text, text, integer, integer, jsonb),
  public.live_remove_player(uuid, uuid),
  public.live_close_room(uuid),
  public.live_expire_rooms()
TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime Authorization: private channels live:<room id>, receive only.
-- ---------------------------------------------------------------------------

-- True when `p_topic` is the channel of an open room. SECURITY DEFINER because the caller
-- (anon or authenticated, inside the policy below) cannot read live_rooms. It tells nothing
-- but "this exact, unguessable topic is open".
CREATE OR REPLACE FUNCTION public.live_topic_open(p_topic text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_topic ~ '^live:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN EXISTS (
      SELECT 1 FROM public.live_rooms r
      WHERE r.id = substr(p_topic, 6)::uuid AND r.status <> 'closed' AND r.expires_at > now()
    )
    ELSE false
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.live_topic_open(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_topic_open(text) TO anon, authenticated, service_role;

-- Receive only. There is no INSERT policy for these topics, so a browser can neither
-- broadcast nor track presence on a room channel: phones only receive.
DROP POLICY IF EXISTS "live_rooms_receive" ON realtime.messages;
CREATE POLICY "live_rooms_receive" ON realtime.messages
  FOR SELECT TO anon, authenticated
  USING (realtime.messages.extension = 'broadcast' AND public.live_topic_open((SELECT realtime.topic())));

COMMIT;

-- Verification 1: the three tables exist, RLS on, and no policy on them. Expected three rows,
-- rls = true, policies = 0.
SELECT c.relname, c.relrowsecurity AS rls,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN ('live_rooms', 'live_players', 'live_answers')
ORDER BY c.relname;

-- Verification 2: who may execute the functions. Expected: service_role (and the owner role)
-- on the thirteen game functions, no anon, no authenticated, no PUBLIC; anon, authenticated and
-- service_role on live_topic_open only.
SELECT routine_name, string_agg(grantee, ', ' ORDER BY grantee) AS grantees
FROM information_schema.routine_privileges
WHERE specific_schema = 'public' AND routine_name LIKE 'live\_%'
GROUP BY routine_name
ORDER BY routine_name;

-- Verification 3: the Realtime policy. Expected exactly one row: live_rooms_receive | SELECT | {anon,authenticated}.
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname LIKE 'live\_%';

-- Undo (run only to remove the live blindtest; every room, player and answer is lost):
-- BEGIN;
-- DROP POLICY IF EXISTS "live_rooms_receive" ON realtime.messages;
-- DROP FUNCTION IF EXISTS public.live_topic_open(text);
-- DROP FUNCTION IF EXISTS public.live_expire_rooms();
-- DROP FUNCTION IF EXISTS public.live_close_room(uuid);
-- DROP FUNCTION IF EXISTS public.live_remove_player(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.live_reset_game(uuid, text, text, integer, integer, jsonb);
-- DROP FUNCTION IF EXISTS public.live_update_settings(uuid, text, text, integer, integer, jsonb);
-- DROP FUNCTION IF EXISTS public.live_move_status(uuid, text, text);
-- DROP FUNCTION IF EXISTS public.live_apply_scores(uuid, integer, integer, jsonb);
-- DROP FUNCTION IF EXISTS public.live_close_round(uuid, integer, integer);
-- DROP FUNCTION IF EXISTS public.live_submit_answer(text, text, integer);
-- DROP FUNCTION IF EXISTS public.live_start_round(uuid, integer, integer);
-- DROP FUNCTION IF EXISTS public.live_join(uuid, text, text, integer, integer);
-- DROP FUNCTION IF EXISTS public.live_room_state(text);
-- DROP FUNCTION IF EXISTS public.live_create_room(text, text, text, text, integer, integer, jsonb, boolean, text);
-- DROP TABLE IF EXISTS public.live_answers;
-- DROP TABLE IF EXISTS public.live_players;
-- DROP TABLE IF EXISTS public.live_rooms;
-- COMMIT;

-- ====================================================================================================
-- FILE 13: v12-g4-party-rls.sql
-- ====================================================================================================
-- V12 G4 (2026-10): close the PUBLIC write policies of party_rooms and party_players, the
-- same way r1-rls-tighten.sql closed six other tables (R1 report, "seen in passing", item 6).
--
-- NOT APPLIED. Apply only after the owner types "go v12-g4-party-rls.sql". It does not depend
-- on v12-g4-live.sql and the live blindtest does not depend on it.
--
-- What G4 found (read only, 2026-10-02)
--   Migration 059 created both tables with
--     party_rooms_insert   FOR INSERT WITH CHECK (true)     party_rooms_update   FOR UPDATE USING (true)
--     party_players_insert FOR INSERT WITH CHECK (true)     party_players_update FOR UPDATE USING (true)
--   so anyone holding the public anon key could insert and edit rooms and scores, and added
--   both tables to the supabase_realtime publication. Migration 072 ("drop the old battle")
--   then DROPPED both tables. On the production project (one catalog query, no data read) neither table
--   exists today, there is no policy on them and nothing of them in the publication.
--   R1 read 059 and not 072.
--
-- Every writer, and what happens to it
--   apps/quiz   none. The app never names these tables. The live blindtest uses its own
--               live_rooms / live_players / live_answers (v12-g4-live.sql): RLS with no policy,
--               every write through the API with the service role.
--   apps/blindtest (the old standalone app; its Supabase project is deleted, it is not
--               deployed with apps/quiz, and it is outside this run)
--     server    /api/party/create, /api/party/[code]/join, /start, /answer: service role
--               already. They keep working: the service role bypasses RLS.
--     browser   components/party/kahoot-host-screen.tsx updates party_rooms with the anon key
--               (round, status). That is the one client writer. If that app is ever pointed at
--               this database again, those three updates must first move behind a server route
--               (the host check of /api/party/[code]/start is the model); until then the host
--               screen of that app cannot advance a round once this file is applied. The reads
--               (hooks/use-party-channel.ts: select and postgres_changes) keep working, the
--               SELECT policies stay.
--   db          no trigger and no function writes either table.
--
-- So this file is a guard, not a fix of something live: on production today it does nothing
-- (the tables do not exist, each block is skipped). If the tables are ever restored (a replay of
-- 059 on another environment, a backup), it leaves them read only for the public keys.
--
-- Rows touched: none (policies and one publication change). Reversible: the commented block
-- at the end recreates the four policies exactly as migration 059 wrote them.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.party_rooms') IS NOT NULL THEN
    DROP POLICY IF EXISTS "party_rooms_insert" ON public.party_rooms;
    DROP POLICY IF EXISTS "party_rooms_update" ON public.party_rooms;
    -- RLS must be on for the SELECT policy to be the only door (059 turned it on; idempotent).
    ALTER TABLE public.party_rooms ENABLE ROW LEVEL SECURITY;
    -- Table grants: the public keys read, they do not write.
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.party_rooms FROM PUBLIC, anon, authenticated;
  END IF;

  IF to_regclass('public.party_players') IS NOT NULL THEN
    DROP POLICY IF EXISTS "party_players_insert" ON public.party_players;
    DROP POLICY IF EXISTS "party_players_update" ON public.party_players;
    ALTER TABLE public.party_players ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.party_players FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

COMMIT;

-- Verification 1: the policies left on the two tables. Expected on production today: no row
-- (the tables do not exist). Where they exist: exactly two rows, both SELECT
--   party_players | party_players_select | SELECT
--   party_rooms   | party_rooms_select   | SELECT
-- Any other row, or a cmd other than SELECT, means a policy with another name exists: tell G4
-- before going on.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('party_rooms', 'party_players')
ORDER BY tablename, policyname;

-- Verification 2: RLS is on where the tables exist (no row on production today; else two rows, both true).
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relname IN ('party_rooms', 'party_players')
ORDER BY relname;

-- Rollback (run only to undo this file, and only where the tables exist):
-- BEGIN;
-- CREATE POLICY "party_rooms_insert" ON public.party_rooms FOR INSERT WITH CHECK (true);
-- CREATE POLICY "party_rooms_update" ON public.party_rooms FOR UPDATE USING (true);
-- CREATE POLICY "party_players_insert" ON public.party_players FOR INSERT WITH CHECK (true);
-- CREATE POLICY "party_players_update" ON public.party_players FOR UPDATE USING (true);
-- GRANT INSERT, UPDATE, DELETE ON public.party_rooms, public.party_players TO anon, authenticated;
-- COMMIT;

-- ====================================================================================================
-- FILE 14: v12-g6-name-all.sql
-- ====================================================================================================
BEGIN;
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
COMMIT;

-- ====================================================================================================
-- FILE 15: v12-g7-this-or-that.sql
-- ====================================================================================================
-- v12-g7-this-or-that.sql  (V12 run, agent G7, SYSTEM.md 5.3)
--
-- WHAT
--   1. duel_vote_guard        new table: one row per (voter hash, question, pair, UTC day).
--   2. duel_votes_question_pair_idx   new index on the existing duel_votes (pair lookups).
--   3. duel_cast_song_vote()  new function: the only write path of the This or that
--                             bonus card. Validates the pair, enforces one vote per
--                             pair per voter per day and a daily cap, inserts ONE row
--                             in duel_votes, returns the real split of the pair.
--   4. duel_song_rankings     new table: the nightly Bradley-Terry ranking of a group's
--                             songs with the weekly movement (written by
--                             /api/cron/fans-picked, read by /api/duel/fans-picked).
--
-- WHY
--   The quiz results bonus card and the "<Fandom> picked" section reuse duel_questions /
--   duel_votes (migrations 067 / 068). They had no per-day voter rule, no server-side
--   pair validation for songs, and no ranking table with weekly movement.
--
-- EXISTING DATA
--   duel_questions, duel_votes (75,191 rows on 2026-10-02) and duel_ratings are NOT
--   altered, rewritten, cleaned or dropped. No column is added to them. The only
--   statement that touches an existing table is `create index if not exists` on
--   duel_votes (no rewrite; 75k rows, well under a second). cast_duel_vote() (068) is
--   left as it is.
--
-- ROWS
--   0 rows inserted, updated or deleted by this file. Two empty tables are created.
--
-- UNTIL APPLIED
--   /api/duel/pairs answers `pairs: []` (the bonus card does not render),
--   /api/duel/vote answers 503 not_live, /api/duel/fans-picked answers `ranked: false`,
--   /api/cron/fans-picked answers `ok: false, reason: not_applied`.
--
-- VERIFY (after applying)
--   select to_regclass('public.duel_vote_guard'), to_regclass('public.duel_song_rankings');   -- both not null
--   select proname, prosecdef from pg_proc where proname = 'duel_cast_song_vote';             -- 1 row, prosecdef = true
--   select has_function_privilege('anon', 'public.duel_cast_song_vote(uuid,uuid,uuid,uuid,text)', 'execute');  -- false
--   select count(*) from public.duel_votes;                                                   -- unchanged
--
-- UNDO
--   drop function if exists public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text);
--   drop table if exists public.duel_song_rankings;
--   drop table if exists public.duel_vote_guard;
--   drop index if exists public.duel_votes_question_pair_idx;
--   (votes cast through the function stay in duel_votes: they are real votes.)
--
-- Idempotent: safe to run twice.

begin;

-- ---------------------------------------------------------------------------
-- 1. duel_vote_guard: "one vote per pair per voter per day"
-- ---------------------------------------------------------------------------
-- voter_hash is an HMAC of the voter's id made by the server (lib/duel/token.ts).
-- No IP, no user id, no user agent is stored. pair_key is
-- least(a, b) || '|' || greatest(a, b) on the uuids, so A-B and B-A are one pair.
-- Rows older than two days are deleted by the nightly cron.
create table if not exists public.duel_vote_guard (
  voter_hash  text not null,
  question_id uuid not null references public.duel_questions(id) on delete cascade,
  pair_key    text not null,
  vote_day    date not null,
  created_at  timestamptz not null default now(),
  primary key (voter_hash, question_id, pair_key, vote_day)
);

create index if not exists duel_vote_guard_voter_day_idx
  on public.duel_vote_guard (voter_hash, vote_day);
create index if not exists duel_vote_guard_day_idx
  on public.duel_vote_guard (vote_day);

-- Service role only: RLS on, no policy.
alter table public.duel_vote_guard enable row level security;

-- ---------------------------------------------------------------------------
-- 2. pair lookups on the vote log (the split of one pair)
-- ---------------------------------------------------------------------------
create index if not exists duel_votes_question_pair_idx
  on public.duel_votes (question_id, option_a_id, option_b_id);

-- ---------------------------------------------------------------------------
-- 3. duel_cast_song_vote
-- ---------------------------------------------------------------------------
-- status: ok | already_voted | rate_limited | bad_pair | bad_question | bad_voter
-- votes_a / votes_b: votes of the pair (either order) won by option a / option b,
-- the new vote included. Null when the request was refused before the pair was read.
create or replace function public.duel_cast_song_vote(
  p_question_id  uuid,
  p_option_a_id  uuid,
  p_option_b_id  uuid,
  p_winner_id    uuid,
  p_voter_hash   text
)
returns table (status text, votes_a int, votes_b int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day    date := (now() at time zone 'utc')::date;
  v_key    text;
  v_status text := 'ok';
  v_today  int;
  v_rows   int;
  -- votes one voter hash may cast in a day, all questions together
  c_daily_cap constant int := 200;
begin
  if p_voter_hash is null or length(p_voter_hash) < 16 or length(p_voter_hash) > 64 then
    return query select 'bad_voter'::text, null::int, null::int;
    return;
  end if;

  if p_question_id is null or p_option_a_id is null or p_option_b_id is null or p_winner_id is null
     or p_option_a_id = p_option_b_id
     or (p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id) then
    return query select 'bad_pair'::text, null::int, null::int;
    return;
  end if;

  -- Songs only: never a member against a member, never a group against a group.
  if not exists (
    select 1 from public.duel_questions q
    where q.id = p_question_id and q.is_active and q.entity_kind = 'song'
  ) then
    return query select 'bad_question'::text, null::int, null::int;
    return;
  end if;

  -- Both songs must belong to the question.
  if (
    select count(*) from public.duel_ratings r
    where r.question_id = p_question_id and r.entity_id in (p_option_a_id, p_option_b_id)
  ) <> 2 then
    return query select 'bad_pair'::text, null::int, null::int;
    return;
  end if;

  v_key := least(p_option_a_id, p_option_b_id)::text || '|' || greatest(p_option_a_id, p_option_b_id)::text;

  select count(*) into v_today
  from public.duel_vote_guard g
  where g.voter_hash = p_voter_hash and g.vote_day = v_day;

  if v_today >= c_daily_cap then
    v_status := 'rate_limited';
  else
    -- The primary key makes this atomic: two concurrent votes on the same pair by
    -- the same voter insert one guard row, so one vote.
    insert into public.duel_vote_guard (voter_hash, question_id, pair_key, vote_day)
    values (p_voter_hash, p_question_id, v_key, v_day)
    on conflict do nothing;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      v_status := 'already_voted';
    else
      insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
      values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);
    end if;
  end if;

  return query
    select v_status,
           (count(*) filter (where v.winner_id = p_option_a_id))::int,
           (count(*) filter (where v.winner_id = p_option_b_id))::int
    from public.duel_votes v
    where v.question_id = p_question_id
      and ((v.option_a_id = p_option_a_id and v.option_b_id = p_option_b_id)
        or (v.option_a_id = p_option_b_id and v.option_b_id = p_option_a_id));
end;
$$;

-- Only the server (service role) may call it: the route checks the signed pair
-- token first. A direct call with the anon key is refused.
revoke all on function public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text) from public;
revoke all on function public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text) from anon, authenticated;
grant execute on function public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. duel_song_rankings: the nightly ranking
-- ---------------------------------------------------------------------------
-- One row per song of a question, replaced every night.
--   rank                1 = first, null = not ranked (fewer than 5 comparisons)
--   prev_rank           rank computed from the votes older than 7 days, null = none
--   movement            prev_rank - rank (positive = went up), null = none
--   strength            Bradley-Terry strength (1 = an average song)
--   votes / wins        counted votes this song took part in / won
--   question_votes      counted votes on the whole question (the group's vote count)
--   question_votes_prev the same, 7 days ago
create table if not exists public.duel_song_rankings (
  question_id         uuid not null references public.duel_questions(id) on delete cascade,
  entity_id           uuid not null,
  group_slug          text not null,
  rank                int,
  prev_rank           int,
  movement            int,
  strength            numeric not null,
  votes               int not null default 0,
  wins                int not null default 0,
  question_votes      int not null default 0,
  question_votes_prev int not null default 0,
  computed_at         timestamptz not null default now(),
  primary key (question_id, entity_id)
);

create index if not exists duel_song_rankings_group_rank_idx
  on public.duel_song_rankings (group_slug, rank);

-- Read and written by the server only (service role): RLS on, no policy.
alter table public.duel_song_rankings enable row level security;

commit;

-- ====================================================================================================
-- FILE 16: v12-g7-song-questions.sql
-- ====================================================================================================
-- v12-g7-song-questions.sql  (V12 run, agent G7, SYSTEM.md 5.3)
--
-- WHAT
--   Data only. Gives every group that has enough songs in the catalogue a song
--   question for the This or that bonus card and the "<Fandom> picked" ranking:
--     duel_questions  one row per group: (group_slug, 'songs'), entity_kind 'song',
--                     prompt 'Best <group> song?', min_votes 100.
--     duel_ratings    the songs of that question: the group's 16 most played songs
--                     on Deezer (songs.deezer_rank), one row per title, taken from the
--                     `songs` catalogue. entity_id = songs.id, entity_name = the title,
--                     entity_image = the Deezer cover.
--
-- WHY
--   Only aespa, BLACKPINK and BTS have a song question today (seeded in June from
--   the old This or that items). Without this file the bonus card shows on the
--   quizzes of those three groups only.
--
-- RULES
--   A group gets a question only if it has 8 or more distinct active song titles
--   with a Deezer cover. The hidden quarantine group (zzz-*) and the general-kpop
--   bucket get none. Groups that already have a (group_slug, 'songs') question are
--   left exactly as they are: their question, their songs, their votes.
--   min_votes 100: see lib/duel/fans-picked.ts (about 12 comparisons per song).
--
-- ROWS (counted on production on 2026-10-02, read only)
--   duel_questions  +77   (20 before)
--   duel_ratings    +1,201 (360 before): 67 groups with 16 songs, 3 with 15, 1 with 14,
--                   3 with 13, 2 with 11, 1 with 9.
--   The counts move if the catalogue changes before this file is applied (G2 adds
--   songs in this run): the VERIFY query prints the real ones.
--   duel_votes: untouched. No existing row of any table is updated or deleted.
--
-- ORDER
--   Independent of v12-g7-this-or-that.sql. Until both are applied the card stays
--   hidden for the new groups.
--
-- VERIFY (after applying)
--   select count(*) from public.duel_questions where question_type = 'songs';                  -- 80 expected
--   select q.group_slug, count(*) from public.duel_ratings r
--     join public.duel_questions q on q.id = r.question_id
--     where q.question_type = 'songs' group by 1 order by 2, 1;                               -- 8 to 16 per group
--   select count(*) from public.duel_votes;                                                   -- unchanged
--
-- UNDO (removes only what this file added; the three older questions have ratings
-- whose entity_id is not a songs.id and are not matched)
--   delete from public.duel_questions q
--   where q.question_type = 'songs' and q.min_votes = 100
--     and not exists (select 1 from public.duel_votes v where v.question_id = q.id)
--     and not exists (select 1 from public.duel_ratings r where r.question_id = q.id
--                     and not exists (select 1 from public.songs s where s.id = r.entity_id));
--   (duel_ratings rows go with their question: on delete cascade. A question that
--   already received votes is kept on purpose: votes are never dropped.)
--
-- Idempotent: a second run inserts nothing (the questions exist, so no rating is added).

begin;

with uniq as (
  -- one row per (group, title): the most played version of a title
  select distinct on (s.group_id, lower(btrim(s.title)))
         s.group_id, s.id, s.title, s.album_cover_big, s.deezer_rank
  from public.songs s
  where s.status = 'active'
    and s.group_id is not null
    and s.album_cover_big like 'https://cdn-images.dzcdn.net/%'
  order by s.group_id, lower(btrim(s.title)), s.deezer_rank desc nulls last, s.id
),
top as (
  select u.group_id, u.id, u.title, u.album_cover_big,
         row_number() over (partition by u.group_id order by u.deezer_rank desc nulls last, u.id) as rn,
         count(*) over (partition by u.group_id) as n
  from uniq u
),
new_q as (
  insert into public.duel_questions (group_slug, question_type, prompt, entity_kind, min_votes, is_active)
  select g.slug, 'songs', 'Best ' || g.name || ' song?', 'song', 100, true
  from public.groups g
  where g.slug not like 'zzz-%'
    and g.slug <> 'general-kpop'
    and exists (select 1 from top t where t.group_id = g.id and t.n >= 8)
  on conflict (group_slug, question_type) do nothing
  returning id, group_slug
)
insert into public.duel_ratings (question_id, entity_id, entity_name, entity_image)
select q.id, t.id, t.title, t.album_cover_big
from new_q q
join public.groups g on g.slug = q.group_slug
join top t on t.group_id = g.id and t.rn <= 16
on conflict (question_id, entity_id) do nothing;

commit;

-- ====================================================================================================
-- FILE 17: v12-g8-share-link-plays.sql
-- ====================================================================================================
-- v12-g8-share-link-plays.sql  (V12 run, agent G8 Group hub + creators). NOT APPLIED.
--
-- WHAT
--   1. Table  public.share_link_plays   one row per play that came through a
--                                       creator's tracked share link (/s/<code>):
--                                       one per link, player and UTC day.
--
-- WHY
--   The share kit (SYSTEM.md 5.4) shows "N plays from your link". Today the site
--   records a CLICK on a share link (dev_share_links.click_count, dev_share_clicks)
--   but nothing ties a PLAY to the link it came from, so the number does not exist.
--   Rule 7 of the run: a number that does not exist is hidden. The kit shows the
--   line only once this table exists and the two write-side calls of
--   run/requests/G8.md (R1, R2) are in.
--
-- ROWS
--   None written by this file. No backfill (past plays cannot be attributed), no
--   change to an existing table, row, policy or function.
--
-- WHAT IT UNLOCKS
--   GET /api/creators/kit answers `linkPlays: <number>` instead of `null`, and the
--   share kit shows the live line. recordLinkPlay() (lib/creators/link-plays.ts)
--   starts storing rows (it answers 'not_live' and writes nothing until then).
--
-- SAFETY
--   Additive only. RLS is on and there is NO policy: anon and authenticated can
--   neither read nor write; every access goes through the service role
--   (app/api/creators/kit after the session check, the play route through
--   recordLinkPlay). No personal data: player_key is a truncated SHA-256 of the
--   account id or of the random per-browser id, never the id itself; no IP, no
--   user agent. is_test is set by the server (true unless VERCEL_ENV is
--   'production'): the dev server and the previews use this same database and
--   must never count. share_code is plain text on purpose (no foreign key), so
--   this file does not depend on the type of dev_share_links.id.
--
-- ORDER
--   Independent of every other v12 file.
--
-- VERIFY (read only, after apply)
--   select count(*) from public.share_link_plays;                                        -- 0
--   select relrowsecurity from pg_class where oid = 'public.share_link_plays'::regclass; -- t
--   select count(*) from pg_policies where tablename = 'share_link_plays';               -- 0
--   select has_table_privilege('anon', 'public.share_link_plays', 'select'),
--          has_table_privilege('authenticated', 'public.share_link_plays', 'insert');    -- f, f
--
-- UNDO
--   BEGIN;
--   DROP TABLE IF EXISTS public.share_link_plays;
--   COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS public.share_link_plays (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_code  text NOT NULL,                                   -- dev_share_links.share_code
  quiz_id     uuid NOT NULL,                                   -- the quiz the link opens
  player_key  text NOT NULL,                                   -- sha256(account or browser id), 32 hex
  played_on   date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  is_test     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT share_link_plays_code_chk CHECK (char_length(share_code) BETWEEN 4 AND 32),
  CONSTRAINT share_link_plays_key_chk CHECK (char_length(player_key) = 32),
  CONSTRAINT share_link_plays_once UNIQUE (share_code, player_key, played_on)
);

COMMENT ON TABLE public.share_link_plays IS 'V12: one row per play that came through a creator share link (/s/<code>), once per link, player and UTC day. Service role only. is_test rows never count.';

CREATE INDEX IF NOT EXISTS share_link_plays_quiz_idx ON public.share_link_plays (quiz_id);

ALTER TABLE public.share_link_plays ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: with RLS on and no policy, anon and authenticated see and
-- write nothing. The service role bypasses RLS.
REVOKE ALL ON TABLE public.share_link_plays FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.share_link_plays TO service_role;

COMMIT;

-- ====================================================================================================
-- FILE 18: v12-g9-editorial.sql
-- ====================================================================================================
-- v12-g9-editorial.sql  (V12 run, agent G9 Editorial seeding). NOT APPLIED.
--
-- WHAT
--   1. Table  public.editorial_accounts   which auth users are editorial (team) accounts
--                                         (user_id, display_name, beat, active). SYSTEM.md 5.6.
--   2. Table  public.editorial_drafts     the review pipeline, columns exactly as SYSTEM.md 5.6
--                                         (id, account_id, kind, group_id, title, body, options,
--                                         sources, scheduled_at, status, created_by, reviewed_by,
--                                         reviewed_at, published_ref) plus four working columns
--                                         (debate_days, template_key, published_at, created_at /
--                                         updated_at) the publisher rules need.
--   3. Table  public.editorial_posts      the published threads and blogs of editorial accounts.
--                                         Fan debates already have a store (community_debates,
--                                         v11-p8-community.sql); threads and blogs do not have a
--                                         public one outside the Verse, so they get this table.
--   4. Func   public.is_editorial(uuid)   true for an ACTIVE editorial account. For the boards,
--                                         counts and XP paths that must leave them out.
--   5. Two CHECK constraints widened (community_likes.target_type, community_replies.target_type)
--      to accept 'editorial', so fans can like and reply to an editorial thread or blog through
--      the stores the community already uses. Skipped without error when v11-p8-community.sql
--      has not been applied (the tables do not exist yet); rerun this file after applying it.
--
-- WHY
--   The community must not look empty at launch (SYSTEM.md 5.6). A few named team accounts open
--   topics, debates and blogs on a schedule; the owner checks every item in /admin/editorial; a
--   cron publishes what is approved and due. Fans reply, vote and like.
--
-- ROWS
--   None. No row is inserted, updated or deleted by this file, in any table. The account rows are
--   inserted by the owner with v12-g9-editorial-accounts.sql, from ids he creates himself.
--   No existing table is changed except the two CHECK constraints of item 5 (widened only: every
--   row that passed before still passes).
--
-- WHAT IT UNLOCKS
--   /admin/editorial shows its queue instead of the "not applied yet" line, the admin routes
--   /api/admin/editorial start writing drafts, the cron /api/cron/editorial-publish starts
--   publishing approved drafts, and the Team badge shows wherever an editorial account is named.
--   All of it also needs NEXT_PUBLIC_UX_V12=1 (and NEXT_PUBLIC_UX_V1=1) at build. Until then
--   every one of those answers 404 or does nothing.
--
-- SAFETY
--   Idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS before ADD). RLS on the
--   three tables. editorial_accounts and editorial_drafts have NO policy: anon and authenticated
--   read and write nothing; the service role writes, and an admin reads through the server after
--   the app's admin gate (lib/admin.ts isAdmin, the same gate as every /admin page). The public
--   reads only visible editorial_posts. Nothing publishes without a reviewer: a CHECK refuses an
--   approved or published draft whose reviewed_by is null.
--
-- VERIFY (read only, after applying)
--   SELECT to_regclass('public.editorial_accounts'), to_regclass('public.editorial_drafts'),
--          to_regclass('public.editorial_posts');                       -- three names, no null
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('editorial_accounts','editorial_drafts','editorial_posts');  -- all true
--   SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'editorial_%';
--                                                -- one row: editorial_posts_public_read
--   SELECT public.is_editorial('00000000-0000-0000-0000-000000000000');  -- false
--   SELECT count(*) FROM public.editorial_accounts;                      -- 0 until the accounts file
--
-- UNDO (drops the three tables and their rows, restores the two CHECKs; touches nothing else)
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.is_editorial(uuid);
--   DROP TABLE IF EXISTS public.editorial_posts;
--   DROP TABLE IF EXISTS public.editorial_drafts;
--   DROP TABLE IF EXISTS public.editorial_accounts;
--   -- only if no 'editorial' row exists in them (DELETE those rows first otherwise):
--   ALTER TABLE public.community_likes DROP CONSTRAINT IF EXISTS community_likes_target_type_check;
--   ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_target_type_check
--     CHECK (target_type IN ('thread','daily_debate','debate','challenge','comment','debate_vote','reply'));
--   ALTER TABLE public.community_replies DROP CONSTRAINT IF EXISTS community_replies_target_type_check;
--   ALTER TABLE public.community_replies ADD CONSTRAINT community_replies_target_type_check
--     CHECK (target_type IN ('debate','challenge'));
--   COMMIT;
--   NOTIFY pgrst, 'reload schema';

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. editorial_accounts
--    One row per team account. The auth user is created by the owner (normal
--    sign-up or the Supabase dashboard). No agent creates one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_accounts (
  user_id      uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 40),
  beat         text NOT NULL CHECK (char_length(btrim(beat)) BETWEEN 1 AND 80),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.editorial_accounts IS 'V12: editorial (team) accounts. They always show the Team badge and never act as fans. Rows inserted by the owner.';
ALTER TABLE public.editorial_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.editorial_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.editorial_accounts TO service_role;
-- (no policy: service role only; the app reads the active ids server side)

-- ---------------------------------------------------------------------------
-- 2. editorial_drafts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_drafts (
  id            bigserial PRIMARY KEY,
  account_id    uuid NOT NULL REFERENCES public.editorial_accounts (user_id) ON DELETE RESTRICT,
  kind          text NOT NULL CHECK (kind IN ('thread','debate','blog')),
  group_id      integer REFERENCES public.groups (id) ON DELETE SET NULL,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  body          text NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  options       jsonb,                                   -- a debate: array of 2 to 4 labels; null otherwise
  sources       jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ "label": text, "url": text | null }]
  scheduled_at  timestamptz,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','rejected')),
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,   -- null = made by a template
  reviewed_by   uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  published_ref text,                                    -- 'debate:<community_debates.id>' or 'post:<editorial_posts.id>'
  -- working columns (not in SYSTEM.md 5.6):
  debate_days   smallint CHECK (debate_days IS NULL OR debate_days IN (1, 3, 7)),
  template_key  text,                                    -- 'weekly_recap:2026-09-28', 'comeback:412': one draft per key
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editorial_drafts_options_chk CHECK (
    (kind = 'debate' AND options IS NOT NULL AND jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 4)
    OR (kind <> 'debate' AND options IS NULL)
  ),
  CONSTRAINT editorial_drafts_sources_chk CHECK (jsonb_typeof(sources) = 'array'),
  -- Nothing is approved or published without a reviewer and a review time.
  CONSTRAINT editorial_drafts_reviewed_chk CHECK (
    status IN ('draft','rejected') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  -- An approved draft has its date; a published one has its reference and time.
  CONSTRAINT editorial_drafts_schedule_chk CHECK (status <> 'approved' OR scheduled_at IS NOT NULL),
  CONSTRAINT editorial_drafts_published_chk CHECK (status <> 'published' OR (published_ref IS NOT NULL AND published_at IS NOT NULL))
);
COMMENT ON TABLE public.editorial_drafts IS 'V12: editorial review pipeline (draft, approved, published, rejected). Service role writes; admins read through the server.';
CREATE INDEX IF NOT EXISTS editorial_drafts_due_idx ON public.editorial_drafts (scheduled_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS editorial_drafts_published_idx ON public.editorial_drafts (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS editorial_drafts_status_idx ON public.editorial_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS editorial_drafts_account_idx ON public.editorial_drafts (account_id);
CREATE UNIQUE INDEX IF NOT EXISTS editorial_drafts_template_key_uq ON public.editorial_drafts (template_key) WHERE template_key IS NOT NULL;
ALTER TABLE public.editorial_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.editorial_drafts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.editorial_drafts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.editorial_drafts_id_seq TO service_role;
-- (no policy: service role only)

-- ---------------------------------------------------------------------------
-- 3. editorial_posts: published editorial threads and blogs.
--    Plain text body (paragraphs split on blank lines), sources listed under it.
--    One post per draft (draft_id unique): a retried publish can never post twice.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_posts (
  id         bigserial PRIMARY KEY,
  draft_id   bigint UNIQUE REFERENCES public.editorial_drafts (id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (kind IN ('thread','blog')),
  group_id   integer REFERENCES public.groups (id) ON DELETE SET NULL,
  author     uuid REFERENCES public.editorial_accounts (user_id) ON DELETE SET NULL,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  body       text NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  sources    jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sources) = 'array'),
  status     text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.editorial_posts IS 'V12: threads and blogs published by editorial accounts, after an admin review. Written only by the publisher (service role).';
CREATE INDEX IF NOT EXISTS editorial_posts_feed_idx ON public.editorial_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS editorial_posts_group_idx ON public.editorial_posts (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS editorial_posts_author_idx ON public.editorial_posts (author);
ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS editorial_posts_public_read ON public.editorial_posts;
CREATE POLICY editorial_posts_public_read ON public.editorial_posts FOR SELECT TO anon, authenticated USING (status = 'visible');
REVOKE ALL ON TABLE public.editorial_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.editorial_posts TO anon, authenticated;
GRANT ALL ON TABLE public.editorial_posts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.editorial_posts_id_seq TO service_role;

-- ---------------------------------------------------------------------------
-- 4. is_editorial(uuid): true for an active editorial account.
--    SECURITY DEFINER so a board or count that runs as the caller can exclude
--    them without reading the (closed) table. It answers one boolean and
--    nothing else. search_path pinned.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_editorial(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.editorial_accounts a WHERE a.user_id = uid AND a.active);
$$;
COMMENT ON FUNCTION public.is_editorial(uuid) IS 'V12: true when the user is an active editorial (team) account. Use it to leave them out of boards, fan counts and XP.';
REVOKE ALL ON FUNCTION public.is_editorial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_editorial(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Likes and replies on an editorial thread or blog use the community stores.
--    target_type 'editorial', target_id = editorial_posts.id. Widening only.
--    Skipped when v11-p8-community.sql is not applied yet.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.community_likes') IS NOT NULL THEN
    ALTER TABLE public.community_likes DROP CONSTRAINT IF EXISTS community_likes_target_type_check;
    ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_target_type_check
      CHECK (target_type IN ('thread','daily_debate','debate','challenge','comment','debate_vote','reply','editorial'));
  ELSE
    RAISE NOTICE 'community_likes does not exist: apply v11-p8-community.sql, then rerun this file (hearts on editorial posts stay hidden until then).';
  END IF;
  IF to_regclass('public.community_replies') IS NOT NULL THEN
    ALTER TABLE public.community_replies DROP CONSTRAINT IF EXISTS community_replies_target_type_check;
    ALTER TABLE public.community_replies ADD CONSTRAINT community_replies_target_type_check
      CHECK (target_type IN ('debate','challenge','editorial'));
  ELSE
    RAISE NOTICE 'community_replies does not exist: apply v11-p8-community.sql, then rerun this file (replies on editorial posts stay closed until then).';
  END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ====================================================================================================
-- VERIFICATION GRID (read only). One row per check: file, check, expected, actual, ok.
-- File 9 reads less than 41 until the filtered file 6 is applied and file 9 is run again.
-- ====================================================================================================
SELECT file, check_name, expected, actual,
       CASE WHEN expected LIKE '>= %' THEN actual::bigint >= substring(expected from 4)::bigint
            ELSE actual = expected END AS ok
FROM (VALUES
  (1,  'bt_runs exists, RLS on, empty, no policy',
       'true/0/0', (SELECT relrowsecurity::text FROM pg_class WHERE oid = to_regclass('public.bt_runs')) || '/' || (SELECT count(*) FROM public.bt_runs)::text || '/' || (SELECT count(*) FROM pg_policies WHERE tablename = 'bt_runs')::text),
  (1,  'bt_song_stats view, security_invoker',
       'true', (SELECT coalesce(array_to_string(reloptions, ','), '') LIKE '%security_invoker=true%' FROM pg_class WHERE oid = to_regclass('public.bt_song_stats'))::text),
  (1,  'bt_bump_song_plays: anon no, service_role yes',
       'false/true', has_function_privilege('anon', 'public.bt_bump_song_plays(uuid[])', 'execute')::text || '/' || has_function_privilege('service_role', 'public.bt_bump_song_plays(uuid[])', 'execute')::text),
  (2,  'bt_fans_today exists',
       'true', (to_regprocedure('public.bt_fans_today()') IS NOT NULL)::text),
  (3,  'quiz_score_stats view exists',
       'true', (to_regclass('public.quiz_score_stats') IS NOT NULL)::text),
  (4,  'groups RESCENE and NCT WISH',
       '2', (SELECT count(*) FROM public.groups WHERE slug IN ('rescene', 'nct-wish'))::text),
  (5,  'file 5 songs present',
       '20', (SELECT count(*) FROM public.songs WHERE deezer_track_id IN (3882940861, 3188858021, 3188858011, 3561319281, 3937976471, 3188858041, 3937976491, 3188858061, 3561319291, 3937976521, 2966352091, 3211215061, 3426703371, 2966352111, 3651343562, 3622618822, 2722856182, 2682281622, 3211215051, 2966352081))::text),
  (7,  'file 7: the 95 corrected years (its 3 other rows are set to NULL)',
       '95', (SELECT count(*) FROM public.songs s JOIN (VALUES (3953618771,2026), (3315036911,2025), (4048845611,2026), (3616742702,2025), (3758369882,2026), (4048845571,2026), (3994187961,2026), (3323050681,2025), (4167424952,2026), (3976692951,2026), (3487140241,2025), (4063736061,2026), (3976692941,2026), (3391965331,2025), (4063736091,2026), (3976692931,2026), (3595814332,2025), (3953618761,2026), (4183906482,2026), (3600774572,2025), (2480160341,2023), (3293899871,2025), (4087604431,2026), (3135697471,2024), (4048845601,2026), (3293899911,2025), (3827175291,2026), (3758369842,2026), (3473951211,2025), (3337521651,2025), (4087604451,2026), (4063736101,2026), (3315036921,2025), (3861932031,2026), (3758369872,2026), (3514913031,2025), (2503980621,2023), (3948103531,2026), (3323050691,2025), (3863988651,2026), (3391965351,2025), (3514912991,2025), (3293899881,2025), (4157164272,2026), (3827375541,2026), (3976692981,2026), (3514913001,2025), (4121008511,2026), (3976692961,2026), (3660524502,2025), (3758369862,2026), (4178804282,2026), (4048845591,2026), (4089668491,2026), (2533931101,2023), (3570119161,2025), (3313211751,2025), (3946155671,2026), (3616742712,2025), (3047609601,2024), (3994187941,2026), (3994187931,2026), (4063736081,2026), (3994187951,2026), (3324968701,2025), (3135697521,2024), (3875168411,2026), (4048845581,2026), (2533931091,2023), (3946155651,2026), (3395330901,2025), (2533931111,2023), (3391965341,2025), (3946155661,2026), (3337521611,2025), (4087604471,2026), (3994187911,2026), (3758369852,2026), (4087604461,2026), (4157164282,2026), (3315036901,2025), (2317353675,2023), (3391965361,2025), (2503980631,2023), (4087604441,2026), (3616742692,2025), (4063736051,2026), (3315036931,2025), (3964491871,2026), (3315036941,2025), (3135697481,2024), (3293899901,2025), (3616742682,2025), (4131564511,2026), (3616742732,2025)) v(d, y) ON s.deezer_track_id = v.d AND s.year = v.y)::text),
  (9,  'file 9 title tracks flagged (41 after file 6 and a re-run of file 9; fewer before)',
       '41', (SELECT count(*) FROM public.songs WHERE is_title_track AND deezer_track_id IN (3234208281, 3407280351, 3570464781, 3827375541, 4087604431, 3188858011, 3561319281, 3937976471, 2722856182, 2966352091, 3211215061, 3426703371, 3622618822, 3651343562, 2671407212, 2842874062, 2990968051, 3293899871, 3514912991, 3946155661, 4089668491, 4131564511, 4232461262, 4204153972, 4103855641, 4027935751, 4149903382, 3986645071, 4204204872, 4178965332, 4090868561, 4208809742, 4258718131, 4143495621, 4051286221, 4285321022, 4049214851, 4157622882, 4018650521, 3920191761, 4223440872))::text),
  (10, 'file 10 soundtrack rows',
       '10', (SELECT count(*) FROM public.songs WHERE status = 'soundtrack' AND deezer_track_id IN (3412534551, 3412534561, 3412534581, 3412534601, 3412534611, 3412534621, 3412534631, 3541756631, 3412534641, 3412534651))::text),
  (10, 'soundtrack rows never curated or grouped',
       '0', (SELECT count(*) FROM public.songs WHERE status = 'soundtrack' AND (group_id IS NOT NULL OR is_curated))::text),
  (11, 'no language ko left',
       '0', (SELECT count(*) FROM public.songs WHERE language = 'ko')::text),
  (12, 'live tables exist, RLS on',
       '3', (SELECT count(*) FROM pg_class WHERE oid IN (to_regclass('public.live_rooms'), to_regclass('public.live_players'), to_regclass('public.live_answers')) AND relrowsecurity)::text),
  (14, 'name_all new columns',
       '2', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'name_all_member_results' AND column_name IN ('found_order', 'round_seconds'))::text),
  (14, 'name_all_round_stats: anon no',
       'false', has_function_privilege('anon', 'public.name_all_round_stats(integer)', 'execute')::text),
  (15, 'duel tables exist',
       'true', (to_regclass('public.duel_vote_guard') IS NOT NULL AND to_regclass('public.duel_song_rankings') IS NOT NULL)::text),
  (15, 'duel_cast_song_vote: security definer, anon no',
       'true/false', (SELECT bool_and(prosecdef)::text FROM pg_proc WHERE proname = 'duel_cast_song_vote') || '/' || has_function_privilege('anon', 'public.duel_cast_song_vote(uuid,uuid,uuid,uuid,text)', 'execute')::text),
  (15, 'duel_votes unchanged (75,191 on 2026-10-02 plus real votes since)',
       '>= 75191', (SELECT count(*) FROM public.duel_votes)::text),
  (16, 'song questions',
       '80', (SELECT count(*) FROM public.duel_questions WHERE question_type = 'songs')::text),
  (17, 'share_link_plays exists, RLS on, empty',
       'true/0', (SELECT relrowsecurity::text FROM pg_class WHERE oid = to_regclass('public.share_link_plays')) || '/' || (SELECT count(*) FROM public.share_link_plays)::text),
  (18, 'editorial tables with RLS',
       '3', (SELECT count(*) FROM pg_class WHERE oid IN (to_regclass('public.editorial_accounts'), to_regclass('public.editorial_drafts'), to_regclass('public.editorial_posts')) AND relrowsecurity)::text),
  (18, 'is_editorial on a random id',
       'false', public.is_editorial('00000000-0000-0000-0000-000000000000')::text),
  (18, 'no editorial account yet (file 19 later)',
       '0', (SELECT count(*) FROM public.editorial_accounts)::text)
) AS g(file, check_name, expected, actual)
ORDER BY file;
