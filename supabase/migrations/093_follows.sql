-- 093 - Follow graph foundation (Workstream M, M1.8). The creator graph: who
-- follows whom. Counts are denormalized onto profiles and maintained by a trigger
-- so profile reads never COUNT-scan (NANO-safe, keeps /u static/ISR cheap).
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),                       -- UNIQUE: dedupes, idempotent follow
  constraint follows_no_self check (follower_id <> followed_id) -- no self-follow
);

-- list followers (newest first, M1.10) / list following.
create index if not exists follows_followed_idx on public.follows (followed_id, created_at desc);
create index if not exists follows_follower_idx on public.follows (follower_id, created_at desc);

alter table public.follows enable row level security;
-- Public read (counts + the viewer's own state are public). Writes are owner-only:
-- a user can only create / remove follows where they are the follower.
create policy follows_select_all  on public.follows for select using (true);
create policy follows_insert_own  on public.follows for insert with check (auth.uid() = follower_id);
create policy follows_delete_own  on public.follows for delete using (auth.uid() = follower_id);

-- Denormalized counts.
alter table public.profiles
  add column if not exists follower_count  int not null default 0,
  add column if not exists following_count int not null default 0;

create or replace function public.handle_follow_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count  = follower_count  + 1 where id = new.followed_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count  = greatest(follower_count  - 1, 0) where id = old.followed_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_follow_change on public.follows;
create trigger trg_follow_change
  after insert or delete on public.follows
  for each row execute function public.handle_follow_change();

-- Trigger-fired only (never an RPC); revoke per the 081/082 lockdown.
revoke execute on function public.handle_follow_change() from anon, authenticated;
