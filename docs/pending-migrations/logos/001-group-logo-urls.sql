-- LOGOS lane (run O1): repoint 46 groups.logo_url rows that point at the deleted Storage bucket `game-images`.
--
-- Why: 57 of the 100 rows of public.groups have logo_url = <project>/storage/v1/object/public/game-images/group/<slug>.jpg.
-- The bucket game-images was deleted with the mini games (refonte plan docs/refonte/DB-CLEANUP-PLAN.md, 2026-09-19) and
-- nothing repointed the groups; every one of those URLs answers HTTP 400 today.
--
-- What this file does (46 rows, each target checked HTTP 200 image/jpeg on 2026-11-04 and present in storage.objects):
--   - blackpink: the real logo file group-logos/blackpink.jpg (the same bucket as the 29 groups whose logo already works).
--   - 45 groups: the Commons group photo images/group-photos/<slug>.jpg, the very object the site already serves for the
--     group photo (groupPhotoUrl, group-photo-credits.ts). It is a photo, not a logo: GroupLogo crops it square
--     (object-cover). If you prefer the initials tile for these 45, do not run the "photos" block (delete the 45 rows
--     whose bucket is 'images' from the VALUES list) or run 002 only.
-- The 11 groups with no object anywhere (2ne1, 2pm, babymonster, bigbang, boynextdoor, fx, girls-generation, nct-127,
-- nct-dream, riize, wonder-girls) are NOT touched here: see 002-group-logo-urls-null-unfixable.sql.
--
-- OWNER-GATED: not applied. Rollback: 001-group-logo-urls.rollback.sql. Check: V-logos.sql.
-- Safety: one transaction. Each row changes only if logo_url still equals the exact old value (a second run changes
-- nothing; a row edited since is skipped). If any target object is missing from storage.objects nothing is applied.
-- No trigger on public.groups, no materialized view reads logo_url (the three RPCs that return it read it live).

begin;

create temporary table logo_fix (
  slug text primary key, old_url text not null, new_url text not null, bucket text not null, obj text not null
) on commit drop;

