-- D01-dev-catchup.sql (run O1, lot DEV-PREVIEW)
-- DEV ONLY. NEVER FOR PRODUCTION. Not in docs/launch/o1/SQL-ORDER.md, not in session.sh, not in the production order of manifest.md section 2.
--
-- What:   brings the branch o1-dev (applied 2026-10-19 to 2026-10-21, files 001 to 016 and L01, plus two files run by hand since) up to what the
--         files of the manifest now expect, so that migrate-dev.sh can apply 017 onwards. Three differences, found by comparing the catalogue of
--         o1-dev with a local build of today's files (docs/launch/o1/dev-preview-rehearsal.sh), nothing else differed:
--         (1) entity_sources_source_check lacks the source 'fandom' (011 was applied before CR-023 added it); L13 and L15 write that source.
--         (2) public.entity_images is the first, empty version of 018 (no license_url, commons_file, needs_credit); 018 only creates the table
--             when it is absent, so the old one is dropped here, when it is empty, and 018 builds the current one (policy, trigger and grants
--             go with it; the function entity_images_touch and the bucket entity-images are kept, 018 replaces the function and updates the bucket).
--         (3) the two sites rows anime and hub still carry the domains and brands of before Bunnyverse; they are put on the registry values
--             (bunnyverse.org/anime, bunnyverse.org). Only a row still in 'building' is touched, only the domain and the brand.
--         Seen and left alone, because they were already right on o1-dev: the grant of merge_anon_passport (008: service_role only), the
--         report_spoiler design of 015 (spoiler_reports with its id), the comments of 007 and 002a. 017 on o1-dev is an older body of
--         passport_run_deletion with passport_deletion_status: 017 replaces both (create or replace), so nothing is needed here.
-- Why:    the owner wants the whole network on o1-dev as a preview (bunnyverse.org hub, /anime, kpopquiz), with the four daily games on.
-- Guards: the file refuses, with nothing changed, when the database does not look like o1-dev: more than 200 profiles (production has real
--         members; o1-dev has 50 fixtures), or the anime or hub site already live, or the public.sites table is missing, or the
--         entity_images table of the first version holds a row (the owner's pictures are never dropped).
-- Rows:   0 rows inserted. 1 constraint replaced, 1 empty table dropped, up to 2 sites rows updated.
-- Verify: select pg_get_constraintdef(oid) like '%fandom%' from pg_constraint where conname = 'entity_sources_source_check';   expect t
--         select id, domain, brand from public.sites order by sort;   expect kpop, anime bunnyverse.org/anime OtakuQuiz, hub bunnyverse.org Bunnyverse
--         select count(*) from information_schema.columns where table_name = 'entity_images' and column_name = 'license_url';   expect 0 now, 1 after 018
-- Undo:   none. D01-dev-catchup.rollback.sql refuses and says why; o1-dev is reset from the dashboard, not by a file.
-- Needs:  016 (the end of the files already on o1-dev). Runs before 017.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null or to_regclass('public.profiles') is null or to_regclass('public.entity_sources') is null then
    raise exception 'D01-dev-catchup: public.sites, public.profiles or public.entity_sources is missing (files 001 to 016 first)';
  end if;
  if (select count(*) from public.profiles) > 200 then
    raise exception 'D01-dev-catchup: refused, this database holds more than 200 profiles: it is not o1-dev. This file is for the dev branch only, never for production';
  end if;
  if exists (select 1 from public.sites where id in ('anime', 'hub') and status = 'live') then
    raise exception 'D01-dev-catchup: refused, the anime or hub site is live: this file is for the dev branch only, never for production';
  end if;
end $$;

-- (1) the source 'fandom' (the statement of 011, run again only when the constraint lacks it)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.entity_sources'::regclass and conname = 'entity_sources_source_check' and pg_get_constraintdef(oid) like '%fandom%'
  ) then
    alter table public.entity_sources drop constraint if exists entity_sources_source_check;
    alter table public.entity_sources add constraint entity_sources_source_check check (source in
      ('wikidata', 'musicbrainz', 'wikipedia', 'official', 'fandom'));
  end if;
end $$;

-- (2) the first version of entity_images (no license_url column): dropped when empty, so that 018 builds the current table
do $$
declare
  n bigint;
begin
  if to_regclass('public.entity_images') is not null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name = 'license_url') then
    execute 'select count(*) from public.entity_images' into n;
    if n > 0 then
      raise exception 'D01-dev-catchup: the first version of entity_images holds % row(s): nothing is dropped; move them by hand first', n;
    end if;
    drop table public.entity_images;
  end if;
end $$;

-- (3) the registry values of the two new sites (the domain column holds the address, 001 and L01)
update public.sites set domain = 'bunnyverse.org/anime', brand = 'OtakuQuiz'
  where id = 'anime' and status = 'building' and (domain, brand) is distinct from ('bunnyverse.org/anime', 'OtakuQuiz');
update public.sites set domain = 'bunnyverse.org', brand = 'Bunnyverse'
  where id = 'hub' and status = 'building' and (domain, brand) is distinct from ('bunnyverse.org', 'Bunnyverse');
