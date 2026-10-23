-- S4 rollback: restore the EXECUTE grants of 2026-10-17 on the 28 functions S4 closes.
--
-- What:   gives PUBLIC its EXECUTE back on the 28 functions, and anon and authenticated their explicit EXECUTE on
--         the 6 that carried one in production (reconcile_quiz_counters, increment_tot_appear,
--         increment_tot_category_plays, increment_tot_pick, tier_list_bump_view, get_daily_bt_leaderboard).
--         service_role keeps its grant (S4 never removed it). Source: the ACLs of prod-public.sql (2026-10-17):
--           22 functions {=X/postgres,postgres=X/postgres,service_role=X/postgres}
--            6 functions {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--         The grants are the same set; only the position of the PUBLIC entry inside the aclitem array may differ
--         (PostgreSQL appends a new grantee), which has no effect on any privilege check.
-- Why:    undo S4 only if a server-side path turns out to depend on the anon or user key for one of the 28.
-- Apply:  one transaction, idempotent; a self-check aborts it unless every ACL matches the production set.
-- Verify (expect anon t, authenticated t, service_role t on all 28 rows):
--   select p.oid::regprocedure, has_function_privilege('anon', p.oid, 'EXECUTE'),
--          has_function_privilege('authenticated', p.oid, 'EXECUTE'), has_function_privilege('service_role', p.oid, 'EXECUTE')
--   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (... the 28 names of S4 ...) order by 1;

BEGIN;

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
TO PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.reconcile_quiz_counters(),
  public.increment_tot_appear(uuid[]),
  public.increment_tot_category_plays(uuid),
  public.increment_tot_pick(uuid),
  public.tier_list_bump_view(text),
  public.get_daily_bt_leaderboard(date)
TO anon, authenticated;

DO $$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb)',
    'public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text)'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', to_regprocedure(sig));
    END IF;
  END LOOP;
END $$;

-- Self-check: every one of the 28 carries exactly the production grantee set.
DO $$
DECLARE
  n_total integer;
  n_bad integer;
BEGIN
  WITH f AS (
    SELECT p.oid, p.proname, p.proacl
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('award_xp', 'award_bt_xp', 'award_daily_capped_byeol', 'award_first_time_byeol',
                        'award_like_xp', 'dev_award_byeol', 'dev_open_card_pack', 'dev_open_starter_pack',
                        'create_quiz_bypass', 'merge_anon_passport', 'record_bt_play', 'record_game_play',
                        'update_player_rank', 'update_player_streak', 'grant_streak_badges', 'emit_activity',
                        'fanout_followed_new_quiz', 'generate_daily_challenges', 'ensure_daily_blindtest',
                        'ensure_daily_debate', 'reconcile_quiz_counters', 'recalculate_difficulty',
                        'increment_game_play_count', 'increment_tot_appear', 'increment_tot_category_plays',
                        'increment_tot_pick', 'tier_list_bump_view', 'get_daily_bt_leaderboard')
  ), got AS (
    SELECT f.oid, f.proname,
           (SELECT array_agg(CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END
                             || ':' || a.privilege_type)
              FROM aclexplode(f.proacl) a) AS acl
    FROM f
  ), want AS (
    SELECT g.oid,
           CASE WHEN g.proname IN ('reconcile_quiz_counters', 'increment_tot_appear', 'increment_tot_category_plays',
                                   'increment_tot_pick', 'tier_list_bump_view', 'get_daily_bt_leaderboard')
                THEN ARRAY['PUBLIC:EXECUTE', 'anon:EXECUTE', 'authenticated:EXECUTE', 'postgres:EXECUTE', 'service_role:EXECUTE']
                ELSE ARRAY['PUBLIC:EXECUTE', 'postgres:EXECUTE', 'service_role:EXECUTE'] END AS acl
    FROM got g
  )
  SELECT count(*), count(*) FILTER (WHERE (SELECT array_agg(x ORDER BY x) FROM unnest(g.acl) x)
                                          IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(w.acl) x))
    INTO n_total, n_bad
  FROM got g JOIN want w USING (oid);
  IF n_total <> 28 THEN
    RAISE EXCEPTION 'S4 rollback: expected 28 functions, found %', n_total;
  END IF;
  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'S4 rollback: % function(s) do not carry the production grants', n_bad;
  END IF;
END $$;

COMMIT;
