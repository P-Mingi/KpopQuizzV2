-- 114-catalog-append.rollback.sql (undo of 114-catalog-append.sql)
--
-- What:   drops public.cards_catalog_append(boolean). Nothing else: the cards a call with p_dry_run false already added stay in cards_catalog
--         (they may be owned; removing them would break players). To empty the catalog use 103-catalog-photos.rollback.sql, which refuses
--         once a player owns a card or opened a pack.
-- Refuses: nothing. Idempotent: a second run changes nothing.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_catalog_append';   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_build_catalog';   expect 1 (103 is untouched)
-- o1-transaction: single, ONE DO block.

do $c114r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_catalog_append(boolean);

  notify pgrst, 'reload schema';
end $c114r$;
