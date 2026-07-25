-- Migration 119: personality passport flair toggle (Workstream P, step 6).
-- Run manually in the prod SQL editor; not auto-applied.
--
-- Adds an opt-in flag so a signed-in user can show their latest personality
-- member match as a flair line on their passport meta ("Felix-coded"). OFF by
-- default (opt-in). The match itself is read from personality_results (the row
-- already carries user_id); this column only governs whether it is shown.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_personality_flair BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
