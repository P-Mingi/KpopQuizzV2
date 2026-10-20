-- 015-spoilers.sql (run O1, lane K1 (the brief of lot (e) part 1 builds the SQL of O3's row); manifest.md row 19; BACKLOG 4.1 row 29; schema.sql section "@file 015-spoilers")
--
-- What:   adds quizzes.spoiler_cover_until (timestamptz), verse_threads.spoiler_flair (smallint, check >= 0), lets reports accept
--         the reason 'spoiler' (reason_valid replaced by a superset), creates the partial unique index reports_spoiler_once
--         (quiz_id, reporter_id) where reason = 'spoiler', and creates report_spoiler(p_quiz_id uuid) (SECURITY DEFINER,
--         search_path = public, closed to PUBLIC, anon and authenticated, then granted to authenticated).
-- Why:    the anime quiz page lets a signed-in reader report a spoiler; three distinct reporters put a temporary cover over the
--         quiz until a moderator decides. The cover never unpublishes.
-- How:    report_spoiler acts on auth.uid() and raises when it is null (no session) or when the quiz is not a published quiz
--         (a bad argument). It inserts one reports row (reason 'spoiler', the quiz's own site_id) and ignores a second report
--         by the same reader (ON CONFLICT DO NOTHING on reports_spoiler_once). It returns the number of distinct signed-in
--         reporters whose spoiler reports are still pending. When that number reaches 3 it sets quizzes.spoiler_cover_until,
--         and a repeated report returns the count unchanged and writes nothing else.
-- Rows:   2 new nullable columns; reads reports once to validate the new check; no row is written by this file.
-- Decisions where the contract is silent: the cover lasts 7 days from the moment the third report arrives (it lifts itself if
--         no moderator acts; it is set again only when the previous cover has ended and the pending count is still 3 or more);
--         only pending reports count, so a moderator who resolves the reports resets the count. The reports row goes through
--         the existing report trigger like any other reason (it adds 1 to quizzes.report_count); this file does not touch that
--         trigger.
-- Verify: select pg_get_constraintdef(oid) from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass;   expect the six reasons
--         select to_regprocedure('public.report_spoiler(uuid)'), has_function_privilege('authenticated', 'public.report_spoiler(uuid)', 'execute'), has_function_privilege('anon', 'public.report_spoiler(uuid)', 'execute');   expect set, t, f
--         select count(*) from pg_indexes where indexname = 'reports_spoiler_once';   expect 1
-- Undo:   015-spoilers.rollback.sql (refused while a spoiler report, a cover or a flair exists).
-- Needs:  002a (reports.site_id, verse_threads.site_id), 011 (the manifest orders it after the spoiler columns of quizzes).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  t text;
begin
  foreach t in array array['quizzes', 'verse_threads', 'reports'] loop
    if to_regclass('public.' || t) is null then
      raise exception '015-spoilers: public.% is missing', t;
    end if;
  end loop;
end $$;

alter table public.quizzes add column if not exists spoiler_cover_until timestamptz;
alter table public.verse_threads add column if not exists spoiler_flair smallint constraint verse_threads_spoiler_flair_check check (spoiler_flair >= 0);

alter table public.reports drop constraint if exists reason_valid;
alter table public.reports add constraint reason_valid check (reason in ('wrong_answers', 'spam', 'inappropriate', 'duplicate', 'other', 'spoiler'));
create unique index if not exists reports_spoiler_once on public.reports (quiz_id, reporter_id) where reason = 'spoiler';

-- report_spoiler: auth.uid() reports p_quiz_id once (reason 'spoiler'); at 3 distinct signed-in reporters it sets
-- quizzes.spoiler_cover_until (a temporary cover until a moderator decides; never unpublishes). Returns the count.
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

  INSERT INTO public.reports (quiz_id, reporter_id, reason, site_id)
  VALUES (p_quiz_id, v_user, 'spoiler', v_site)
  ON CONFLICT (quiz_id, reporter_id) WHERE reason = 'spoiler' DO NOTHING;

  SELECT count(DISTINCT r.reporter_id)::integer INTO v_count
  FROM public.reports r
  WHERE r.quiz_id = p_quiz_id AND r.reason = 'spoiler' AND r.reporter_id IS NOT NULL AND r.status = 'pending';

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
