-- 098 - Per-quiz hall of fame (Workstream M, M1.19). Index-backed top-N scorers
-- for a quiz + a concrete per-quiz rank for the viewer. NANO-cheap, bounded to one
-- quiz's plays. Honest: a per-quiz leaderboard is allowed (unlike a global
-- percentile). plays_select_all (mig 003) already makes these public reads.

-- Supports the top-N order (highest score, then fastest time) without a scan.
create index if not exists idx_plays_quiz_score
  on public.plays (quiz_id, score desc, time_taken_seconds asc nulls last);

-- Your standing ON THIS quiz: best score, rank among distinct players, and the
-- total distinct players. Bounded to one quiz; the (quiz_id, score) index above
-- backs the score filter. best_score is null when the viewer has not played.
create or replace function public.get_quiz_rank(p_quiz_id uuid, p_user_id uuid)
returns table(best_score int, total_questions int, rank int, total_players int)
language sql
stable
as $$
  with mine as (
    select max(score) as s, max(total_questions) as tq
    from public.plays
    where quiz_id = p_quiz_id and player_id = p_user_id
  )
  select
    (select s from mine)::int as best_score,
    (select tq from mine)::int as total_questions,
    case
      when (select s from mine) is null then null
      else 1 + (
        select count(distinct player_id) from public.plays
        where quiz_id = p_quiz_id and player_id is not null and score > (select s from mine)
      )
    end::int as rank,
    (
      select count(distinct player_id) from public.plays
      where quiz_id = p_quiz_id and player_id is not null
    )::int as total_players;
$$;

grant execute on function public.get_quiz_rank(uuid, uuid) to anon, authenticated;
