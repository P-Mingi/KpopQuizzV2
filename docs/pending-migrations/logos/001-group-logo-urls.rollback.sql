-- LOGOS lane (run O1): rollback of 001-group-logo-urls.sql.
-- Restores the 46 old logo_url values byte for byte (the dead game-images URLs), only on rows that still hold the
-- new value written by 001 (a row edited since is left alone). Running it twice changes nothing.
-- Note: restoring puts back 46 URLs that answer HTTP 400. Only roll back if the new targets caused a problem.

begin;

create temporary table logo_fix (
  slug text primary key, old_url text not null, new_url text not null
) on commit drop;

insert into logo_fix (slug, old_url, new_url) values
  ('apink', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/apink.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/apink.jpg'),
  ('artms', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/artms.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/artms.jpg'),
  ('bibi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/bibi.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/bibi.jpg'),
  ('billlie', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/billlie.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/billlie.jpg'),
  ('blackpink', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/blackpink.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/group-logos/blackpink.jpg'),
  ('chungha', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/chungha.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/chungha.jpg'),
  ('cortis', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/cortis.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/cortis.jpg'),
  ('day6', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/day6.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/day6.jpg'),
  ('fifty-fifty', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/fifty-fifty.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/fifty-fifty.jpg'),
  ('fromis-9', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/fromis-9.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/fromis-9.jpg'),
  ('heize', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/heize.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/heize.jpg'),
  ('hwasa', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/hwasa.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/hwasa.jpg'),
  ('hyuna', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/hyuna.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/hyuna.jpg'),
  ('ikon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/ikon.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/ikon.jpg'),
  ('illit', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/illit.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/illit.jpg'),
  ('iu', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/iu.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/iu.jpg'),
  ('jay-park', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jay-park.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jay-park.jpg'),
  ('jennie', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jennie.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg'),
  ('jeon-somi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jeon-somi.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jeon-somi.jpg'),
  ('jimin', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jimin.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jimin.jpg'),
  ('jungkook', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/jungkook.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jungkook.jpg'),
  ('kara', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/kara.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kara.jpg'),
  ('katseye', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/katseye.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/katseye.jpg'),
  ('kickflip', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/kickflip.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kickflip.jpg'),
  ('kiss-of-life', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/kiss-of-life.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kiss-of-life.jpg'),
  ('loona', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/loona.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/loona.jpg'),
  ('loossemble', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/loossemble.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/loossemble.jpg'),
  ('miss-a', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/miss-a.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/miss-a.jpg'),
  ('p1harmony', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/p1harmony.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/p1harmony.jpg'),
  ('pentagon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/pentagon.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/pentagon.jpg'),
  ('psy', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/psy.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/psy.jpg'),
  ('purple-kiss', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/purple-kiss.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/purple-kiss.jpg'),
  ('rose', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/rose.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/rose.jpg'),
  ('sistar', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/sistar.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/sistar.jpg'),
  ('sunmi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/sunmi.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/sunmi.jpg'),
  ('t-ara', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/t-ara.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/t-ara.jpg'),
  ('taeyang', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/taeyang.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/taeyang.jpg'),
  ('taeyeon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/taeyeon.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/taeyeon.jpg'),
  ('the-boyz', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/the-boyz.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/the-boyz.jpg'),
  ('triples', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/triples.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/triples.jpg'),
  ('tws', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/tws.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/tws.jpg'),
  ('v-bts', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/v-bts.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/v-bts.jpg'),
  ('winner', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/winner.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/winner.jpg'),
  ('xikers', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/xikers.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/xikers.jpg'),
  ('zerobaseone', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/zerobaseone.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/zerobaseone.jpg'),
  ('zico', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/zico.jpg', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/zico.jpg');

with changed as (
  update public.groups g
     set logo_url = f.old_url
    from logo_fix f
   where g.slug = f.slug
     and g.logo_url = f.new_url
  returning g.slug
)
select count(*) as rows_restored, (select count(*) from logo_fix) as rows_in_file from changed;

commit;
