-- R1 F3 (2026-10): drop the PUBLIC write policies of four tables.
--
-- NOT APPLIED. Apply only after (1) the r1/fixes code is live in production (it
-- moves the two server writers below to the service role; applied before that,
-- "Challenge a friend" and the timing cache would stop writing), (2) the owner ran
-- docs/release/r1-rls-inventory.sql and R1 confirmed its result against this
-- header, and (3) the owner typed "go rls".
--
-- What is wrong today: anyone holding the public anon key (it ships in the site's
-- JavaScript) can call the REST API directly and
--   ranked_plays      insert forged ranked results           (policy ranked_plays_insert, migration 059)
--   battles           insert any challenge row               (policy battles_insert_all, 073)
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
-- Same pattern, NOT in this file (left for the owner, R1 report): battle_results and
-- pending_questions (073) also have public insert policies.
--
-- Rows touched: none (policies only). Reversible: the commented block at the end
-- recreates the four policies exactly as the migrations wrote them.

BEGIN;

DROP POLICY IF EXISTS "ranked_plays_insert" ON public.ranked_plays;
DROP POLICY IF EXISTS battles_insert_all ON public.battles;
DROP POLICY IF EXISTS "quizbank_admin_all" ON public.quiz_bank;
DROP POLICY IF EXISTS "quiz_time_stats_write_all" ON public.quiz_time_stats;

-- RLS must be on for the remaining policies to be the only doors (it already is; idempotent).
ALTER TABLE public.ranked_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_time_stats ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verification 1: the policies left on the four tables. Expected, exactly three rows:
--   battles          | battles_select_all        | SELECT
--   quiz_time_stats  | quiz_time_stats_read_all  | SELECT
--   ranked_plays     | ranked_plays_select       | SELECT
-- (quiz_bank has none). Any other row, or any cmd other than SELECT, means a policy
-- with another name exists: tell R1 before going on.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('ranked_plays', 'battles', 'quiz_bank', 'quiz_time_stats')
ORDER BY tablename, policyname;

-- Verification 2: RLS is on for the four tables (four rows, all true).
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relname IN ('ranked_plays', 'battles', 'quiz_bank', 'quiz_time_stats')
ORDER BY relname;

-- Rollback (run only to undo this file):
-- BEGIN;
-- CREATE POLICY "ranked_plays_insert" ON public.ranked_plays FOR INSERT WITH CHECK (true);
-- CREATE POLICY battles_insert_all ON public.battles FOR INSERT WITH CHECK (true);
-- CREATE POLICY "quizbank_admin_all" ON public.quiz_bank FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "quiz_time_stats_write_all" ON public.quiz_time_stats FOR ALL USING (true) WITH CHECK (true);
-- COMMIT;
