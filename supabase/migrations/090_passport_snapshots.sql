-- 090 - Passport forward snapshots (Workstream M, M1.4).
-- There is no accuracy time-series yet, so we build one FORWARD from now: a tiny
-- per-user-per-group weekly snapshot of accuracy. Never fabricates a past
-- baseline. Accuracy-climb deltas ("aespa accuracy climbed 60 to 84%") only show
-- once a group has >= 2 snapshots; until then the passport shows achievement
-- progression (current counters), which needs no history.
--
-- Cheapest mechanism (NANO-safe): the snapshot is written LAZILY on the owner's
-- own /me render, gated by profiles.passport_snapshot_at so it fires at most once
-- per 7 days per user (a handful of upserts), and pruned to ~8 weeks. No cron, no
-- per-action writes. RLS keeps it owner-private (personal-mode only).
create table if not exists public.passport_group_snapshots (
  user_id      uuid not null references auth.users(id) on delete cascade,
  group_id     int  not null references public.groups(id) on delete cascade,
  taken_on     date not null,
  accuracy     real not null,
  songs_played int  not null,
  primary key (user_id, group_id, taken_on)
);

create index if not exists pgs_user_idx on public.passport_group_snapshots (user_id, group_id, taken_on);

alter table public.passport_group_snapshots enable row level security;
create policy pgs_select_own on public.passport_group_snapshots for select using (auth.uid() = user_id);
create policy pgs_insert_own on public.passport_group_snapshots for insert with check (auth.uid() = user_id);
create policy pgs_delete_own on public.passport_group_snapshots for delete using (auth.uid() = user_id);

-- Cadence gate: last date a snapshot batch was written for this user.
alter table public.profiles
  add column if not exists passport_snapshot_at date;
