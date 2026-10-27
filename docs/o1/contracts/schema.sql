-- Run O1 contract o1-contract-v1: the DDL shape of every object of BACKLOG section 4.1.
--
-- What this file freezes (BACKLOG 5.1 "Schema"): every table, column, type, default, nullability, FK, unique key
-- and index name; every function's name, arguments, return type, SECURITY mode, search_path and grants; trigger
-- names; view columns; RLS policy names and intent (the comment above each policy). Changing a frozen item after
-- the tag is a CR (CONTRACT.md); BACKLOG 5.2 lets a CR add nullable or defaulted columns, tables, indexes and
-- views, never rename or retype. BACKLOG 5.3: the names and signatures of the 11 locked functions,
-- ensure_daily_quiz and its v2, award_world_xp and ensure_membership are never changed inside the run.
--
-- What it is NOT: a migration. Each "@file" section is the shape that the owner lane's real file
-- (docs/pending-migrations/multisite/, manifest.md) must produce. Real files add what a shape omits: IF NOT EXISTS
-- guards, NOT VALID then VALIDATE, CREATE INDEX CONCURRENTLY, lock_timeout, the backfill, the real function
-- bodies, verification queries, the header and the rollback file. Function bodies here are contract stubs
-- (COMMON rule 17): they raise 'o1-contract stub', or return NEW for trigger functions. 008's and 010's kpop
-- branches are today's bodies verbatim (from G3's pg_get_functiondef), never these stubs.
--
-- Loading: apps/quiz/scripts/o1/gen-contract-types.mts and check-contract.mts load a base (schema.base.sql on a
-- throwaway local cluster before G3; after G3 the stand-in roles and the production dump, or with
-- gen-contract-types --base db the o1-scratch branch's own schema), then this file section by section, in ONE
-- transaction that is rolled back after the catalog is read: the contract is what each "@file" section changes.
-- check-contract.mts then reads a branch's catalog in a read-only transaction and diffs it. Never apply this file
-- to a branch or to production outside that transaction: its stubs would replace live functions.
--
-- Conventions frozen here (naming.md): on the shared tables of 002a, site_id text not null default 'kpop' references
-- public.sites(id) with the FK named <table>_site_id_fkey; a new table keyed by site (favourites, world_follows,
-- review_batches, daily_openings, ...) has site_id text not null with no default; constraints and indexes carry explicit names; triggers trg_<table>_<purpose>; network
-- functions net_*, passport functions passport_*; every SECURITY DEFINER function sets search_path = public and
-- schema-qualifies passport.* objects; every new function revokes PUBLIC, anon and authenticated, then grants the
-- roles listed (service_role also keeps the EXECUTE that Supabase's default privileges give it); every new public
-- table enables RLS; a table with RLS on and no policy is service-role only and also revokes anon and
-- authenticated. Policy intent is written as "-- policy: ..." above each policy.

-- =============================================================================================================
-- @file 001-sites
-- owner B2; BACKLOG 4.1 row 1; tx single; production phase pre.
-- The kpop row only: the anime and hub rows wait for launch (L01, Verrou 0, COMMON rule 6; F0 decision 31).
-- =============================================================================================================
create table public.sites (
  id     text primary key constraint sites_id_check check (id ~ '^[a-z]{2,12}$'),
  domain text not null constraint sites_domain_key unique,
  brand  text not null,
  kind   text not null constraint sites_kind_check check (kind in ('world', 'hub')),
  status text not null default 'building' constraint sites_status_check check (status in ('building', 'live', 'frozen')),
  sort   smallint not null default 0
);
alter table public.sites enable row level security;
-- policy: everyone (anon included) reads the registry mirror; no write policy (rows come from SQL files only).
create policy sites_read on public.sites for select using (true);
insert into public.sites (id, domain, brand, kind, status, sort) values ('kpop', 'kpopquiz.org', 'KpopQuiz', 'world', 'live', 1);

-- =============================================================================================================
-- @file L01-B2-sites
-- owner B2; launch row file; tx single; production phase launch (first launch file); on the dev branches it runs
-- right after 001 (manifest.md). Values mirror registry.md; L12 (L1) sets status 'live' on launch day.
-- =============================================================================================================
insert into public.sites (id, domain, brand, kind, status, sort) values
  ('anime', 'otakuquiz.org', 'OtakuQuiz', 'world', 'building', 2),
  ('hub',   'fanquiz.org',   'FanQuiz',   'hub',   'building', 3);

-- =============================================================================================================
-- @file 002a-site-columns
-- owner B2; BACKLOG 4.1 rows 2 and 3; tx single (metadata-only adds; the real file adds each FK NOT VALID and
-- sets a short lock_timeout); production phase pre.
-- The scoped tables: the 14 of BACKLOG row 2, then the inventory (community threads and blogs live in
-- verse_threads and verse_essays with origin 'community'; editorial posts; community replies, debates and
-- challenges; quiz reports; live rooms; challenges; personality_profiles). B2's inventory may add more tables
-- through a CR (BACKLOG 5.2: a defaulted column).
-- =============================================================================================================
alter table public.quizzes               add column site_id text not null default 'kpop' constraint quizzes_site_id_fkey references public.sites(id);
alter table public.groups                add column site_id text not null default 'kpop' constraint groups_site_id_fkey references public.sites(id);
alter table public.games                 add column site_id text not null default 'kpop' constraint games_site_id_fkey references public.sites(id);
alter table public.trivia                add column site_id text not null default 'kpop' constraint trivia_site_id_fkey references public.sites(id);
alter table public.quiz_bank             add column site_id text not null default 'kpop' constraint quiz_bank_site_id_fkey references public.sites(id);
alter table public.qotd_log              add column site_id text not null default 'kpop' constraint qotd_log_site_id_fkey references public.sites(id);
alter table public.badge_definitions     add column site_id text not null default 'kpop' constraint badge_definitions_site_id_fkey references public.sites(id);
alter table public.creator_notifications add column site_id text not null default 'kpop' constraint creator_notifications_site_id_fkey references public.sites(id);
alter table public.activity_events       add column site_id text not null default 'kpop' constraint activity_events_site_id_fkey references public.sites(id);
alter table public.editorial_accounts    add column site_id text not null default 'kpop' constraint editorial_accounts_site_id_fkey references public.sites(id);
alter table public.editorial_drafts      add column site_id text not null default 'kpop' constraint editorial_drafts_site_id_fkey references public.sites(id);
alter table public.bt_runs               add column site_id text not null default 'kpop' constraint bt_runs_site_id_fkey references public.sites(id);
alter table public.personality_questions add column site_id text not null default 'kpop' constraint personality_questions_site_id_fkey references public.sites(id);
alter table public.songs                 add column site_id text not null default 'kpop' constraint songs_site_id_fkey references public.sites(id);
alter table public.verse_threads         add column site_id text not null default 'kpop' constraint verse_threads_site_id_fkey references public.sites(id);
alter table public.verse_essays          add column site_id text not null default 'kpop' constraint verse_essays_site_id_fkey references public.sites(id);
alter table public.editorial_posts       add column site_id text not null default 'kpop' constraint editorial_posts_site_id_fkey references public.sites(id);
alter table public.community_replies     add column site_id text not null default 'kpop' constraint community_replies_site_id_fkey references public.sites(id);
alter table public.community_debates     add column site_id text not null default 'kpop' constraint community_debates_site_id_fkey references public.sites(id);
alter table public.community_challenges  add column site_id text not null default 'kpop' constraint community_challenges_site_id_fkey references public.sites(id);
alter table public.reports               add column site_id text not null default 'kpop' constraint reports_site_id_fkey references public.sites(id);
alter table public.live_rooms            add column site_id text not null default 'kpop' constraint live_rooms_site_id_fkey references public.sites(id);
alter table public.challenges            add column site_id text not null default 'kpop' constraint challenges_site_id_fkey references public.sites(id);
alter table public.personality_profiles  add column site_id text not null default 'kpop' constraint personality_profiles_site_id_fkey references public.sites(id);

-- =============================================================================================================
-- @file 002b-site-validate
-- owner B2; BACKLOG 4.1 row 3; tx none (each VALIDATE CONSTRAINT alone, off-peak); production phase pre.
-- Shape: the 24 <table>_site_id_fkey constraints of 002a end VALIDATED (convalidated = true). Nothing to declare
-- here because this file creates the FKs already valid.
-- =============================================================================================================

-- =============================================================================================================
-- @file 002c-site-indexes
-- owner B2; BACKLOG 4.1 row 4; tx none (CREATE INDEX CONCURRENTLY, one statement each, IF NOT EXISTS, then a
-- check that no index is left invalid); production phase pre. New read-path indexes later: a CR (5.2).
-- =============================================================================================================
create index quizzes_site_status_created_idx     on public.quizzes (site_id, status, created_at desc);
create index groups_site_slug_idx                on public.groups (site_id, slug);
create index games_site_status_idx               on public.games (site_id, status);
create index trivia_site_group_idx               on public.trivia (site_id, group_id);
create index activity_events_site_created_idx    on public.activity_events (site_id, created_at desc);
create index creator_notifications_site_user_idx on public.creator_notifications (site_id, user_id);
create index editorial_drafts_site_status_idx    on public.editorial_drafts (site_id, status);
create index verse_threads_site_created_idx      on public.verse_threads (site_id, created_at desc);
create index community_debates_site_created_idx  on public.community_debates (site_id, created_at desc);

-- =============================================================================================================
-- @file 002d-quiz-site-guard
-- owner B2; BACKLOG 4.1 row 5 (DANGEROUS: on the kpop insert path, two R-SQL reviewers); tx single; phase pre.
-- Intent: BEFORE INSERT OR UPDATE OF site_id, group_id on quizzes, raise when NEW.site_id differs from the site_id
-- of NEW.group_id's group. Equivalence: every kpop insert of today passes unchanged (both sides 'kpop').
-- =============================================================================================================
create function public.quizzes_site_guard() returns trigger
  language plpgsql security definer set search_path = public
  as $$ begin return new; end $$;
revoke all on function public.quizzes_site_guard() from public, anon, authenticated;
create trigger trg_quizzes_site_guard before insert or update of site_id, group_id on public.quizzes
  for each row execute function public.quizzes_site_guard();

-- =============================================================================================================
-- @file 003-memberships
-- owner B3; BACKLOG 4.1 rows 6, 7, 8 (world_memberships and trg_profiles_membership DANGEROUS: two R-SQL
-- reviewers); tx single; production phase pre.
-- Rows: the real file backfills one kpop membership per profile (joined_via 'backfill', joined_at, activated_at and
-- notice_seen_at = profiles.created_at). Progression and presentation columns stay NULL for 'kpop' forever
-- (profiles.* is the kpop source of truth, P 7.3).
-- =============================================================================================================
create table public.world_memberships (
  user_id    uuid not null constraint world_memberships_user_id_fkey references public.profiles(id) on delete cascade,
  site_id    text not null constraint world_memberships_site_id_fkey references public.sites(id),
  joined_at  timestamptz not null default now(),
  joined_via text not null default 'signup'
    constraint world_memberships_joined_via_check check (joined_via in ('backfill', 'signup', 'jump', 'continue', 'seed', 'play')),
  via_code   text constraint world_memberships_via_code_check check (via_code ~ '^[kaf]\.[a-z]{2,8}$'),
  activated_at  timestamptz,
  first_play_at timestamptz,
  -- progression (NULL for kpop)
  xp integer,
  quizzes_played integer,
  blindtests_played integer,
  games_played integer,
  quizzes_created integer,
  plays_received integer,
  likes_received integer,
  follower_count integer,
  following_count integer,
  daily_streak integer,
  daily_streak_longest integer,
  last_daily_date date,
  -- per-site presentation (NULL for kpop)
  bio text constraint world_memberships_bio_check check (char_length(bio) <= 160),
  header_url text,
  profile_theme text,
  pinned_badge_id text constraint world_memberships_pinned_badge_id_fkey references public.badge_definitions(id) on delete set null,
  display_name_override text constraint world_memberships_display_name_override_check check (char_length(display_name_override) <= 40),
  avatar_override jsonb,
  tag_text text constraint world_memberships_tag_text_check check (char_length(tag_text) <= 40),
  since_year smallint,
  -- visibility and lifecycle
  show_elsewhere boolean not null default false,
  auto_continue  boolean not null default false,
  notice_seen_at timestamptz,
  last_seen_at   timestamptz,
  banned_at      timestamptz,
  constraint world_memberships_pkey primary key (user_id, site_id),
  constraint world_memberships_kpop_null_check check (site_id <> 'kpop' or (xp is null and quizzes_played is null
    and blindtests_played is null and games_played is null and quizzes_created is null and plays_received is null
    and likes_received is null and follower_count is null and following_count is null and daily_streak is null
    and daily_streak_longest is null and last_daily_date is null))
);
create index world_memberships_site_joined_idx on public.world_memberships (site_id, joined_at desc);
create index world_memberships_site_xp_idx on public.world_memberships (site_id, xp desc) where xp is not null;
alter table public.world_memberships enable row level security;
-- policy: a signed-in user reads only their own memberships. No write policy: writes go through
-- ensure_membership, create_profile_for_site, update_my_membership and the service role. Another member's public
-- fields are read server side with the service role (the projection is frozen in rpcs.md) or via public_passport.
create policy world_memberships_select_own on public.world_memberships for select to authenticated
  using (user_id = auth.uid());

-- trg_profiles_membership: AFTER INSERT on profiles, inserts a membership for
-- coalesce(nullif(current_setting('app.site_id', true), ''), 'kpop'), activated at once for 'kpop';
-- the body is wrapped in EXCEPTION WHEN OTHERS (it can never block a sign-up).
create function public.profiles_membership() returns trigger
  language plpgsql security definer set search_path = public
  as $$ begin return new; end $$;
revoke all on function public.profiles_membership() from public, anon, authenticated;
create trigger trg_profiles_membership after insert on public.profiles
  for each row execute function public.profiles_membership();

-- ensure_membership: idempotent, for auth.uid() (raises when null), on every sign-in and handoff on every site.
-- p_via in the joined_via enum, p_via_code null or the via regex. created = true when the row was inserted.
create function public.ensure_membership(p_site text, p_via text, p_via_code text default null)
  returns table (site_id text, joined_via text, via_code text, joined_at timestamptz, activated_at timestamptz, created boolean)
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.ensure_membership(text, text, text) from public, anon, authenticated;
grant execute on function public.ensure_membership(text, text, text) to authenticated;

-- create_profile_for_site: set_config('app.site_id', p_site, true), then inserts the profile (so the trigger
-- creates the p_site membership), with the username rules of today. An authenticated caller creates its own
-- profile (p_user_id null or auth.uid()); the service role passes p_user_id (K2's editorial accounts).
create function public.create_profile_for_site(p_username text, p_site text, p_avatar_bg text, p_avatar_text text,
  p_via text default 'signup', p_via_code text default null, p_user_id uuid default null)
  returns uuid
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.create_profile_for_site(text, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_profile_for_site(text, text, text, text, text, text, uuid) to authenticated, service_role;

-- =============================================================================================================
-- @file 004-passport-prefs
-- owner B3; BACKLOG 4.1 rows 9 to 12; tx single; production phase pre.
-- =============================================================================================================
create table public.passport_prefs (
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
-- policy: a signed-in user reads only their own row. No write policy: writes go through set_passport_prefs.
create policy passport_prefs_select_own on public.passport_prefs for select to authenticated using (user_id = auth.uid());

create table public.favourites (
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
-- policy: favourites are public profile content on their own site (like kpop's bias): everyone reads them.
create policy favourites_select_public on public.favourites for select using (true);
-- policy: a signed-in user inserts, updates and deletes only their own rows, never on 'kpop'.
create policy favourites_insert_own on public.favourites for insert to authenticated with check (user_id = auth.uid() and site_id <> 'kpop');
create policy favourites_update_own on public.favourites for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and site_id <> 'kpop');
create policy favourites_delete_own on public.favourites for delete to authenticated using (user_id = auth.uid());

create table public.world_follows (
  site_id text not null constraint world_follows_site_id_fkey references public.sites(id),
  follower_id uuid not null constraint world_follows_follower_id_fkey references public.profiles(id) on delete cascade,
  followed_id uuid not null constraint world_follows_followed_id_fkey references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint world_follows_pkey primary key (site_id, follower_id, followed_id),
  constraint world_follows_not_kpop_check check (site_id <> 'kpop'),
  constraint world_follows_not_self_check check (follower_id <> followed_id)
);
create index world_follows_followed_idx on public.world_follows (site_id, followed_id);
alter table public.world_follows enable row level security;
-- policy: follow lists are public on their site (as kpop follows are).
create policy world_follows_select_public on public.world_follows for select using (true);
-- policy: a signed-in user follows and unfollows as themself only (the Team accounts are refused by the API).
create policy world_follows_insert_own on public.world_follows for insert to authenticated with check (follower_id = auth.uid() and site_id <> 'kpop');
create policy world_follows_delete_own on public.world_follows for delete to authenticated using (follower_id = auth.uid());

-- trg_world_follows_counts: AFTER INSERT OR DELETE, keeps world_memberships.follower_count and following_count.
create function public.world_follows_counts() returns trigger
  language plpgsql security definer set search_path = public
  as $$ begin return null; end $$;
revoke all on function public.world_follows_counts() from public, anon, authenticated;
create trigger trg_world_follows_counts after insert or delete on public.world_follows
  for each row execute function public.world_follows_counts();

-- world_progress: one row per membership; kpop values come from profiles (P 7.2, 7.3).
create view public.world_progress with (security_invoker = true) as
select m.user_id, m.site_id,
       case when m.site_id = 'kpop' then p.xp else coalesce(m.xp, 0) end as xp,
       case when m.site_id = 'kpop' then p.daily_streak else coalesce(m.daily_streak, 0) end as daily_streak,
       case when m.site_id = 'kpop' then p.total_quizzes_created else coalesce(m.quizzes_created, 0) end as quizzes_created,
       m.show_elsewhere, m.joined_at, m.activated_at
from public.world_memberships m join public.profiles p on p.id = m.user_id;

-- favourites_all: every site's favourites in one shape; kpop rows derive from profiles.ult_groups and bias.
create view public.favourites_all with (security_invoker = true) as
select f.user_id, f.site_id, f.slot, f.rank, f.entity_type, f.entity_id, f.label from public.favourites f
union all
select p.id, 'kpop'::text, 'topic'::text, (g.ord - 1)::smallint, 'group'::text, g.slug, coalesce(gr.name, g.slug)
from public.profiles p
cross join lateral jsonb_array_elements_text(p.ult_groups) with ordinality as g(slug, ord)
left join public.groups gr on gr.slug = g.slug
union all
select p.id, 'kpop'::text, 'pick'::text, 0::smallint, 'idol'::text, null::text, p.bias
from public.profiles p where coalesce(p.bias, '') <> '';

-- =============================================================================================================
-- @file 005-net-counters
-- owner B3; BACKLOG 4.1 row 13; tx single; production phase pre. Aggregate counters, no identifier of any kind.
-- =============================================================================================================
create table public.bridge_daily (
  day date not null default current_date,
  src_site text not null constraint bridge_daily_src_site_fkey references public.sites(id),
  dst_site text not null constraint bridge_daily_dst_site_fkey references public.sites(id),
  bridge text not null constraint bridge_daily_bridge_check check (bridge ~ '^[a-z]{2,8}$'),
  step text not null constraint bridge_daily_step_check check (step in ('shown', 'click', 'land', 'join', 'first_play', 'dismiss', 'optin')),
  signed_in boolean not null,
  n integer not null default 0,
  constraint bridge_daily_pkey primary key (day, src_site, dst_site, bridge, step, signed_in)
);
alter table public.bridge_daily enable row level security;
-- (no policy: service role only)
revoke all on public.bridge_daily from anon, authenticated;

-- net_bridge_bump: upsert n = n + p_n on today's row (UTC day).
create function public.net_bridge_bump(p_src text, p_dst text, p_bridge text, p_step text, p_signed_in boolean, p_n integer default 1)
  returns void
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.net_bridge_bump(text, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.net_bridge_bump(text, text, text, text, boolean, integer) to service_role;

-- =============================================================================================================
-- @file 006-passport-handoff
-- owner B4; BACKLOG 4.1 row 14; tx single; production phase pre (after 001, before 016 and PASSPORT_JUMP).
-- The passport schema is never exposed to the Data API (it stays out of the API's exposed schemas list).
-- Formats: cookies.md 3 and 5.
-- =============================================================================================================
create schema passport;
revoke all on schema passport from public, anon, authenticated;
grant usage on schema passport to service_role;

create table passport.handoff_codes (
  code_hash text constraint handoff_codes_pkey primary key constraint handoff_codes_code_hash_check check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null constraint handoff_codes_user_id_fkey references auth.users(id) on delete cascade,
  from_site text not null constraint handoff_codes_from_site_fkey references public.sites(id),
  to_site text not null constraint handoff_codes_to_site_fkey references public.sites(id),
  code_challenge text not null constraint handoff_codes_code_challenge_check check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint handoff_codes_sites_check check (from_site <> to_site)
);
create index handoff_codes_expires_idx on passport.handoff_codes (expires_at);
alter table passport.handoff_codes enable row level security;

create table passport.handoff_events (
  id bigint generated always as identity constraint handoff_events_pkey primary key,
  at timestamptz not null default now(),
  user_id uuid constraint handoff_events_user_id_fkey references auth.users(id) on delete set null,
  from_site text constraint handoff_events_from_site_fkey references public.sites(id),
  to_site text constraint handoff_events_to_site_fkey references public.sites(id),
  outcome text not null constraint handoff_events_outcome_check check (outcome in ('issued', 'redeemed', 'login_required',
    'state_mismatch', 'pkce_fail', 'expired', 'replay', 'banned', 'rate_limited', 'unconfirmed', 'deletion_pending', 'bad_ticket')),
  via_code text constraint handoff_events_via_code_check check (via_code ~ '^[kaf]\.[a-z]{2,8}$'),
  ip_hash text,
  ua_family text
);
create index handoff_events_at_idx on passport.handoff_events (at);
create index handoff_events_user_at_idx on passport.handoff_events (user_id, at desc) where user_id is not null;
create index handoff_events_ip_at_idx on passport.handoff_events (ip_hash, at desc) where ip_hash is not null;
alter table passport.handoff_events enable row level security;

-- passport_issue_code: on the IdP, for p_user. Checks, in order: email confirmed, not banned, no pending deletion,
-- rate limits (cookies.md 3); then stores the code hash (expires now() + 60 s) and logs 'issued'. Returns the
-- outcome: 'issued', or the refusal ('unconfirmed', 'banned', 'deletion_pending', 'rate_limited'), also logged.
create function public.passport_issue_code(p_user uuid, p_from_site text, p_to_site text, p_code_hash text,
  p_code_challenge text, p_via_code text default null, p_ip_hash text default null, p_ua_family text default null)
  returns text
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_issue_code(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.passport_issue_code(uuid, text, text, text, text, text, text, text) to service_role;

-- passport_redeem_code: on the RP. One UPDATE consumes the code (cookies.md 3); then compares p_code_challenge
-- (b64u(SHA256(verifier)), computed by the app) with the stored challenge. outcome: 'redeemed' (user_id and
-- from_site set), 'pkce_fail' (code burned), 'replay' (already used), 'expired' (past expires_at, or unknown,
-- since cleanup deletes old codes). Logs the outcome.
create function public.passport_redeem_code(p_code_hash text, p_to_site text, p_code_challenge text,
  p_via_code text default null, p_ip_hash text default null, p_ua_family text default null)
  returns table (outcome text, user_id uuid, from_site text)
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_redeem_code(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.passport_redeem_code(text, text, text, text, text, text) to service_role;

-- passport_log_event: one row of passport.handoff_events (the outcomes logged by the routes themselves:
-- 'login_required', 'state_mismatch', 'rate_limited', 'bad_ticket').
create function public.passport_log_event(p_outcome text, p_user uuid default null, p_from_site text default null,
  p_to_site text default null, p_via_code text default null, p_ip_hash text default null, p_ua_family text default null)
  returns void
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_log_event(text, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.passport_log_event(text, uuid, text, text, text, text, text) to service_role;

-- passport_cleanup: deletes codes older than 1 day and events older than 90 days (hub cron).
create function public.passport_cleanup()
  returns table (codes_deleted integer, events_deleted integer)
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_cleanup() from public, anon, authenticated;
grant execute on function public.passport_cleanup() to service_role;

-- =============================================================================================================
-- @file 007-world-xp
-- owner B3; BACKLOG 4.1 row 15 (M7); tx single; production phase pre (before 008).
-- =============================================================================================================
-- award_world_xp: raises on p_site = 'kpop' (kpop keeps award_xp); adds p_amount to world_memberships.xp of
-- (p_user, p_site), runs that site's badge rules, returns the new xp.
create function public.award_world_xp(p_user uuid, p_site text, p_amount integer, p_reason text)
  returns integer
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.award_world_xp(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.award_world_xp(uuid, text, integer, text) to service_role;

-- bump_world_counter: raises on 'kpop'; p_counter in ('quizzes_played', 'blindtests_played', 'games_played',
-- 'quizzes_created', 'plays_received', 'likes_received'); returns the new value. Called by 008's non-kpop
-- branches and by the server.
create function public.bump_world_counter(p_user uuid, p_site text, p_counter text, p_delta integer default 1)
  returns integer
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.bump_world_counter(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.bump_world_counter(uuid, text, text, integer) to service_role;

-- public_passport: one row per visible stamp (show_elsewhere true, activated, not banned) of p_username;
-- passport_xp only when passport_prefs.show_passport_level, else null; showcase_badges filtered to badges of
-- visible stamps. Fail closed: no visible stamp, no row.
create function public.public_passport(p_username text)
  returns table (username text, display_name text, avatar_url text, site_id text, joined_at timestamptz,
                 xp integer, quizzes_created integer, daily_streak integer, passport_xp integer, showcase_badges text[])
  language plpgsql stable security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.public_passport(text) from public, anon, authenticated;
grant execute on function public.public_passport(text) to anon, authenticated, service_role;

-- my_passport: auth.uid()'s full summary, one row per membership (fanquiz.org/passport, /api/n/me). plays: kpop
-- profiles.quizzes_played + blindtests_played; other sites quizzes_played + blindtests_played + games_played of the
-- membership (NetMe.sites[].plays, rpcs.md 2).
create function public.my_passport()
  returns table (site_id text, joined_at timestamptz, joined_via text, via_code text, activated_at timestamptz,
                 xp integer, plays integer, daily_streak integer, quizzes_created integer, show_elsewhere boolean)
  language plpgsql stable security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.my_passport() from public, anon, authenticated;
grant execute on function public.my_passport() to authenticated;

-- update_my_membership: auth.uid()'s row on p_site; p_patch keys allowed on every site: show_elsewhere,
-- auto_continue, notice_seen_at; on non-kpop sites also bio, header_url, profile_theme, pinned_badge_id,
-- display_name_override, avatar_override, tag_text, since_year. Any other key raises.
create function public.update_my_membership(p_site text, p_patch jsonb)
  returns void
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.update_my_membership(text, jsonb) from public, anon, authenticated;
grant execute on function public.update_my_membership(text, jsonb) to authenticated;

-- set_passport_prefs: upsert of auth.uid()'s passport_prefs; p_patch keys: worlds, show_passport_level,
-- showcase_badges, your_sites_menu, crossover_suggestions, welcomed_sites, dismissed. Any other key raises.
create function public.set_passport_prefs(p_patch jsonb)
  returns void
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.set_passport_prefs(jsonb) from public, anon, authenticated;
grant execute on function public.set_passport_prefs(jsonb) to authenticated;

-- =============================================================================================================
-- @file 008-write-locks
-- owner B5; BACKLOG 4.1 rows 16, 17, 18 (all DANGEROUS: two R-SQL reviewers; rollback per function from
-- pg_get_functiondef); tx single; production phase pre-T14.
-- Signatures, return types, SECURITY modes and ACLs are today's (BACKLOG 5.3; confirmed by G3's catalog copy of
-- production, 2026-10-17).
-- CREATE OR REPLACE keeps each ACL as it is in production; merge_anon_passport is dropped and created in the same
-- transaction with its ACL restored. Each kpop branch is today's body verbatim; the non-kpop branch writes world
-- counters through 007. Existing triggers keep their names: on_quiz_insert (handle_new_quiz),
-- trg_notify_badge_earned, group_quiz_alerts_on_insert and group_quiz_alerts_on_publish
-- (notify_group_quiz_alerts), trg_passport_on_battle_result. Audited, unchanged (row 19, no file):
-- grant_creator_tier_badge, grant_group_master_badge, grant_streak_badges, handle_follow_change.
-- =============================================================================================================
create or replace function public.award_xp(p_user_id uuid, p_amount integer, p_reason text) returns integer
  language plpgsql security definer as $$ begin raise exception 'o1-contract stub'; end $$;
create or replace function public.record_play(p_quiz_id uuid, p_player_id uuid, p_score integer, p_total_questions integer, p_time_taken_seconds integer)
  returns table (play_id uuid, percentile integer)
  language plpgsql security definer as $$ begin raise exception 'o1-contract stub'; end $$;
create or replace function public.handle_new_quiz() returns trigger
  language plpgsql security definer as $$ begin return new; end $$;
create or replace function public.increment_like_count(quiz_uuid uuid) returns void
  language plpgsql security definer as $$ begin raise exception 'o1-contract stub'; end $$;
create or replace function public.decrement_like_count(quiz_uuid uuid) returns void
  language plpgsql security definer as $$ begin raise exception 'o1-contract stub'; end $$;
create or replace function public.notify_badge_earned() returns trigger
  language plpgsql security definer set search_path = public as $$ begin return new; end $$;
create or replace function public.notify_group_quiz_alerts() returns trigger
  language plpgsql security definer set search_path = public as $$ begin return new; end $$;
create or replace function public.cast_duel_vote(p_question_id uuid, p_option_a_id uuid, p_option_b_id uuid, p_winner_id uuid, p_voter_hash text default null)
  returns table (entity_id uuid, elo numeric, last_delta integer)
  language plpgsql security definer set search_path = public as $$ begin raise exception 'o1-contract stub'; end $$;
create or replace function public.passport_on_battle_result() returns trigger
  language plpgsql security definer as $$ begin return new; end $$;
create or replace function public.record_bt_play(p_player_id uuid, p_mode_id text, p_score integer, p_correct integer, p_total integer,
  p_total_time double precision, p_best_combo integer, p_songs jsonb, p_xp_earned integer, p_group_mastery_updates jsonb)
  returns void
  language plpgsql security definer as $$ begin raise exception 'o1-contract stub'; end $$;

drop function public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb);
create function public.merge_anon_passport(p_user_id uuid, p_quizzes_played integer, p_blindtests_played integer,
  p_duels_voted integer, p_battles_played integer, p_group_stats jsonb, p_site text default 'kpop')
  returns boolean
  language plpgsql security definer as $$ begin raise exception 'o1-contract stub'; end $$;
-- ACL restored as production has it (G3: migration 087 revoked anon and authenticated; PUBLIC and service_role keep
-- EXECUTE, which request F0-13 puts to the owner).
revoke execute on function public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) from anon, authenticated;

-- =============================================================================================================
-- @file 009-daily-prep
-- owner B5; BACKLOG 4.1 rows 20, 21, 22; tx none (the two unique indexes CONCURRENTLY; the check NOT VALID then
-- VALIDATE); production phase pre-T14, in one owner session with the app deploy and 010 (BACKLOG 4.3 item 4).
-- G3 (production catalog, 2026-10-17): quiz_bank has no category check today (migration 018 lists the five kpop
-- values in a comment only). The real file creates quiz_bank_category_check with the kpop values plus the anime
-- categories of S 4.4, NOT VALID then VALIDATE (its verify query lists any production category outside the list
-- first); the guarded drop keeps it re-runnable.
-- =============================================================================================================
alter table public.sites add column system_user_id uuid constraint sites_system_user_id_fkey references public.profiles(id);
alter table public.sites add column fallback_group_slug text;
update public.sites set system_user_id = '00000000-0000-0000-0000-000000000001', fallback_group_slug = 'general-kpop' where id = 'kpop';
create unique index quiz_bank_site_date on public.quiz_bank (site_id, scheduled_date);
create unique index qotd_log_site_date on public.qotd_log (site_id, featured_date);
alter table public.quiz_bank drop constraint if exists quiz_bank_category_check;
alter table public.quiz_bank add constraint quiz_bank_category_check check (category in (
  'group_specific', 'knowledge', 'true_false', 'fun', 'era',
  'series_specific', 'who_am_i', 'name_the_series', 'music', 'creators_studios', 'odd_one_out', 'crossover'));

-- =============================================================================================================
-- @file 010-daily-v2
-- owner B5; BACKLOG 4.1 row 23 (DANGEROUS: two R-SQL reviewers; v1 definition saved for rollback); tx single;
-- production phase pre-T14, never alone (BACKLOG 4.3 item 4), away from the cron hour.
-- =============================================================================================================
-- ensure_daily_quiz_v2: S 4.4. Site-scoped: existing quiz of the day of (p_site, p_date), else the bank row of
-- (p_site, p_date), creator sites.system_user_id, group bank.group_id or the site's fallback group, unflags only
-- p_site's quizzes of that date, logs qotd_log on (site_id, featured_date). Returns the quiz id or null.
create function public.ensure_daily_quiz_v2(p_date date, p_site text) returns uuid
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.ensure_daily_quiz_v2(date, text) from public, anon, authenticated;
grant execute on function public.ensure_daily_quiz_v2(date, text) to service_role;
-- ensure_daily_quiz: today's signature and return type; becomes the kpop wrapper (the real body, not a stub).
-- CREATE OR REPLACE keeps today's ACL.
create or replace function public.ensure_daily_quiz(p_date text) returns uuid
  language plpgsql security definer set search_path = public
  as $$ begin return public.ensure_daily_quiz_v2(p_date::date, 'kpop'); end $$;
alter table public.quiz_bank drop constraint quiz_bank_scheduled_date_key;
alter table public.qotd_log drop constraint qotd_log_featured_date_key;

-- =============================================================================================================
-- @file 011-anime-series
-- owner K1; BACKLOG 4.1 rows 24, 25 (and the entity_sources widening row 36 needs); tx single; production phase
-- pre-after-V0 (empty tables; rows only in launch L04 and L05). A series is the anime topic row of groups
-- (site_id 'anime'), 1:1; every series child references series(group_id). Public reads see published rows only;
-- writes are service role only (no write policy) except the two per-user tables.
-- =============================================================================================================
create table public.series (
  group_id integer constraint series_pkey primary key constraint series_group_id_fkey references public.groups(id) on delete cascade,
  type text not null constraint series_type_check check (type in ('anime_manga', 'manga', 'webtoon', 'anime_original', 'franchise')),
  title_en text not null,
  title_native text,
  title_romaji text,
  aliases text[] not null default '{}',
  studios jsonb not null default '[]'::jsonb,
  director text,
  authors jsonb not null default '[]'::jsonb,
  magazine text,
  publisher text,
  anime_start_year smallint,
  anime_end_year smallint,
  manga_start_year smallint,
  manga_end_year smallint,
  status text not null constraint series_status_check check (status in ('airing', 'between_seasons', 'finished', 'ongoing', 'hiatus')),
  episodes integer,
  seasons smallint,
  volumes smallint,
  chapters integer,
  chapters_approx boolean not null default false,
  official_url text,
  airing jsonb,
  wikidata_qid text constraint series_wikidata_qid_check check (wikidata_qid ~ '^Q[0-9]+$'),
  tier text constraint series_tier_check check (tier in ('A', 'B', 'C')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint series_studios_check check (jsonb_typeof(studios) = 'array'),
  constraint series_authors_check check (jsonb_typeof(authors) = 'array')
);
alter table public.series enable row level security;
-- policy: everyone reads a published series row.
create policy series_select_published on public.series for select using (published);

create table public.arcs (
  id integer generated always as identity constraint arcs_pkey primary key,
  group_id integer not null constraint arcs_group_id_fkey references public.series(group_id) on delete cascade,
  ord smallint not null constraint arcs_ord_check check (ord >= 1),
  name text not null,
  kind text not null constraint arcs_kind_check check (kind in ('saga', 'arc', 'season', 'part', 'cour')),
  parent_id integer constraint arcs_parent_id_fkey references public.arcs(id) on delete set null,
  episode_from integer, episode_to integer,
  chapter_from integer, chapter_to integer,
  volume_from smallint, volume_to smallint,
  manga_only boolean not null default false,
  anime_only boolean not null default false,
  source_url text,
  status text not null default 'draft' constraint arcs_status_check check (status in ('draft', 'published', 'hidden')),
  constraint arcs_series_ord_key unique (group_id, ord)
);
alter table public.arcs enable row level security;
-- policy: everyone reads published arcs.
create policy arcs_select_published on public.arcs for select using (status = 'published');

create table public.characters (
  id integer generated always as identity constraint characters_pkey primary key,
  group_id integer not null constraint characters_group_id_fkey references public.series(group_id) on delete cascade,
  slug text not null constraint characters_slug_check check (slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null,
  name_native text,
  aliases text[] not null default '{}',
  role text not null constraint characters_role_check check (role in ('main', 'supporting', 'antagonist', 'other')),
  affiliation text,
  debut_arc_ord smallint,
  debut_medium text constraint characters_debut_medium_check check (debut_medium in ('anime', 'manga', 'both')),
  description text constraint characters_description_check check (char_length(description) <= 140),
  wikidata_qid text constraint characters_wikidata_qid_check check (wikidata_qid ~ '^Q[0-9]+$'),
  source_url text,
  spoiler_level smallint not null default 0 constraint characters_spoiler_level_check check (spoiler_level >= 0),
  identity_spoiler boolean not null default false,
  ord integer not null default 0,
  status text not null default 'draft' constraint characters_status_check check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  constraint characters_series_slug_key unique (group_id, slug)
);
create index characters_series_ord_idx on public.characters (group_id, ord);
alter table public.characters enable row level security;
-- policy: everyone reads published characters.
create policy characters_select_published on public.characters for select using (status = 'published');

create table public.episodes (
  id integer generated always as identity constraint episodes_pkey primary key,
  group_id integer not null constraint episodes_group_id_fkey references public.series(group_id) on delete cascade,
  number integer not null constraint episodes_number_check check (number >= 1),
  season smallint,
  title text,
  aired_on date,
  arc_id integer constraint episodes_arc_id_fkey references public.arcs(id) on delete set null,
  source_url text,
  status text not null default 'draft' constraint episodes_status_check check (status in ('draft', 'published', 'hidden')),
  constraint episodes_series_number_key unique (group_id, number)
);
alter table public.episodes enable row level security;
-- policy: everyone reads published episodes.
create policy episodes_select_published on public.episodes for select using (status = 'published');

create table public.series_themes (
  id integer generated always as identity constraint series_themes_pkey primary key,
  group_id integer not null constraint series_themes_group_id_fkey references public.series(group_id) on delete cascade,
  kind text not null constraint series_themes_kind_check check (kind in ('op', 'ed', 'insert')),
  number smallint not null constraint series_themes_number_check check (number >= 1),
  title text not null,
  artist text not null,
  season smallint,
  episode_from integer, episode_to integer,
  mb_recording_id uuid,
  mb_artist_id uuid,
  deezer_track_id bigint,
  deezer_playable boolean,
  deezer_checked_at timestamptz,
  kpop_group_slug text,
  idol_sung boolean not null default false,
  source_url text,
  status text not null default 'draft' constraint series_themes_status_check check (status in ('draft', 'published', 'hidden')),
  constraint series_themes_slot_key unique (group_id, kind, number)
);
create index series_themes_deezer_idx on public.series_themes (deezer_track_id) where deezer_track_id is not null;
alter table public.series_themes enable row level security;
-- policy: everyone reads published themes (titles, artists, ids; never audio, cover or lyrics).
create policy series_themes_select_published on public.series_themes for select using (status = 'published');

create table public.series_progress (
  user_id uuid not null constraint series_progress_user_id_fkey references public.profiles(id) on delete cascade,
  group_id integer not null constraint series_progress_group_id_fkey references public.series(group_id) on delete cascade,
  medium text not null default 'anime' constraint series_progress_medium_check check (medium in ('anime', 'manga')),
  arc_ord smallint not null default 0 constraint series_progress_arc_ord_check check (arc_ord >= 0),
  updated_at timestamptz not null default now(),
  constraint series_progress_pkey primary key (user_id, group_id)
);
alter table public.series_progress enable row level security;
-- policy: a signed-in user reads and writes only their own progress.
create policy series_progress_select_own on public.series_progress for select to authenticated using (user_id = auth.uid());
create policy series_progress_insert_own on public.series_progress for insert to authenticated with check (user_id = auth.uid());
create policy series_progress_update_own on public.series_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy series_progress_delete_own on public.series_progress for delete to authenticated using (user_id = auth.uid());

create table public.favourite_characters (
  user_id uuid not null constraint favourite_characters_user_id_fkey references public.profiles(id) on delete cascade,
  group_id integer not null constraint favourite_characters_group_id_fkey references public.series(group_id) on delete cascade,
  character_id integer not null constraint favourite_characters_character_id_fkey references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favourite_characters_pkey primary key (user_id, group_id)
);
create index favourite_characters_character_idx on public.favourite_characters (character_id);
alter table public.favourite_characters enable row level security;
-- policy: a signed-in user reads and writes only their own oshi rows (one per series); counts go through the view.
create policy favourite_characters_select_own on public.favourite_characters for select to authenticated using (user_id = auth.uid());
create policy favourite_characters_insert_own on public.favourite_characters for insert to authenticated with check (user_id = auth.uid());
create policy favourite_characters_update_own on public.favourite_characters for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favourite_characters_delete_own on public.favourite_characters for delete to authenticated using (user_id = auth.uid());

-- favourite_character_counts: owner-rights view (reads across users), counts only from 30 picks (the threshold rule).
create view public.favourite_character_counts as
select fc.group_id, fc.character_id, count(*)::integer as picks
from public.favourite_characters fc
group by fc.group_id, fc.character_id
having count(*) >= 30;
revoke all on public.favourite_character_counts from anon, authenticated;
grant select on public.favourite_character_counts to anon, authenticated, service_role;

alter table public.quizzes add column spoiler_arc_ord smallint constraint quizzes_spoiler_arc_ord_check check (spoiler_arc_ord >= 0);
alter table public.quizzes add column spoiler_scope text constraint quizzes_spoiler_scope_check check (spoiler_scope in ('anime', 'manga', 'both'));

alter table public.trivia drop constraint trivia_entity_kind_check;
alter table public.trivia add constraint trivia_entity_kind_check check (entity_kind in
  ('group', 'idol', 'album', 'track', 'era', 'award', 'series', 'character', 'arc', 'theme'));

alter table public.entity_sources add column source_url text;
alter table public.entity_sources drop constraint entity_sources_entity_type_check;
alter table public.entity_sources add constraint entity_sources_entity_type_check check (entity_type in
  ('group', 'group_unit', 'idol', 'album', 'album_track', 'song', 'series', 'character', 'arc', 'episode', 'series_theme'));
alter table public.entity_sources drop constraint entity_sources_source_check;
alter table public.entity_sources add constraint entity_sources_source_check check (source in
  ('wikidata', 'musicbrainz', 'wikipedia', 'official'));

-- =============================================================================================================
-- @file 012-editorial-quiz
-- owner E1 (E1b); BACKLOG 4.1 row 26; tx single; production phase pre-after-V0.
-- =============================================================================================================
create table public.review_batches (
  id bigint generated always as identity constraint review_batches_pkey primary key,
  site_id text not null constraint review_batches_site_id_fkey references public.sites(id),
  lane text not null,
  label text not null,
  size smallint not null constraint review_batches_size_check check (size between 1 and 50),
  sample_size smallint not null default 0,
  errors smallint not null default 0,
  status text not null default 'open' constraint review_batches_status_check check (status in ('open', 'approved', 'rejected', 'partial')),
  reviewed_by uuid constraint review_batches_reviewed_by_fkey references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint review_batches_reviewed_check check (status = 'open' or (reviewed_by is not null and reviewed_at is not null))
);
create index review_batches_site_status_idx on public.review_batches (site_id, status);
alter table public.review_batches enable row level security;
-- (no policy: service role only; /admin/review reads through the server)
revoke all on public.review_batches from anon, authenticated;

alter table public.editorial_drafts drop constraint editorial_drafts_kind_check;
alter table public.editorial_drafts add constraint editorial_drafts_kind_check check (kind in ('thread', 'debate', 'blog', 'quiz'));
alter table public.editorial_drafts add column payload jsonb;
alter table public.editorial_drafts add column review_batch_id bigint constraint editorial_drafts_review_batch_id_fkey references public.review_batches(id) on delete set null;
alter table public.editorial_drafts add constraint editorial_drafts_payload_check check (kind <> 'quiz' or (payload is not null and jsonb_typeof(payload) = 'object'));
create index editorial_drafts_review_batch_idx on public.editorial_drafts (review_batch_id) where review_batch_id is not null;

-- =============================================================================================================
-- @file 013-formats
-- owner O5; BACKLOG 4.1 row 27; tx single; production phase pre-after-V0. personality_profiles.site_id is in
-- 002a (M2's inventory). G3 (production catalog, 2026-10-17): games has no game_type check today; the real file
-- creates games_game_type_check NOT VALID then VALIDATE (its verify query lists any production type outside the
-- list first); the guarded drop keeps it re-runnable.
-- =============================================================================================================
alter table public.personality_profiles add column character_id integer
  constraint personality_profiles_character_id_fkey references public.characters(id) on delete set null;
alter table public.games drop constraint if exists games_game_type_check;
alter table public.games add constraint games_game_type_check check (game_type in ('this_or_that', 'blind_test',
  'name_all_members', 'name_all_songs', 'name_top_songs', 'name_all_groups', 'name_all_idols', 'name_all_characters'));

-- =============================================================================================================
-- @file 014-daily-openings
-- owner O6; BACKLOG 4.1 row 28; tx single; production phase pre-after-V0 (empty; the pool is launch L09).
-- =============================================================================================================
create table public.daily_openings (
  site_id text not null constraint daily_openings_site_id_fkey references public.sites(id),
  date date not null,
  theme_id integer not null constraint daily_openings_theme_id_fkey references public.series_themes(id),
  created_at timestamptz not null default now(),
  constraint daily_openings_pkey primary key (site_id, date)
);
alter table public.daily_openings enable row level security;
-- policy: everyone reads the opening of the day.
create policy daily_openings_select_public on public.daily_openings for select using (true);

-- ensure_daily_opening: idempotent per (p_site, p_date); picks a published, playable theme by the K4 rotation
-- rules; returns the theme id or null.
create function public.ensure_daily_opening(p_date date, p_site text) returns integer
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.ensure_daily_opening(date, text) from public, anon, authenticated;
grant execute on function public.ensure_daily_opening(date, text) to service_role;

-- =============================================================================================================
-- @file 015-spoilers
-- owner O3; BACKLOG 4.1 row 29; tx single; production phase pre-after-V0.
-- =============================================================================================================
alter table public.quizzes add column spoiler_cover_until timestamptz;
alter table public.verse_threads add column spoiler_flair smallint constraint verse_threads_spoiler_flair_check check (spoiler_flair >= 0);
-- Spoiler reports live in their own table (D-073, owner phase 2): public.reports, its reason list and the handle_new_report
-- trigger path stay as today, so a spoiler report never counts toward report_count.
create table public.spoiler_reports (
  id bigint generated always as identity constraint spoiler_reports_pkey primary key,
  quiz_id uuid not null constraint spoiler_reports_quiz_id_fkey references public.quizzes(id) on delete cascade,
  reporter_id uuid not null constraint spoiler_reports_reporter_id_fkey references public.profiles(id) on delete cascade,
  site_id text not null constraint spoiler_reports_site_id_fkey references public.sites(id),
  status text not null default 'pending' constraint spoiler_reports_status_check check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint spoiler_reports_quiz_reporter_key unique (quiz_id, reporter_id)
);
-- D-086: a surrogate key, so PostgREST never reads spoiler_reports as a quizzes-profiles junction (ambiguous embeds, PGRST201).
create index spoiler_reports_quiz_status_idx on public.spoiler_reports (quiz_id, status);
alter table public.spoiler_reports enable row level security;

-- report_spoiler: auth.uid() reports p_quiz_id once (reason 'spoiler'); at 3 distinct signed-in reporters it sets
-- quizzes.spoiler_cover_until (a temporary cover until a moderator decides; never unpublishes). Returns the count.
create function public.report_spoiler(p_quiz_id uuid) returns integer
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.report_spoiler(uuid) from public, anon, authenticated;
grant execute on function public.report_spoiler(uuid) to authenticated;

-- =============================================================================================================
-- @file 016-passport-deletion
-- owner B7; BACKLOG 4.1 row 30 (DANGEROUS, destructive: two R-SQL reviewers, R-SEC); tx single; production phase
-- pre-after-V0 (dormant). Built on Mission U's admin_delete_account. Dry run by default: counts only.
-- =============================================================================================================
create table passport.deletion_requests (
  user_id uuid constraint deletion_requests_pkey primary key constraint deletion_requests_user_id_fkey references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  requested_from text not null constraint deletion_requests_requested_from_fkey references public.sites(id),
  run_after timestamptz not null,
  keep_quizzes boolean not null default true,
  cancelled_at timestamptz,
  completed_at timestamptz
);
create index deletion_requests_due_idx on passport.deletion_requests (run_after) where cancelled_at is null and completed_at is null;
alter table passport.deletion_requests enable row level security;

create table passport.deletion_log (
  id bigint generated always as identity constraint deletion_log_pkey primary key,
  at timestamptz not null default now(),
  subject_hash text not null,
  kind text not null constraint deletion_log_kind_check check (kind in ('passport', 'leave_world')),
  site_id text constraint deletion_log_site_id_fkey references public.sites(id),
  dry_run boolean not null,
  counts jsonb not null default '{}'::jsonb,
  outcome text not null constraint deletion_log_outcome_check check (outcome in ('ok', 'failed', 'cancelled'))
);
alter table passport.deletion_log enable row level security;

-- passport_request_deletion: creates or refreshes the request (run_after = now() + the grace period, G16),
-- returns run_after. While pending, passport_issue_code refuses codes ('deletion_pending').
create function public.passport_request_deletion(p_user uuid, p_from_site text, p_keep_quizzes boolean default true)
  returns timestamptz
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_request_deletion(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.passport_request_deletion(uuid, text, boolean) to service_role;

-- passport_cancel_deletion: true when a pending request was cancelled.
create function public.passport_cancel_deletion(p_user uuid) returns boolean
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_cancel_deletion(uuid) from public, anon, authenticated;
grant execute on function public.passport_cancel_deletion(uuid) to service_role;

-- passport_run_deletion: the pipeline (reassign kept quizzes to each site's sentinel, purge the user's rows,
-- anonymize the rest); p_dry_run true returns the counts per table and writes nothing but the log row. The app
-- deletes the auth user afterwards with the service role.
create function public.passport_run_deletion(p_user uuid, p_dry_run boolean default true) returns jsonb
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_run_deletion(uuid, boolean) from public, anon, authenticated;
grant execute on function public.passport_run_deletion(uuid, boolean) to service_role;

-- passport_leave_world: removes p_user's rows of one non-kpop site only (membership, favourites, follows,
-- progress, oshi); the user's quizzes of that site go to the site's sentinel when p_keep_quizzes, else are deleted;
-- raises on 'kpop'; dry run by default (counts only).
create function public.passport_leave_world(p_user uuid, p_site text, p_dry_run boolean default true,
  p_keep_quizzes boolean default true) returns jsonb
  language plpgsql security definer set search_path = public
  as $$ begin raise exception 'o1-contract stub'; end $$;
revoke all on function public.passport_leave_world(uuid, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.passport_leave_world(uuid, text, boolean, boolean) to service_role;

revoke all on all tables in schema passport from public, anon, authenticated;
