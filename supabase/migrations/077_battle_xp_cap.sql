-- 077 - L6: battle XP anti-farm. Cap the number of battles per UTC day that
-- earn XP (per signed-in user). Counters reset each UTC day.
alter table public.profiles
  add column if not exists battle_xp_date  date,
  add column if not exists battle_xp_count int  not null default 0;

-- 077 - confirm/flag per-user dedup. One confirm + one flag per (question, voter)
-- prevents a single user from inflating either counter on a pending question.
create table if not exists public.pending_question_votes (
  question_id uuid not null references public.pending_questions(id) on delete cascade,
  voter_hash  text not null,                                        -- anon: sha256(ip+day); authed: 'user:' + user_id
  action      text not null check (action in ('confirm', 'flag')),
  created_at  timestamptz not null default now(),
  primary key (question_id, voter_hash, action)
);

alter table public.pending_question_votes enable row level security;
-- service role only; client never writes here directly. SELECT closed too.
