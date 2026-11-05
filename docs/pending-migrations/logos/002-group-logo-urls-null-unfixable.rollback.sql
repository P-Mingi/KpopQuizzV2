-- LOGOS lane (run O1): rollback of 002-group-logo-urls-null-unfixable.sql.
-- Restores the 11 old logo_url values byte for byte, only on rows whose logo_url is still NULL (a row given a new
-- logo since is left alone). Running it twice changes nothing.
-- Note: the restored URLs answer HTTP 400 (the bucket game-images no longer exists).

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
     set logo_url = f.old_url
    from logo_null f
   where g.slug = f.slug
     and g.logo_url is null
  returning g.slug
)
select count(*) as rows_restored, (select count(*) from logo_null) as rows_in_file from changed;

commit;
