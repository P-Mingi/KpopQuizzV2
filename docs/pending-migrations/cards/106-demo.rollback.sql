-- 106-demo.rollback.sql (Bunnyverse Cards lot 3): undo of 106-demo.sql.
--
-- What:   drops cards_demo_claim() and the table cards_demo_claims. The cards that demo claims added to binders stay (they are ordinary
--         cards_owned rows); only the record of the claims goes, so a token not yet claimed could be claimed again if the file is applied again.
-- Why:    without the function the demo routes answer that the demo cannot be attached; the pages still show the demo pack.
-- Rows:   1 function and 1 table dropped. The rows of cards_demo_claims (token ids and salted hashes) are deleted with it.
-- Verify: select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'cards_demo_claims';   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_demo_claim';   expect 0
-- Undo:   run 106-demo.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c106r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz);
  drop table if exists public.cards_demo_claims;
end $c106r$;
