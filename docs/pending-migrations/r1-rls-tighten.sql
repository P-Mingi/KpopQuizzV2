-- R1 F3 (2026-10): drop the PUBLIC write policies of six tables, and close the public
-- EXECUTE grant of ensure_daily_quiz.
--
-- NOT APPLIED. Apply only after (1) the R1 code is live in production (PR #88 and the
-- second R1 PR move the three server writers below to the service role; applied before
-- that, "Challenge a friend", challenge attempts and the timing cache would stop writing), (2) the owner ran
-- docs/release/r1-rls-inventory.sql and R1 confirmed its result against this
-- header, and (3) the owner typed "go rls".
--
-- What is wrong today: anyone holding the public anon key (it ships in the site's
-- JavaScript) can call the REST API directly and
--   ranked_plays      insert forged ranked results           (policy ranked_plays_insert, migration 059)
--   battles           insert any challenge row               (policy battles_insert_all, 073)
--   battle_results    insert a forged challenge result       (policy battle_results_insert_all, 073)
--   pending_questions insert fan questions nobody reads      (policy pending_questions_insert_all, 073)
--   quiz_bank         READ, insert, edit and delete the bank (policy quizbank_admin_all FOR ALL, 018):
--                     the unpublished daily quizzes with their answers are readable, and a planted
--                     row is published by the daily cron (decision 16)
--   quiz_time_stats   insert, edit and delete timing rows    (policy quiz_time_stats_write_all FOR ALL, 032)
--
-- Every writer, and how it still works afterwards (the service role bypasses RLS):
--   ranked_plays
--     code  none today. With v11-p7-ranked.sql: ranked_finalize_run(), EXECUTE granted to
--           service_role only, called by lib/ranked/service.ts with the service role.
--     db    no trigger; no other function.
--   battles
--     code  POST /api/ux-v1/p4/challenge (flag on only): inserts with the SERVICE ROLE since R1,
--           after validating the stored questions, the score ceiling and a rate limit.
--           /api/ux-v1/p4/challenge/[id] and .../attempt only read it (policy battles_select_all stays).
--     db    passport_on_battle_result() (087 / 092) only READS battles.
--   quiz_bank
--     code  /admin/quiz-bank, /api/admin/quiz-bank/*, /api/admin/auto-select-qotd,
--           /api/cron/ensure-daily-quiz, /api/qotd/publish, lib/ux-v1/p1/qotd-rotation.ts:
--           all server code on the service role (admin pages check isAdmin first).
--     db    ensure_daily_quiz(text): SECURITY DEFINER with search_path = public (042), EXECUTE
--           revoked from anon / authenticated (081, 082); called with the service role.
--     No browser reads the bank, so no SELECT policy replaces the dropped one: with RLS on and
--     no policy, anon and authenticated get nothing.
--   quiz_time_stats
--     code  POST /api/quiz/[id]/play: writes with the SERVICE ROLE since R1 through
--           lib/quiz/time-stats.ts, after validating the sample. Readers
--           (/api/quiz/[id]/time-stats, the v11 home) keep policy quiz_time_stats_read_all.
--     db    no trigger; no function.
--
--   battle_results (added on the owner's instruction, 2026-10-01)
--     code  POST /api/ux-v1/p4/challenge/[id]/attempt (flag on only): inserts with the SERVICE ROLE
--           since the second R1 PR, after checking the link signature, the score ceiling, the
--           answer count and a rate limit; user_id comes from the session.
--           POST /api/claim-runs: updates user_id with the service role (already).
--     db    trigger trg_passport_on_battle_result (087 / 092, SECURITY DEFINER) fires AFTER INSERT and
--           writes profiles, not this table; it reads NEW.user_id, so a service-role insert behaves
--           the same. No function writes the table. Readers keep policy battle_results_select_all.
--   pending_questions (added on the owner's instruction, 2026-10-01)
--     code  none (the fan-submitted question feature was removed with the old battle mode).
--     db    no trigger, no function. Readers keep policy pending_questions_select_all.
--   ensure_daily_quiz(text) (added on the owner's instruction, 2026-10-01)
--     The inventory shows EXECUTE granted to PUBLIC: migrations 081 / 082 revoked it from anon and
--     authenticated, which PUBLIC still covers, so anyone with the anon key can call this SECURITY
--     DEFINER function (it publishes the day's bank quiz). Its three callers use the service key:
--     /api/cron/ensure-daily-quiz (createServiceRoleClient), /api/qotd/publish (a client built with
--     SUPABASE_SERVICE_ROLE_KEY) and lib/ux-v1/p1/qotd-rotation.ts (handed one of those two clients).
--
-- Rows touched: none (policies only). Reversible: the commented block at the end
-- recreates the six policies exactly as the migrations wrote them, and the PUBLIC grant.

BEGIN;

DROP POLICY IF EXISTS "ranked_plays_insert" ON public.ranked_plays;
DROP POLICY IF EXISTS battles_insert_all ON public.battles;
DROP POLICY IF EXISTS battle_results_insert_all ON public.battle_results;
DROP POLICY IF EXISTS pending_questions_insert_all ON public.pending_questions;
DROP POLICY IF EXISTS "quizbank_admin_all" ON public.quiz_bank;
DROP POLICY IF EXISTS "quiz_time_stats_write_all" ON public.quiz_time_stats;

-- RLS must be on for the remaining policies to be the only doors (it already is; idempotent).
ALTER TABLE public.ranked_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_time_stats ENABLE ROW LEVEL SECURITY;

-- ensure_daily_quiz: server only. PUBLIC is the grant that still let anon and authenticated in.
REVOKE EXECUTE ON FUNCTION public.ensure_daily_quiz(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_quiz(text) TO service_role;

COMMIT;

-- Verification 1: the policies left on the six tables. Expected, exactly five rows, all SELECT:
--   battle_results    | battle_results_select_all     | SELECT
--   battles           | battles_select_all            | SELECT
--   pending_questions | pending_questions_select_all  | SELECT
--   quiz_time_stats   | quiz_time_stats_read_all      | SELECT
--   ranked_plays      | ranked_plays_select           | SELECT
-- (quiz_bank has none). Any other row, or any cmd other than SELECT, means a policy
-- with another name exists: tell R1 before going on.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ranked_plays', 'battles', 'battle_results', 'pending_questions', 'quiz_bank', 'quiz_time_stats')
ORDER BY tablename, policyname;

-- Verification 2: RLS is on for the six tables (six rows, all true).
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('ranked_plays', 'battles', 'battle_results', 'pending_questions', 'quiz_bank', 'quiz_time_stats')
ORDER BY relname;

-- Verification 3: who may execute ensure_daily_quiz. Expected: no PUBLIC, no anon, no
-- authenticated (service_role and the owner role remain).
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public' AND routine_name = 'ensure_daily_quiz'
ORDER BY grantee;

-- Rollback (run only to undo this file):
-- BEGIN;
-- CREATE POLICY "ranked_plays_insert" ON public.ranked_plays FOR INSERT WITH CHECK (true);
-- CREATE POLICY battles_insert_all ON public.battles FOR INSERT WITH CHECK (true);
-- CREATE POLICY battle_results_insert_all ON public.battle_results FOR INSERT WITH CHECK (true);
-- CREATE POLICY pending_questions_insert_all ON public.pending_questions FOR INSERT WITH CHECK (true);
-- CREATE POLICY "quizbank_admin_all" ON public.quiz_bank FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "quiz_time_stats_write_all" ON public.quiz_time_stats FOR ALL USING (true) WITH CHECK (true);
-- GRANT EXECUTE ON FUNCTION public.ensure_daily_quiz(text) TO PUBLIC;
-- COMMIT;
