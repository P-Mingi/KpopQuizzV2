-- L24-l1-comebacks-sources.rollback.sql (lane titles, run O1; audit 04 P0-4)
--
-- What:   undoes L24: drops the four source columns of public.comebacks and the constraints that came with them. The previous shape is
--         restored exactly (L24 changed no existing value). Values written into the new columns after L24 are lost: take a backup first.
-- WHEN:   as L24. Safe to run twice.
-- o1-transaction: single (psql --single-transaction).

set lock_timeout = '5s';
set client_min_messages = warning;

alter table if exists public.comebacks drop constraint if exists comebacks_announced_has_source_check;
alter table if exists public.comebacks drop constraint if exists comebacks_source_url_check;
alter table if exists public.comebacks drop constraint if exists comebacks_status_check;
alter table if exists public.comebacks drop constraint if exists comebacks_source_type_check;
alter table if exists public.comebacks drop column if exists status;
alter table if exists public.comebacks drop column if exists verified_at;
alter table if exists public.comebacks drop column if exists source_type;
alter table if exists public.comebacks drop column if exists source_url;

notify pgrst, 'reload schema';
