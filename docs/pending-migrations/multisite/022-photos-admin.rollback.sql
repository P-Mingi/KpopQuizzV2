-- 022-photos-admin.rollback.sql (run O1, daily games step 2): undo of 022-photos-admin.sql.
--
-- What:   drops the views site_assets_public and entity_images_public, the tables site_assets and agencies (their triggers, checks and
--         identity sequences go with them), the two triggers of entity_images that reset the check, the functions photos_touch(),
--         agencies_sources_ok(text[]), entity_images_licence_listed() and entity_images_licence_reset(), the checks 022 added to
--         entity_images, and puts back the kind and slug checks of 018 (series and character only) and its select policy (every row).
--         The columns license_verified and thumb_path stay: they are 019's. Nothing else is restored: the sequence grants 022 revoked
--         belonged to its own tables.
-- Why:    the rollback of step 2's tables.
-- Rows:   Refused, with nothing changed, while entity_images holds a picture of an idol, a group or an agency, while site_assets
--         holds a row (the owner's banners, icons and stickers would be lost), or while an agency carries what the owner typed (a
--         mother company, an official site, a source, or any edit after it was added). The files of the bucket are 018's: this file
--         never touches them.
-- Verify: select to_regclass('public.site_assets'), to_regclass('public.agencies'), to_regclass('public.site_assets_public'), to_regclass('public.entity_images_public');   expect null, null, null, null
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'entity_images_kind_check';   expect series and character only
-- Undo:   run 022-photos-admin.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('public.entity_images') is not null then
    execute 'select count(*) from public.entity_images where kind not in (''series'', ''character'')' into n;
    if n > 0 then
      raise exception '022-photos-admin rollback refused: % picture(s) of an idol, a group or an agency exist in entity_images', n;
    end if;
  end if;
  if to_regclass('public.site_assets') is not null then
    execute 'select count(*) from public.site_assets' into n;
    if n > 0 then
      raise exception '022-photos-admin rollback refused: % site_assets row(s) exist (banners, card images, icons or stickers)', n;
    end if;
  end if;
  if to_regclass('public.agencies') is not null then
    execute 'select count(*) from public.agencies where parent_id is not null or official_url is not null or cardinality(sources) > 0 or updated_at > created_at' into n;
    if n > 0 then
      raise exception '022-photos-admin rollback refused: % agency row(s) carry what the owner typed (mother company, official site or sources)', n;
    end if;
  end if;
end $$;

drop view if exists public.entity_images_public;
drop view if exists public.site_assets_public;
drop table if exists public.site_assets;
drop table if exists public.agencies;
drop function if exists public.photos_touch();
drop function if exists public.agencies_sources_ok(text[]);

do $$
begin
  if to_regclass('public.entity_images') is not null then
    drop trigger if exists trg_entity_images_licence_reset on public.entity_images;
    drop trigger if exists trg_entity_images_licence_listed on public.entity_images;
    drop policy if exists entity_images_select_display on public.entity_images;
    create policy entity_images_select_display on public.entity_images for select to anon, authenticated using (true);
    alter table public.entity_images drop constraint if exists entity_images_verified_thumb_check;
    alter table public.entity_images drop constraint if exists entity_images_kpop_source_check;
    alter table public.entity_images drop constraint if exists entity_images_kind_site_check;
    alter table public.entity_images drop constraint if exists entity_images_kind_check;
    alter table public.entity_images add constraint entity_images_kind_check check (kind in ('series', 'character'));
    alter table public.entity_images drop constraint if exists entity_images_slug_check;
    alter table public.entity_images add constraint entity_images_slug_check
      check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}(/[a-z0-9][a-z0-9-]{0,59})?$' and (kind = 'series') = (position('/' in slug) = 0));
  end if;
end $$;
drop function if exists public.entity_images_licence_reset();
drop function if exists public.entity_images_licence_listed();

notify pgrst, 'reload schema';
