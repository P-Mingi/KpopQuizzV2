-- 015-spoilers.sql (run O1, lane K1 (the brief of lot (e) part 1 builds the SQL of O3's row); manifest.md row 19; BACKLOG 4.1 row 29; schema.sql section "@file 015-spoilers")
--
-- What:   adds quizzes.spoiler_cover_until (timestamptz), verse_threads.spoiler_flair (smallint, check >= 0), creates the table
--         public.spoiler_reports (one row per quiz and reader, RLS on, no policy) and the function report_spoiler(p_quiz_id uuid)
--         (SECURITY DEFINER, search_path = public, closed to PUBLIC, anon and authenticated, then granted to authenticated).
-- Why:    the anime quiz page lets a signed-in reader report a spoiler; three distinct reporters put a temporary cover over the
--         quiz until a moderator decides. The cover never unpublishes.
-- How:    report_spoiler acts on auth.uid() and raises when it is null (no session) or when the quiz is not a published quiz
--         (a bad argument). It inserts one spoiler_reports row (the quiz's own site_id) and ignores a second report by the same
--         reader (unique spoiler_reports_quiz_reporter_key on quiz_id, reporter_id; ON CONFLICT DO NOTHING). It returns the number of distinct signed-in reporters
--         whose spoiler reports are still pending. When that number reaches 3 it sets quizzes.spoiler_cover_until, and a repeated
--         report returns the count unchanged and writes nothing else.
-- Own table: a spoiler report is NOT a row of public.reports. The trigger on_report_insert (handle_new_report, left as it is) adds 1
--         to quizzes.report_count for every reason and, from five distinct reporters, can set a published quiz to 'flagged'; a
--         spoiler report must neither count as a quality report nor unpublish a quiz (K1-3 of the K1 request). Writing the spoiler
--         reports elsewhere keeps the trigger path, the reason list of reports (reason_valid) and kpop's report flow untouched.
--         docs/o1/contracts/schema.sql still lists the reports row, the sixth reason and reports_spoiler_once for this file: a
--         change request for ORCH (this table replaces them).
-- Surrogate key: spoiler_reports has id bigint identity as primary key and unique (quiz_id, reporter_id), NOT a primary key on the pair:
--         a table whose key is (quiz_id, reporter_id) with foreign keys to quizzes and profiles is a many-to-many junction to PostgREST
--         and makes every quizzes-profiles embed ambiguous (PGRST201). An earlier version of this table is converted in place.
-- Rows:   2 new nullable columns, 1 new table (an earlier spoiler_reports gains its id column, rows kept); reads reports once, only to move the spoiler rows a first version of this file wrote
--         there (see "Earlier version"); no other row is written by this file.
-- Decisions where the contract is silent: the cover lasts 7 days from the moment the third report arrives (it lifts itself if
--         no moderator acts; it is set again only when the previous cover has ended and the pending count is still 3 or more);
--         only pending reports count, so a moderator who resolves the reports resets the count.
-- Earlier version: a first version of this file put the spoiler reports in public.reports (reason 'spoiler', index
--         reports_spoiler_once, the sixth reason in reason_valid). Run on a database that has it, this version moves those rows to
--         spoiler_reports, takes back the report_count they added, drops the index and puts the five reasons back. It cannot undo
--         a 'flagged' status the trigger already set. On a database that never had it, that block does nothing.
-- Verify: select to_regclass('public.spoiler_reports'), to_regprocedure('public.report_spoiler(uuid)'), has_function_privilege('authenticated', 'public.report_spoiler(uuid)', 'execute'), has_function_privilege('anon', 'public.report_spoiler(uuid)', 'execute');   expect set, set, t, f
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass;   expect the five reasons of today
--         select count(*) from pg_indexes where indexname = 'reports_spoiler_once';   expect 0
-- Undo:   015-spoilers.rollback.sql (refused while a spoiler report, a cover or a flair exists).
-- Needs:  002a (reports.site_id, verse_threads.site_id), 001 (sites), 011 (the manifest orders it after the spoiler columns of quizzes).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  t text;
begin
  foreach t in array array['quizzes', 'verse_threads', 'reports', 'profiles', 'sites'] loop
    if to_regclass('public.' || t) is null then
      raise exception '015-spoilers: public.% is missing', t;
    end if;
  end loop;
end $$;

alter table public.quizzes add column if not exists spoiler_cover_until timestamptz;
alter table public.verse_threads add column if not exists spoiler_flair smallint constraint verse_threads_spoiler_flair_check check (spoiler_flair >= 0);

create table if not exists public.spoiler_reports (
  id bigint generated always as identity constraint spoiler_reports_pkey primary key,
  quiz_id uuid not null constraint spoiler_reports_quiz_id_fkey references public.quizzes(id) on delete cascade,
  reporter_id uuid not null constraint spoiler_reports_reporter_id_fkey references public.profiles(id) on delete cascade,
  site_id text not null constraint spoiler_reports_site_id_fkey references public.sites(id),
  status text not null default 'pending' constraint spoiler_reports_status_check check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint spoiler_reports_quiz_reporter_key unique (quiz_id, reporter_id)
);
-- Earlier version of this table (primary key (quiz_id, reporter_id), no id): convert it in place, rows kept. With that key and its two
-- foreign keys PostgREST read the table as a many-to-many junction between quizzes and profiles and every embed between the two
-- became ambiguous (PGRST201). A surrogate primary key takes the junction shape away; the pair stays unique.
do $$
begin
  if not exists (select 1 from pg_attribute where attrelid = 'public.spoiler_reports'::regclass and attname = 'id' and not attisdropped) then
    alter table public.spoiler_reports drop constraint if exists spoiler_reports_pkey;
    alter table public.spoiler_reports add column id bigint generated always as identity;
    alter table public.spoiler_reports add constraint spoiler_reports_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'spoiler_reports_quiz_reporter_key' and conrelid = 'public.spoiler_reports'::regclass) then
    alter table public.spoiler_reports add constraint spoiler_reports_quiz_reporter_key unique (quiz_id, reporter_id);
  end if;
end $$;
create index if not exists spoiler_reports_quiz_status_idx on public.spoiler_reports (quiz_id, status);
alter table public.spoiler_reports enable row level security;
-- (no policy: written by report_spoiler, read by the moderators through the server)
revoke all on public.spoiler_reports from anon, authenticated;

-- Earlier version of this file (see the header): the spoiler rows of public.reports move to spoiler_reports.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass and pg_get_constraintdef(oid) like '%spoiler%') then
    insert into public.spoiler_reports (quiz_id, reporter_id, site_id, status, created_at)
    select r.quiz_id, r.reporter_id, r.site_id, case when r.status in ('pending', 'reviewed', 'resolved', 'dismissed') then r.status else 'pending' end, r.created_at
    from public.reports r
    where r.reason = 'spoiler' and r.reporter_id is not null and r.site_id is not null
    on conflict (quiz_id, reporter_id) do nothing;
    -- each of those rows added 1 to report_count through the trigger: take it back
    update public.quizzes q
       set report_count = greatest(0, q.report_count - n.c)
      from (select quiz_id, count(*)::integer as c from public.reports where reason = 'spoiler' group by quiz_id) n
     where q.id = n.quiz_id;
    delete from public.reports where reason = 'spoiler';
    drop index if exists public.reports_spoiler_once;
    alter table public.reports drop constraint reason_valid;
    alter table public.reports add constraint reason_valid check (reason in ('wrong_answers', 'spam', 'inappropriate', 'duplicate', 'other'));
  end if;
end $$;

-- report_spoiler: auth.uid() reports p_quiz_id once; at 3 distinct signed-in reporters it sets quizzes.spoiler_cover_until (a
-- temporary cover until a moderator decides; never unpublishes). Returns the count. Never touches reports or report_count.
CREATE OR REPLACE FUNCTION public.report_spoiler(p_quiz_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_site text;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'report_spoiler: no signed-in user' USING ERRCODE = '28000';
  END IF;

  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = p_quiz_id AND q.status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_spoiler: unknown quiz' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.spoiler_reports (quiz_id, reporter_id, site_id)
  VALUES (p_quiz_id, v_user, v_site)
  ON CONFLICT (quiz_id, reporter_id) DO NOTHING;

  SELECT count(*)::integer INTO v_count
  FROM public.spoiler_reports r
  WHERE r.quiz_id = p_quiz_id AND r.status = 'pending';

  IF v_count >= 3 THEN
    UPDATE public.quizzes
       SET spoiler_cover_until = now() + interval '7 days'
     WHERE id = p_quiz_id AND (spoiler_cover_until IS NULL OR spoiler_cover_until < now());
  END IF;

  RETURN v_count;
END;
$function$;
revoke all on function public.report_spoiler(uuid) from public, anon, authenticated;
grant execute on function public.report_spoiler(uuid) to authenticated;
