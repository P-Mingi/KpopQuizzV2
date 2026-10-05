-- v12-f5-quiz-rank.sql  (V12 run, agent F5a: the results rank "#N of M players"). NOT APPLIED.
-- OWNER APPLIES THIS BY HAND, after a backup point, only after `go v12-f5-quiz-rank.sql`.
--
-- WHAT
--   Two NEW read-only functions, twins of the rank functions the results screen reads,
--   with one extra parameter p_exclude_team boolean DEFAULT false:
--     public.get_quiz_rank_v12(p_quiz_id uuid, p_user_id uuid, p_exclude_team boolean DEFAULT false)
--       twin of get_quiz_rank (migration 098), same columns:
--       best_score, total_questions, rank, total_players
--     public.get_quiz_rank_for_score_v12(p_quiz_id uuid, p_score int, p_exclude_team boolean DEFAULT false)
--       twin of get_quiz_rank_for_score (v11-p4-rank-for-score.sql), same columns: rank, total_players
--   With p_exclude_team = false each answers exactly what its twin answers (same board:
--   rank = 1 + distinct signed-in players whose best beats it; total = distinct signed-in
--   players). With true, the plays of active editorial accounts (public.is_editorial) are
--   left out of both numbers, and an editorial viewer gets rank null (they never act as fans).
--
-- WHY
--   Owner decision 2026-10-03 (F5 brief): the 9 editorial accounts are left out of the
--   results rank. New names, not a new parameter on the existing functions: adding a
--   defaulted parameter with CREATE OR REPLACE would create an overload and make every
--   existing two-argument call ambiguous. get_quiz_rank and get_quiz_rank_for_score are
--   NOT touched: every existing call keeps its exact signature and result. Only the v12
--   code (NEXT_PUBLIC_UX_V12 on, at least one editorial account) calls the new names with
--   p_exclude_team = true, and it falls back to today's call while this file is not applied.
--
-- ORDER
--   Apply after v12-g9-editorial.sql (it defines public.is_editorial). This file stops with
--   a clear error, writing nothing, when is_editorial does not exist yet.
--
-- ROWS
--   None. No table, column, policy, index or existing function changes; no row is written.
--   Both functions are STABLE, SECURITY INVOKER, and read public.plays through the caller's
--   existing RLS (public SELECT, migration 003), like their twins.
--
-- VERIFY (read only)
--   SELECT * FROM public.get_quiz_rank('<quiz uuid>', '<user uuid>');
--   SELECT * FROM public.get_quiz_rank_v12('<quiz uuid>', '<user uuid>');          -- same row
--   SELECT * FROM public.get_quiz_rank_v12('<quiz uuid>', '<user uuid>', true);    -- total_players lower by the editorial players of that quiz
--   SELECT * FROM public.get_quiz_rank_for_score_v12('<quiz uuid>', 5);            -- same as get_quiz_rank_for_score when that one is applied
--
-- UNDO
--   DROP FUNCTION IF EXISTS public.get_quiz_rank_v12(uuid, uuid, boolean);
--   DROP FUNCTION IF EXISTS public.get_quiz_rank_for_score_v12(uuid, int, boolean);
--   NOTIFY pgrst, 'reload schema';

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_editorial(uuid)') IS NULL THEN
    RAISE EXCEPTION 'v12-f5-quiz-rank.sql: apply v12-g9-editorial.sql first (public.is_editorial(uuid) is missing)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_quiz_rank_v12(p_quiz_id uuid, p_user_id uuid, p_exclude_team boolean DEFAULT false)
RETURNS TABLE(best_score int, total_questions int, rank int, total_players int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  with board as (
    select player_id, score from public.plays
    where quiz_id = p_quiz_id and player_id is not null
      and (not p_exclude_team or not public.is_editorial(player_id))
  ),
  mine as (
    select max(score) as s, max(total_questions) as tq
    from public.plays
    where quiz_id = p_quiz_id and player_id = p_user_id
  )
  select
    (select s from mine)::int as best_score,
    (select tq from mine)::int as total_questions,
    case
      when (select s from mine) is null then null
      when p_exclude_team and public.is_editorial(p_user_id) then null
      else 1 + (select count(distinct player_id) from board where score > (select s from mine))
    end::int as rank,
    (select count(distinct player_id) from board)::int as total_players;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_rank_for_score_v12(p_quiz_id uuid, p_score int, p_exclude_team boolean DEFAULT false)
RETURNS TABLE(rank int, total_players int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  with board as (
    select player_id, score from public.plays
    where quiz_id = p_quiz_id and player_id is not null
      and (not p_exclude_team or not public.is_editorial(player_id))
  )
  select
    (1 + (select count(distinct player_id) from board where score > p_score))::int as rank,
    (select count(distinct player_id) from board)::int as total_players;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_rank_v12(uuid, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_rank_for_score_v12(uuid, int, boolean) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
