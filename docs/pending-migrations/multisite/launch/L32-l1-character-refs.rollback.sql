-- L32-l1-character-refs.rollback.sql (lane charrefs, run O1, owner 2026-11-10; rewritten lane norefs, owner 2026-11-11)
-- o1-transaction: single, ONE DO block
--
-- What:   undoes L32: drops public.character_reference_images, the private table of the character references (AniList and Fandom
--         pictures). Owner's decision 2026-11-11: every reference is deleted, only the public pictures stay.
--         ALREADY DONE before this file, by ORCH through the Storage API and the service role (owner's yes, 2026-11-11 about 20:50 UTC):
--           - the 1,075 files of the bucket "character-refs" removed, then the empty bucket deleted;
--           - the 1,075 rows of the table deleted (0 left).
--         So this file only drops the empty table. It never deletes from storage.buckets or storage.objects: Supabase refuses any SQL
--         delete there (trigger storage.protect_delete, "Use the Storage API instead"), even for zero rows.
--         It refuses while the bucket still exists (delete it from the Storage page first) or while the table still holds a row.
--         Public pictures are untouched: entity_images and the public bucket entity-images.
-- WHEN:   after the PR that removes the "Références personnages" screen is merged and deployed (the old screen read this table).
--         Never during a build, never between 23:50 and 00:30 UTC.
-- Shape:  ONE do block, safe to run twice.
--
-- Verify (after the rollback):
-- Verify: select to_regclass('public.character_reference_images');   expect NULL
-- Verify: select count(*) from storage.buckets where id = 'character-refs';   expect 0
-- Verify: select count(*) from storage.objects where bucket_id = 'character-refs';   expect 0

do $o1l32r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);
  if to_regclass('storage.buckets') is not null
     and exists (select 1 from storage.buckets where id = 'character-refs') then
    raise exception 'L32 rollback: the bucket character-refs still exists: empty and delete it from the Storage page first, then run this file again';
  end if;
  if to_regclass('public.character_reference_images') is not null then
    if exists (select 1 from public.character_reference_images) then
      raise exception 'L32 rollback: public.character_reference_images still holds rows: stopped, nothing dropped';
    end if;
    drop table public.character_reference_images;
  end if;
end $o1l32r$;
