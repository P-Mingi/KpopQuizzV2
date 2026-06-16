-- Migration 071: public read on discord_quiz_scores
-- The end-of-day leaderboard auto-post (GitHub Actions cron) reads this table
-- with the anon key, so add a SELECT policy. Writes still go only through the
-- service-role client (the serverless Discord endpoint, which bypasses RLS).
-- The data is a public leaderboard (Discord username + score + date), so public
-- read is fine. Idempotent.

DROP POLICY IF EXISTS "discord_quiz_scores_read_all" ON public.discord_quiz_scores;
CREATE POLICY "discord_quiz_scores_read_all"
  ON public.discord_quiz_scores FOR SELECT
  USING (true);
