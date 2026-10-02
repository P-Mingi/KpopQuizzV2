-- v12-g7-this-or-that.sql  (V12 run, agent G7, SYSTEM.md 5.3)
--
-- WHAT
--   1. duel_vote_guard        new table: one row per (voter hash, question, pair, UTC day).
--   2. duel_votes_question_pair_idx   new index on the existing duel_votes (pair lookups).
--   3. duel_cast_song_vote()  new function: the only write path of the This or that
--                             bonus card. Validates the pair, enforces one vote per
--                             pair per voter per day and a daily cap, inserts ONE row
--                             in duel_votes, returns the real split of the pair.
--   4. duel_song_rankings     new table: the nightly Bradley-Terry ranking of a group's
--                             songs with the weekly movement (written by
--                             /api/cron/fans-picked, read by /api/duel/fans-picked).
--
-- WHY
--   The quiz results bonus card and the "<Fandom> picked" section reuse duel_questions /
--   duel_votes (migrations 067 / 068). They had no per-day voter rule, no server-side
--   pair validation for songs, and no ranking table with weekly movement.
--
-- EXISTING DATA
--   duel_questions, duel_votes (75,191 rows on 2026-10-02) and duel_ratings are NOT
--   altered, rewritten, cleaned or dropped. No column is added to them. The only
--   statement that touches an existing table is `create index if not exists` on
--   duel_votes (no rewrite; 75k rows, well under a second). cast_duel_vote() (068) is
--   left as it is.
--
-- ROWS
--   0 rows inserted, updated or deleted by this file. Two empty tables are created.
--
-- UNTIL APPLIED
--   /api/duel/pairs answers `pairs: []` (the bonus card does not render),
--   /api/duel/vote answers 503 not_live, /api/duel/fans-picked answers `ranked: false`,
--   /api/cron/fans-picked answers `ok: false, reason: not_applied`.
--
-- VERIFY (after applying)
--   select to_regclass('public.duel_vote_guard'), to_regclass('public.duel_song_rankings');   -- both not null
--   select proname, prosecdef from pg_proc where proname = 'duel_cast_song_vote';             -- 1 row, prosecdef = true
--   select has_function_privilege('anon', 'public.duel_cast_song_vote(uuid,uuid,uuid,uuid,text)', 'execute');  -- false
--   select count(*) from public.duel_votes;                                                   -- unchanged
--
-- UNDO
--   drop function if exists public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text);
--   drop table if exists public.duel_song_rankings;
--   drop table if exists public.duel_vote_guard;
--   drop index if exists public.duel_votes_question_pair_idx;
--   (votes cast through the function stay in duel_votes: they are real votes.)
--
-- Idempotent: safe to run twice.

begin;

-- ---------------------------------------------------------------------------
-- 1. duel_vote_guard: "one vote per pair per voter per day"
-- ---------------------------------------------------------------------------
-- voter_hash is an HMAC of the voter's id made by the server (lib/duel/token.ts).
-- No IP, no user id, no user agent is stored. pair_key is
-- least(a, b) || '|' || greatest(a, b) on the uuids, so A-B and B-A are one pair.
-- Rows older than two days are deleted by the nightly cron.
create table if not exists public.duel_vote_guard (
  voter_hash  text not null,
  question_id uuid not null references public.duel_questions(id) on delete cascade,
  pair_key    text not null,
  vote_day    date not null,
  created_at  timestamptz not null default now(),
  primary key (voter_hash, question_id, pair_key, vote_day)
);

create index if not exists duel_vote_guard_voter_day_idx
  on public.duel_vote_guard (voter_hash, vote_day);
create index if not exists duel_vote_guard_day_idx
  on public.duel_vote_guard (vote_day);

-- Service role only: RLS on, no policy.
alter table public.duel_vote_guard enable row level security;

-- ---------------------------------------------------------------------------
-- 2. pair lookups on the vote log (the split of one pair)
-- ---------------------------------------------------------------------------
create index if not exists duel_votes_question_pair_idx
  on public.duel_votes (question_id, option_a_id, option_b_id);

