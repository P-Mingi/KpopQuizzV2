-- S4: revoke PUBLIC execute on server-only SECURITY DEFINER functions (priority 1, standalone).
--
-- What:   REVOKE EXECUTE FROM PUBLIC, anon, authenticated (and an explicit GRANT EXECUTE TO service_role) on 28
--         SECURITY DEFINER functions of schema public that no browser path calls. The owner (postgres) keeps its
--         right, so other SQL functions that call them (SECURITY DEFINER, they run as the owner) and pg_cron (runs
--         as postgres) are unaffected. Server code calls them with the service role key, which keeps its grant.
--         Byeol is gone: dev_award_byeol, dev_open_card_pack, dev_open_starter_pack, award_daily_capped_byeol and
--         award_first_time_byeol are revoked without condition.
--         NOT touched here (the browser, through the anon or user key, calls them): record_play,
--         increment_like_count, decrement_like_count, get_personality_counts. See README.md (risk and fix).
-- Why:    In production these functions carry =X/postgres (PUBLIC execute). Earlier revocations removed anon and
--         authenticated, but anon and authenticated inherit PUBLIC, so anyone holding the public anon key can call
--         them through /rest/v1/rpc with arbitrary arguments (award XP to any user, record fake plays, create
--         quizzes bypassing the API, emit activity, run maintenance jobs).
-- Scope:  independent of run O1. Written against production of 2026-10-17 (prod-public.sql). merge_anon_passport
--         is handled in its production form (6 arguments) and, if present, in O1's 7 argument form (008), so the
--         same file applies before or after O1.
-- Apply:  one transaction; idempotent (a second run changes nothing). A self-check at the end aborts the
--         transaction if any of the 28 is still executable by anon or authenticated, or not by service_role.
-- Rollback: S4-revoke-public-execute.rollback.sql (restores the grants of 2026-10-17).
--
-- Verify (expect 28 rows, anon f, authenticated f, service_role t on every row):
--   select p.oid::regprocedure as fn,
--          has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
--          has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('award_xp', 'award_bt_xp', 'award_daily_capped_byeol', 'award_first_time_byeol',
--                       'award_like_xp', 'dev_award_byeol', 'dev_open_card_pack', 'dev_open_starter_pack',
--                       'create_quiz_bypass', 'merge_anon_passport', 'record_bt_play', 'record_game_play',
--                       'update_player_rank', 'update_player_streak', 'grant_streak_badges', 'emit_activity',
--                       'fanout_followed_new_quiz', 'generate_daily_challenges', 'ensure_daily_blindtest',
--                       'ensure_daily_debate', 'reconcile_quiz_counters', 'recalculate_difficulty',
--                       'increment_game_play_count', 'increment_tot_appear', 'increment_tot_category_plays',
--                       'increment_tot_pick', 'tier_list_bump_view', 'get_daily_bt_leaderboard')
--   order by 1;
-- Verify the 4 kept functions are unchanged (expect anon t, authenticated t, service_role t):
--   select p.oid::regprocedure, has_function_privilege('anon', p.oid, 'EXECUTE'),
--          has_function_privilege('authenticated', p.oid, 'EXECUTE'), has_function_privilege('service_role', p.oid, 'EXECUTE')
--   from pg_proc p where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('record_play', 'increment_like_count', 'decrement_like_count', 'get_personality_counts');
-- Verify the ACL text (expect {postgres=X/postgres,service_role=X/postgres} on all 28):
--   select p.oid::regprocedure, p.proacl from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (...) order by 1;

BEGIN;

