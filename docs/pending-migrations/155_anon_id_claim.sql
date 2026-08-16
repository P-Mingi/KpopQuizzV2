-- W3 PART A - a browser-scoped anonymous id, so a guest can claim what they earned.
-- OWNER APPLIES THIS BY HAND. Additive only: two nullable columns + two indexes.
-- No data is written, no column is dropped, no constraint is tightened.
--
-- WHY (measured on 2026-08-15, live):
--   plays            : 59,003 rows, 36,158 with player_id NULL (61.3% guest)
--   plays columns    : id, quiz_id, player_id, score, total_questions,
--                      time_taken_seconds, created_at, per_question_times
--                      -> NOTHING identifies the browser that made a guest play.
--   battle_results   : player_hash = sha256(ip + UTC day). 199 hashes cover more than
--                      one run, the largest covers 15. Claiming by that hash would hand
--                      a new account OTHER PEOPLE'S runs from the same IP that day
--                      (household, school, carrier NAT) and would still miss the same
--                      guest's runs from yesterday, because the hash rotates daily.
--                      It is neither stable enough to find a history nor private enough
--                      to claim one.
--
-- WHAT THIS ENABLES, AND WHAT IT DOES NOT:
--   FROM SHIP DATE FORWARD a guest run carries a client-generated UUID kept in
--   localStorage, so signing up can attach that browser's own runs and only its own.
--   The 36,158 existing guest plays CANNOT be rescued by this or any other migration.
--   The claim copy must never promise otherwise. Honest wording only.
--
-- PRIVACY NOTE: anon_id is a pseudonymous identifier. It must be generated client-side,
-- stored in localStorage, never derived from IP, user agent or any fingerprint, and it
-- must be discardable by the user (clearing site data ends it, by design).

BEGIN;

ALTER TABLE public.plays
  ADD COLUMN IF NOT EXISTS anon_id uuid;

ALTER TABLE public.battle_results
  ADD COLUMN IF NOT EXISTS anon_id uuid;

COMMENT ON COLUMN public.plays.anon_id IS
  'Client-generated UUID held in localStorage. Identifies a browser, never a person. NULL on every row created before migration 155 and on any run from a client that has no id yet.';
COMMENT ON COLUMN public.battle_results.anon_id IS
  'Client-generated UUID held in localStorage. Used to let a guest claim their own battle runs at signup. Never derived from IP: player_hash is not usable for that.';

-- Claim lookups are "all rows for this browser, not yet owned".
CREATE INDEX IF NOT EXISTS plays_anon_id_unclaimed_idx
  ON public.plays (anon_id)
  WHERE anon_id IS NOT NULL AND player_id IS NULL;

CREATE INDEX IF NOT EXISTS battle_results_anon_id_unclaimed_idx
  ON public.battle_results (anon_id)
  WHERE anon_id IS NOT NULL AND user_id IS NULL;

COMMIT;

-- RLS: both tables have row security enabled. This migration adds NO policy. The claim
-- write path (setting player_id / user_id where anon_id matches) must be performed by a
-- SECURITY DEFINER function or the service role, and it MUST verify the caller supplied
-- the anon_id it is claiming. A client that can pass an arbitrary anon_id could claim a
-- stranger's runs, which is the exact failure this migration exists to avoid.
--
-- ROLLBACK: DROP INDEX plays_anon_id_unclaimed_idx, battle_results_anon_id_unclaimed_idx;
--           ALTER TABLE public.plays DROP COLUMN anon_id;
--           ALTER TABLE public.battle_results DROP COLUMN anon_id;
