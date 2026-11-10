-- L32-l1-character-refs.rollback.sql (lane charrefs, run O1, owner 2026-11-10)
-- o1-transaction: single, ONE DO block
--
-- What:   undoes L32: drops public.character_reference_images and deletes the storage bucket "character-refs".
--         It refuses while the bucket still holds files: Supabase deletes stored files only through the Storage API, so empty the bucket
--         first (Storage, character-refs, select all, delete), then run this file. The table's rows (references, candidates, credits) are
--         lost with it: a published picture stays published (it lives in entity_images and the public bucket entity-images, untouched).
-- WHEN:   any time, after a backup, never during a build, never between 23:50 and 00:30 UTC.
-- Shape:  ONE do block, safe to run twice.
--
-- Verify (after the rollback):
-- Verify: select to_regclass('public.character_reference_images');   expect NULL
-- Verify: select count(*) from storage.buckets where id = 'character-refs';   expect 0

do $o1l32r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('storage.objects') is not null
     and exists (select 1 from storage.objects where bucket_id = 'character-refs') then
    raise exception 'L32 rollback: the bucket character-refs still holds files: empty it from the Storage page first, then run this file again';
  end if;

  drop table if exists public.character_reference_images;
  delete from storage.buckets where id = 'character-refs';
end $o1l32r$;
