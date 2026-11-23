-- L38-l1-character-pictures-live.sql (owner, 2026-11-23: every anime character picture goes live; ORCH of run O1)
--
-- What:   in ONE DO block, every picture of an anime character (public.entity_images, site_id anime, kind character) that has its 96 px file is marked
--         license_verified = true, the flag the site reads before it shows a character picture (lib/anime/entity-images-read.ts, the view
--         entity_images_public of 022, the Otakudle views of 023, 024, L18 and L23). In the same statement a source page written http:// becomes
--         https:// (the view passes on an https source page or none; the rest of the address is kept). A picture already verified is touched only
--         for that https move. A picture with no 96 px file cannot be verified (entity_images_verified_thumb_check of 022) and stays hidden: the
--         notice gives their number; saving them again in the admin makes the file, and apps/quiz/scripts/cards/character-thumbs/character-thumbs.mjs
--         (owner-run, with the service key) makes it for all of them at once; then run this file again.
--         Each changed row is written first to public.o1_l38_verified_pictures (its id, its former flag and former source page), a table with RLS on
--         and no grant to the browser roles, so the rollback restores exactly those rows.
-- Why:    the owner, 2026-11-23: "je veux que tu ecrives un script qui les fasse toutes cocher en accepte, c'est moi qui ai tout publie", and in the same
--         message, informed that the pictures of the import of 2026-11-11 ("Official artwork, rights belong to the original creators and studio") and the
--         ones taken from Fandom are not free (decision of 2026-11-13) and that publishing them is a legal risk: "j'accepte". The owner takes that risk.
-- Rows:   updates the character pictures that are unverified or carry an http source page and have a 96 px file; inserts one row per changed
--         picture into the new log table. No file, licence, credit, slug or other kind of picture is changed. The series pictures are untouched.
-- Effect: bunnyverse.org/anime: the character pictures of the series hubs, the personality pages and the Otakudle games show once the cached reads
--         expire (at most one hour). The admin's button "Supprimer les images non libres" then finds nothing: it never selects a verified picture.
-- Needs:  018, 019 (license_verified), 022 (thumb_path, the check, the triggers, entity_images_public).
-- WHEN:   apply by the owner, never between 23:50 and 00:30 UTC, the Verify lines run after it.
-- Verify: select count(*) from public.entity_images where site_id = 'anime' and kind = 'character' and thumb_path is not null and not license_verified;   expect 0
-- Verify: select count(*) from public.entity_images where site_id = 'anime' and kind = 'character' and thumb_path is not null and source_url ~ '^http://';   expect 0
-- Verify: select count(*) from public.entity_images_public where site_id = 'anime' and kind = 'character';   expect the "now live" number of the notice
-- Verify: select count(*) from public.entity_images where site_id = 'anime' and kind = 'character' and thumb_path is null;   expect the "no 96 px file" number of the notice
-- Verify: select has_table_privilege('anon', 'public.o1_l38_verified_pictures', 'select'), has_table_privilege('authenticated', 'public.o1_l38_verified_pictures', 'select');   expect f, f
-- Undo:   L38-l1-character-pictures-live.rollback.sql (puts back the flag and the source page of every logged row, then drops the log table)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $l38$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_total integer := 0;
    v_done integer := 0;
    v_https integer := 0;
    v_nothumb integer := 0;
    v_live integer := 0;
  begin
  -- Prerequisites.
  if to_regclass('public.entity_images') is null then raise exception 'L38: public.entity_images is missing (018)'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name = 'license_verified') then
    raise exception 'L38: entity_images.license_verified is missing (019)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name = 'thumb_path') then
    raise exception 'L38: entity_images.thumb_path is missing (022)';
  end if;
  if to_regclass('public.entity_images_public') is null then raise exception 'L38: the view entity_images_public is missing (022)'; end if;

  -- The log of the rows this file changes (the rollback reads it). Never readable by the browser roles.
  if to_regclass('public.o1_l38_verified_pictures') is null then
    create table public.o1_l38_verified_pictures (
      image_id bigint primary key references public.entity_images(id) on delete cascade,
      was_verified boolean not null,
      old_source_url text,
      changed_at timestamptz not null default now()
    );
  end if;
  alter table public.o1_l38_verified_pictures enable row level security;
  revoke all on table public.o1_l38_verified_pictures from public, anon, authenticated;

  select count(*) into v_total from public.entity_images where site_id = 'anime' and kind = 'character';
  select count(*) into v_nothumb from public.entity_images where site_id = 'anime' and kind = 'character' and thumb_path is null;
  select count(*) into v_https from public.entity_images
   where site_id = 'anime' and kind = 'character' and thumb_path is not null and source_url ~ '^http://' and char_length(source_url) < 2000;

  -- Log, then change, the pictures to put live: unverified ones, and verified ones whose http source page keeps them out of the view.
  insert into public.o1_l38_verified_pictures (image_id, was_verified, old_source_url)
  select e.id, e.license_verified, e.source_url
    from public.entity_images e
   where e.site_id = 'anime' and e.kind = 'character' and e.thumb_path is not null
     and (not e.license_verified or (e.source_url ~ '^http://' and char_length(e.source_url) < 2000))
  on conflict (image_id) do nothing;

  -- One statement that names license_verified: the triggers of 022 keep the check although the source page changes.
  update public.entity_images e
     set license_verified = true,
         source_url = case when e.source_url ~ '^http://' and char_length(e.source_url) < 2000 then 'https://' || substr(e.source_url, 8) else e.source_url end
   where e.site_id = 'anime' and e.kind = 'character' and e.thumb_path is not null
     and (not e.license_verified or (e.source_url ~ '^http://' and char_length(e.source_url) < 2000));
  get diagnostics v_done = row_count;

  select count(*) into v_live from public.entity_images_public where site_id = 'anime' and kind = 'character';

  if v_done = 0 then
    raise notice 'L38: nothing to change (% character pictures, % now live, % with no 96 px file stay hidden)', v_total, v_live, v_nothumb;
  else
    raise notice 'L38: % character pictures checked (% sources moved to https); % now live of %; % with no 96 px file stay hidden (save them again in the admin)',
      v_done, v_https, v_live, v_total, v_nothumb;
  end if;
  end;
end $l38$;
