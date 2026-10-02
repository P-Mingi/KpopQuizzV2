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
  host_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS live_rooms_host_user_idx ON public.live_rooms (host_user_id) WHERE host_user_id IS NOT NULL;

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
  p_code text, p_host_token_hash text, p_host_user_id uuid, p_playlist text, p_label text,
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

  INSERT INTO public.live_rooms (code, host_token_hash, host_user_id, playlist, label, rounds, seconds, questions, is_test, ip_hash)
  VALUES (p_code, p_host_token_hash, p_host_user_id, p_playlist, p_label, p_rounds, p_seconds, p_questions, p_is_test, p_ip_hash)
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
  public.live_create_room(text, text, uuid, text, text, integer, integer, jsonb, boolean, text),
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
  public.live_create_room(text, text, uuid, text, text, integer, integer, jsonb, boolean, text),
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
-- DROP FUNCTION IF EXISTS public.live_create_room(text, text, uuid, text, text, integer, integer, jsonb, boolean, text);
-- DROP TABLE IF EXISTS public.live_answers;
-- DROP TABLE IF EXISTS public.live_players;
-- DROP TABLE IF EXISTS public.live_rooms;
-- COMMIT;
