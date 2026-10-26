-- 018-entity-images.rollback.sql (run O1, lane ADM back): undo of 018-entity-images.sql.
--
-- What:   drops public.entity_images (its trigger, policy and constraints go with it), the function entity_images_touch() and the
--         Storage bucket 'entity-images'.
-- Why:    the rollback of the admin images table and bucket.
-- Rows:   Refused, with nothing changed, while the table holds a row or the bucket holds a file (the owner's photos would be lost:
--         empty the bucket and the table deliberately first).
-- Verify: select to_regclass('public.entity_images'), (select count(*) from storage.buckets where id = 'entity-images');   expect null, 0
-- Undo:   run 018-entity-images.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('public.entity_images') is not null then
    execute 'select count(*) from public.entity_images' into n;
    if n > 0 then
      raise exception '018-entity-images rollback refused: % entity_images row(s) exist', n;
    end if;
  end if;
  select count(*) into n from storage.objects where bucket_id = 'entity-images';
  if n > 0 then
    raise exception '018-entity-images rollback refused: % file(s) are in the bucket entity-images', n;
  end if;
end $$;

drop table if exists public.entity_images;
drop function if exists public.entity_images_touch();
-- Storage refuses a direct delete unless this setting is on (its protect_delete trigger); the bucket is empty here (checked above).
set local storage.allow_delete_query = 'true';
delete from storage.buckets where id = 'entity-images';
