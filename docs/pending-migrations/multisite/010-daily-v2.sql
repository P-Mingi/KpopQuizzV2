-- 010-daily-v2.sql (run O1, lane K1 (the brief of lot (e) part 1 gives it to K1); manifest.md row 14; BACKLOG 4.1 row 23; schema.sql section "@file 010-daily-v2")
-- DANGEROUS (two R-SQL reviewers): it replaces ensure_daily_quiz, the function the production cron runs every day, and drops
-- the two single-date unique constraints that today's function relies on. Never alone (BACKLOG 4.3 item 4): the window is
-- 009, the app deploy (onConflict 'site_id,featured_date'), then this file, away from the cron hour.
--
-- What:   creates ensure_daily_quiz_v2(p_date date, p_site text) (SECURITY DEFINER, search_path = public, service_role only),
--         turns ensure_daily_quiz(p_date text) into the kpop wrapper (CREATE OR REPLACE: signature, return type, SECURITY mode,
--         search_path and ACL stay today's) and drops quiz_bank_scheduled_date_key and qotd_log_featured_date_key.
-- How:    v2 IS today's body of ensure_daily_quiz, copied from the production schema dump (~/kpq-o1/prod-public.sql, lines 3153
--         to 3238), statement for statement, with these edits and no other (p_date is a date now, so p_date::DATE stays valid):
--           1. the lookups of the quiz of the day and of the bank row, and the unflagging UPDATE, add AND site_id = p_site;
--           2. a new lookup of the sites row (SELECT * INTO v_site FROM sites WHERE id = p_site) returns NULL when the site is
--              unknown or has no system_user_id (nothing is published without an author);
--           3. the creator '00000000-0000-0000-0000-000000000001' becomes v_site.system_user_id and the fallback group
--              slug 'general-kpop' becomes v_site.fallback_group_slug (restricted to the site's groups);
--           4. the quizzes INSERT and the qotd_log INSERT carry site_id = p_site, and ON CONFLICT (featured_date) becomes
--              ON CONFLICT (site_id, featured_date) (the unique index qotd_log_site_date of 009).
--         For p_site = 'kpop' every one of those resolves to today's value (009 sets the kpop row to the two constants), so
--         the kpop daily publishes the same quiz as today (apps/quiz/e2e/o1/LE/K1/daily.sh gives one md5 before and after).
--         The wrapper is `RETURN public.ensure_daily_quiz_v2(p_date::DATE, 'kpop')`.
-- Why:    BACKLOG 4.4: one quiz of the day per site on the same date; the unique keys become (site_id, date).
-- Rows:   no row is read or written by this file except the checks at its end; 2 functions created or replaced and 2
--         constraints dropped (each drop takes a short ACCESS EXCLUSIVE lock on its table: lock_timeout 5s, the file fails
--         whole rather than queue; rerun).
-- Decisions where the contract is silent: a site with no system_user_id (anime before launch L02, hub) returns NULL; a bank
--         row whose group_id belongs to another site is not repaired (trg_quizzes_site_guard of 002d raises, the cron fails
--         loudly); the quiz slug stays globally unique (quizzes_slug_key), a clash gets today's epoch suffix.
-- Verify: select proname, pg_get_function_identity_arguments(oid), prosecdef, proacl from pg_proc where pronamespace = 'public'::regnamespace and proname in ('ensure_daily_quiz', 'ensure_daily_quiz_v2') order by 1;
--           expect 2 rows, prosecdef t; ensure_daily_quiz {postgres=X/postgres,service_role=X/postgres} (unchanged), v2 the same
--         select count(*) from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key');   expect 0
--         apps/quiz/e2e/o1/LE/K1/daily.sh gives the same md5 before and after this file
-- Undo:   010-daily-v2.rollback.sql (today's ensure_daily_quiz verbatim from the production dump; refused while a non-kpop
--         bank or log row exists).
-- Needs:  009-daily-prep.sql (the columns, the two indexes, the kpop values).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

-- Preconditions: plpgsql binds late, so without 009 the first call would fail; with the kpop row unset the wrapper would
-- return NULL every day. Refuse to start in either case.
do $$
begin
  if to_regclass('public.sites') is null
     or not exists (select 1 from pg_attribute where attrelid = to_regclass('public.sites') and attname = 'system_user_id' and not attisdropped)
     or not exists (select 1 from pg_attribute where attrelid = to_regclass('public.sites') and attname = 'fallback_group_slug' and not attisdropped) then
    raise exception '010-daily-v2: sites.system_user_id or sites.fallback_group_slug is missing (apply 009 first)';
  end if;
  if not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                  where c.relnamespace = 'public'::regnamespace and c.relname = 'qotd_log_site_date' and i.indisvalid and i.indisready)
     or not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                     where c.relnamespace = 'public'::regnamespace and c.relname = 'quiz_bank_site_date' and i.indisvalid and i.indisready) then
    raise exception '010-daily-v2: the unique indexes quiz_bank_site_date and qotd_log_site_date are missing or invalid (apply 009 first)';
  end if;
  if not exists (select 1 from public.sites where id = 'kpop' and system_user_id = '00000000-0000-0000-0000-000000000001' and fallback_group_slug = 'general-kpop') then
    raise exception '010-daily-v2: the kpop sites row does not carry the daily values (apply 009 first)';
  end if;
  if to_regprocedure('public.ensure_daily_quiz(text)') is null then
    raise exception '010-daily-v2: public.ensure_daily_quiz(text) is missing';
  end if;
