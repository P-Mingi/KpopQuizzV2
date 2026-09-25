-- v11-p4-rank-for-score.sql - UX v11 run, agent P4 (quiz results).
-- OWNER APPLIES THIS BY HAND, after a backup point. Never applied by an agent.
--
-- WHY. The v11 results screen shows "#38 of 2,375 players · your best 7/8" for every
-- finished run (DESIGN-SPEC 16.7 "rank line"; prototype state `end` and `end-guest`).
-- Signed-in players already get it from get_quiz_rank(p_quiz_id, p_user_id)
-- (migration 098). A guest has no user id, so today there is no way to place a guest
-- score on the same board without fabricating a number.
--
-- WHAT. A read-only twin of get_quiz_rank that ranks a SCORE instead of a user, with
-- the exact same definition of the board: rank = 1 + distinct signed-in players whose
-- score beats it; total_players = distinct signed-in players on the quiz.
--
-- FAIL SOFT UNTIL APPLIED: GET /api/ux-v1/p4/rank calls it; while the function does
-- not exist the route answers { rank: null } and the guest results screen simply has
-- no rank line (signed-in players keep theirs from get_quiz_rank).
--
-- DATA SAFETY: additive only (a new STABLE SQL function, SECURITY INVOKER, reading
-- plays through the caller's existing RLS, which already allows public SELECT of the
-- columns used here). No table, column, policy or existing RPC changes.

CREATE OR REPLACE FUNCTION public.get_quiz_rank_for_score(p_quiz_id uuid, p_score int)
RETURNS TABLE(rank int, total_players int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select
    (1 + (
      select count(distinct player_id) from public.plays
      where quiz_id = p_quiz_id and player_id is not null and score > p_score
    ))::int as rank,
    (
      select count(distinct player_id) from public.plays
      where quiz_id = p_quiz_id and player_id is not null
    )::int as total_players;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_rank_for_score(uuid, int) TO anon, authenticated;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.get_quiz_rank_for_score(uuid, int);
