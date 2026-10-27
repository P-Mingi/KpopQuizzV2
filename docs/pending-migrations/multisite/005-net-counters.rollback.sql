-- 005-net-counters.rollback.sql (run O1, lane B3): undo of 005-net-counters.sql.
--
-- What:   drops net_bridge_bump and public.bridge_daily.
-- Why:    the rollback of manifest.md row 9.
-- Rows:   1 table dropped. Refused, with nothing changed, while bridge_daily holds rows (the counters would be lost).
-- Verify: select to_regclass('public.bridge_daily');                                              expect null
--         select count(*) from pg_proc where proname = 'net_bridge_bump' and pronamespace = 'public'::regnamespace;   expect 0
-- Undo:   run 005-net-counters.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('public.bridge_daily') is not null then
    select count(*) into n from public.bridge_daily;
    if n > 0 then
      raise exception '005-net-counters rollback refused: public.bridge_daily holds % rows (the counters would be lost); remove them deliberately first', n;
    end if;
  end if;
end $$;

drop function if exists public.net_bridge_bump(text, text, text, text, boolean, integer);
drop table if exists public.bridge_daily;
