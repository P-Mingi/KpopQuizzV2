-- 009-daily-prep.rollback.sql (run O1, lane K1): undo of 009-daily-prep.sql.
--
-- What:   drops quiz_bank_category_check, drops the two unique indexes CONCURRENTLY, then drops sites.system_user_id (its
--         foreign key goes with it) and sites.fallback_group_slug.
-- Why:    the rollback of manifest.md row 13 (reverse order: after 010's rollback, which stops using the two columns and the
--         two indexes; before 002a's).
-- Rows:   2 columns dropped; no other row is read or written. Refused, with nothing changed, while a non-kpop sites row
--         carries a system author or a fallback group (the values of launch L02 would be lost); the kpop values are today's
--         constants and are dropped.
-- Verify: select count(*) from pg_attribute where attrelid = 'public.sites'::regclass and attname in ('system_user_id', 'fallback_group_slug') and not attisdropped;   expect 0
--         select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname in ('quiz_bank_site_date', 'qotd_log_site_date');   expect 0
--         select count(*) from pg_constraint where conname = 'quiz_bank_category_check';   expect 0
-- Undo:   run 009-daily-prep.sql again.
-- o1-transaction: none
-- Each statement commits alone (psql without --single-transaction; CONCURRENTLY refuses a transaction block).
-- Idempotent: IF EXISTS everywhere.

set lock_timeout = '3s';
set client_min_messages = warning;

do $$
declare
  n bigint := 0;
begin
  if exists (select 1 from pg_attribute where attrelid = to_regclass('public.sites') and attname = 'system_user_id' and not attisdropped) then
    select count(*) into n from public.sites where id <> 'kpop' and system_user_id is not null;
  end if;
  if n = 0 and exists (select 1 from pg_attribute where attrelid = to_regclass('public.sites') and attname = 'fallback_group_slug' and not attisdropped) then
    select count(*) into n from public.sites where id <> 'kpop' and fallback_group_slug is not null;
  end if;
  if n > 0 then
    raise exception '009-daily-prep rollback refused: a non-kpop sites row carries a system author or a fallback group (the daily quiz of that site would lose them); clear them deliberately first';
  end if;
end $$;

alter table public.quiz_bank drop constraint if exists quiz_bank_category_check;
set lock_timeout = '30s';
drop index concurrently if exists public.quiz_bank_site_date;
drop index concurrently if exists public.qotd_log_site_date;
set lock_timeout = '3s';
alter table public.sites drop column if exists system_user_id;
alter table public.sites drop column if exists fallback_group_slug;
