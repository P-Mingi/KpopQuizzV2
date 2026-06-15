-- Migration 068: cast_duel_vote RPC (real-time Elo, Pipeline 1 Section 2a + 7).
--
-- Atomic, anonymous-callable vote: records the duel_votes row, applies a plain
-- Elo update (K=24) to both entities' duel_ratings, and returns the two updated
-- rows so the vote API / live widget can animate the "+12" delta.
--
-- SECURITY DEFINER: duel_ratings writes are RLS-restricted to the service role,
-- so the function runs as its owner (the migration role, which owns the tables
-- and bypasses RLS) and is granted to anon + authenticated, who only get to call
-- this one controlled path. Idempotent definition (create or replace).

create or replace function public.cast_duel_vote(
  p_question_id  uuid,
  p_option_a_id  uuid,
  p_option_b_id  uuid,
  p_winner_id    uuid,
  p_voter_hash   text default null
)
returns table (entity_id uuid, elo numeric, last_delta int)
language plpgsql
security definer
set search_path = public
as $$
-- RETURNS TABLE names (entity_id, elo, last_delta) collide with duel_ratings
-- columns in the UPDATE/SELECT below; resolve bare references to the column.
#variable_conflict use_column
declare
  v_loser_id   uuid;
  v_elo_w      numeric;
  v_elo_l      numeric;
  v_expected_w numeric;
  v_delta      int;
begin
  -- Validate the winner is actually one of the two options.
  if p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id then
    raise exception 'winner_id % is not one of option_a_id % / option_b_id %',
      p_winner_id, p_option_a_id, p_option_b_id;
  end if;

  -- Light anti-abuse (Section 7): same voter + same exact pair within 10s is a
  -- double-fire. Ignore it (no insert, no Elo change) and return current standings
  -- for the two entities, so the raw vote log stays replay-consistent with the
  -- nightly reconciliation.
  if p_voter_hash is not null and exists (
    select 1 from public.duel_votes
    where question_id = p_question_id
      and voter_hash  = p_voter_hash
      and option_a_id = p_option_a_id
      and option_b_id = p_option_b_id
      and created_at  > now() - interval '10 seconds'
  ) then
    return query
      select dr.entity_id, dr.elo, dr.last_delta
      from public.duel_ratings dr
      where dr.question_id = p_question_id
        and dr.entity_id in (p_option_a_id, p_option_b_id);
    return;
  end if;

  -- Record the vote (source of truth for reconciliation).
  insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
  values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);

  v_loser_id := case when p_winner_id = p_option_a_id then p_option_b_id else p_option_a_id end;

  -- Lock + load both ratings.
  select dr.elo into v_elo_w from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id = p_winner_id for update;
  select dr.elo into v_elo_l from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id = v_loser_id for update;

  if v_elo_w is null or v_elo_l is null then
    raise exception 'duel_ratings missing for question % (winner % / loser %)',
      p_question_id, p_winner_id, v_loser_id;
  end if;

  -- Plain Elo, K = 24. Winner scored 1, loser 0; deltaB = -deltaA for a 1v1.
  v_expected_w := 1.0 / (1.0 + power(10.0, (v_elo_l - v_elo_w) / 400.0));
  v_delta := round(24 * (1 - v_expected_w));

  update public.duel_ratings
    set elo = elo + v_delta, wins = wins + 1, last_delta = v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = p_winner_id;

  update public.duel_ratings
    set elo = elo - v_delta, losses = losses + 1, last_delta = -v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = v_loser_id;

  return query
    select dr.entity_id, dr.elo, dr.last_delta
    from public.duel_ratings dr
    where dr.question_id = p_question_id
      and dr.entity_id in (p_winner_id, v_loser_id);
end;
$$;

grant execute on function public.cast_duel_vote(uuid, uuid, uuid, uuid, text) to anon, authenticated;
