-- 002-functions.rollback.sql (Bunnyverse Cards, lane CORE): undo of 002-functions.sql.
--
-- What:   drops the 2 triggers and the 10 functions of 002-functions.sql. The tables and their rows stay (001 rollback drops those).
-- Why:    without the functions no pack can be opened; the routes answer 404 anyway while NET_CARDS is off.
-- Rows:   2 triggers, 10 functions dropped. No data is changed.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\_%';   expect 0
-- Undo:   run 002-functions.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c002r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  -- A trigger only when its table exists (001's rollback may have run first), so a second run changes nothing.
  if to_regclass('public.cards_photos') is not null then
    drop trigger if exists cards_photos_retire on public.cards_photos;
  end if;
  if to_regclass('public.cards_reports') is not null then
    drop trigger if exists cards_reports_close on public.cards_reports;
  end if;
  drop function if exists public.cards_photo_retire();
  drop function if exists public.cards_report_close();
  drop function if exists public.cards_issue_ticket(uuid, timestamptz, integer);
  drop function if exists public.cards_favorite(uuid, integer, boolean);
  drop function if exists public.cards_recycle(uuid, timestamptz);
  drop function if exists public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer);
  drop function if exists public.cards_wallet(uuid, timestamptz, integer, integer);
  drop function if exists public.cards_bonus_record(uuid, timestamptz);
  drop function if exists public.cards_bonus_plays(uuid, date);
  drop function if exists public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz);

  notify pgrst, 'reload schema';
end $c002r$;
