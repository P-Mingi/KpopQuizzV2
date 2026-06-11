-- Migration 067: Duel engine (Pipeline 1 - duel ranking).
-- Source: kpopquiz_pipeline1_duel_ranking_spec.md, Section 1 (data model).
--
-- Three tables back the "fans voted X" opinion-ranking duels:
--   duel_questions - one ranking per (group_slug, question_type).
--   duel_votes     - one row per anonymous A-vs-B vote (insert-only, public).
--   duel_ratings   - per-entity Elo standings, recomputed from votes (service role).
--
-- Safety / RLS: every app WRITE to questions + ratings goes through the
-- service-role client (createServiceRoleClient), which BYPASSES RLS, so no anon
-- write policy is granted on those. Votes are inserted directly by anonymous
-- visitors, so duel_votes gets a public INSERT policy but no public SELECT
-- (ranking reads come from duel_ratings, not the raw vote log). Additive +
-- idempotent (safe to re-run).

-- ---------------------------------------------------------------------------
-- 1a. duel_questions
-- ---------------------------------------------------------------------------
create table if not exists public.duel_questions (
  id            uuid primary key default gen_random_uuid(),
  group_slug    text not null,
  question_type text not null,
  prompt        text not null,
  entity_kind   text not null check (entity_kind in ('idol', 'song', 'group')),
  min_votes     int  not null default 500,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (group_slug, question_type)
);

-- ---------------------------------------------------------------------------
-- 1b. duel_votes
-- ---------------------------------------------------------------------------
create table if not exists public.duel_votes (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.duel_questions(id) on delete cascade,
  option_a_id uuid not null,
  option_b_id uuid not null,
  winner_id   uuid not null,
  voter_hash  text,
  created_at  timestamptz not null default now()
);

create index if not exists duel_votes_question_created_idx
  on public.duel_votes (question_id, created_at);
create index if not exists duel_votes_question_voter_idx
  on public.duel_votes (question_id, voter_hash);

-- ---------------------------------------------------------------------------
-- 1c. duel_ratings
-- ---------------------------------------------------------------------------
create table if not exists public.duel_ratings (
  question_id  uuid not null references public.duel_questions(id) on delete cascade,
  entity_id    uuid not null,
  entity_name  text not null,
  entity_image text,
  elo          numeric not null default 1500,
  wins         int not null default 0,
  losses       int not null default 0,
  last_delta   int not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (question_id, entity_id)
);

-- Ranking reads: highest Elo first within a question.
create index if not exists duel_ratings_question_elo_idx
  on public.duel_ratings (question_id, elo desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.duel_questions enable row level security;
alter table public.duel_votes     enable row level security;
alter table public.duel_ratings   enable row level security;

-- duel_questions: public SELECT; writes service-role only (no anon write policy).
drop policy if exists duel_questions_select on public.duel_questions;
create policy duel_questions_select
  on public.duel_questions for select
  using (true);

-- duel_ratings: public SELECT; writes service-role only.
drop policy if exists duel_ratings_select on public.duel_ratings;
create policy duel_ratings_select
  on public.duel_ratings for select
  using (true);

-- duel_votes: public INSERT (anonymous voting, no auth). No public SELECT - the
-- raw vote log is not readable through the anon endpoint; reads go via ratings.
drop policy if exists duel_votes_insert on public.duel_votes;
create policy duel_votes_insert
  on public.duel_votes for insert
  with check (true);
