-- 108-push.rollback.sql (Bunnyverse Cards lot 4, lane PUSH): undo of 108-push.sql.
--
-- What:   drops the 5 cards_push_* functions and the table cards_push_subs, with every subscription in it.
-- Why:    without the table the cron and the push routes answer nothing useful; they are off anyway while NET_CARDS_PUSH is off.
-- Rows:   1 table (and its rows), 5 functions dropped. Nothing else is touched.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\_push\_%';   expect 0
-- Verify: select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'cards_push_subs';   expect 0
-- Undo:   run 108-push.sql again (the players turn the notification on again).
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c108r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_push_pick(timestamptz, integer);
  drop function if exists public.cards_push_result(uuid, boolean);
  drop function if exists public.cards_push_drop(text);
  drop function if exists public.cards_push_delete(uuid, text);
  drop function if exists public.cards_push_upsert(uuid, text, text, text, timestamptz);
  drop table if exists public.cards_push_subs;

  notify pgrst, 'reload schema';
end $c108r$;
