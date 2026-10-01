-- v11-p4-relaxed-runs.sql - UX v11 run, agent P4 (quiz page, game, results).
-- OWNER APPLIES THIS BY HAND, after a backup point. Never applied by an agent.
--
-- WHY. DESIGN-SPEC 16.7 / 16.9: "Play without a timer" (relaxed mode). A relaxed run
-- is a normal play (it counts as a play, earns the same XP, keeps the streak) but it
-- must NOT enter the hall of fame and must NOT feed quiz_time_stats. WIRING-MAP v10:
-- "NEW flag on the play record (pending migration)".
--
-- WHAT THE CODE DOES WITH IT (apps/quiz, behind NEXT_PUBLIC_UX_V1):
--   1. The game saves a relaxed run through the EXISTING POST /api/quiz/[id]/play with
--      the same payload keys, time_taken_seconds = null. The existing endpoint only
--      touches quiz_time_stats when the time is > 0, so relaxed runs stay out of it
--      with or without this migration, and the "fastest" stats (which require a
--      non-null time) ignore them too.
--   2. Right after, the game calls the NEW POST /api/ux-v1/p4/relaxed with the play id
--      the endpoint returned. That route sets plays.relaxed = true, only for the
--      caller's own row (auth user = player_id, or the browser's proven anon cookie =
--      anon_id on a guest row) created in the last 15 minutes.
--   3. The v11 hall of fame reads plays where relaxed = false.
--
-- FAIL SOFT UNTIL APPLIED: lib/ux-v1/p4/queries.ts probes the column (a select that
-- errors while it does not exist). While it is missing, the "Play without a timer"
-- control is not rendered, /api/ux-v1/p4/relaxed answers 503 not_live, and the hall
-- of fame reads exactly like today. No 500, no hidden broken control.
--
-- DATA SAFETY (PHASE0 contract, part 2): additive only. ADD COLUMN with a constant
-- default is a metadata-only change on PostgreSQL 11+ (no table rewrite on the ~67k
-- rows); every existing row reads relaxed = false, which is what they are. No
-- backfill, no policy change, no RPC change. record_play is untouched.

BEGIN;

ALTER TABLE public.plays
  ADD COLUMN IF NOT EXISTS relaxed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.plays.relaxed IS
  'UX v11: run played without the timer (relaxed mode). Excluded from the hall of fame; saved with time_taken_seconds = null so quiz_time_stats ignores it.';

COMMIT;

-- ROLLBACK (only if nothing reads the column any more; the v11 code falls back to
-- today's behaviour on its own once the column is gone):
-- ALTER TABLE public.plays DROP COLUMN IF EXISTS relaxed;
