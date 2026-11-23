-- 128-admin-stats.rollback.sql (KpopCards launch, 2026-11-23; the admin figures function, undone)
--
-- What:   in ONE DO block, cards_admin_stats is dropped.
-- Why:    the undo of 128-admin-stats.sql. No data is touched.
-- Rows:   0 rows changed.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_admin_stats';   expect 0
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c128r$
begin
  perform set_config('lock_timeout', '5s', true);

  if to_regprocedure('public.cards_admin_stats(text, text, text, integer, text, text, integer, integer)') is null then
    raise notice '128-admin-stats.rollback: already rolled back, nothing changed';
    return;
  end if;
  drop function public.cards_admin_stats(text, text, text, integer, text, text, integer, integer);
  raise notice '128-admin-stats.rollback: cards_admin_stats is gone';
  notify pgrst, 'reload schema';
end $c128r$;
