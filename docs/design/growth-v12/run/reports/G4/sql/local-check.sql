-- G4 local check, step 2: the rules of docs/pending-migrations/v12-g4-live.sql, asserted
-- on a LOCAL scratch Postgres (run.sh). Every ASSERT that fails stops the script.
\set ON_ERROR_STOP on

-- The API's role.
SET ROLE service_role;

DO $$
DECLARE
  q jsonb;
  v_room uuid;
  v_other uuid;
  v jsonb;
  r jsonb;
  p1 uuid;
  p2 uuid;
  i integer;
  n integer;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'song_id', gen_random_uuid(), 'kind', 'title', 'prompt', 'Which song is this?',
    'options', jsonb_build_array('A', 'B', 'C', 'D'), 'correct', 1,
    'preview_url', 'https://cdnt-preview.dzcdn.net/x.mp3')) INTO q
  FROM generate_series(1, 5);

  -- Create, and the code is unique among open rooms.
  v_room := public.live_create_room('ABCDEF', 'hosthash', 'all', 'All K-pop', 5, 15, q, true, 'ip1');
  ASSERT v_room IS NOT NULL, 'room created';
  ASSERT public.live_create_room('ABCDEF', 'h2', 'all', 'All K-pop', 5, 15, q, true, 'ip1') IS NULL, 'open code refused';

  -- State of a lobby.
  v := public.live_room_state('ABCDEF');
  ASSERT v -> 'room' ->> 'status' = 'lobby', 'lobby';
  ASSERT (v -> 'room' ->> 'round')::int = 0, 'round 0';
  ASSERT v -> 'question' = 'null'::jsonb, 'no question in the lobby';
  ASSERT v -> 'next' ->> 'prompt' = 'Which song is this?', 'next question is round 1';
  ASSERT v -> 'players' = '[]'::jsonb, 'no player';
  ASSERT (v ->> 'now')::bigint > 1700000000000, 'database clock in ms';
  ASSERT public.live_room_state('ZZZZZZ') IS NULL, 'unknown code';

  -- Join: the same nickname twice, case ignored, and a full length name.
  r := public.live_join(v_room, 't1', 'mingi', 0, 50);
  ASSERT r ->> 'status' = 'ok' AND r -> 'player' ->> 'nickname' = 'mingi', 'first mingi';
  p1 := (r -> 'player' ->> 'id')::uuid;
  r := public.live_join(v_room, 't2', 'Mingi', 1, 50);
  ASSERT r -> 'player' ->> 'nickname' = 'Mingi 2', 'second mingi gets a number: ' || (r -> 'player' ->> 'nickname');
  p2 := (r -> 'player' ->> 'id')::uuid;
  r := public.live_join(v_room, 't3', 'mingi', 2, 50);
  ASSERT r -> 'player' ->> 'nickname' = 'mingi 3', 'third mingi';
  r := public.live_join(v_room, 't4', 'abcdefghijklmnop', 0, 50);
  r := public.live_join(v_room, 't5', 'abcdefghijklmnop', 0, 50);
  ASSERT r -> 'player' ->> 'nickname' = 'abcdefghijklmn 2', 'a 16 character name is shortened: ' || (r -> 'player' ->> 'nickname');

  -- The cap: 50 players, the 51st is refused.
  FOR i IN 6..50 LOOP
    r := public.live_join(v_room, 't' || i, 'fan' || i, i % 4, 50);
    ASSERT r ->> 'status' = 'ok', 'join ' || i;
  END LOOP;
  r := public.live_join(v_room, 't51', 'late', 0, 50);
  ASSERT r ->> 'status' = 'full', 'the 51st player is refused';
  SELECT players_peak INTO n FROM public.live_rooms WHERE id = v_room;
  ASSERT n = 50, 'players_peak 50';

  -- No answer before the round.
  ASSERT public.live_submit_answer('ABCDEF', 't1', 1) ->> 'status' = 'not_open', 'no answer in the lobby';

  -- Start: only round 1 from the lobby, once.
  ASSERT NOT public.live_start_round(v_room, 1, 2), 'round 2 cannot start from the lobby';
  ASSERT NOT public.live_start_round(v_room, 2, 1), 'wrong game';
  ASSERT public.live_start_round(v_room, 1, 1), 'round 1 starts';
  ASSERT NOT public.live_start_round(v_room, 1, 1), 'round 1 does not start twice';
  v := public.live_room_state('ABCDEF');
  ASSERT v -> 'room' ->> 'status' = 'round' AND (v -> 'room' ->> 'round_started_at')::bigint > 0, 'round clock set';
  ASSERT (v -> 'question' ->> 'correct')::int = 1, 'question of round 1';

  -- Answers: timed by the database, once, known token only.
  r := public.live_submit_answer('ABCDEF', 't1', 1);
  ASSERT r ->> 'status' = 'ok' AND (r ->> 'ms')::int BETWEEN 0 AND 2000 AND (r ->> 'round')::int = 1, 'answer taken: ' || r::text;
  ASSERT public.live_submit_answer('ABCDEF', 't1', 2) ->> 'status' = 'duplicate', 'second answer refused';
  ASSERT public.live_submit_answer('ABCDEF', 'nope', 1) ->> 'status' = 'unauthorized', 'unknown token';
  ASSERT public.live_submit_answer('QQQQQQ', 't1', 1) ->> 'status' = 'gone', 'unknown room';
  SELECT count(*) INTO n FROM public.live_answers WHERE room_id = v_room;
  ASSERT n = 1, 'one answer row';

  -- A removed player is refused, and the name is free again.
  ASSERT public.live_remove_player(v_room, p2), 'remove';
  ASSERT NOT public.live_remove_player(v_room, p2), 'remove once';
  ASSERT public.live_submit_answer('ABCDEF', 't2', 1) ->> 'status' = 'removed', 'removed player refused';
  r := public.live_join(v_room, 't2b', 'Mingi 2', 1, 50);
  ASSERT r -> 'player' ->> 'nickname' = 'Mingi 2', 'the name of a removed player is free';

  -- Late: the round started 16 seconds ago, the round lasts 15.
  UPDATE public.live_rooms SET round_started_at = clock_timestamp() - interval '16 seconds' WHERE id = v_room;
  ASSERT public.live_submit_answer('ABCDEF', 't3', 1) ->> 'status' = 'late', 'late answer refused';
  -- Just inside: 14.9 seconds.
  UPDATE public.live_rooms SET round_started_at = clock_timestamp() - interval '14.9 seconds' WHERE id = v_room;
  r := public.live_submit_answer('ABCDEF', 't4', 0);
  ASSERT r ->> 'status' = 'ok' AND (r ->> 'ms')::int BETWEEN 14900 AND 15000, 'answer at 14.9 s: ' || r::text;

  -- Close the round, once. No answer afterwards.
  ASSERT public.live_close_round(v_room, 1, 1), 'close';
  ASSERT NOT public.live_close_round(v_room, 1, 1), 'close once';
  ASSERT public.live_submit_answer('ABCDEF', 't5', 1) ->> 'status' = 'not_open', 'no answer after the close';
  ASSERT NOT public.live_move_status(v_room, 'reveal', 'ended'), 'only the two allowed moves';

  -- Scores: applied once.
  ASSERT public.live_apply_scores(v_room, 1, 1, jsonb_build_array(
    jsonb_build_object('player_id', p1, 'score', 990, 'streak', 1, 'correct', 1, 'answered', 1, 'total_ms', 120, 'gain', 990, 'bonus', 0, 'result', 'ok'))), 'scores applied';
  ASSERT NOT public.live_apply_scores(v_room, 1, 1, jsonb_build_array(
    jsonb_build_object('player_id', p1, 'score', 5000, 'streak', 9, 'correct', 9, 'answered', 9, 'total_ms', 1, 'gain', 5000, 'bonus', 300, 'result', 'ok'))), 'scores applied once';
  SELECT score INTO n FROM public.live_players WHERE id = p1;
  ASSERT n = 990, 'score kept from the first apply';
  v := public.live_room_state('ABCDEF');
  ASSERT (v -> 'room' ->> 'scored_round')::int = 1, 'scored_round 1';
  ASSERT jsonb_array_length(v -> 'answers') = 2, 'answers of the round in the state';

  -- Leaderboard, next round, end.
  ASSERT NOT public.live_start_round(v_room, 1, 2), 'no next round from the reveal';
  ASSERT public.live_move_status(v_room, 'reveal', 'board'), 'board';
  ASSERT public.live_start_round(v_room, 1, 2), 'round 2 from the board';
  ASSERT NOT public.live_update_settings(v_room, 'gg', 'Girl groups', 5, 10, q), 'no settings during a round';
  ASSERT jsonb_array_length(public.live_room_state('ABCDEF') -> 'answers') = 0, 'round 2 has no answer yet';
  ASSERT public.live_close_round(v_room, 1, 2), 'close 2';
  ASSERT public.live_apply_scores(v_room, 1, 2, '[]'::jsonb), 'apply 2';
  ASSERT public.live_move_status(v_room, 'reveal', 'board'), 'board 2';
  ASSERT NOT public.live_reset_game(v_room, 'all', 'All K-pop', 5, 15, q), 'no play again before the end';
  ASSERT public.live_move_status(v_room, 'board', 'ended'), 'ended';

  -- Play again: next game, scores at zero, players kept.
  ASSERT public.live_reset_game(v_room, 'gg', 'Girl groups', 5, 10, q), 'play again';
  v := public.live_room_state('ABCDEF');
  ASSERT v -> 'room' ->> 'status' = 'lobby' AND (v -> 'room' ->> 'game')::int = 2 AND (v -> 'room' ->> 'round')::int = 0, 'game 2 lobby';
  ASSERT (v -> 'room' ->> 'seconds')::int = 10 AND v -> 'room' ->> 'label' = 'Girl groups', 'new settings';
  SELECT score INTO n FROM public.live_players WHERE id = p1;
  ASSERT n = 0, 'score back to zero';
  SELECT count(*) INTO n FROM public.live_players WHERE room_id = v_room AND removed_at IS NULL;
  ASSERT n = 50, 'players kept';
  ASSERT public.live_update_settings(v_room, 'all', 'All K-pop', 5, 15, q), 'settings in the lobby';
  -- A player may answer round 1 of game 2 although it answered round 1 of game 1.
  ASSERT public.live_start_round(v_room, 2, 1), 'game 2 round 1';
  ASSERT public.live_submit_answer('ABCDEF', 't1', 3) ->> 'status' = 'ok', 'answer in game 2';

  -- Close: nothing personal is kept, the code is free.
  ASSERT public.live_close_room(v_room), 'close room';
  ASSERT NOT public.live_close_room(v_room), 'close room once';
  ASSERT public.live_room_state('ABCDEF') IS NULL, 'closed room is gone';
  SELECT count(*) INTO n FROM public.live_players WHERE room_id = v_room;
  ASSERT n = 0, 'players deleted on close';
  SELECT count(*) INTO n FROM public.live_answers WHERE room_id = v_room;
  ASSERT n = 0, 'answers deleted on close';
  ASSERT public.live_join(v_room, 'x', 'ghost', 0, 50) ->> 'status' = 'gone', 'no join in a closed room';
  v_other := public.live_create_room('ABCDEF', 'h3', 'all', 'All K-pop', 5, 15, q, false, 'ip1');
  ASSERT v_other IS NOT NULL, 'the code of a closed room can be given again';

  -- Expiry. A real room past its two hours: closed and emptied, the row kept.
  PERFORM public.live_join(v_other, 'e1', 'fan', 0, 50);
  UPDATE public.live_rooms SET expires_at = now() - interval '1 minute' WHERE id = v_other;
  ASSERT public.live_room_state('ABCDEF') IS NULL, 'an expired room is gone before the cron runs';
  ASSERT public.live_submit_answer('ABCDEF', 'e1', 1) ->> 'status' = 'gone', 'no answer in an expired room';
  ASSERT NOT public.live_start_round(v_other, 1, 1), 'no round in an expired room';
  -- An expired room gives its code back at once.
  v_room := public.live_create_room('ABCDEF', 'h4', 'all', 'All K-pop', 5, 15, q, true, 'ip2');
  ASSERT v_room IS NOT NULL, 'the code of an expired room can be given again';
  PERFORM public.live_join(v_room, 'e2', 'fan', 0, 50);
  UPDATE public.live_rooms SET expires_at = now() - interval '1 minute' WHERE id = v_room;
  r := public.live_expire_rooms();
  ASSERT (r ->> 'deleted')::int = 1, 'the expired test room is deleted: ' || r::text;
  ASSERT (r ->> 'closed')::int = 1, 'one real room closed: ' || r::text;
  -- The test room the host closed earlier is not two hours old yet: it goes at its own expiry.
  SELECT count(*) INTO n FROM public.live_rooms WHERE is_test;
  ASSERT n = 1, 'the closed test room waits for its expiry';
  UPDATE public.live_rooms SET expires_at = now() - interval '1 minute' WHERE is_test;
  r := public.live_expire_rooms();
  ASSERT (r ->> 'deleted')::int = 1 AND (r ->> 'closed')::int = 0, 'then it is deleted: ' || r::text;
  SELECT count(*) INTO n FROM public.live_rooms WHERE id = v_other AND status = 'closed' AND questions = '[]'::jsonb AND host_token_hash = '' AND players_peak = 1;
  ASSERT n = 1, 'the real room keeps one closed row with its player count';
  SELECT count(*) INTO n FROM public.live_players;
  ASSERT n = 0, 'no player left';
  r := public.live_expire_rooms();
  ASSERT (r ->> 'deleted')::int = 0 AND (r ->> 'closed')::int = 0, 'expiry is idempotent: ' || r::text;

  -- Constraints.
  BEGIN
    PERFORM public.live_create_room('abc', 'h', 'all', 'x', 5, 15, q, true, 'ip');
    RAISE EXCEPTION 'a bad code was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.live_create_room('BCDEFG', 'h', 'all', 'x', 21, 15, q, true, 'ip');
    RAISE EXCEPTION '21 rounds were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'service_role checks: OK';
