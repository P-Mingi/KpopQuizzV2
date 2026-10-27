-- 010-daily-v2.rollback.sql (run O1, lane K1): undo of 010-daily-v2.sql.
-- DANGEROUS: it replaces ensure_daily_quiz again.
--
-- What:   re-adds quiz_bank_scheduled_date_key (UNIQUE (scheduled_date)) and qotd_log_featured_date_key (UNIQUE (featured_date)),
--         puts back today's ensure_daily_quiz(p_date text), copied verbatim from the production schema dump
--         (~/kpq-o1/prod-public.sql, lines 3153 to 3238; CREATE OR REPLACE keeps its ACL), and drops ensure_daily_quiz_v2.
-- Why:    the rollback of manifest.md row 14 (reverse order: after 011 to 015's, before 009's). The app deploy that writes
--         onConflict 'site_id,featured_date' keeps working after this file, because the unique indexes of 009 stay until
--         009's own rollback.
-- Rows:   2 constraints created (an index build each), 2 functions touched; no row is written. Refused, with nothing changed,
--         while a non-kpop bank or log row exists (the single-date keys would clash, and today's function would pick any
--         site's bank row): after launch this rollback is not available.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'ensure_daily_quiz_v2';   expect 0
--         select prosrc like '%ensure_daily_quiz_v2%' from pg_proc where proname = 'ensure_daily_quiz';                 expect f
--         select proacl from pg_proc where proname = 'ensure_daily_quiz';   expect {postgres=X/postgres,service_role=X/postgres}
--         select count(*) from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key');   expect 2
--         a catalog dump (pg_dump --schema-only) of public equals the one taken before 009
-- Undo:   run 010-daily-v2.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  select (select count(*) from public.quiz_bank where site_id <> 'kpop') + (select count(*) from public.qotd_log where site_id <> 'kpop') into n;
  if n > 0 then
    raise exception '010-daily-v2 rollback refused: % non-kpop quiz_bank or qotd_log rows exist (the single-date keys would clash and the data of another site would be lost to today''s function); remove them deliberately first', n;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.quiz_bank'::regclass and conname = 'quiz_bank_scheduled_date_key') then
    alter table public.quiz_bank add constraint quiz_bank_scheduled_date_key unique (scheduled_date);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.qotd_log'::regclass and conname = 'qotd_log_featured_date_key') then
    alter table public.qotd_log add constraint qotd_log_featured_date_key unique (featured_date);
  end if;
end $$;


-- ensure_daily_quiz (today's definition)

CREATE OR REPLACE FUNCTION public.ensure_daily_quiz(p_date text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id UUID;
  v_bank        RECORD;
  v_group_id    INTEGER;
  v_slug        TEXT;
  v_new_id      UUID;
  v_questions   JSONB;
BEGIN
  SELECT id INTO v_existing_id
  FROM quizzes
  WHERE is_quiz_of_the_day = true AND quiz_of_the_day_date = p_date::DATE
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_bank
  FROM quiz_bank
  WHERE scheduled_date = p_date::DATE AND status IN ('verified', 'scheduled')
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_group_id := v_bank.group_id;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM groups WHERE slug = 'general-kpop' LIMIT 1;
  END IF;
  IF v_group_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(q - 'source')
  INTO v_questions
  FROM jsonb_array_elements(v_bank.questions) q;

  v_slug := lower(regexp_replace(regexp_replace(v_bank.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  v_slug := substr(v_slug, 1, 60);
  IF v_slug = '' THEN v_slug := 'quiz'; END IF;
  IF EXISTS (SELECT 1 FROM quizzes WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || floor(extract(epoch from now()))::bigint;
  END IF;

  UPDATE quizzes
  SET is_quiz_of_the_day = false, quiz_of_the_day_date = NULL
  WHERE quiz_of_the_day_date = p_date::DATE;

  INSERT INTO quizzes (
    title, creator_id, group_id, slug,
    quiz_type, difficulty, questions, question_count, settings,
    status, is_quiz_of_the_day, quiz_of_the_day_date
  ) VALUES (
    v_bank.title,
    '00000000-0000-0000-0000-000000000001',
    v_group_id,
    v_slug,
    coalesce(v_bank.quiz_type, 'multiple_choice'),
    coalesce(v_bank.difficulty, 'medium'),
    v_questions,
    jsonb_array_length(v_questions),
    '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb,
    'published',
    true,
    p_date::DATE
  )
  RETURNING id INTO v_new_id;

  UPDATE quiz_bank
  SET status = 'published', published_quiz_id = v_new_id, updated_at = now()
  WHERE id = v_bank.id;

  INSERT INTO qotd_log (quiz_id, featured_date, selection_method)
  VALUES (v_new_id, p_date::DATE, 'bank')
  ON CONFLICT (featured_date) DO UPDATE
    SET quiz_id = EXCLUDED.quiz_id, selection_method = 'bank';

  RETURN v_new_id;
END;
$function$;


drop function if exists public.ensure_daily_quiz_v2(date, text);
