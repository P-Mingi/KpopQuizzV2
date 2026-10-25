-- 002-xp-daily-snapshots.rollback.sql (run O1, lot H2b): undo of 002-xp-daily-snapshots.sql.
--
-- What:   drops public.hub_snapshot_xp() and public.xp_daily_snapshots (its index and constraints go with it).
-- Why:    the table holds copies of numbers that live on profiles and world_memberships, so nothing is lost; the Top fans block falls back
--         to the XP of the quiz plays of the week on its own when the table is gone.
-- Rows:   1 table dropped, 1 function dropped.
-- Verify: select to_regclass('public.xp_daily_snapshots'), to_regprocedure('public.hub_snapshot_xp()');   expect null, null
-- Undo:   run 002-xp-daily-snapshots.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

drop function if exists public.hub_snapshot_xp();
drop table if exists public.xp_daily_snapshots;
