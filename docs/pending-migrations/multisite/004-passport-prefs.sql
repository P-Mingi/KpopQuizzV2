-- 004-passport-prefs.sql (run O1, lane B3; manifest.md row 8; BACKLOG 4.1 rows 9 to 12; schema.sql section "@file 004-passport-prefs")
--
-- What:   creates public.passport_prefs (one row per member: the hub settings), public.favourites (a member's topics
--         and picks on a non-kpop world, never 'kpop'), public.world_follows (follows on a non-kpop world, never
--         'kpop'), the trigger trg_world_follows_counts (function world_follows_counts, keeps follower_count and
--         following_count of world_memberships), and the views world_progress and favourites_all (both
--         security_invoker), with RLS and the policies of the contract.
-- Why:    the passport reads one shape of progress and favourites across worlds (kpop values come from profiles,
--         P 7.2 and 7.3) and the non-kpop worlds store their own favourites and follows. kpop's own follows
--         (table follows, handle_follow_change) are not touched.
-- Rows:   3 new tables, 2 views and 1 trigger function; no row is inserted, no existing table, row or column is
--         touched.
-- Needs:  003 (world_memberships), 001 (sites).
-- Verify: select to_regclass('public.passport_prefs'), to_regclass('public.favourites'), to_regclass('public.world_follows');   expect 3 names
--         select relname, relrowsecurity from pg_class where relname in ('passport_prefs', 'favourites', 'world_follows');   expect 3 rows, t
--         select count(*) from public.world_progress;                  expect the number of profiles (one kpop stamp each)
--         select count(*) from public.favourites_all where site_id = 'kpop';   expect the kpop picks and topics derived from profiles
--         select polname from pg_policy where polrelid in ('public.passport_prefs'::regclass, 'public.favourites'::regclass, 'public.world_follows'::regclass) order by 1;   expect 7 rows
-- Undo:   004-passport-prefs.rollback.sql (refused while any row sits in passport_prefs, favourites or world_follows).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

create table if not exists public.passport_prefs (
  user_id uuid constraint passport_prefs_pkey primary key constraint passport_prefs_user_id_fkey references public.profiles(id) on delete cascade,
  worlds jsonb not null default '{}'::jsonb,
  show_passport_level boolean not null default false,
  showcase_badges text[] not null default '{}' constraint passport_prefs_showcase_badges_check check (cardinality(showcase_badges) <= 3),
  your_sites_menu text not null default 'auto' constraint passport_prefs_your_sites_menu_check check (your_sites_menu in ('auto', 'show', 'hide')),
  crossover_suggestions boolean not null default true,
  welcomed_sites text[] not null default '{}',
  dismissed jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint passport_prefs_worlds_check check (jsonb_typeof(worlds) = 'object'),
  constraint passport_prefs_dismissed_check check (jsonb_typeof(dismissed) = 'object')
);
alter table public.passport_prefs enable row level security;

create table if not exists public.favourites (
  id bigint generated always as identity constraint favourites_pkey primary key,
  user_id uuid not null constraint favourites_user_id_fkey references public.profiles(id) on delete cascade,
  site_id text not null constraint favourites_site_id_fkey references public.sites(id),
  slot text not null constraint favourites_slot_check check (slot in ('topic', 'pick')),
  rank smallint not null default 0 constraint favourites_rank_check check (rank between 0 and 2),
  entity_type text not null,
  entity_id text,
  label text not null constraint favourites_label_check check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  constraint favourites_not_kpop_check check (site_id <> 'kpop'),
  constraint favourites_slot_key unique (user_id, site_id, slot, rank)
);
alter table public.favourites enable row level security;

create table if not exists public.world_follows (
  site_id text not null constraint world_follows_site_id_fkey references public.sites(id),
  follower_id uuid not null constraint world_follows_follower_id_fkey references public.profiles(id) on delete cascade,
  followed_id uuid not null constraint world_follows_followed_id_fkey references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint world_follows_pkey primary key (site_id, follower_id, followed_id),
  constraint world_follows_not_kpop_check check (site_id <> 'kpop'),
  constraint world_follows_not_self_check check (follower_id <> followed_id)
);
create index if not exists world_follows_followed_idx on public.world_follows (site_id, followed_id);
alter table public.world_follows enable row level security;

-- Policies (each created once; a second run skips the ones that exist).
do $$
declare
  p record;
