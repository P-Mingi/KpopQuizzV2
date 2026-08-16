-- W3b PART 3 - let a guest claim a GAME run, same contract as migration 155.
-- OWNER APPLIES THIS BY HAND. Additive only: one nullable column + one partial index.
--
-- WHY (measured live 2026-08-15):
--   game_plays : 1,517 rows, 1,390 with player_id NULL = 92% guest, 706 in 30 days.
--   columns    : id, game_id, player_id, choices, created_at  -> no browser-scoped id,
--                so the claim block on a game result screen would move ZERO rows.
--   Game screens are MORE anonymous than quizzes (92% vs 61%), so this is the biggest
--   remaining claim surface, not the smallest.
--
-- NOT INCLUDED, deliberately: name_all_member_results. It has no player_id at all
-- (id, group_id, member_name, found, round_id, created_at) - those are per-member detail
-- rows of a round, not an ownable run. There is nothing there to claim.
--
-- WHAT THIS DOES NOT DO: the 1,390 existing guest game plays carry no anon_id and can
-- NEVER be claimed, exactly like the 36,170 pre-155 quiz plays. The copy must not
-- pretend otherwise.

BEGIN;

ALTER TABLE public.game_plays
  ADD COLUMN IF NOT EXISTS anon_id uuid;

COMMENT ON COLUMN public.game_plays.anon_id IS
  'Client-generated UUID held in localStorage, same contract as plays.anon_id and battle_results.anon_id (migration 155). Identifies a browser, never a person. NULL on every row created before migration 156.';

CREATE INDEX IF NOT EXISTS game_plays_anon_id_unclaimed_idx
  ON public.game_plays (anon_id)
  WHERE anon_id IS NOT NULL AND player_id IS NULL;

COMMIT;

-- The claim write must verify the caller supplied the anon_id it claims (httpOnly
-- nq_anon cookie), and may only touch rows where player_id IS NULL. Same security
-- contract as /api/claim-runs.
--
-- ROLLBACK: DROP INDEX game_plays_anon_id_unclaimed_idx;
--           ALTER TABLE public.game_plays DROP COLUMN anon_id;
