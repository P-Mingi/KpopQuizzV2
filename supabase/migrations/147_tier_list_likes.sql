-- 147 - Tier list likes: real one-per-user idempotency + atomic counters.
-- Fixes the phase-3 engage hole (L-224): /api/tier-list/engage had no auth, no rate
-- limit, and a read-modify-write counter. Because tier_lists.likes orders the
-- community list on every subject page, a loop of POSTs could farm a list to the top,
-- and concurrent likes lost increments. A like is now a ROW owned by a signed-in
-- user (anonymous likes are impossible to make idempotent: a fresh id per request is
-- a fresh "like"), the counter is maintained by a trigger, and the view bump is a
-- single atomic UPDATE. Mirrors 146 for style, RLS posture and FK targets.

create table if not exists public.tier_list_likes (
  list_id    uuid not null references public.tier_lists(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists tier_list_likes_user_idx on public.tier_list_likes (user_id);

alter table public.tier_list_likes enable row level security;

-- Read: a signed-in user reads their own likes (to render the filled heart). The
-- public like COUNT is served from tier_lists.likes, so no world read is needed.
do $$ begin
  create policy "tier_list_likes read own"
    on public.tier_list_likes for select
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Write: a signed-in user likes / unlikes only as themselves.
do $$ begin
  create policy "tier_list_likes insert own"
    on public.tier_list_likes for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tier_list_likes delete own"
    on public.tier_list_likes for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Keep tier_lists.likes exactly equal to the number of like rows. That counter
-- orders a public surface, so it must not drift and must not be writable by a
-- spammed endpoint.
create or replace function public.tier_list_likes_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.tier_lists set likes = likes + 1 where id = NEW.list_id;
  elsif TG_OP = 'DELETE' then
    update public.tier_lists set likes = greatest(likes - 1, 0) where id = OLD.list_id;
  end if;
  return null;
end $$;

drop trigger if exists tier_list_likes_sync_trg on public.tier_list_likes;
create trigger tier_list_likes_sync_trg
  after insert or delete on public.tier_list_likes
  for each row execute function public.tier_list_likes_sync();

-- Reconcile any counter written before this migration.
update public.tier_lists t
   set likes = coalesce((select count(*) from public.tier_list_likes l where l.list_id = t.id), 0)
 where t.likes is distinct from coalesce((select count(*) from public.tier_list_likes l where l.list_id = t.id), 0);

-- Atomic view bump: one UPDATE, no read-modify-write, so concurrent views cannot
-- lose increments. Views rank nothing, so they stay open to logged-out viewers;
-- the route still throttles.
create or replace function public.tier_list_bump_view(p_slug text) returns integer
language sql security definer set search_path = public as $$
  update public.tier_lists set views = views + 1 where slug = p_slug returning views;
$$;