-- ---------------------------------------------------------------------------
-- 3. duel_cast_song_vote
-- ---------------------------------------------------------------------------
-- status: ok | already_voted | rate_limited | bad_pair | bad_question | bad_voter
-- votes_a / votes_b: votes of the pair (either order) won by option a / option b,
-- the new vote included. Null when the request was refused before the pair was read.
create or replace function public.duel_cast_song_vote(
  p_question_id  uuid,
  p_option_a_id  uuid,
  p_option_b_id  uuid,
  p_winner_id    uuid,
  p_voter_hash   text
)
returns table (status text, votes_a int, votes_b int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day    date := (now() at time zone 'utc')::date;
  v_key    text;
  v_status text := 'ok';
  v_today  int;
  v_rows   int;
  -- votes one voter hash may cast in a day, all questions together
  c_daily_cap constant int := 200;
begin
  if p_voter_hash is null or length(p_voter_hash) < 16 or length(p_voter_hash) > 64 then
    return query select 'bad_voter'::text, null::int, null::int;
    return;
  end if;

  if p_question_id is null or p_option_a_id is null or p_option_b_id is null or p_winner_id is null
     or p_option_a_id = p_option_b_id
     or (p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id) then
    return query select 'bad_pair'::text, null::int, null::int;
    return;
  end if;

  -- Songs only: never a member against a member, never a group against a group.
  if not exists (
    select 1 from public.duel_questions q
    where q.id = p_question_id and q.is_active and q.entity_kind = 'song'
  ) then
    return query select 'bad_question'::text, null::int, null::int;
    return;
  end if;

  -- Both songs must belong to the question.
  if (
    select count(*) from public.duel_ratings r
    where r.question_id = p_question_id and r.entity_id in (p_option_a_id, p_option_b_id)
  ) <> 2 then
    return query select 'bad_pair'::text, null::int, null::int;
    return;
  end if;

  v_key := least(p_option_a_id, p_option_b_id)::text || '|' || greatest(p_option_a_id, p_option_b_id)::text;

  select count(*) into v_today
  from public.duel_vote_guard g
  where g.voter_hash = p_voter_hash and g.vote_day = v_day;

  if v_today >= c_daily_cap then
    v_status := 'rate_limited';
  else
    -- The primary key makes this atomic: two concurrent votes on the same pair by
    -- the same voter insert one guard row, so one vote.
    insert into public.duel_vote_guard (voter_hash, question_id, pair_key, vote_day)
    values (p_voter_hash, p_question_id, v_key, v_day)
    on conflict do nothing;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      v_status := 'already_voted';
    else
      insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
      values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);
    end if;
  end if;

  return query
    select v_status,
           (count(*) filter (where v.winner_id = p_option_a_id))::int,
           (count(*) filter (where v.winner_id = p_option_b_id))::int
    from public.duel_votes v
    where v.question_id = p_question_id
      and ((v.option_a_id = p_option_a_id and v.option_b_id = p_option_b_id)
        or (v.option_a_id = p_option_b_id and v.option_b_id = p_option_a_id));
end;
$$;

-- Only the server (service role) may call it: the route checks the signed pair
-- token first. A direct call with the anon key is refused.
revoke all on function public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text) from public;
revoke all on function public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text) from anon, authenticated;
grant execute on function public.duel_cast_song_vote(uuid, uuid, uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. duel_song_rankings: the nightly ranking
-- ---------------------------------------------------------------------------
-- One row per song of a question, replaced every night.
--   rank                1 = first, null = not ranked (fewer than 5 comparisons)
--   prev_rank           rank computed from the votes older than 7 days, null = none
--   movement            prev_rank - rank (positive = went up), null = none
--   strength            Bradley-Terry strength (1 = an average song)
--   votes / wins        counted votes this song took part in / won
--   question_votes      counted votes on the whole question (the group's vote count)
--   question_votes_prev the same, 7 days ago
create table if not exists public.duel_song_rankings (
  question_id         uuid not null references public.duel_questions(id) on delete cascade,
  entity_id           uuid not null,
  group_slug          text not null,
  rank                int,
  prev_rank           int,
  movement            int,
  strength            numeric not null,
  votes               int not null default 0,
  wins                int not null default 0,
  question_votes      int not null default 0,
  question_votes_prev int not null default 0,
  computed_at         timestamptz not null default now(),
  primary key (question_id, entity_id)
);

create index if not exists duel_song_rankings_group_rank_idx
  on public.duel_song_rankings (group_slug, rank);

-- Read and written by the server only (service role): RLS on, no policy.
alter table public.duel_song_rankings enable row level security;

commit;
