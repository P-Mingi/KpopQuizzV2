-- L32-l1-character-refs.sql (lane charrefs, run O1, owner 2026-11-10)
-- o1-transaction: single, ONE DO block
--
-- UNDONE (owner, 2026-11-11): every reference was deleted and the bucket removed; L32-l1-character-refs.rollback.sql drops the table.
--         Do not run this file again: it refuses at once.
--
-- What:   the PRIVATE store of the Fandom reference pictures of the OtakuQuiz characters, for the owner's admin screen only:
--           - storage bucket "character-refs", public = false, images only (png, jpeg, webp, gif), 10 MB at most per file, and NO policy on
--             storage.objects for anon or authenticated (only the service role, which bypasses RLS, reads or writes it);
--           - table public.character_reference_images (one row per character: the reference and its Fandom credits, the owner's free
--             candidate and its credits, the published state), RLS on, NO policy, every privilege revoked from anon and authenticated.
--         A reference is never shown on the site, before or after PRIVATE_LAUNCH=0: no public route reads this table or this bucket.
-- Needs:  Supabase storage (storage.buckets, storage.objects). Nothing else.
-- WHEN:   before the first run of out/otaku-refs-tool/fetch-refs.mjs --upload (it refuses to upload while the bucket is missing or public).
--         It may go before the code of the admin screen. Never during a build, never between 23:50 and 00:30 UTC, after a backup.
-- Undo:   L32-l1-character-refs.rollback.sql (drops the table and the bucket; it refuses while the bucket still holds files).
-- Shape:  ONE do block, no temp table, safe to run twice (a bucket made public by hand is made private again; an existing table is kept,
--         with its rows, and its RLS and privileges are set again).
--
-- Verify (after the apply):
-- Verify: select public from storage.buckets where id = 'character-refs';   expect false
-- Verify: select relrowsecurity from pg_class where oid = 'public.character_reference_images'::regclass;   expect true
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename = 'character_reference_images';   expect 0
-- Verify: select count(*) from pg_policies where schemaname = 'storage' and (coalesce(qual, '') || coalesce(with_check, '')) like '%character-refs%';   expect 0
-- Verify: select has_table_privilege('anon', 'public.character_reference_images', 'SELECT');   expect false
-- Verify: select has_table_privilege('authenticated', 'public.character_reference_images', 'SELECT');   expect false
-- Verify: select count(*) from public.character_reference_images where status not in ('reference', 'candidate', 'published');   expect 0

do $o1l32$
begin
  raise exception 'L32 is undone (owner, 2026-11-11: the character references are deleted). Do not run it again.';
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('storage.buckets') is null then raise exception 'L32: storage.buckets does not exist (Supabase storage is needed)'; end if;

  -- 1. the private bucket
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('character-refs', 'character-refs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

  if exists (select 1 from pg_policies where schemaname = 'storage' and (coalesce(qual, '') || coalesce(with_check, '')) like '%character-refs%') then
    raise exception 'L32: a storage policy names the bucket character-refs: remove it, the bucket must have none';
  end if;

  -- 2. the admin-only table
  create table if not exists public.character_reference_images (
    site_id                  text not null default 'anime',
    series_slug              text not null,
    character_slug           text not null,
    status                   text not null default 'reference' check (status in ('reference', 'candidate', 'published')),
    reference_path           text,
    reference_page_url       text,
    reference_image_url      text,
    reference_file_page_url  text,
    reference_author         text,
    reference_license        text,
    reference_found_by       text,
    reference_fetched_at     timestamptz,
    reference_uploaded_at    timestamptz,
    candidate_path           text,
    candidate_source_url     text,
    candidate_author         text,
    candidate_license        text,
    candidate_license_url    text,
    candidate_uploaded_at    timestamptz,
    published_at             timestamptz,
    primary key (site_id, series_slug, character_slug)
  );

  alter table public.character_reference_images enable row level security;
  revoke all on table public.character_reference_images from anon, authenticated;
  revoke all on table public.character_reference_images from public;

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'character_reference_images') then
    raise exception 'L32: public.character_reference_images has a policy: remove it, the table must have none';
  end if;
  if has_table_privilege('anon', 'public.character_reference_images', 'SELECT')
     or has_table_privilege('authenticated', 'public.character_reference_images', 'SELECT') then
    raise exception 'L32: anon or authenticated can still read public.character_reference_images';
  end if;
  if (select public from storage.buckets where id = 'character-refs') is distinct from false then
    raise exception 'L32: the bucket character-refs is not private';
  end if;
end $o1l32$;
