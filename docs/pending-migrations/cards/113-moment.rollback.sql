-- 113-moment.rollback.sql (KpopCards lots 3 + 4 + 5): undo of 113-moment.sql.
--
-- What:   drops cards_moment and the column cards_photos.event_precision (with its check).
-- Why:    without 113 the card view has no "moment" data; the route /api/cards/card/{n} then fails, so switch NET_CARDS off or deploy the code from before.
-- Rows:   the column holds derived precision words only ('day' for every stored date): nothing is lost.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_moment';   expect 0
-- Undo:   run 113-moment.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c113r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_moment(uuid, integer);
  alter table public.cards_photos drop constraint if exists cards_photos_event_precision_check;
  alter table public.cards_photos drop column if exists event_precision;

  notify pgrst, 'reload schema';
end $c113r$;
