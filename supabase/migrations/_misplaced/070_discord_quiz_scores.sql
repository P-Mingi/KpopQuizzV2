-- Migration 070: discord_quiz_scores
-- Stores per-user daily quiz results + streaks for the in-Discord quiz, written
-- by the serverless Discord interactions endpoint (apps/quiz/src/app/api/discord).
--
-- All access goes through the service-role client (createServiceRoleClient),
-- which BYPASSES RLS, so we enable RLS with NO public policies: Discord scores
-- stay private (never readable/writable via the anon PostgREST endpoint).
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS public.discord_quiz_scores (
  discord_user_id text        NOT NULL,
  quiz_date       date        NOT NULL,
  username        text        NOT NULL DEFAULT '',
  score           integer     NOT NULL DEFAULT 0,
  total           integer     NOT NULL DEFAULT 0,
  streak          integer     NOT NULL DEFAULT 1,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (discord_user_id, quiz_date)
);

-- Fast "today's leaderboard" reads (ORDER BY score DESC for a given day).
CREATE INDEX IF NOT EXISTS discord_quiz_scores_date_score_idx
  ON public.discord_quiz_scores (quiz_date, score DESC);

ALTER TABLE public.discord_quiz_scores ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the service-role key may read/write.
