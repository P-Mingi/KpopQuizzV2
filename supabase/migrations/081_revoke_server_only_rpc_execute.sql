-- Lock down SECURITY DEFINER RPCs that should never be callable by anon or
-- authenticated roles directly. Audit was done by grepping the app code for
-- .rpc('<name>') call sites:
--
-- KEPT (still executable by anon/authenticated - real client-or-user calls):
--   record_play              - server api route, runs as authenticated user
--   cast_duel_vote           - server api route, runs as authenticated user
--   increment_like_count     - server api route, runs as authenticated user
--   decrement_like_count     - server api route, runs as authenticated user
--   increment_tot_pick       - browser client (this-or-that-game.tsx)
--   increment_tot_category_plays - browser client (this-or-that-game.tsx)
--
-- REVOKED below (no app code calls these via .rpc - they are either trigger-
-- fired by INSERT/UPDATE, called from other SECURITY DEFINER fns, or are
-- dev/seed-only). Service-role bypasses grants so server crons + admin work.
--
-- FLAGGED separately (need app code refactor before revoke - see report):
--   award_xp, ensure_daily_quiz, create_quiz_bypass.
--
-- Using a DO block + pg_proc lookup so every overload of each name is hit
-- without needing to hand-write argument signatures.

DO $$
DECLARE
  fn_name TEXT;
  fn_signature TEXT;
  fn_names CONSTANT TEXT[] := ARRAY[
    -- Trigger functions (fired by table INSERT/UPDATE, never RPC-called).
    'handle_new_user',
    'handle_new_play',
    'handle_new_battle',
    'recalculate_difficulty',
    'increment_game_play_count',
    -- Server-only helpers (called from cron jobs / other SECURITY DEFINER fns).
    'update_player_rank',
    'update_player_streak',
    'generate_daily_challenges',
    -- Byeol (currency) awards - must NEVER be self-callable by anon/authenticated
    -- or users could grant themselves currency. Real awards happen server-side
    -- via service role inside record_play / record_bt_play / record_game_play.
    'award_first_time_byeol',
    'award_daily_capped_byeol',
    'award_bt_xp',
    -- Dev / seed-only. These must not be callable in production.
    'dev_award_byeol',
    'dev_open_card_pack',
    'dev_open_starter_pack',
    -- Server-only play recorders (the public `record_play` stays callable;
    -- these two are internal server wrappers per the audit).
    'record_bt_play',
    'record_game_play'
  ];
BEGIN
  FOREACH fn_name IN ARRAY fn_names LOOP
    FOR fn_signature IN
      SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', fn_signature);
      RAISE NOTICE 'revoked execute on %', fn_signature;
    END LOOP;
  END LOOP;
END$$;
