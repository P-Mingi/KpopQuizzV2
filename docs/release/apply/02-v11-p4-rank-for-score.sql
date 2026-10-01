-- R1 apply bundle 02 of 8: v11-p4-rank-for-score.sql, verbatim, followed by a read-only verification.
-- Paste the whole text in the Supabase SQL editor (project rdkgouofytwfdpbxbzio) and Run.
-- The result grid is the verification: columns check / value / expected.
-- ============================================================================

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

-- ============================================================================
-- R1 verification (read only). Its rows are what the editor shows after Run.
-- ============================================================================
select 1 as n, 'function' as "check", ((select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || case when p.prosecdef then 'definer' else 'invoker' end, '; ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('get_quiz_rank_for_score')))::text as value, 'get_quiz_rank_for_score(p_quiz_id uuid, p_score integer) invoker' as expected
union all
select 2, 'execute granted to', ((select coalesce(string_agg(distinct rp.grantee, ', ' order by rp.grantee), 'none') from information_schema.routine_privileges rp where rp.specific_schema = 'public' and rp.routine_name in ('get_quiz_rank_for_score')))::text, 'a list that includes anon and authenticated'
union all
select 3, 'sample call: most played quiz, score 0', (select 'rank ' || r.rank || ' of ' || r.total_players from public.get_quiz_rank_for_score((select id from public.quizzes where status = 'published' order by play_count desc limit 1), 0) r)::text, 'rank N of M, two numbers above 0'
order by 1;