begin
  for p in
    select * from (values
      -- policy: a signed-in user reads only their own row. No write policy: writes go through set_passport_prefs.
      ('passport_prefs', 'passport_prefs_select_own',
       'create policy passport_prefs_select_own on public.passport_prefs for select to authenticated using (user_id = auth.uid())'),
      -- policy: favourites are public profile content on their own site (like kpop''s bias): everyone reads them.
      ('favourites', 'favourites_select_public',
       'create policy favourites_select_public on public.favourites for select using (true)'),
      -- policy: a signed-in user inserts, updates and deletes only their own rows, never on ''kpop''.
      ('favourites', 'favourites_insert_own',
       'create policy favourites_insert_own on public.favourites for insert to authenticated with check (user_id = auth.uid() and site_id <> ''kpop'')'),
      ('favourites', 'favourites_update_own',
       'create policy favourites_update_own on public.favourites for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and site_id <> ''kpop'')'),
      ('favourites', 'favourites_delete_own',
       'create policy favourites_delete_own on public.favourites for delete to authenticated using (user_id = auth.uid())'),
      -- policy: follow lists are public on their site (as kpop follows are).
      ('world_follows', 'world_follows_select_public',
       'create policy world_follows_select_public on public.world_follows for select using (true)'),
      -- policy: a signed-in user follows and unfollows as themself only (the Team accounts are refused by the API).
      ('world_follows', 'world_follows_insert_own',
       'create policy world_follows_insert_own on public.world_follows for insert to authenticated with check (follower_id = auth.uid() and site_id <> ''kpop'')'),
      ('world_follows', 'world_follows_delete_own',
       'create policy world_follows_delete_own on public.world_follows for delete to authenticated using (follower_id = auth.uid())')
    ) as v(tbl, pol, ddl)
  loop
    if not exists (select 1 from pg_policy where polrelid = ('public.' || p.tbl)::regclass and polname = p.pol) then
      execute p.ddl;
    end if;
  end loop;
end $$;

-- trg_world_follows_counts: AFTER INSERT OR DELETE, keeps world_memberships.follower_count and following_count.
create or replace function public.world_follows_counts() returns trigger
  language plpgsql security definer set search_path = public
  as $$
begin
  if tg_op = 'INSERT' then
    update public.world_memberships m set following_count = coalesce(m.following_count, 0) + 1
     where m.user_id = new.follower_id and m.site_id = new.site_id;
    update public.world_memberships m set follower_count = coalesce(m.follower_count, 0) + 1
     where m.user_id = new.followed_id and m.site_id = new.site_id;
  elsif tg_op = 'DELETE' then
    update public.world_memberships m set following_count = greatest(coalesce(m.following_count, 0) - 1, 0)
     where m.user_id = old.follower_id and m.site_id = old.site_id;
    update public.world_memberships m set follower_count = greatest(coalesce(m.follower_count, 0) - 1, 0)
     where m.user_id = old.followed_id and m.site_id = old.site_id;
  end if;
  return null;
end
$$;
revoke all on function public.world_follows_counts() from public, anon, authenticated;
create or replace trigger trg_world_follows_counts after insert or delete on public.world_follows
  for each row execute function public.world_follows_counts();

-- world_progress: one row per membership; kpop values come from profiles (P 7.2, 7.3).
create or replace view public.world_progress with (security_invoker = true) as
select m.user_id, m.site_id,
       case when m.site_id = 'kpop' then p.xp else coalesce(m.xp, 0) end as xp,
       case when m.site_id = 'kpop' then p.daily_streak else coalesce(m.daily_streak, 0) end as daily_streak,
       case when m.site_id = 'kpop' then p.total_quizzes_created else coalesce(m.quizzes_created, 0) end as quizzes_created,
       m.show_elsewhere, m.joined_at, m.activated_at
from public.world_memberships m join public.profiles p on p.id = m.user_id;

-- favourites_all: every site's favourites in one shape; kpop rows derive from profiles.ult_groups and bias.
create or replace view public.favourites_all with (security_invoker = true) as
select f.user_id, f.site_id, f.slot, f.rank, f.entity_type, f.entity_id, f.label from public.favourites f
union all
select p.id, 'kpop'::text, 'topic'::text, (g.ord - 1)::smallint, 'group'::text, g.slug, coalesce(gr.name, g.slug)
from public.profiles p
cross join lateral jsonb_array_elements_text(p.ult_groups) with ordinality as g(slug, ord)
left join public.groups gr on gr.slug = g.slug
union all
select p.id, 'kpop'::text, 'pick'::text, 0::smallint, 'idol'::text, null::text, p.bias
from public.profiles p where coalesce(p.bias, '') <> '';
