-- LOGOS lane (run O1): set logo_url to NULL for the 11 groups that have no logo or photo object anywhere in Storage.
--
-- These 11 rows still point at the deleted bucket game-images (HTTP 400): 2ne1, 2pm, babymonster, bigbang, boynextdoor,
-- fx, girls-generation, nct-127, nct-dream, riize, wonder-girls. No object exists for them in group-logos, in
-- images/group-photos or anywhere else in Storage (storage.objects checked by name on 2026-11-04). No URL is invented.
-- Why NULL beats the dead URL (checked in the code): GroupLogo draws the initials tile at once instead of requesting a
-- URL that fails (and flashing a broken image first); the raw <img> spots (related quizzes on the group quiz page, the
-- news branded fallback, the "hottest group" cell) skip the <img> on NULL and show the group name; the OG cards use the
-- abbreviation pill, as they do now. The quiz thumbs and cards already use groupPhotoUrl (the site's /idols photos exist
-- for all 11), so nothing there changes.
--
-- OPTIONAL and OWNER-GATED: not applied. Independent of 001. Rollback: 002-group-logo-urls-null-unfixable.rollback.sql.
-- Safety: one transaction; each row changes only if logo_url still equals the exact old value (second run: no change).

begin;

create temporary table logo_null (
  slug text primary key, old_url text not null
) on commit drop;

insert into logo_null (slug, old_url) values
  ('2ne1', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/2ne1.jpg'),
  ('2pm', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/2pm.jpg'),
  ('babymonster', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/babymonster.jpg'),
  ('bigbang', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/bigbang.jpg'),
  ('boynextdoor', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/boynextdoor.jpg'),
  ('fx', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/fx.jpg'),
  ('girls-generation', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/girls-generation.jpg'),
  ('nct-127', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/nct-127.jpg'),
  ('nct-dream', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/nct-dream.jpg'),
  ('riize', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/riize.jpg'),
  ('wonder-girls', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/wonder-girls.jpg');

with changed as (
  update public.groups g
     set logo_url = null
    from logo_null f
   where g.slug = f.slug
     and g.logo_url = f.old_url
  returning g.slug
)
select count(*) as rows_nulled, (select count(*) from logo_null) as rows_in_file from changed;

commit;