end $$;


-- ensure_daily_quiz_v2

CREATE OR REPLACE FUNCTION public.ensure_daily_quiz_v2(p_date date, p_site text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id UUID;
  v_bank        RECORD;
  v_site        RECORD;
  v_group_id    INTEGER;
  v_slug        TEXT;
  v_new_id      UUID;
  v_questions   JSONB;
BEGIN
  SELECT id INTO v_existing_id
  FROM quizzes
  WHERE is_quiz_of_the_day = true AND quiz_of_the_day_date = p_date::DATE AND site_id = p_site
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_site FROM sites WHERE id = p_site;
  IF NOT FOUND OR v_site.system_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_bank
  FROM quiz_bank
  WHERE scheduled_date = p_date::DATE AND status IN ('verified', 'scheduled') AND site_id = p_site
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_group_id := v_bank.group_id;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM groups WHERE slug = v_site.fallback_group_slug AND site_id = p_site LIMIT 1;
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
  WHERE quiz_of_the_day_date = p_date::DATE AND site_id = p_site;

  INSERT INTO quizzes (
    title, creator_id, group_id, slug,
    quiz_type, difficulty, questions, question_count, settings,
    status, is_quiz_of_the_day, quiz_of_the_day_date, site_id
  ) VALUES (
    v_bank.title,
    v_site.system_user_id,
    v_group_id,
    v_slug,
    coalesce(v_bank.quiz_type, 'multiple_choice'),
    coalesce(v_bank.difficulty, 'medium'),
    v_questions,
    jsonb_array_length(v_questions),
    '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb,
    'published',
    true,
    p_date::DATE,
    p_site
  )
  RETURNING id INTO v_new_id;

  UPDATE quiz_bank
  SET status = 'published', published_quiz_id = v_new_id, updated_at = now()
  WHERE id = v_bank.id;

  INSERT INTO qotd_log (quiz_id, featured_date, selection_method, site_id)
  VALUES (v_new_id, p_date::DATE, 'bank', p_site)
  ON CONFLICT (site_id, featured_date) DO UPDATE
    SET quiz_id = EXCLUDED.quiz_id, selection_method = 'bank';

  RETURN v_new_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_daily_quiz_v2(date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_quiz_v2(date, text) TO service_role;


-- ensure_daily_quiz: the kpop wrapper (CREATE OR REPLACE keeps today's ACL)

CREATE OR REPLACE FUNCTION public.ensure_daily_quiz(p_date text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.ensure_daily_quiz_v2(p_date::DATE, 'kpop');
END;
$function$;


-- the two single-date keys give way to the per-site keys of 009

alter table public.quiz_bank drop constraint if exists quiz_bank_scheduled_date_key;
alter table public.qotd_log drop constraint if exists qotd_log_featured_date_key;


-- Check: both functions are definer, search_path public, service_role only; the two constraints are gone.
do $$
declare
  n integer;
begin
  select count(*) into n from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname in ('ensure_daily_quiz', 'ensure_daily_quiz_v2')
     and p.prosecdef and p.proconfig = array['search_path=public']::text[]
     and not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')
     and has_function_privilege('service_role', p.oid, 'execute');
  if n <> 2 then
    raise exception '010-daily-v2: expected 2 definer functions closed to anon and authenticated, found %', n;
  end if;
  if exists (select 1 from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key')) then
    raise exception '010-daily-v2: a single-date unique constraint is still there';
  end if;
end $$;
