-- v11 P7: ranked blindtest engine (DESIGN-SPEC 15.4 + 17.6). OWNER APPLIES THIS BY HAND.
--
-- NOTE (one paragraph). Ranked has never been live (ranked_plays = 0 rows, bt_players = 0 rows,
-- measured 2026-09-25). This file adds what the server-side engine in apps/quiz/src/lib/ranked
-- needs and nothing else: a seasons table (ranked goes live only when the owner inserts
-- season 1, see the commented INSERT at the end), a server-private runs table that holds the
-- drawn songs, the correct options and the server timestamps of every round (the run token is
-- its primary key: single use, checked by status + an optimistic step counter), per-song ranked
-- accuracy stats (the draw uses them once a song has 20 answers, the curated songs.tier before
-- that: `songs` has no accuracy columns today), a Legend table filled nightly, two nullable
-- columns and two indexes on ranked_plays (season and run_token; a unique index on run_token and
-- the (player_id, season, score desc) index; `score` holds the run POINTS, `correct_count`
-- already holds the right answers),
-- and eight functions (issue, finalize, standings, player standing, ladder, legends, season
-- roll, nightly) callable by service_role only. Additive only: CREATE TABLE / ADD COLUMN NULL /
-- CREATE INDEX / CREATE FUNCTION; no DROP, no RENAME, no type change, no backfill, no change to
-- any existing RLS policy or RPC. Every new table has RLS on and NO policy, so anon and
-- authenticated can neither read nor write them (the API uses the service role). The nightly
-- job is documented at the end and NOT enabled. Until this file is applied, every
-- /api/ranked/* route answers 503 {"ranked":"not_live"} after a read-only probe.
--
-- OWNER DECISION flagged, not done here (it would change an existing RLS policy): since mig 059
-- ranked_plays has `ranked_plays_insert ... WITH CHECK (true)` for PUBLIC, so anyone with the
-- anon key can insert a forged ranked_plays row. The engine never trusts ranked_plays for
-- scores (it reads ranked_runs, service-role only), but any other reader of ranked_plays should
-- join ranked_runs, or the owner should replace that policy with a service-role-only insert.

BEGIN;

-- 1. Seasons ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranked_seasons (
  id                 smallint PRIMARY KEY CHECK (id > 0),
  starts_at          timestamptz NOT NULL,
  ends_at            timestamptz NOT NULL,
  legend_computed_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ranked_seasons_window CHECK (ends_at > starts_at)
);
ALTER TABLE public.ranked_seasons ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ranked_seasons IS
  'Ranked seasons, 8 weeks, back to back. Ranked is live while a row covers now(). Service role only (RLS on, no policy).';

-- 2. Runs (the run token) -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranked_runs (
  token         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season        smallint NOT NULL REFERENCES public.ranked_seasons(id),
  status        text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'submitted', 'quit')),
  rounds        jsonb NOT NULL,
  answers       jsonb NOT NULL DEFAULT '[]'::jsonb,
  step          integer NOT NULL DEFAULT 0,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  finished_at   timestamptz,
  points        integer CHECK (points IS NULL OR points >= 0),
  correct_count smallint,
  best_combo    smallint,
  avg_answer_ms integer,
  CONSTRAINT ranked_runs_finished CHECK ((status = 'issued') = (finished_at IS NULL))
);
CREATE INDEX IF NOT EXISTS ranked_runs_user_issued_idx ON public.ranked_runs (user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS ranked_runs_season_user_points_idx
  ON public.ranked_runs (season, user_id, points DESC) WHERE status IN ('submitted', 'quit');
CREATE INDEX IF NOT EXISTS ranked_runs_open_expiry_idx ON public.ranked_runs (expires_at) WHERE status = 'issued';
ALTER TABLE public.ranked_runs ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ranked_runs IS
  'One row per issued ranked run. rounds = server-private draw (songs, options, correct index); answers = server timestamps + locked answers. Authoritative for season scores. Service role only (RLS on, no policy).';

-- 3. Per-song ranked accuracy ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranked_song_stats (
  song_id       uuid PRIMARY KEY REFERENCES public.songs(id) ON DELETE CASCADE,
  times_played  integer NOT NULL DEFAULT 0 CHECK (times_played >= 0),
  times_correct integer NOT NULL DEFAULT 0 CHECK (times_correct >= 0 AND times_correct <= times_played),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ranked_song_stats ENABLE ROW LEVEL SECURITY;

-- 4. Legend (top 100 Masters, recomputed nightly) --------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranked_legends (
  season       smallint NOT NULL REFERENCES public.ranked_seasons(id),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position     smallint NOT NULL CHECK (position BETWEEN 1 AND 100),
  season_score integer NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season, user_id)
);
ALTER TABLE public.ranked_legends ENABLE ROW LEVEL SECURITY;

-- 5. ranked_plays: season, run token, index (additive, nullable) ------------------------------
ALTER TABLE public.ranked_plays ADD COLUMN IF NOT EXISTS season smallint;
ALTER TABLE public.ranked_plays
  ADD COLUMN IF NOT EXISTS run_token uuid REFERENCES public.ranked_runs(token) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ranked_plays_run_token_key ON public.ranked_plays (run_token);
CREATE INDEX IF NOT EXISTS ranked_plays_player_season_score_idx ON public.ranked_plays (player_id, season, score DESC);
COMMENT ON COLUMN public.ranked_plays.score IS
  'Ranked: run points ((100 + speed) x combo, server-computed). correct_count holds the right answers.';

-- 6. Functions (service_role only) --------------------------------------------------------------

-- Issue a run atomically: one open run per player, 15 started per UTC day.
CREATE OR REPLACE FUNCTION public.ranked_issue_run(
  p_user uuid, p_season smallint, p_rounds jsonb, p_day_start timestamptz,
  p_daily_limit integer, p_ttl_seconds integer)
RETURNS TABLE (issued_token uuid, runs_today integer, outcome text, expires_at timestamptz)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_token uuid;
  v_expires timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ranked_issue_run:' || p_user::text));
  IF EXISTS (SELECT 1 FROM public.ranked_runs r WHERE r.user_id = p_user AND r.status = 'issued') THEN
    RETURN QUERY SELECT NULL::uuid, NULL::integer, 'busy'::text, NULL::timestamptz;
    RETURN;
  END IF;
  SELECT count(*)::integer INTO v_count
    FROM public.ranked_runs r WHERE r.user_id = p_user AND r.issued_at >= p_day_start;
  IF v_count >= p_daily_limit THEN
    RETURN QUERY SELECT NULL::uuid, v_count, 'limit'::text, NULL::timestamptz;
    RETURN;
  END IF;
  INSERT INTO public.ranked_runs AS r (user_id, season, rounds, expires_at)
  VALUES (p_user, p_season, p_rounds, now() + make_interval(secs => p_ttl_seconds))
  RETURNING r.token, r.expires_at INTO v_token, v_expires;
  RETURN QUERY SELECT v_token, v_count + 1, 'ok'::text, v_expires;
END;
$$;

-- Close a run once (status issued -> submitted | quit) with the server-computed result, then
-- mirror it into ranked_plays and the song stats. Returns false when the run was already closed
-- (token replay) or does not belong to p_user. bt_players gets a bare row on the first finished
-- run (PHASE0 Q2: created on first submit, never backfilled).
CREATE OR REPLACE FUNCTION public.ranked_finalize_run(
  p_token uuid, p_user uuid, p_status text, p_answers jsonb,
  p_points integer, p_correct integer, p_best_combo integer, p_avg_answer_ms integer,
  p_song_results jsonb)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_run public.ranked_runs%ROWTYPE;
  v_player uuid;
BEGIN
  IF p_status NOT IN ('submitted', 'quit') THEN
    RAISE EXCEPTION 'ranked_finalize_run: invalid status %', p_status;
  END IF;
  UPDATE public.ranked_runs r
     SET status = p_status, answers = p_answers, points = p_points, correct_count = p_correct,
         best_combo = p_best_combo, avg_answer_ms = p_avg_answer_ms, finished_at = now(), step = r.step + 1
   WHERE r.token = p_token AND r.user_id = p_user AND r.status = 'issued'
  RETURNING r.* INTO v_run;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.bt_players (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT b.id INTO v_player FROM public.bt_players b WHERE b.user_id = p_user;

  INSERT INTO public.ranked_plays
    (player_id, score, correct_count, total_rounds, best_combo, avg_speed_ms, playlist, song_ids, played_at, season, run_token)
  VALUES (
    v_player, p_points, p_correct, jsonb_array_length(v_run.rounds), p_best_combo, p_avg_answer_ms,
    jsonb_build_object('mode', 'ranked', 'mix', jsonb_build_object('easy', 4, 'medium', 4, 'hard', 2)),
    ARRAY(SELECT (e.value->>'songId')::uuid FROM jsonb_array_elements(v_run.rounds) WITH ORDINALITY AS e(value, ord) ORDER BY e.ord),
    v_run.finished_at, v_run.season, v_run.token);

  INSERT INTO public.ranked_song_stats AS st (song_id, times_played, times_correct, updated_at)
  SELECT (e->>'song_id')::uuid, count(*)::integer, (count(*) FILTER (WHERE (e->>'correct')::boolean))::integer, now()
    FROM jsonb_array_elements(COALESCE(p_song_results, '[]'::jsonb)) AS e
   WHERE EXISTS (SELECT 1 FROM public.songs s WHERE s.id = (e->>'song_id')::uuid)
   GROUP BY 1
  ON CONFLICT (song_id) DO UPDATE
    SET times_played = st.times_played + EXCLUDED.times_played,
        times_correct = st.times_correct + EXCLUDED.times_correct,
        updated_at = now();
  RETURN true;
END;
$$;

-- The season ladder: placed players only (5 finished runs), season score = sum of the best 5
-- runs (equal points: the earlier run keeps its place), ordered by score, then average answer
-- time of the counted runs (right answers, weighted), then who reached the score first.
-- Banned accounts are left out. Mirrors lib/ranked/season.ts + ladder.ts.
CREATE OR REPLACE FUNCTION public.ranked_standings(p_season smallint)
RETURNS TABLE (user_id uuid, season_score integer, runs_total integer, avg_answer_ms integer,
               reached_at timestamptz, "position" bigint)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH finished AS (
    SELECT r.user_id, r.points, r.correct_count, r.avg_answer_ms, r.finished_at,
           row_number() OVER (PARTITION BY r.user_id ORDER BY r.points DESC, r.finished_at ASC, r.token ASC) AS rn,
           count(*) OVER (PARTITION BY r.user_id) AS n
      FROM public.ranked_runs r
     WHERE r.season = p_season AND r.status IN ('submitted', 'quit') AND r.points IS NOT NULL
       -- banned accounts are off the ladder (and out of Legend)
       AND NOT EXISTS (SELECT 1 FROM public.profiles bp WHERE bp.id = r.user_id AND bp.banned_at IS NOT NULL)
  ), best AS (
    SELECT f.user_id,
           sum(f.points)::integer AS season_score,
           max(f.n)::integer AS runs_total,
           round(sum(f.avg_answer_ms::numeric * f.correct_count) FILTER (WHERE f.avg_answer_ms IS NOT NULL)
                 / NULLIF(sum(f.correct_count) FILTER (WHERE f.avg_answer_ms IS NOT NULL), 0))::integer AS avg_answer_ms,
           max(f.finished_at) AS reached_at
      FROM finished f
     WHERE f.rn <= 5
     GROUP BY f.user_id
  )
  SELECT b.user_id, b.season_score, b.runs_total, b.avg_answer_ms, b.reached_at,
         row_number() OVER (ORDER BY b.season_score DESC, b.avg_answer_ms ASC NULLS LAST, b.reached_at ASC, b.user_id ASC)
    FROM best b
   WHERE b.runs_total >= 5;
$$;

-- One player's ladder position (NULL while placing) and the ladder size.
CREATE OR REPLACE FUNCTION public.ranked_player_standing(p_season smallint, p_user uuid)
RETURNS TABLE ("position" bigint, total bigint)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH s AS (SELECT * FROM public.ranked_standings(p_season))
  SELECT (SELECT s."position" FROM s WHERE s.user_id = p_user), (SELECT count(*) FROM s);
$$;

-- The ladder as the ranked page shows it: the top p_limit rows of a scope plus the asking
-- player's own row. Scopes: 'global'; 'fandom' = players whose ult_groups contain the asking
-- player's main fandom (profiles.ult_groups first slug); 'following' = the players the asking
-- player follows, plus themself. Returns only what /u/[username] already shows (username,
-- display name, avatar, name flair); never a user id. scope_position is the rank inside the
-- scope, "position" the global one.
CREATE OR REPLACE FUNCTION public.ranked_ladder(p_season smallint, p_scope text, p_user uuid, p_limit integer DEFAULT 8)
RETURNS TABLE ("position" bigint, scope_position bigint, scope_total bigint, season_score integer,
               avg_answer_ms integer, runs_total integer, is_me boolean, legend boolean,
               username text, display_name text, avatar_url text, name_accent text, name_font text, bias text)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH s AS (SELECT * FROM public.ranked_standings(p_season)),
  me AS (SELECT (p.ult_groups->>0) AS fandom FROM public.profiles p WHERE p.id = p_user),
  scoped AS (
    SELECT s.*,
           row_number() OVER (ORDER BY s."position") AS scope_position,
           count(*) OVER () AS scope_total
      FROM s
     WHERE p_scope = 'global'
        OR (p_scope = 'fandom' AND EXISTS (
              SELECT 1 FROM public.profiles fp, me
               WHERE fp.id = s.user_id AND me.fandom IS NOT NULL AND fp.ult_groups ? me.fandom))
        OR (p_scope = 'following' AND (s.user_id = p_user OR EXISTS (
              SELECT 1 FROM public.follows f WHERE f.follower_id = p_user AND f.followed_id = s.user_id)))
  )
  SELECT sc."position", sc.scope_position, sc.scope_total, sc.season_score, sc.avg_answer_ms, sc.runs_total,
         (sc.user_id = p_user) AS is_me,
         EXISTS (SELECT 1 FROM public.ranked_legends l WHERE l.season = p_season AND l.user_id = sc.user_id) AS legend,
         p.username, p.display_name, p.avatar_url, p.name_accent, p.name_font, p.bias
    FROM scoped sc
    LEFT JOIN public.profiles p ON p.id = sc.user_id
   WHERE sc.scope_position <= GREATEST(1, LEAST(p_limit, 50)) OR sc.user_id = p_user
   ORDER BY sc.scope_position;
$$;

-- Legend = top 100 of the ladder among Masters (season score >= 12,000).
CREATE OR REPLACE FUNCTION public.ranked_recompute_legends(p_season smallint)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.ranked_legends l WHERE l.season = p_season;
  INSERT INTO public.ranked_legends (season, user_id, "position", season_score, computed_at)
  SELECT p_season, s.user_id, (row_number() OVER (ORDER BY s."position"))::smallint, s.season_score, now()
    FROM public.ranked_standings(p_season) s
   WHERE s.season_score >= 12000
   ORDER BY s."position"
   LIMIT 100;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.ranked_seasons SET legend_computed_at = now() WHERE id = p_season;
  RETURN v_count;
END;
$$;

-- Keep seasons back to back: once the last season has ended, add the next 8-week one(s).
-- Returns the season covering now(), or NULL (ranked not started: the owner inserts season 1).
CREATE OR REPLACE FUNCTION public.ranked_roll_season(p_length_days integer DEFAULT 56)
RETURNS smallint
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id smallint;
  v_ends timestamptz;
  v_guard integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ranked_roll_season'));
  SELECT s.id, s.ends_at INTO v_id, v_ends FROM public.ranked_seasons s ORDER BY s.id DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  WHILE v_ends <= now() AND v_guard < 100 LOOP
    INSERT INTO public.ranked_seasons (id, starts_at, ends_at)
    -- hours, not days: an exact 56 x 24 h whatever the session time zone (no DST drift).
    VALUES (v_id + 1, v_ends, v_ends + make_interval(hours => p_length_days * 24))
    RETURNING id, ends_at INTO v_id, v_ends;
    v_guard := v_guard + 1;
  END LOOP;
  RETURN (SELECT s.id FROM public.ranked_seasons s
           WHERE s.starts_at <= now() AND s.ends_at > now() ORDER BY s.id DESC LIMIT 1);
END;
$$;

-- Nightly: roll the season, recompute Legend for the current season, and once more (final)
-- for a season that ended since its last computation.
CREATE OR REPLACE FUNCTION public.ranked_nightly()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current smallint;
  v_ended smallint;
  v_legends integer := 0;
  v_final integer := 0;
BEGIN
  v_current := public.ranked_roll_season(56);
  SELECT s.id INTO v_ended FROM public.ranked_seasons s
   WHERE s.ends_at <= now() AND (s.legend_computed_at IS NULL OR s.legend_computed_at < s.ends_at)
   ORDER BY s.id DESC LIMIT 1;
  IF v_ended IS NOT NULL THEN
    v_final := public.ranked_recompute_legends(v_ended);
  END IF;
  IF v_current IS NOT NULL THEN
    v_legends := public.ranked_recompute_legends(v_current);
  END IF;
  RETURN jsonb_build_object('season', v_current, 'legends', v_legends, 'final_season', v_ended, 'final_legends', v_final);
END;
$$;

REVOKE ALL ON FUNCTION public.ranked_issue_run(uuid, smallint, jsonb, timestamptz, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_finalize_run(uuid, uuid, text, jsonb, integer, integer, integer, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_standings(smallint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_player_standing(smallint, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_ladder(smallint, text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_recompute_legends(smallint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_roll_season(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ranked_nightly() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ranked_issue_run(uuid, smallint, jsonb, timestamptz, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_finalize_run(uuid, uuid, text, jsonb, integer, integer, integer, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_standings(smallint) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_player_standing(smallint, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_ladder(smallint, text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_recompute_legends(smallint) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_roll_season(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranked_nightly() TO service_role;

COMMIT;

-- 7. GO-LIVE (owner, separate step, NOT part of this migration) --------------------------------
-- Ranked stays "not live" (503) until a season covers now(). To launch season 1, pick the start
-- and run (8 weeks):
--   INSERT INTO public.ranked_seasons (id, starts_at, ends_at)
--   VALUES (1, '<YYYY-MM-DD> 00:00:00+00', '<YYYY-MM-DD> 00:00:00+00'::timestamptz + interval '56 days');
-- Also set NEXT_PUBLIC_UX_V1=1 on the environment (the routes 404 with the flag off).

-- 8. NIGHTLY JOB (documented, NOT enabled) ------------------------------------------------------
-- It must (a) close expired open runs as quit runs (TS scoring, so it runs in the app) and
-- (b) call public.ranked_nightly(). The app route does both:
--   apps/quiz/vercel.json crons += { "path": "/api/ranked/cron/nightly", "schedule": "20 0 * * *" }
-- (b) alone is also possible with pg_cron, which is NOT installed on this project today:
--   -- CREATE EXTENSION IF NOT EXISTS pg_cron;
--   -- SELECT cron.schedule('ranked-nightly', '20 0 * * *', $cron$ SELECT public.ranked_nightly(); $cron$);

-- ROLLBACK (commented; run only to undo this file, in this order) ------------------------------
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.ranked_nightly();
-- DROP FUNCTION IF EXISTS public.ranked_roll_season(integer);
-- DROP FUNCTION IF EXISTS public.ranked_recompute_legends(smallint);
-- DROP FUNCTION IF EXISTS public.ranked_ladder(smallint, text, uuid, integer);
-- DROP FUNCTION IF EXISTS public.ranked_player_standing(smallint, uuid);
-- DROP FUNCTION IF EXISTS public.ranked_standings(smallint);
-- DROP FUNCTION IF EXISTS public.ranked_finalize_run(uuid, uuid, text, jsonb, integer, integer, integer, integer, jsonb);
-- DROP FUNCTION IF EXISTS public.ranked_issue_run(uuid, smallint, jsonb, timestamptz, integer, integer);
-- DROP INDEX IF EXISTS public.ranked_plays_player_season_score_idx;
-- DROP INDEX IF EXISTS public.ranked_plays_run_token_key;
-- ALTER TABLE public.ranked_plays DROP COLUMN IF EXISTS run_token;
-- ALTER TABLE public.ranked_plays DROP COLUMN IF EXISTS season;
-- COMMENT ON COLUMN public.ranked_plays.score IS NULL;
-- DROP TABLE IF EXISTS public.ranked_legends;
-- DROP TABLE IF EXISTS public.ranked_song_stats;
-- DROP TABLE IF EXISTS public.ranked_runs;
-- DROP TABLE IF EXISTS public.ranked_seasons;
-- COMMIT;
-- (bt_players rows created by ranked_finalize_run are ordinary progression rows; leave them.)
