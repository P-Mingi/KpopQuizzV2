-- 015-spoilers.rollback.sql (run O1, lane K1): undo of 015-spoilers.sql.
--
-- What:   drops report_spoiler(uuid), the table spoiler_reports, quizzes.spoiler_cover_until and verse_threads.spoiler_flair (its
--         check goes with it). public.reports is not touched by 015 and not by this file, except on a database that still has
--         the first version of 015 (spoiler reports in public.reports): there it drops the index reports_spoiler_once and puts
--         back today's reason_valid (five reasons), copied verbatim from the production schema dump (~/kpq-o1/prod-public.sql,
--         line 6165).
--         The table goes whole, whatever its key: the surrogate id and unique (quiz_id, reporter_id) of the current 015 and the
--         primary key (quiz_id, reporter_id) of an earlier version alike; the refusal counts rows of either shape.
-- Why:    the rollback of manifest.md row 19, the first rollback of the lot (reverse order: 015, 014, 013, 012, 011, 010, 009).
-- Rows:   1 table, 2 columns and, on an earlier version, 1 index dropped. Refused, with nothing changed, while a spoiler report
--         (spoiler_reports, or a row of public.reports with the reason 'spoiler'), a spoiler cover or a thread flair exists (the
--         reports and the covers would be lost).
-- Verify: select to_regprocedure('public.report_spoiler(uuid)'), to_regclass('public.spoiler_reports');   expect null, null
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass;   expect the five reasons of today
--         a catalog dump (pg_dump --schema-only) of public equals the one taken before 009
-- Undo:   run 015-spoilers.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
  msg text := '';
begin
  if to_regclass('public.spoiler_reports') is not null then
    select count(*) into n from public.spoiler_reports;
    if n > 0 then msg := msg || 'spoiler reports (' || n || ' rows) '; end if;
  end if;
  select count(*) into n from public.reports where reason = 'spoiler';
  if n > 0 then msg := msg || 'spoiler reports of the first version (' || n || ' rows of public.reports) '; end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.quizzes'::regclass and attname = 'spoiler_cover_until' and not attisdropped) then
    select count(*) into n from public.quizzes where spoiler_cover_until is not null;
    if n > 0 then msg := msg || 'quiz spoiler covers (' || n || ' rows) '; end if;
  end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.verse_threads'::regclass and attname = 'spoiler_flair' and not attisdropped) then
    select count(*) into n from public.verse_threads where spoiler_flair is not null;
    if n > 0 then msg := msg || 'thread spoiler flairs (' || n || ' rows) '; end if;
  end if;
  if msg <> '' then
    raise exception '015-spoilers rollback refused: spoiler data would be lost: %; remove it deliberately first', msg;
  end if;
end $$;

drop function if exists public.report_spoiler(uuid);
drop table if exists public.spoiler_reports;
alter table public.quizzes drop column if exists spoiler_cover_until;
alter table public.verse_threads drop column if exists spoiler_flair;

-- a database that still has the first version of 015: today's check (verbatim from the production dump), without the index
drop index if exists public.reports_spoiler_once;
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass and pg_get_constraintdef(oid) like '%spoiler%') then
    alter table only public.reports drop constraint reason_valid;
    ALTER TABLE ONLY public.reports ADD CONSTRAINT reason_valid CHECK ((reason = ANY (ARRAY['wrong_answers'::text, 'spam'::text, 'inappropriate'::text, 'duplicate'::text, 'other'::text])));
  end if;
end $$;