END;
$$;

RESET ROLE;

-- A room for the public-key checks below.
SELECT public.live_create_room('HJKLMN', 'hosthash', 'all', 'All K-pop', 5, 15, '[]'::jsonb, true, 'ip9') AS open_room \gset
INSERT INTO realtime.messages (topic, extension, event) VALUES ('live:' || :'open_room', 'broadcast', 'state');
INSERT INTO realtime.messages (topic, extension, event) VALUES ('live:' || :'open_room', 'presence', 'state');
SELECT set_config('g4.room', :'open_room', false) \g /dev/null

-- The public keys: no table access, no game function, receive only on an open room's topic.
DO $$
DECLARE
  role_name text;
  n integer;
  room text := current_setting('g4.room');
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    EXECUTE format('SET ROLE %I', role_name);

    BEGIN
      PERFORM 1 FROM public.live_rooms;
      RAISE EXCEPTION '% read live_rooms', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM 1 FROM public.live_players;
      RAISE EXCEPTION '% read live_players', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      INSERT INTO public.live_answers (room_id, game, round, player_id, choice, ms) VALUES (room::uuid, 1, 1, gen_random_uuid(), 1, 1);
      RAISE EXCEPTION '% wrote live_answers', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM public.live_room_state('HJKLMN');
      RAISE EXCEPTION '% called live_room_state', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM public.live_submit_answer('HJKLMN', 't', 1);
      RAISE EXCEPTION '% called live_submit_answer', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM public.live_join(room::uuid, 't', 'x', 0, 50);
      RAISE EXCEPTION '% called live_join', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM public.live_expire_rooms();
      RAISE EXCEPTION '% called live_expire_rooms', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- Realtime Authorization, as the Realtime server checks it: the topic is set, then the
    -- role reads realtime.messages.
    PERFORM set_config('realtime.topic', 'live:' || room, false);
    SELECT count(*) INTO n FROM realtime.messages;
    ASSERT n = 1, format('%s receives broadcasts of an open room (and not presence): %s', role_name, n);
    BEGIN
      INSERT INTO realtime.messages (topic, extension, event) VALUES ('live:' || room, 'broadcast', 'state');
      RAISE EXCEPTION '% sent a broadcast', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('realtime.topic', 'live:' || gen_random_uuid()::text, false);
    SELECT count(*) INTO n FROM realtime.messages;
    ASSERT n = 0, format('%s receives nothing on an unknown topic', role_name);
    PERFORM set_config('realtime.topic', 'other:' || room, false);
    SELECT count(*) INTO n FROM realtime.messages;
    ASSERT n = 0, format('%s receives nothing on another prefix', role_name);
    PERFORM set_config('realtime.topic', 'live:not-a-uuid', false);
    SELECT count(*) INTO n FROM realtime.messages;
    ASSERT n = 0, format('%s: a malformed topic is refused, not an error', role_name);

    RESET ROLE;
  END LOOP;

  -- The same topic once the room is closed.
  PERFORM public.live_close_room(room::uuid);
  SET ROLE anon;
  PERFORM set_config('realtime.topic', 'live:' || room, false);
  SELECT count(*) INTO n FROM realtime.messages;
  ASSERT n = 0, 'nothing is received on the topic of a closed room';
  RESET ROLE;

  RAISE NOTICE 'anon / authenticated checks: OK';
END;
$$;

-- The three verification queries of the migration.
SELECT c.relname, c.relrowsecurity AS rls,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN ('live_rooms', 'live_players', 'live_answers')
ORDER BY c.relname;

SELECT routine_name, string_agg(grantee, ', ' ORDER BY grantee) AS grantees
FROM information_schema.routine_privileges
WHERE specific_schema = 'public' AND routine_name LIKE 'live\_%'
GROUP BY routine_name
ORDER BY routine_name;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname LIKE 'live\_%';
