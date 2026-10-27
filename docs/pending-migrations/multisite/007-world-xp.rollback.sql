-- 007-world-xp.rollback.sql (run O1, lane B3): undo of 007-world-xp.sql.
--
-- What:   drops award_world_xp, bump_world_counter, public_passport, my_passport, update_my_membership and
--         set_passport_prefs.
-- Why:    the rollback of manifest.md row 11. Rollbacks run in reverse order: 008 first.
-- Rows:   6 functions dropped; no table or row is touched. Refused, with nothing changed, while 008 is applied (the
--         non-kpop branches of its functions call bump_world_counter, and plpgsql would only fail at the first call).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('award_world_xp', 'bump_world_counter', 'public_passport', 'my_passport', 'update_my_membership', 'set_passport_prefs');   expect 0
-- Undo:   run 007-world-xp.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  callers text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into callers
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('award_xp', 'record_play', 'handle_new_quiz', 'increment_like_count', 'decrement_like_count',
                       'notify_badge_earned', 'notify_group_quiz_alerts', 'cast_duel_vote', 'passport_on_battle_result',
                       'record_bt_play', 'merge_anon_passport')
     and (p.prosrc like '%bump_world_counter%' or p.prosrc like '%award_world_xp%');
  if callers is not null then
    raise exception '007-world-xp rollback refused: % still call these functions; roll back 008 first', callers;
  end if;
end $$;

drop function if exists public.set_passport_prefs(jsonb);
drop function if exists public.update_my_membership(text, jsonb);
drop function if exists public.my_passport();
drop function if exists public.public_passport(text);
drop function if exists public.bump_world_counter(uuid, text, text, integer);
drop function if exists public.award_world_xp(uuid, text, integer, text);
