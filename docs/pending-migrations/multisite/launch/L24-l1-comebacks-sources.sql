-- L24-l1-comebacks-sources.sql (lane titles, run O1, owner 2026-11-09, audit 04 P0-4)
--
-- What:   adds the source of a comeback date to the owner's release calendar (public.comebacks): source_url (https link), source_type
--         (official | outlet | musicbrainz), verified_at (the day the source was read) and status (announced | reported). Adds columns only:
--         no row is read, changed or deleted, so every existing comeback has status null and drafts nothing until the owner fills it.
-- Why:    the Team comeback topic (lib/editorial/templates.ts buildComebackTopic) drafts only an announced row with a verified source_url.
--         Leads (Soompi, allkpop) are not a source type, kprofiles never.
-- Needs:  121 (public.comebacks).
-- WHEN:   BEFORE or after the code: the code works with or without this file (no column: no comeback topic, fail closed). Any quiet time,
--         after a backup; never during a build, never between 23:50 and 00:30 UTC. A new column on a small table: instant.
-- Undo:   L24-l1-comebacks-sources.rollback.sql (drops the four columns; the values they hold are lost, take the backup first).
-- Shape:  ONE do block, no temp table, safe to run twice (a second run changes nothing).
--
-- Verify (after the apply):
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'comebacks' and column_name in ('source_url', 'source_type', 'verified_at', 'status');   expect 4
-- Verify: select count(*) from pg_constraint where conrelid = 'public.comebacks'::regclass and conname in ('comebacks_source_type_check', 'comebacks_status_check', 'comebacks_source_url_check', 'comebacks_announced_has_source_check');   expect 4
-- Verify: select count(*) from public.comebacks where status is not null or source_url is not null;   expect 0

do $l24$
declare
  n   int;
  bad int;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.comebacks') is null then
    raise exception 'L24: public.comebacks does not exist (apply 121 first)';
  end if;

  alter table public.comebacks add column if not exists source_url  text;
  alter table public.comebacks add column if not exists source_type text;
  alter table public.comebacks add column if not exists verified_at timestamptz;
  alter table public.comebacks add column if not exists status      text;

  if not exists (select 1 from pg_constraint where conname = 'comebacks_source_type_check' and conrelid = 'public.comebacks'::regclass) then
    alter table public.comebacks add constraint comebacks_source_type_check check (source_type is null or source_type in ('official', 'outlet', 'musicbrainz'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comebacks_status_check' and conrelid = 'public.comebacks'::regclass) then
    alter table public.comebacks add constraint comebacks_status_check check (status is null or status in ('announced', 'reported'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comebacks_source_url_check' and conrelid = 'public.comebacks'::regclass) then
    alter table public.comebacks add constraint comebacks_source_url_check check (source_url is null or (source_url ~ '^https://[a-z0-9.-]+(/.*)?$' and length(source_url) <= 500));
  end if;
  -- An announced row must say where it was read (the code drafts from announced rows only).
  if not exists (select 1 from pg_constraint where conname = 'comebacks_announced_has_source_check' and conrelid = 'public.comebacks'::regclass) then
    alter table public.comebacks add constraint comebacks_announced_has_source_check check (status is distinct from 'announced' or (source_url is not null and source_type is not null and verified_at is not null)) not valid;
  end if;

  -- Self-check: the four columns exist and no existing row carries a status without a source.
  select count(*) into n from information_schema.columns where table_schema = 'public' and table_name = 'comebacks' and column_name in ('source_url', 'source_type', 'verified_at', 'status');
  if n <> 4 then raise exception 'L24: expected 4 new columns, found %', n; end if;
  select count(*) into bad from public.comebacks where status is not null and source_url is null;
  if bad <> 0 then raise exception 'L24: % rows carry a status without a source', bad; end if;

  perform pg_notify('pgrst', 'reload schema');
end
$l24$;
