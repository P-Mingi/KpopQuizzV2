-- LOGOS lane (run O1): read-only check of groups.logo_url. Counts only, one ok/KO line per check.
-- Run it before (expect KO on the first lines) and after 001 (and 002). Changes nothing.
-- PENDING-002 means: only the 11 groups of 002 are left on the dead bucket, which is the expected state after 001 alone.

begin transaction read only;

with base as (
  select 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/' as p
), parsed as (
  select g.slug, g.logo_url,
         (regexp_match(g.logo_url, '^' || replace(b.p, '.', '\.') || '([^/]+)/(.+)$')) as m
  from public.groups g cross join base b
), refs as (
  select slug, logo_url, m[1] as bucket, m[2] as obj from parsed where m is not null
), targets(slug, new_url) as (
  values
    ('apink', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/apink.jpg'),
    ('artms', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/artms.jpg'),
    ('bibi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/bibi.jpg'),
    ('billlie', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/billlie.jpg'),
    ('blackpink', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/group-logos/blackpink.jpg'),
    ('chungha', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/chungha.jpg'),
    ('cortis', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/cortis.jpg'),
    ('day6', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/day6.jpg'),
    ('fifty-fifty', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/fifty-fifty.jpg'),
    ('fromis-9', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/fromis-9.jpg'),
    ('heize', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/heize.jpg'),
    ('hwasa', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/hwasa.jpg'),
    ('hyuna', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/hyuna.jpg'),
    ('ikon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/ikon.jpg'),
    ('illit', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/illit.jpg'),
    ('iu', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/iu.jpg'),
    ('jay-park', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jay-park.jpg'),
    ('jennie', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg'),
    ('jeon-somi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jeon-somi.jpg'),
    ('jimin', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jimin.jpg'),
    ('jungkook', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/jungkook.jpg'),
    ('kara', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kara.jpg'),
    ('katseye', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/katseye.jpg'),
    ('kickflip', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kickflip.jpg'),
    ('kiss-of-life', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/kiss-of-life.jpg'),
    ('loona', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/loona.jpg'),
    ('loossemble', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/loossemble.jpg'),
    ('miss-a', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/miss-a.jpg'),
    ('p1harmony', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/p1harmony.jpg'),
    ('pentagon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/pentagon.jpg'),
    ('psy', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/psy.jpg'),
    ('purple-kiss', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/purple-kiss.jpg'),
    ('rose', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/rose.jpg'),
    ('sistar', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/sistar.jpg'),
    ('sunmi', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/sunmi.jpg'),
    ('t-ara', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/t-ara.jpg'),
    ('taeyang', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/taeyang.jpg'),
    ('taeyeon', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/taeyeon.jpg'),
    ('the-boyz', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/the-boyz.jpg'),
    ('triples', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/triples.jpg'),
    ('tws', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/tws.jpg'),
    ('v-bts', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/v-bts.jpg'),
    ('winner', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/winner.jpg'),
    ('xikers', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/xikers.jpg'),
    ('zerobaseone', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/zerobaseone.jpg'),
    ('zico', 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/zico.jpg')
), unfixable(slug) as (
  values ('2ne1'), ('2pm'), ('babymonster'), ('bigbang'), ('boynextdoor'), ('fx'), ('girls-generation'), ('nct-127'), ('nct-dream'), ('riize'), ('wonder-girls')
), checks as (
  select 1 as ord,
         '001: groups at their new logo_url (expect 46)' as label,
         (select count(*) from public.groups g join targets t on t.slug = g.slug and g.logo_url = t.new_url) as n,
         46 as want
  union all
  select 2, '001: groups still on the dead game-images bucket among the 46 (expect 0)',
         (select count(*) from public.groups g join targets t on t.slug = g.slug where g.logo_url like '%/game-images/%'), 0
  union all
  select 3, 'all: groups on the dead game-images bucket (expect 0 after 001 and 002; 11 after 001 alone)',
         (select count(*) from public.groups where logo_url like '%/game-images/%'), 0
  union all
  select 4, 'all: storage logo_url pointing at a bucket that does not exist (expect 0)',
         (select count(*) from refs r where not exists (select 1 from storage.buckets b where b.id = r.bucket)), 0
  union all
  select 5, 'all: storage logo_url whose object does not exist in storage.objects (expect 0)',
         (select count(*) from refs r where not exists (select 1 from storage.objects o where o.bucket_id = r.bucket and o.name = r.obj)), 0
  union all
  select 6, 'untouched: groups on group-logos still resolving (expect 29 before, 30 after 001)',
         (select count(*) from refs r where r.bucket = 'group-logos' and exists (select 1 from storage.objects o where o.bucket_id = r.bucket and o.name = r.obj)), -1
  union all
  select 7, 'untouched: akmu still on its external pinimg host (expect 1)',
         (select count(*) from public.groups where slug = 'akmu' and logo_url like 'https://i.pinimg.com/%'), 1
  union all
  select 8, 'untouched: groups with a NULL logo_url that are not in the 002 list (informational, was 13)',
         (select count(*) from public.groups g where g.logo_url is null and g.slug not in (select slug from unfixable)), -1
)
select case
         when want = -1 then 'info'
         when ord = 3 and n = 11 and (select count(*) from public.groups g join unfixable u on u.slug = g.slug where g.logo_url like '%/game-images/%') = 11 then 'PENDING-002'
         when ord = 5 and n = 11 and (select count(*) from refs r join unfixable u on u.slug = r.slug where r.bucket = 'game-images') = 11 then 'PENDING-002'
         when ord = 4 and n = 11 and (select count(*) from refs r join unfixable u on u.slug = r.slug where r.bucket = 'game-images') = 11 then 'PENDING-002'
         when n = want then 'ok'
         else 'KO'
       end as status,
       label, n, case when want = -1 then null else want end as expected
from checks
order by ord;

rollback;
