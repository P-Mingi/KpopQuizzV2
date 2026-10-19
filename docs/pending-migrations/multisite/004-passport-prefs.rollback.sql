-- 004-passport-prefs.rollback.sql (run O1, lane B3): undo of 004-passport-prefs.sql.
--
-- What:   drops the views favourites_all and world_progress, the tables world_follows (with trg_world_follows_counts),
--         favourites and passport_prefs (policies, indexes and constraints go with them) and the function
--         world_follows_counts.
-- Why:    the rollback of manifest.md row 8. Rollbacks run in reverse order: 008 and 007 first (set_passport_prefs, 007,
--         and the world branch of merge_anon_passport, 008, use passport_prefs; plpgsql would only fail at the first call).
-- Rows:   3 tables dropped. Refused, with nothing changed, while any row sits in passport_prefs, favourites or
--         world_follows (member data would be lost: after launch this deletes anime favourites and follows).
-- Verify: select to_regclass('public.passport_prefs'), to_regclass('public.favourites'), to_regclass('public.world_follows'), to_regclass('public.world_progress'), to_regclass('public.favourites_all');   expect 5 nulls
-- Undo:   run 004-passport-prefs.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array['passport_prefs', 'favourites', 'world_follows'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then
        raise exception '004-passport-prefs rollback refused: public.% holds % rows (member data would be lost); remove them deliberately first', t, n;
      end if;
    end if;
  end loop;
end $$;

drop view if exists public.favourites_all;
drop view if exists public.world_progress;
drop table if exists public.world_follows;   -- takes trg_world_follows_counts with it
drop function if exists public.world_follows_counts();
drop table if exists public.favourites;
drop table if exists public.passport_prefs;
