-- 002-xp-daily-snapshots.rollback.sql (run O1, lot H2b): undo of 002-xp-daily-snapshots.sql.
--
-- What:   drops public.hub_snapshot_xp() and public.xp_daily_snapshots (its index and constraints go with it).
-- Why:    the only way to take the table away. Today's rows can be rebuilt (hub_snapshot_xp() writes them again from profiles and
--         world_memberships), but the rows of earlier days cannot: they are the XP of those days, and the XP of the week of Top fans is
--         the difference with them. The Top fans block falls back to the XP of the quiz plays of the week on its own when the table is gone.
-- Rows:   1 table dropped, 1 function dropped. Refused, with nothing changed, while any row with day < current_date (UTC) exists.
--         To go on anyway, delete those rows on purpose first: delete from public.xp_daily_snapshots where day < (now() at time zone 'utc')::date;
-- Verify: select to_regclass('public.xp_daily_snapshots'), to_regprocedure('public.hub_snapshot_xp()');   expect null, null
-- Undo:   run 002-xp-daily-snapshots.sql again (past days are not restored).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $o1h$
declare
  v_past bigint := 0;
begin
  if to_regclass('public.xp_daily_snapshots') is not null then
    execute 'select count(*) from public.xp_daily_snapshots where day < (now() at time zone ''utc'')::date' into v_past;
    if v_past > 0 then
      raise exception '002-xp-daily-snapshots.rollback: % snapshot rows of earlier days cannot be rebuilt; delete them on purpose first', v_past;
    end if;
  end if;
end $o1h$;

drop function if exists public.hub_snapshot_xp();
drop table if exists public.xp_daily_snapshots;
