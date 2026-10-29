-- 018-entity-images.sql (run O1, lane ADM back, owner request of 2026-10-26)
--
-- What:   creates public.entity_images (one image per site, kind and slug: kind 'series' or 'character'; the slug of a
--         character is '<series slug>/<character slug>' because a character slug is unique per series only), with the focal
--         point (0 to 100), the credit (source_url, author, license, license_note) and the path of the file in the Storage
--         bucket 'entity-images'; RLS on, no write policy (only the service role writes: the admin routes of the app);
--         anon and authenticated may SELECT only the display columns (column grants), through one select policy;
--         creates the Storage bucket 'entity-images' (public read, WebP only, 4 MB per file) with no insert, update or
--         delete policy for anon or authenticated; a trigger keeps updated_at.
-- Why:    the owner uploads the photo of each series and each character from /admin on bunnyverse.org/anime. Files are copied into
--         the bucket (never hot-linked); the app reads the row first, then the bundled series photo, then the neutral
--         placeholder. The file path ends with a content hash, so a replaced image never serves stale bytes.
-- Rows:   1 table, 1 trigger function, 1 trigger, 1 policy, 1 bucket; no entity_images row is inserted by the file.
-- Needs:  001 (public.sites). Nothing in 011 is referenced: the slug is text, so the table also works before the series exist.
-- Verify: select relname, relrowsecurity from pg_class where oid = 'public.entity_images'::regclass;   expect entity_images t
--         select has_table_privilege('anon', 'public.entity_images', 'insert'), has_table_privilege('authenticated', 'public.entity_images', 'update'), has_column_privilege('anon', 'public.entity_images', 'created_by', 'select'), has_column_privilege('anon', 'public.entity_images', 'path', 'select');   expect f, f, f, t
--         select id, public, file_size_limit from storage.buckets where id = 'entity-images';   expect entity-images, t, 4194304
--         select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (policyname ilike '%entity-images%' or qual ilike '%entity-images%' or with_check ilike '%entity-images%');   expect 0
-- Undo:   018-entity-images.rollback.sql (refused while a row or a file of the bucket exists).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null then
    raise exception '018-entity-images: public.sites is missing (apply 001 first)';
  end if;
end $$;

create table if not exists public.entity_images (
  id bigint generated always as identity constraint entity_images_pkey primary key,
  site_id text not null constraint entity_images_site_id_fkey references public.sites(id),
  kind text not null constraint entity_images_kind_check check (kind in ('series', 'character')),
  slug text not null constraint entity_images_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}(/[a-z0-9][a-z0-9-]{0,59})?$' and (kind = 'series') = (position('/' in slug) = 0)),
  path text not null constraint entity_images_path_check check (path ~ '^[a-z0-9][a-z0-9/_.-]*[.]webp$' and path not like '%..%'),
  width integer not null constraint entity_images_width_check check (width > 0),
  height integer not null constraint entity_images_height_check check (height > 0),
  focal_x numeric(5, 2) not null default 50 constraint entity_images_focal_x_check check (focal_x >= 0 and focal_x <= 100),
  focal_y numeric(5, 2) not null default 50 constraint entity_images_focal_y_check check (focal_y >= 0 and focal_y <= 100),
  source_url text not null constraint entity_images_source_url_check check (source_url ~ '^https?://' and char_length(source_url) <= 2000),
  author text not null constraint entity_images_author_check check (char_length(btrim(author)) between 1 and 200),
  license text not null constraint entity_images_license_check check (license in ('cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed', 'other')),
  license_note text constraint entity_images_license_note_check check (license_note is null or char_length(license_note) <= 500),
  created_by uuid constraint entity_images_created_by_fkey references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_images_site_kind_slug_key unique (site_id, kind, slug),
  constraint entity_images_other_note_check check (license <> 'other' or (license_note is not null and char_length(btrim(license_note)) > 0))
);

create or replace function public.entity_images_touch() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.entity_images_touch() from public, anon, authenticated;

drop trigger if exists trg_entity_images_touch on public.entity_images;
create trigger trg_entity_images_touch before update on public.entity_images
  for each row execute function public.entity_images_touch();

alter table public.entity_images enable row level security;

-- Browser roles: read the display columns of every row, write nothing. Supabase grants new tables to anon and authenticated by
-- default, so everything is revoked first and the column grants below are the whole list.
revoke all on table public.entity_images from public, anon, authenticated;
grant select (site_id, kind, slug, path, width, height, focal_x, focal_y, license, author, source_url, license_note, updated_at)
  on public.entity_images to anon, authenticated;
grant all on table public.entity_images to service_role;

drop policy if exists entity_images_select_display on public.entity_images;
create policy entity_images_select_display on public.entity_images for select to anon, authenticated using (true);

-- Storage: one public bucket, WebP only. No policy on storage.objects is created: a public bucket serves its files by URL without
-- one, and without an insert, update or delete policy only the service role (the admin routes) can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entity-images', 'entity-images', true, 4194304, array['image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 4194304, allowed_mime_types = array['image/webp'];