-- XP and the retired byeol economy (server routes call award_xp, award_bt_xp, award_like_xp with service_role).
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_bt_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_like_xp(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_daily_capped_byeol(uuid, character varying) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_first_time_byeol(uuid, character varying, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dev_award_byeol(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dev_open_card_pack(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dev_open_starter_pack(uuid) FROM PUBLIC, anon, authenticated;

-- Writes done by server routes with service_role, or by other SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.create_quiz_bypass(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_bt_play(uuid, text, integer, integer, integer, double precision, integer, jsonb, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_game_play(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_player_rank(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_player_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_streak_badges(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_activity(text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fanout_followed_new_quiz(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Daily content and maintenance jobs (Vercel cron routes and server pages, all with service_role).
REVOKE EXECUTE ON FUNCTION public.generate_daily_challenges(date, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_daily_blindtest(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_daily_debate(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_quiz_counters() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_difficulty(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_daily_bt_leaderboard(date) FROM PUBLIC, anon, authenticated;

-- Counters of retired features (games, This or That, tier lists: no caller left in the code).
REVOKE EXECUTE ON FUNCTION public.increment_game_play_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tot_appear(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tot_category_plays(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tot_pick(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tier_list_bump_view(text) FROM PUBLIC, anon, authenticated;

-- service_role keeps (or gets back) its explicit right.
GRANT EXECUTE ON FUNCTION
  public.award_xp(uuid, integer, text),
  public.award_bt_xp(uuid, integer),
  public.award_like_xp(uuid, uuid),
  public.award_daily_capped_byeol(uuid, character varying),
  public.award_first_time_byeol(uuid, character varying, text, integer, integer),
  public.dev_award_byeol(uuid, integer, text, text),
  public.dev_open_card_pack(uuid, text),
  public.dev_open_starter_pack(uuid),
  public.create_quiz_bypass(jsonb),
  public.record_bt_play(uuid, text, integer, integer, integer, double precision, integer, jsonb, integer, jsonb),
  public.record_game_play(uuid, uuid, jsonb),
  public.update_player_rank(uuid),
  public.update_player_streak(uuid),
  public.grant_streak_badges(uuid, integer),
  public.emit_activity(text, uuid, text, jsonb),
  public.fanout_followed_new_quiz(uuid, uuid, text, text),
  public.generate_daily_challenges(date, integer),
  public.ensure_daily_blindtest(date),
  public.ensure_daily_debate(date),
  public.reconcile_quiz_counters(),
  public.recalculate_difficulty(uuid),
  public.get_daily_bt_leaderboard(date),
  public.increment_game_play_count(uuid),
  public.increment_tot_appear(uuid[]),
  public.increment_tot_category_plays(uuid),
  public.increment_tot_pick(uuid),
  public.tier_list_bump_view(text)
TO service_role;

-- merge_anon_passport: production has the 6 argument form; run O1 (008) replaces it with a 7 argument form
-- (p_site text DEFAULT 'kpop'). Revoke whichever exists; at least one must.
DO $$
DECLARE
  sig text;
  found integer := 0;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb)',
    'public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text)'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', to_regprocedure(sig));
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', to_regprocedure(sig));
      found := found + 1;
    END IF;
  END LOOP;
  IF found = 0 THEN
    RAISE EXCEPTION 'S4: no merge_anon_passport signature found';
  END IF;
END $$;

-- Self-check: the 28 are SECURITY DEFINER, closed to anon and authenticated, open to service_role; the 4 kept
-- functions are untouched (still executable by anon and authenticated).
DO $$
DECLARE
  n_total integer;
  n_bad integer;
  n_kept integer;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE NOT p.prosecdef
                             OR has_function_privilege('anon', p.oid, 'EXECUTE')
                             OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
                             OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
                             OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))
    INTO n_total, n_bad
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN ('award_xp', 'award_bt_xp', 'award_daily_capped_byeol', 'award_first_time_byeol',
                      'award_like_xp', 'dev_award_byeol', 'dev_open_card_pack', 'dev_open_starter_pack',
                      'create_quiz_bypass', 'merge_anon_passport', 'record_bt_play', 'record_game_play',
                      'update_player_rank', 'update_player_streak', 'grant_streak_badges', 'emit_activity',
                      'fanout_followed_new_quiz', 'generate_daily_challenges', 'ensure_daily_blindtest',
                      'ensure_daily_debate', 'reconcile_quiz_counters', 'recalculate_difficulty',
                      'increment_game_play_count', 'increment_tot_appear', 'increment_tot_category_plays',
                      'increment_tot_pick', 'tier_list_bump_view', 'get_daily_bt_leaderboard');
  IF n_total <> 28 THEN
    RAISE EXCEPTION 'S4: expected 28 functions, found %', n_total;
  END IF;
  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'S4: % function(s) still open to PUBLIC, anon or authenticated, or closed to service_role', n_bad;
  END IF;
  SELECT count(*) INTO n_kept
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN ('record_play', 'increment_like_count', 'decrement_like_count', 'get_personality_counts')
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  IF n_kept <> 4 THEN
    RAISE EXCEPTION 'S4: expected the 4 browser-called functions still open to anon and authenticated, found %', n_kept;
  END IF;
END $$;

COMMIT;
