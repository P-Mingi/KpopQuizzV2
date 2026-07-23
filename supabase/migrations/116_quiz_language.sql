-- Migration 116: quiz language (Workstream Q-B2).
-- Run manually in the prod SQL editor; not auto-applied.
--
-- Adds a language the quiz is written in. Defaults to 'en' so every existing
-- row (374 published, all previously untagged) is backfilled to English by the
-- DEFAULT. New quizzes self-declare via the creation funnel picker.
--
-- Allowed set mirrors the funnel picker: en, ko, tr, pt, es, id, ja, fr, de,
-- plus 'other'. Kept as a CHECK (same pattern as difficulty_valid in mig 001).

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quiz_language_valid;
ALTER TABLE public.quizzes ADD CONSTRAINT quiz_language_valid
  CHECK (language IN ('en', 'ko', 'tr', 'pt', 'es', 'id', 'ja', 'fr', 'de', 'other'));

-- Browse filter reads (language, status); index mirrors idx_quizzes_difficulty.
CREATE INDEX IF NOT EXISTS idx_quizzes_language_status
  ON public.quizzes(language, status);

-- Backfill: the DEFAULT already set every existing row to 'en'. Re-tag the one
-- unambiguously non-English (Turkish) quiz identified in the Workstream Q audit.
UPDATE public.quizzes
  SET language = 'tr'
  WHERE id = '13e5906d-5368-4ebd-86fe-5d74b6608790';

NOTIFY pgrst, 'reload schema';
