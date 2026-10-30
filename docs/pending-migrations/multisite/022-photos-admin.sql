-- 022-photos-admin.sql (run O1, daily games step 2 "photos et admin", owner brief of 2026-10-29; RAPPORT-JEUX-DU-JOUR-v2.md section 7)
--
-- What:   the tables of the licensed pictures and of the admin images of Bunnyverse, nothing switched on:
--         - public.entity_images (018) opens to the kinds idol, group and agency (site kpop, slug = the id of the idol, the group or
--           the agency), beside series and character (unchanged, site anime). It reuses the two columns of 019, license_verified (the
--           admin's "licence verifiee" box) and thumb_path (the 96 px WebP made at upload); no parallel column is added. A verified
--           row must have its 96 px file. A trigger keeps it fail closed: a new file (path changes) that comes without a new 96 px
--           file loses its check (license_verified false, thumb_path null), so the upload route of 018, which knows neither column,
--           can never leave an old check on a new picture;
--         - the view entity_images_public: the verified rows only, their display columns, the 96 px file and the name of the entity
--           (idol, group, agency, series; a character's name is read by the app, which hides the characters under a spoiler). The
--           only way a browser role reads a verified picture; /credits reads it;
--         - public.agencies: one row per agency (name, mother company for "same mother company", official site, sources), filled
--           with the 17 record labels the kpop groups cite today (groups.record_label, names only: the mother company, the site and
--           the sources are the owner's, in the admin). RLS on with no policy: the service role only (the admin routes);
--         - public.site_assets: the banners, card images, icons and stickers of the pages of Bunnyverse (key, type, page, settings,
--           the WebP files at 1920, 400 and 96 px, credit, licence, the "licence verifiee" box, published_at for "publish now" or
--           "at a date", retired_at). Every row is a version: the live one of a key is the latest published one; older ones stay as
--           the history. RLS on with no policy: only the service role writes;
--         - the view site_assets_public: per key, the latest version published at or before now(), never a retired one. A row with
--           a picture can only be published with its licence verified (a check), so the view never shows an unlicensed picture.
-- Why:    v2 section 7: only licensed pictures, with their credit on /credits; the owner sets them in the admin of bunnyverse.org/anime
--         (Photos tab). The thumbnails are made in the admin's browser (canvas, WebP), stored in the bucket entity-images of 018;
--         no Vercel image optimisation.
-- Rows:   2 tables, 2 views, 2 trigger functions, 1 check function, 3 triggers; up to 17 public.agencies rows (the cited labels, by
--         name). No entity_images or site_assets row.
-- Needs:  001 (sites), 002a (groups.site_id), 018 (entity_images), 019 (its columns license_verified and thumb_path). Supabase's auth.users.
-- Verify: select relname, relrowsecurity from pg_class where oid in ('public.agencies'::regclass, 'public.site_assets'::regclass) order by 1;   expect agencies t, site_assets t
--         select count(*) from pg_policies where schemaname = 'public' and tablename in ('agencies', 'site_assets');   expect 0
--         select has_table_privilege('anon', 'public.site_assets', 'select'), has_table_privilege('authenticated', 'public.site_assets', 'insert'), has_table_privilege('anon', 'public.agencies', 'select'), has_table_privilege('anon', 'public.site_assets_public', 'select'), has_table_privilege('anon', 'public.entity_images_public', 'select'), has_table_privilege('anon', 'public.site_assets_public', 'insert');   expect f, f, f, t, t, f
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'entity_images_kind_check';   expect the five kinds
--         select count(*) from public.agencies;   expect 17 (the distinct record labels of the kpop groups)
-- Undo:   022-photos-admin.rollback.sql (refused while an idol, group or agency picture, a site_assets row, or an agency the owner
--         edited exists).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null then
    raise exception '022-photos-admin: public.sites is missing (apply 001 first)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'groups' and column_name = 'site_id') then
    raise exception '022-photos-admin: groups.site_id is missing (apply 002a first)';
  end if;
  if to_regclass('public.entity_images') is null then
    raise exception '022-photos-admin: public.entity_images is missing (apply 018 first)';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'entity_images'
      and column_name in ('license_verified', 'thumb_path')) <> 2 then
    raise exception '022-photos-admin: entity_images.license_verified and thumb_path are missing (apply 019 first)';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 1. entity_images: three more kinds, a 96 px file for every verified row, and the reset of the check on a new file
-- ---------------------------------------------------------------------------------------------------------------------------

-- The checks of 018 are replaced by supersets: every row 018 allowed is still allowed (series: a slug with no '/', character:
-- '<series>/<character>'); idol, group and agency take the id of their row, on the kpop site only.
alter table public.entity_images drop constraint if exists entity_images_kind_check;
alter table public.entity_images add constraint entity_images_kind_check
  check (kind in ('series', 'character', 'idol', 'group', 'agency'));
alter table public.entity_images drop constraint if exists entity_images_slug_check;
alter table public.entity_images add constraint entity_images_slug_check check (case kind
  when 'series' then slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'
  when 'character' then slug ~ '^[a-z0-9][a-z0-9-]{0,59}/[a-z0-9][a-z0-9-]{0,59}$'
  else slug ~ '^[1-9][0-9]{0,18}$'
end);
alter table public.entity_images drop constraint if exists entity_images_kind_site_check;
alter table public.entity_images add constraint entity_images_kind_site_check
  check (kind in ('series', 'character') or site_id = 'kpop');
alter table public.entity_images drop constraint if exists entity_images_verified_thumb_check;
alter table public.entity_images add constraint entity_images_verified_thumb_check
  check (not license_verified or thumb_path is not null);

create or replace function public.entity_images_licence_reset() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.path is distinct from old.path and new.thumb_path is not distinct from old.thumb_path then
    new.thumb_path := null;
    new.license_verified := false;
  end if;
  return new;
end $$;
revoke all on function public.entity_images_licence_reset() from public, anon, authenticated;

drop trigger if exists trg_entity_images_licence_reset on public.entity_images;
create trigger trg_entity_images_licence_reset before update on public.entity_images
  for each row execute function public.entity_images_licence_reset();

-- ---------------------------------------------------------------------------------------------------------------------------
-- 2. agencies
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace function public.agencies_sources_ok(v text[]) returns boolean
language sql immutable
set search_path = public
as $$
  select coalesce(bool_and(s ~ '^https://[^[:space:]]+$' and char_length(s) <= 2000), true) from unnest(v) as s
$$;
revoke all on function public.agencies_sources_ok(text[]) from public, anon, authenticated;

create table if not exists public.agencies (
  id bigint generated always as identity constraint agencies_pkey primary key,
  slug text not null constraint agencies_slug_key unique constraint agencies_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null constraint agencies_name_key unique constraint agencies_name_check check (char_length(btrim(name)) between 1 and 120 and name = btrim(name)),
  parent_id bigint constraint agencies_parent_id_fkey references public.agencies(id) on delete set null,
  official_url text constraint agencies_official_url_check check (official_url is null or (official_url ~ '^https://[^[:space:]]+$' and char_length(official_url) <= 2000)),
  sources text[] not null default '{}' constraint agencies_sources_check check (cardinality(sources) <= 20 and public.agencies_sources_ok(sources)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agencies_parent_self_check check (parent_id is null or parent_id <> id)
);

create or replace function public.photos_touch() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.photos_touch() from public, anon, authenticated;

drop trigger if exists trg_agencies_touch on public.agencies;
create trigger trg_agencies_touch before update on public.agencies
  for each row execute function public.photos_touch();

alter table public.agencies enable row level security;
revoke all on table public.agencies from public, anon, authenticated;
grant all on table public.agencies to service_role;

-- The labels the kpop groups cite today, by name only (the dle view of 020 reads groups.record_label; "near" needs parent_id).
-- A label whose slug is already taken by another name is skipped (on conflict) and named in a notice.
do $$
declare
  skipped text;
begin
  insert into public.agencies (slug, name)
  select distinct on (s.slug) s.slug, s.name
  from (
    select btrim(g.record_label) as name,
      left(btrim(regexp_replace(lower(btrim(g.record_label)), '[^a-z0-9]+', '-', 'g'), '-'), 60) as slug
    from public.groups g
    where g.site_id = 'kpop' and nullif(btrim(g.record_label), '') is not null
  ) s
  where s.slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'
  order by s.slug, s.name
  on conflict do nothing;
  select string_agg(distinct btrim(g.record_label), ', ') into skipped
  from public.groups g
  where g.site_id = 'kpop' and nullif(btrim(g.record_label), '') is not null
    and not exists (select 1 from public.agencies a where a.name = btrim(g.record_label));
  if skipped is not null then
    raise notice '022-photos-admin: record label(s) not added (their slug is taken by another name): %', skipped;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 3. site_assets
-- ---------------------------------------------------------------------------------------------------------------------------

-- key: the slot ('banner:kpopdle', 'card:home-kpopdle', 'home:siteK', 'icon:k-idol', 'sticker:kpopdle:<id>'); type: what it is;
-- page: the page of bunnyverse.org it decorates. settings: the focal point, the icon (library name, circle, colour) or the sticker
-- (side, x, y, size, rotation, mirror, opacity, animation); the app checks every value against its own lists before it draws one.
-- path, mid_path, thumb_path: the WebP files at 1920 (banners and card images; 400 for an icon or a sticker), 400 and 96 px. An
-- icon of the library has no file. A picture carries its credit; an illustration of our own ('own_photo') needs no source page.
create table if not exists public.site_assets (
  id bigint generated always as identity constraint site_assets_pkey primary key,
  key text not null constraint site_assets_key_check check (key ~ '^[a-z0-9][a-z0-9:/_-]{0,100}$'),
  type text not null constraint site_assets_type_check check (type in ('banner', 'card_image', 'icon', 'sticker')),
  page text not null constraint site_assets_page_check check (page ~ '^[a-z0-9][a-z0-9/-]{0,80}$'),
  settings jsonb not null default '{}' constraint site_assets_settings_check check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 8192),
  path text constraint site_assets_path_check check (path is null or (path ~ '^[a-z0-9][a-z0-9/_.-]*[.]webp$' and path not like '%..%')),
  mid_path text constraint site_assets_mid_path_check check (mid_path is null or (mid_path ~ '^[a-z0-9][a-z0-9/_.-]*[.]webp$' and mid_path not like '%..%')),
  thumb_path text constraint site_assets_thumb_path_check check (thumb_path is null or (thumb_path ~ '^[a-z0-9][a-z0-9/_.-]*[.]webp$' and thumb_path not like '%..%')),
  width integer constraint site_assets_width_check check (width is null or width > 0),
  height integer constraint site_assets_height_check check (height is null or height > 0),
  source_url text constraint site_assets_source_url_check check (source_url is null or (source_url ~ '^https://' and char_length(source_url) <= 2000)),
  author text constraint site_assets_author_check check (author is null or char_length(btrim(author)) between 1 and 200),
  license text constraint site_assets_license_check check (license is null or license in ('cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed', 'other')),
  license_note text constraint site_assets_license_note_check check (license_note is null or char_length(license_note) <= 500),
  license_verified boolean not null default false,
  published_at timestamptz,
  retired_at timestamptz,
  created_by uuid constraint site_assets_created_by_fkey references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_assets_file_check check (type = 'icon' or path is not null),
  constraint site_assets_sizes_check check (path is not null or (mid_path is null and thumb_path is null and width is null and height is null)),
  constraint site_assets_dims_check check (path is null or (width is not null and height is not null)),
  constraint site_assets_credit_check check (path is null or (author is not null and license is not null and (source_url is not null or license = 'own_photo'))),
  constraint site_assets_other_note_check check (license is distinct from 'other' or (license_note is not null and char_length(btrim(license_note)) > 0)),
  constraint site_assets_published_check check (published_at is null or path is null or license_verified)
);

create index if not exists site_assets_key_live_idx on public.site_assets (key, published_at desc, id desc) where retired_at is null;

drop trigger if exists trg_site_assets_touch on public.site_assets;
create trigger trg_site_assets_touch before update on public.site_assets
  for each row execute function public.photos_touch();

alter table public.site_assets enable row level security;
revoke all on table public.site_assets from public, anon, authenticated;
grant all on table public.site_assets to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 4. The public views (owner-rights views, like favourite_character_counts of 011: they read tables the browser roles cannot,
--    and give only what is public)
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace view public.site_assets_public as
select distinct on (a.key)
  a.key, a.type, a.page, a.settings, a.path, a.mid_path, a.thumb_path, a.width, a.height,
  a.source_url, a.author, a.license, a.license_note, a.published_at
from public.site_assets a
where a.retired_at is null and a.published_at is not null and a.published_at <= now() and (a.path is null or a.license_verified)
order by a.key, a.published_at desc, a.id desc;

revoke all on table public.site_assets_public from public, anon, authenticated;
grant select on table public.site_assets_public to anon, authenticated, service_role;

create or replace view public.entity_images_public as
select e.site_id, e.kind, e.slug, e.path, e.thumb_path, e.width, e.height, e.focal_x, e.focal_y,
  e.source_url, e.author, e.license, e.license_note, e.updated_at,
  case e.kind
    when 'idol' then (select i.name from public.idols i where i.id::text = e.slug)
    when 'group' then (select g.name from public.groups g where g.id::text = e.slug and g.site_id = 'kpop')
    when 'agency' then (select ag.name from public.agencies ag where ag.id::text = e.slug)
    when 'series' then (select g.name from public.groups g where g.slug = e.slug and g.site_id = e.site_id)
  end as name
from public.entity_images e
where e.license_verified and e.thumb_path is not null;

revoke all on table public.entity_images_public from public, anon, authenticated;
grant select on table public.entity_images_public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 5. Self-check
-- ---------------------------------------------------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['public.agencies', 'public.site_assets'] loop
    if not (select relrowsecurity from pg_class where oid = t::regclass) then
      raise exception '022-photos-admin: % has RLS off', t;
    end if;
    if exists (select 1 from pg_policy where polrelid = t::regclass) then
      raise exception '022-photos-admin: % has a policy (it must be the service role''s only)', t;
    end if;
    if has_table_privilege('anon', t, 'select') or has_table_privilege('authenticated', t, 'select')
      or has_table_privilege('anon', t, 'insert') or has_table_privilege('authenticated', t, 'insert')
      or has_table_privilege('anon', t, 'update') or has_table_privilege('authenticated', t, 'update')
      or has_table_privilege('anon', t, 'delete') or has_table_privilege('authenticated', t, 'delete') then
      raise exception '022-photos-admin: a browser role has a privilege on %', t;
    end if;
  end loop;
  foreach t in array array['public.site_assets_public', 'public.entity_images_public'] loop
    if not (has_table_privilege('anon', t, 'select') and has_table_privilege('authenticated', t, 'select')) then
      raise exception '022-photos-admin: % is not readable by the browser roles', t;
    end if;
    if has_table_privilege('anon', t, 'insert') or has_table_privilege('authenticated', t, 'insert')
      or has_table_privilege('anon', t, 'update') or has_table_privilege('authenticated', t, 'update')
      or has_table_privilege('anon', t, 'delete') or has_table_privilege('authenticated', t, 'delete') then
      raise exception '022-photos-admin: a browser role can write through %', t;
    end if;
  end loop;
  if has_table_privilege('anon', 'public.entity_images', 'insert') or has_table_privilege('authenticated', 'public.entity_images', 'update')
    or has_column_privilege('anon', 'public.entity_images', 'license_verified', 'select')
    or has_column_privilege('anon', 'public.entity_images', 'thumb_path', 'select') then
    raise exception '022-photos-admin: the browser grants of entity_images changed (018 and 019 keep them)';
  end if;
  if pg_get_viewdef('public.entity_images_public'::regclass) !~ 'license_verified' then
    raise exception '022-photos-admin: entity_images_public does not filter on license_verified';
  end if;
  if pg_get_viewdef('public.site_assets_public'::regclass) !~ 'retired_at IS NULL' then
    raise exception '022-photos-admin: site_assets_public shows retired rows';
  end if;
  if pg_get_constraintdef((select oid from pg_constraint where conname = 'entity_images_kind_check' and conrelid = 'public.entity_images'::regclass)) !~ 'agency' then
    raise exception '022-photos-admin: entity_images does not accept the kind agency';
  end if;
end $$;

notify pgrst, 'reload schema';
