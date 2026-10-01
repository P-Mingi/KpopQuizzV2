-- v11 P10 - passport header pictures: the `profile-headers` storage bucket.
-- OWNER-RUN. Not applied by any agent. Nothing else changes (profiles.header_url
-- already exists, migration 114).
--
-- Note for the owner (one paragraph): the v11 passport lets a fan change the band
-- behind their passport ("Change header": upload JPG / PNG / WebP up to 5 MB, or
-- paste a link) (DESIGN-SPEC 17.8). The two routes that do it,
-- POST /api/profile/header/upload and POST /api/profile/header/link, never
-- hot-link: they check the file (declared type, 5 MB, magic bytes), fetch a
-- pasted link server side with the SSRF guard (https only, public addresses only
-- after DNS, connection pinned to the vetted address, redirects re-checked,
-- timeouts, 5 MB streaming cap), decode it with sharp (pixel cap), crop it to
-- 1500 x 300 and re-encode it as WebP (which drops EXIF / GPS), then upload it
-- with the SERVICE ROLE under `<user id>/<time>-<hash>.webp` and save the public
-- URL to the user's own profiles.header_url (their own session, RLS). Until this
-- bucket exists both routes answer 503 "Header pictures are not switched on yet"
-- BEFORE any write (they ask storage.getBucket first), and the sheet shows that
-- message; "Use the theme colour" keeps working. Run this once to switch it on.
-- Alternative with no DDL: point HEADER_BUCKET (lib/ux-v1/p10/header-store.ts)
-- at the existing public `avatars` bucket (migration 103); a dedicated bucket is
-- cleaner (own size and type limits, own cleanup).
--
-- Security choices:
--   * public = true so the passport can show the image by its public URL (the
--     /u/[username] page is static / ISR and cookie-free);
--   * NO policy on storage.objects for this bucket: public objects are served by
--     their public URL without RLS, uploads and deletes go through the service
--     role (which bypasses RLS), and without a SELECT policy nobody can LIST the
--     bucket through the API (the folder names are user ids);
--   * the bucket itself only accepts WebP up to 1 MB (the routes always store a
--     re-encoded 1500 x 300 WebP, typically 40 to 200 KB), so even a leaked
--     service key cannot turn it into a general file host.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-headers', 'profile-headers', true, 1048576, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Check after running (read only):
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'profile-headers';
--   select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
--     and (qual like '%profile-headers%' or with_check like '%profile-headers%');   -- expect 0
