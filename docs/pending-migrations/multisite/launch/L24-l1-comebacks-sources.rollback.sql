-- L24-l1-comebacks-sources.rollback.sql (lane titles, run O1; audit 04 P0-4)
--
-- What:   undoes L24: drops the four source columns of public.comebacks and the constraints that came with them. The previous shape is
--         restored exactly (L24 changed no existing value). Values written into the new columns after L24 are lost: take a backup first.
-- WHEN:   as L24. Safe to run twice. ONE do block, no temp table.
--
-- Verify (after the rollback):
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'comebacks' and column_name in ('source_url', 'source_type', 'verified_at', 'status');   expect 0
-- Verify: select count(*) from pg_constraint where conrelid = 'public.comebacks'::regclass and conname in ('comebacks_source_type_check', 'comebacks_status_check', 'comebacks_source_url_check', 'comebacks_announced_has_source_check');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'comebacks' and column_name in ('id', 'artist', 'title', 'release_date');   expect 4

do $l24r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  alter table if exists public.comebacks drop constraint if exists comebacks_announced_has_source_check;
  alter table if exists public.comebacks drop constraint if exists comebacks_source_url_check;
  alter table if exists public.comebacks drop constraint if exists comebacks_status_check;
  alter table if exists public.comebacks drop constraint if exists comebacks_source_type_check;
  alter table if exists public.comebacks drop column if exists status;
  alter table if exists public.comebacks drop column if exists verified_at;
  alter table if exists public.comebacks drop column if exists source_type;
  alter table if exists public.comebacks drop column if exists source_url;

  perform pg_notify('pgrst', 'reload schema');
end
$l24r$;
