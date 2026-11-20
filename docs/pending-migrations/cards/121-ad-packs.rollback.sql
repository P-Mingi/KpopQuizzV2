-- 121-ad-packs.rollback.sql (KpopCards launch prep, 2026-11-17; the undo of 121-ad-packs.sql)
--
-- What:   in ONE DO block, drops cards_ad_pack_grant and the table cards_ad_events. Refused while a row of cards_ad_events exists (a granted pack is
--         a fact: the rows are the proof of it and would be lost).
-- Why:    the way back for 121 while the flag is off and no ad event has been recorded.
-- Rows:   0 rows changed (the table must be empty).
-- Verify: select to_regclass('public.cards_ad_events') is null;   expect true
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c121r$
begin
  perform set_config('lock_timeout', '5s', true);

  if to_regclass('public.cards_ad_events') is not null then
    if exists (select 1 from public.cards_ad_events limit 1) then
      raise exception '121-ad-packs.rollback: cards_ad_events holds rows, nothing changed';
    end if;
  end if;
  drop function if exists public.cards_ad_pack_grant(uuid, text, text, timestamptz, integer, integer);
  drop table if exists public.cards_ad_events;
  notify pgrst, 'reload schema';
end $c121r$;
