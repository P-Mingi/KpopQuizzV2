-- 122-pulls-feed.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP): undo of 122-pulls-feed.sql.
--
-- What:   drops cards_pulls_recent and the index cards_packs_opened_idx.
-- Why:    without 122 the pulls feed of the community page has no data; it then reads as no block (the page keeps working). Switch NET_CARDS_BRIDGES off or deploy the code from before.
-- Rows:   no row is touched: the function only read, the index is derived.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_pulls_recent';   expect 0
-- Verify: select count(*) from pg_indexes where schemaname = 'public' and indexname = 'cards_packs_opened_idx';   expect 0
-- Undo:   run 122-pulls-feed.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c122r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_pulls_recent(integer, timestamptz);
  drop index if exists public.cards_packs_opened_idx;

  notify pgrst, 'reload schema';
end $c122r$;
