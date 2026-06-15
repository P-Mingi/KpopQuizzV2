-- 080 - K7: per-day rate-limit log for the "Brag in the Discord" webhook posts.
-- One row per successful flex POST so we can:
--   1. Cap per-voter posts to N/day (anti-spam).
--   2. Disable a "Brag" button once the same user has already flexed a given result.
-- voter_hash is sha256(ip+day) for anon, or 'user:<id>' for signed-in users.
-- Service-role-only (no policies; writes via createServiceRoleClient).
create table if not exists public.discord_flex_log (
  id            uuid primary key default gen_random_uuid(),
  voter_hash    text not null,
  kind          text not null check (kind in ('quiz', 'battle', 'levelup')),
  -- A stable key per posted moment so the UI can ask "did I already flex THIS?".
  -- For quizzes: quiz slug; for battles: battle id; for level-ups: 'level-<n>'.
  context_key   text not null,
  posted_at     timestamptz not null default now()
);
create index if not exists discord_flex_log_voter_day_idx
  on public.discord_flex_log(voter_hash, posted_at desc);
create index if not exists discord_flex_log_context_idx
  on public.discord_flex_log(voter_hash, context_key);
alter table public.discord_flex_log enable row level security;
