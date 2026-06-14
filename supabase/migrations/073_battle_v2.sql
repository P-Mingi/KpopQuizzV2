-- 073 - Async 1v1 battle data model (Workstream E, spec Section 5).
-- Three anon-first tables: battles (a run + its ghost), battle_results (each
-- player's run for the ghost breakdown), pending_questions (fan-submitted Qs).
-- Anon-first RLS: public SELECT + INSERT; UPDATE/DELETE are service-role only
-- (finalize score, confirms/flags/status promotion go through API routes).

-- ============================================================
-- battles
-- ============================================================
create table if not exists public.battles (
  id               uuid primary key default gen_random_uuid(),
  quiz_id          uuid references public.quizzes(id) on delete cascade,   -- null for group-level
  group_slug       text,
  question_ids     uuid[] not null,                                        -- the exact 7, ordered
  challenger_hash  text not null,                                          -- anon hash of originator
  challenger_score int,                                                    -- null until they finish
  created_at       timestamptz not null default now()
);
-- ghost matchmaking by quiz, most recent first
create index if not exists battles_quiz_created_idx on public.battles(quiz_id, created_at desc);
create index if not exists battles_group_created_idx on public.battles(group_slug, created_at desc);

-- ============================================================
-- battle_results
-- ============================================================
create table if not exists public.battle_results (
  id           uuid primary key default gen_random_uuid(),
  battle_id    uuid not null references public.battles(id) on delete cascade,
  player_hash  text not null,                 -- anon (or user_id later, Type 3)
  score        int not null,
  per_question boolean[] not null,            -- correct/incorrect per Q (breakdown)
  time_ms      int not null,                  -- total answer time, tiebreaker
  created_at   timestamptz not null default now()
);
create index if not exists battle_results_battle_idx on public.battle_results(battle_id);
-- supports "recent results" recency ordering for the ghost query
create index if not exists battle_results_created_idx on public.battle_results(created_at desc);

-- ============================================================
-- pending_questions
-- ============================================================
create table if not exists public.pending_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid references public.quizzes(id) on delete set null,
  group_slug    text,
  question      text not null,
  options       text[] not null,
  correct_index int not null,
  author_hash   text not null,
  confirms      int not null default 0,
  flags         int not null default 0,
  status        text not null default 'pending' check (status in ('pending', 'live', 'killed')),
  created_at    timestamptz not null default now()
);
create index if not exists pending_questions_status_idx on public.pending_questions(status);

-- ============================================================
-- RLS (anon-first). Enable + public SELECT/INSERT. No UPDATE/DELETE policies,
-- so writes beyond insert are blocked for anon/authenticated; the service role
-- bypasses RLS for finalize/confirm/promote in API routes.
-- ============================================================
alter table public.battles            enable row level security;
alter table public.battle_results     enable row level security;
alter table public.pending_questions  enable row level security;

drop policy if exists battles_select_all on public.battles;
drop policy if exists battles_insert_all on public.battles;
create policy battles_select_all on public.battles for select using (true);
create policy battles_insert_all on public.battles for insert with check (true);

drop policy if exists battle_results_select_all on public.battle_results;
drop policy if exists battle_results_insert_all on public.battle_results;
create policy battle_results_select_all on public.battle_results for select using (true);
create policy battle_results_insert_all on public.battle_results for insert with check (true);

drop policy if exists pending_questions_select_all on public.pending_questions;
drop policy if exists pending_questions_insert_all on public.pending_questions;
create policy pending_questions_select_all on public.pending_questions for select using (true);
create policy pending_questions_insert_all on public.pending_questions for insert with check (true);
