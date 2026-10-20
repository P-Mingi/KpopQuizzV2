-- 009-daily-prep.sql (run O1, lane K1 (the brief of lot (e) part 1 gives it to K1); manifest.md row 13; BACKLOG 4.1 rows 20, 21, 22; schema.sql section "@file 009-daily-prep")
--
-- What:   adds sites.system_user_id (FK sites_system_user_id_fkey to profiles) and sites.fallback_group_slug, sets the kpop row to
--         today's values ('00000000-0000-0000-0000-000000000001' and 'general-kpop', the constants of ensure_daily_quiz), creates
--         the two unique indexes quiz_bank_site_date (site_id, scheduled_date) and qotd_log_site_date (site_id, featured_date)
--         CONCURRENTLY, and creates quiz_bank_category_check (the five kpop categories plus the seven anime ones) NOT VALID
--         then VALIDATE.
-- Why:    010 makes the daily quiz per site: its creator and fallback group come from the sites row, and its upsert and its
--         lookups key on (site_id, date). The two new unique indexes must exist before 010 drops the two single-date unique
--         constraints; the app deploy (onConflict 'site_id,featured_date') needs qotd_log_site_date too.
-- Rows:   2 columns on 3 rows of sites (1 row updated); reads quiz_bank and qotd_log once each to build the indexes and
--         validate the check; no other row is written.
-- Decisions where the contract is silent: the file refuses to start when the system author is not in public.profiles (the
--         foreign key would fail on the UPDATE with a bare message; production has the row, a branch needs
--         apps/quiz/e2e/o1/LE/K1/seed-branch.sql); the fallback group is not checked (a missing group makes the daily quiz
--         return null, as today). The check is dropped IF EXISTS then created again, as schema.sql says, after a query that
--         lists any category outside the list: nothing is added when one exists.
-- Verify: select id, system_user_id, fallback_group_slug from public.sites order by id;     expect kpop with the two values, the other rows null
--         select count(*) from pg_index i join pg_class c on c.oid = i.indexrelid where c.relname in ('quiz_bank_site_date', 'qotd_log_site_date') and i.indisvalid and i.indisready;   expect 2
--         select convalidated from pg_constraint where conname = 'quiz_bank_category_check';   expect t
--         select category, count(*) from public.quiz_bank group by 1 order by 1;               expect only the twelve listed categories
-- Undo:   009-daily-prep.rollback.sql (refused while a non-kpop sites row carries one of the two columns).
-- Needs:  002a (site_id on quiz_bank and qotd_log), 001 (sites).
-- o1-transaction: none
-- Each statement commits alone (psql without --single-transaction; CONCURRENTLY refuses a transaction block).
-- Idempotent: IF NOT EXISTS everywhere, the UPDATE only touches a row that differs. A build stopped half way leaves an INVALID
-- index that IF NOT EXISTS would skip: the check at the end refuses it by name; drop it with DROP INDEX CONCURRENTLY and run
-- this file again.

-- Short lock_timeout for the statements that take a lock other sessions queue behind (the foreign key locks profiles, the
-- sign-up table; the check locks quiz_bank): they fail whole rather than queue, and the file is rerunnable. The index builds
-- wait longer (CONCURRENTLY blocks nobody).
set lock_timeout = '3s';
set client_min_messages = warning;

-- Preconditions.
do $$
begin
  if to_regclass('public.sites') is null then
    raise exception '009-daily-prep: public.sites is missing (apply 001 first)';
  end if;
  if not exists (select 1 from pg_attribute where attrelid = to_regclass('public.quiz_bank') and attname = 'site_id' and not attisdropped)
     or not exists (select 1 from pg_attribute where attrelid = to_regclass('public.qotd_log') and attname = 'site_id' and not attisdropped) then
    raise exception '009-daily-prep: quiz_bank.site_id or qotd_log.site_id is missing (apply 002a first)';
  end if;
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001') then
    raise exception '009-daily-prep: the system author 00000000-0000-0000-0000-000000000001 is not in public.profiles (production has it; on a branch apply apps/quiz/e2e/o1/LE/K1/seed-branch.sql first)';
  end if;
end $$;

alter table public.sites add column if not exists system_user_id uuid constraint sites_system_user_id_fkey references public.profiles(id);
alter table public.sites add column if not exists fallback_group_slug text;

update public.sites
   set system_user_id = '00000000-0000-0000-0000-000000000001', fallback_group_slug = 'general-kpop'
 where id = 'kpop'
   and (system_user_id is distinct from '00000000-0000-0000-0000-000000000001'::uuid or fallback_group_slug is distinct from 'general-kpop');

set lock_timeout = '30s';
create unique index concurrently if not exists quiz_bank_site_date on public.quiz_bank (site_id, scheduled_date);
create unique index concurrently if not exists qotd_log_site_date on public.qotd_log (site_id, featured_date);
set lock_timeout = '3s';

-- The categories of quiz_bank today, listed before the check is added (production has no check on this column).
do $$
declare
  bad text;
begin
  select string_agg(distinct category, ', ' order by category) into bad
    from public.quiz_bank
   where category not in ('group_specific', 'knowledge', 'true_false', 'fun', 'era',
                          'series_specific', 'who_am_i', 'name_the_series', 'music', 'creators_studios', 'odd_one_out', 'crossover');
  if bad is not null then
    raise exception '009-daily-prep: quiz_bank holds categories outside quiz_bank_category_check: %; fix those rows first', bad;
  end if;
end $$;

alter table public.quiz_bank drop constraint if exists quiz_bank_category_check;
alter table public.quiz_bank add constraint quiz_bank_category_check check (category in (
  'group_specific', 'knowledge', 'true_false', 'fun', 'era',
  'series_specific', 'who_am_i', 'name_the_series', 'music', 'creators_studios', 'odd_one_out', 'crossover')) not valid;
alter table public.quiz_bank validate constraint quiz_bank_category_check;

-- Check: the two indexes exist and none is left invalid; the kpop row carries its values; the check is validated.
do $$
declare
  names text[] := array['quiz_bank_site_date', 'qotd_log_site_date'];
  bad text;
  n integer;
begin
  select string_agg(c.relname, ', ' order by c.relname) into bad
    from pg_index i join pg_class c on c.oid = i.indexrelid
   where c.relnamespace = 'public'::regnamespace and c.relname = any (names) and not (i.indisvalid and i.indisready);
  if bad is not null then
    raise exception '009-daily-prep: invalid index left: %; drop it with DROP INDEX CONCURRENTLY and run this file again', bad;
  end if;
  select count(*) into n
    from pg_index i join pg_class c on c.oid = i.indexrelid
   where c.relnamespace = 'public'::regnamespace and c.relname = any (names);
  if n <> 2 then
    raise exception '009-daily-prep: expected 2 unique indexes, found %', n;
  end if;
  if not exists (select 1 from public.sites where id = 'kpop' and system_user_id = '00000000-0000-0000-0000-000000000001' and fallback_group_slug = 'general-kpop') then
    raise exception '009-daily-prep: the kpop sites row does not carry the daily values';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_bank_category_check' and conrelid = 'public.quiz_bank'::regclass and convalidated) then
    raise exception '009-daily-prep: quiz_bank_category_check is missing or not validated';
  end if;
end $$;
