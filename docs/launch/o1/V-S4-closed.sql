-- V-S4: the 28 functions S4 closed (2026-10-23, applied in production by the owner) must stay closed after any launch SQL.
-- Fails (raises, psql exits non-zero with -v ON_ERROR_STOP=1) if one of them, any overload, is executable by anon or authenticated,
-- if service_role lost EXECUTE on one, or if one of the 28 names disappeared. Read only. Run as postgres:
--   psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql
do $$
declare
  names text[] := array['award_bt_xp','award_daily_capped_byeol','award_first_time_byeol','award_like_xp','award_xp',
    'create_quiz_bypass','dev_award_byeol','dev_open_card_pack','dev_open_starter_pack','emit_activity','ensure_daily_blindtest',
    'ensure_daily_debate','fanout_followed_new_quiz','generate_daily_challenges','get_daily_bt_leaderboard','grant_streak_badges',
    'increment_game_play_count','increment_tot_appear','increment_tot_category_plays','increment_tot_pick','merge_anon_passport',
    'recalculate_difficulty','reconcile_quiz_counters','record_bt_play','record_game_play','tier_list_bump_view',
    'update_player_rank','update_player_streak'];
  open_to text;
  service_missing text;
  found int;
begin
  select count(distinct p.proname) into found
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
   where p.proname = any(names);
  if found <> 28 then
    raise exception 'V-S4 failed: % of the 28 functions exist', found;
  end if;
  select string_agg(p.oid::regprocedure::text || ' -> ' || r.role, ', ' order by 1) into open_to
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    cross join (values ('anon'), ('authenticated')) as r(role)
   where p.proname = any(names) and has_function_privilege(r.role, p.oid, 'EXECUTE');
  if open_to is not null then
    raise exception 'V-S4 failed: reopened %', open_to;
  end if;
  select string_agg(p.oid::regprocedure::text, ', ') into service_missing
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
   where p.proname = any(names) and not has_function_privilege('service_role', p.oid, 'EXECUTE');
  if service_missing is not null then
    raise exception 'V-S4 failed: service_role lost EXECUTE on %', service_missing;
  end if;
  raise notice 'V-S4 ok: 28 functions closed to anon and authenticated, open to service_role';
end $$;
