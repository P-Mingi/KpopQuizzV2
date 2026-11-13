-- 103-catalog-photos.rollback.sql (undo of 103-catalog-photos.sql)
--
-- What:   empties cards_catalog, cards_photos and cards_entities, drops cards_build_catalog(), cards_photo_ready() and its trigger, and gives
--         cards_photos back the shape of 102 (no sha1, quality, stage, event_date_precision, news_only; slot 1 to 3). The catalog stays
--         EMPTY: apply 102-catalog-rebuild.sql again to get the one-photo catalog of lot 2 back.
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs).
-- Verify: select count(*) from public.cards_catalog;   expect 0
-- Verify: select count(*) from pg_proc where proname in ('cards_build_catalog', 'cards_photo_ready');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name in ('sha1', 'quality', 'stage', 'event_date_precision', 'news_only');   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $c103r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null then
    return;
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '103-catalog-photos rollback: a player owns a card';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '103-catalog-photos rollback: a pack was opened';
  end if;

  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  drop trigger if exists cards_photos_ready on public.cards_photos;
  drop function if exists public.cards_photo_ready();
  drop function if exists public.cards_build_catalog();
  alter table public.cards_photos drop constraint if exists cards_photos_quality_check;
  alter table public.cards_photos drop constraint if exists cards_photos_event_date_precision_check;
  alter table public.cards_photos drop column if exists sha1;
  alter table public.cards_photos drop column if exists quality;
  alter table public.cards_photos drop column if exists stage;
  alter table public.cards_photos drop column if exists event_date_precision;
  alter table public.cards_photos drop column if exists news_only;
  alter table public.cards_photos drop constraint if exists cards_photos_slot_check;
  alter table public.cards_photos add constraint cards_photos_slot_check check (slot between 1 and 3);
end $c103r$;
