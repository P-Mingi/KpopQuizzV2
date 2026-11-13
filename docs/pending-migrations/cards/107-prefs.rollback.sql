-- 107-prefs.rollback.sql (KpopCards lots 3 + 4 + 5): undo of 107-prefs.sql.
--
-- What:   drops the 2 functions and the table cards_prefs.
-- Why:    without 107 the sound, vibration, theme and focus choices are not kept on the server; 110 reads them, so undo 110 first.
-- Rows:   the table is dropped with its rows (preferences only: nothing a player earned). Refused while a function of 110 or later still exists.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_prefs_get', 'cards_prefs_set');   expect 0
-- Undo:   run 107-prefs.sql again (the preferences are back to their defaults).
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c107r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is not null then
    raise exception '107-prefs rollback: refused, 110 is applied (cards_open exists); undo 110 first';
  end if;

  drop function if exists public.cards_prefs_set(uuid, jsonb, timestamptz);
  drop function if exists public.cards_prefs_get(uuid);
  drop table if exists public.cards_prefs;

  notify pgrst, 'reload schema';
end $c107r$;
