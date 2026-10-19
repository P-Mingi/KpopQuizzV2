-- 003-memberships.rollback.sql (run O1, lane B3): undo of 003-memberships.sql.
--
-- What:   drops trg_profiles_membership, the three functions (profiles_membership, ensure_membership,
--         create_profile_for_site) and public.world_memberships (its policy, indexes and rows go with it).
-- Why:    the rollback of manifest.md row 7. Rollbacks run in reverse order: 008, 007, then 004 first (the 004 views
--         depend on world_memberships and the drop fails, changing nothing, while they exist; the 007 and 008
--         functions use it and would only fail at their first call).
-- Rows:   1 table dropped. Refused, with nothing changed, while a non-kpop membership exists (the rows would be
--         lost: after launch this deletes anime passport data); the kpop rows are pure backfill and are dropped.
-- Verify: select to_regclass('public.world_memberships');                                        expect null
--         select count(*) from pg_trigger where tgname = 'trg_profiles_membership';              expect 0
--         select count(*) from pg_proc where proname in ('profiles_membership', 'ensure_membership', 'create_profile_for_site') and pronamespace = 'public'::regnamespace;   expect 0
-- Undo:   run 003-memberships.sql again (the backfill rebuilds the kpop rows).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('public.world_memberships') is not null then
    select count(*) into n from public.world_memberships where site_id <> 'kpop';
    if n > 0 then
      raise exception '003-memberships rollback refused: public.world_memberships holds % non-kpop rows (world data would be lost); remove them deliberately first', n;
    end if;
  end if;
end $$;

drop trigger if exists trg_profiles_membership on public.profiles;
drop function if exists public.create_profile_for_site(text, text, text, text, text, text, uuid);
drop function if exists public.ensure_membership(text, text, text);
drop function if exists public.profiles_membership();
drop table if exists public.world_memberships;