insert into logo_fix (slug, old_url, new_url, bucket, obj) values
  ('apink', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/apink.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/apink.jpg', 'images', 'group-photos/apink.jpg'),
  ('artms', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/artms.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/artms.jpg', 'images', 'group-photos/artms.jpg'),
  ('bibi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/bibi.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/bibi.jpg', 'images', 'group-photos/bibi.jpg'),
  ('billlie', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/billlie.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/billlie.jpg', 'images', 'group-photos/billlie.jpg'),
  ('blackpink', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/blackpink.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/group-logos/blackpink.jpg', 'group-logos', 'blackpink.jpg'),
  ('chungha', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/chungha.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/chungha.jpg', 'images', 'group-photos/chungha.jpg'),
  ('cortis', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/cortis.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/cortis.jpg', 'images', 'group-photos/cortis.jpg'),
  ('day6', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/day6.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/day6.jpg', 'images', 'group-photos/day6.jpg'),
  ('fifty-fifty', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/fifty-fifty.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/fifty-fifty.jpg', 'images', 'group-photos/fifty-fifty.jpg'),
  ('fromis-9', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/fromis-9.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/fromis-9.jpg', 'images', 'group-photos/fromis-9.jpg'),
  ('heize', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/heize.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/heize.jpg', 'images', 'group-photos/heize.jpg'),
  ('hwasa', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/hwasa.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/hwasa.jpg', 'images', 'group-photos/hwasa.jpg'),
  ('hyuna', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/hyuna.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/hyuna.jpg', 'images', 'group-photos/hyuna.jpg'),
  ('ikon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/ikon.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/ikon.jpg', 'images', 'group-photos/ikon.jpg'),
  ('illit', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/illit.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/illit.jpg', 'images', 'group-photos/illit.jpg'),
  ('iu', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/iu.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/iu.jpg', 'images', 'group-photos/iu.jpg'),
  ('jay-park', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jay-park.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jay-park.jpg', 'images', 'group-photos/jay-park.jpg'),
  ('jennie', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jennie.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg', 'images', 'group-photos/jennie.jpg'),
  ('jeon-somi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jeon-somi.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jeon-somi.jpg', 'images', 'group-photos/jeon-somi.jpg'),
  ('jimin', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jimin.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jimin.jpg', 'images', 'group-photos/jimin.jpg'),
  ('jungkook', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jungkook.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jungkook.jpg', 'images', 'group-photos/jungkook.jpg'),
  ('kara', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/kara.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kara.jpg', 'images', 'group-photos/kara.jpg'),
  ('katseye', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/katseye.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/katseye.jpg', 'images', 'group-photos/katseye.jpg'),
  ('kickflip', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/kickflip.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kickflip.jpg', 'images', 'group-photos/kickflip.jpg'),
  ('kiss-of-life', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/kiss-of-life.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kiss-of-life.jpg', 'images', 'group-photos/kiss-of-life.jpg'),
  ('loona', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/loona.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/loona.jpg', 'images', 'group-photos/loona.jpg'),
  ('loossemble', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/loossemble.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/loossemble.jpg', 'images', 'group-photos/loossemble.jpg'),
  ('miss-a', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/miss-a.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/miss-a.jpg', 'images', 'group-photos/miss-a.jpg'),
  ('p1harmony', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/p1harmony.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/p1harmony.jpg', 'images', 'group-photos/p1harmony.jpg'),
  ('pentagon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/pentagon.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/pentagon.jpg', 'images', 'group-photos/pentagon.jpg'),
  ('psy', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/psy.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/psy.jpg', 'images', 'group-photos/psy.jpg'),
  ('purple-kiss', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/purple-kiss.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/purple-kiss.jpg', 'images', 'group-photos/purple-kiss.jpg'),
  ('rose', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/rose.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/rose.jpg', 'images', 'group-photos/rose.jpg'),
  ('sistar', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/sistar.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/sistar.jpg', 'images', 'group-photos/sistar.jpg'),
  ('sunmi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/sunmi.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/sunmi.jpg', 'images', 'group-photos/sunmi.jpg'),
  ('t-ara', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/t-ara.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/t-ara.jpg', 'images', 'group-photos/t-ara.jpg'),
  ('taeyang', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/taeyang.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/taeyang.jpg', 'images', 'group-photos/taeyang.jpg'),
  ('taeyeon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/taeyeon.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/taeyeon.jpg', 'images', 'group-photos/taeyeon.jpg'),
  ('the-boyz', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/the-boyz.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/the-boyz.jpg', 'images', 'group-photos/the-boyz.jpg'),
  ('triples', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/triples.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/triples.jpg', 'images', 'group-photos/triples.jpg'),
  ('tws', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/tws.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/tws.jpg', 'images', 'group-photos/tws.jpg'),
  ('v-bts', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/v-bts.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/v-bts.jpg', 'images', 'group-photos/v-bts.jpg'),
  ('winner', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/winner.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/winner.jpg', 'images', 'group-photos/winner.jpg'),
  ('xikers', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/xikers.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/xikers.jpg', 'images', 'group-photos/xikers.jpg'),
  ('zerobaseone', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/zerobaseone.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/zerobaseone.jpg', 'images', 'group-photos/zerobaseone.jpg'),
  ('zico', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/zico.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/zico.jpg', 'images', 'group-photos/zico.jpg');

do $$
declare
  missing int;
begin
  select count(*) into missing
  from logo_fix f
  where not exists (select 1 from storage.objects o where o.bucket_id = f.bucket and o.name = f.obj);
  if missing > 0 then
    raise exception 'logos 001: % target object(s) missing in storage.objects, nothing applied', missing;
  end if;
end $$;

with changed as (
  update public.groups g
     set logo_url = f.new_url
    from logo_fix f
   where g.slug = f.slug
     and g.logo_url = f.old_url
  returning g.slug
)
select count(*) as rows_repointed, (select count(*) from logo_fix) as rows_in_file from changed;

commit;
