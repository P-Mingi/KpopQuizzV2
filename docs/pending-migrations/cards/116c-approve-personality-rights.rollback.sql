-- 116c-approve-personality-rights.rollback.sql (undo of 116c-approve-personality-rights.sql)
--
-- What:   puts the photos 116c approved (their note ends with "(approved with 116c-approve-personality-rights.sql)") back to pending, with their note as before.
--         Then press "Reconstruire le catalogue": until then the catalog still holds their cards.
-- Refuses: when a pack was opened (the catalog numbers cannot change any more).
-- Verify: select count(*) from public.cards_photos where right(review_note, 52) = ' (approved with 116c-approve-personality-rights.sql)';   expect 0
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c116cr$
declare
  v_n integer;
begin
  perform set_config('lock_timeout', '5s', true);
  if exists (select 1 from public.cards_packs) then
    raise exception '116c.rollback: a pack was opened, the catalog numbers cannot change: nothing changed';
  end if;
  update public.cards_photos
     set status = 'pending', review_note = left(review_note, length(review_note) - 52)
   where status = 'approved' and right(review_note, 52) = ' (approved with 116c-approve-personality-rights.sql)';
  get diagnostics v_n = row_count;
  raise notice '116c.rollback: % photos back to pending; now press "Reconstruire le catalogue"', v_n;
end $c116cr$;
