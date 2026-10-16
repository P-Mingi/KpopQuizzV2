-- Run O1, o1-contract-v1: STAND-IN for the production objects that schema.sql builds on.
--
-- NOT part of the contract. It exists only so schema.sql can be loaded on a local throwaway Postgres 18
-- cluster before gate G3 (no production schema dump yet). gen-contract-types.mts and check-contract.mts load
-- this file, then schema.sql, in one transaction. After G3, KPQ/prod-public.sql (the real public schema)
-- replaces this file, and on o1-scratch the branch itself provides these objects.
--
-- What it holds: the Supabase roles, schemas and default privileges; auth.users with auth.uid() and auth.role();
-- every public table that schema.sql alters or references, with only the columns schema.sql reads (views, FKs,
-- checks it widens or drops); the existing functions that 008 and 010 replace, with today's signature and ACL as
-- the repository records them (migrations 009, 042, 068 to 092, 081, 087, 105, r1-rls-tighten); two rows that
-- 009 and the fixtures need (the kpop system profile and the general-kpop group). Column lists, constraint names
-- and ACLs here are the repository's view of production: G3's dump is the authority, and a difference found
-- then is fixed here (and in schema.sql if it touches a frozen object) without a CR.
--
-- Never load this file on a Supabase branch or on production.

\set ON_ERROR_STOP on

-- Roles and schemas (Supabase defaults) -------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')), '')::text
$$;

create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);

-- Public tables (only what schema.sql reads) --------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  avatar_bg text not null default '#EEEDFE',
  avatar_text text not null default '#3C3489',
  bio text default '',
  created_at timestamptz not null default now(),
  total_quizzes_created integer not null default 0,
  xp integer not null default 0,
  daily_streak integer not null default 0,
  ult_groups jsonb not null default '[]'::jsonb,
  bias text,
  banned_at timestamptz
);
create table public.groups (
  id serial primary key,
  name text unique not null,
  slug text unique not null,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  group_id integer not null references public.groups(id),
  title text not null,
  slug text unique not null,
  status text not null default 'published',
  is_quiz_of_the_day boolean not null default false,
  quiz_of_the_day_date date,
  created_at timestamptz not null default now()
);
create table public.games (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'this_or_that',
  status text not null default 'published',
  created_at timestamptz not null default now()
);
create table public.trivia (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null constraint trivia_entity_kind_check
    check (entity_kind in ('group','idol','album','track','era','award')),
  entity_id text not null,
  group_id integer references public.groups(id) on delete cascade,
  status text not null default 'published'
);
create table public.quiz_bank (
  id uuid primary key default gen_random_uuid(),
  group_id integer references public.groups(id),
  category text not null constraint quiz_bank_category_check
    check (category in ('group_specific','knowledge','true_false','fun','era')),
  scheduled_date date constraint quiz_bank_scheduled_date_key unique,
  status text not null default 'draft'
);
create table public.qotd_log (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id),
  featured_date date not null constraint qotd_log_featured_date_key unique,
  selection_method text not null default 'auto'
);
create table public.badge_definitions (id text primary key, name text not null);
create table public.creator_notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.activity_events (id bigint generated always as identity primary key, created_at timestamptz not null default now());
create table public.editorial_accounts (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.editorial_drafts (
  id bigserial primary key,
  account_id uuid not null references public.editorial_accounts(user_id) on delete restrict,
  kind text not null constraint editorial_drafts_kind_check check (kind in ('thread','debate','blog')),
  status text not null default 'draft'
);
create table public.editorial_posts (id bigserial primary key);
create table public.bt_runs (id uuid primary key);
create table public.personality_questions (id serial primary key);
create table public.personality_profiles (id serial primary key, group_id integer not null references public.groups(id) on delete cascade);
create table public.songs (id uuid primary key default gen_random_uuid());
create table public.verse_threads (id bigserial primary key, created_at timestamptz not null default now());
create table public.verse_essays (id serial primary key);
create table public.community_replies (id bigserial primary key);
create table public.community_debates (id bigserial primary key, created_at timestamptz not null default now());
create table public.community_challenges (id bigserial primary key);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint reason_valid check (reason in ('wrong_answers','spam','inappropriate','duplicate','other'))
);
create table public.live_rooms (id uuid primary key default gen_random_uuid());
create table public.challenges (id uuid primary key default gen_random_uuid());
create table public.entity_sources (
  id serial primary key,
  entity_type text not null constraint entity_sources_entity_type_check
    check (entity_type in ('group','group_unit','idol','album','album_track','song')),
  entity_id text not null,
  field text not null,
  source text not null constraint entity_sources_source_check check (source in ('wikidata','musicbrainz')),
  source_ref text,
  fetched_at timestamptz not null default now(),
  unique (entity_type, entity_id, field, source)
);

-- Existing functions that 008 and 010 replace (today's signatures; stub bodies; ACL as the repo records it) --
create function public.award_xp(p_user_id uuid, p_amount integer, p_reason text) returns integer
  language plpgsql security definer as $$ begin return null; end $$;
create function public.record_play(p_quiz_id uuid, p_player_id uuid, p_score integer, p_total_questions integer, p_time_taken_seconds integer)
  returns table (play_id uuid, percentile integer) language plpgsql security definer as $$ begin return; end $$;
create function public.handle_new_quiz() returns trigger language plpgsql security definer as $$ begin return new; end $$;
create function public.increment_like_count(quiz_uuid uuid) returns void language plpgsql security definer as $$ begin return; end $$;
create function public.decrement_like_count(quiz_uuid uuid) returns void language plpgsql security definer as $$ begin return; end $$;
create function public.notify_badge_earned() returns trigger language plpgsql security definer set search_path = public as $$ begin return new; end $$;
create function public.notify_group_quiz_alerts() returns trigger language plpgsql security definer set search_path = public as $$ begin return new; end $$;
revoke all on function public.notify_group_quiz_alerts() from public, anon, authenticated;
create function public.cast_duel_vote(p_question_id uuid, p_option_a_id uuid, p_option_b_id uuid, p_winner_id uuid, p_voter_hash text default null)
  returns table (entity_id uuid, elo numeric, last_delta integer) language plpgsql security definer set search_path = public as $$ begin return; end $$;
create function public.passport_on_battle_result() returns trigger language plpgsql security definer as $$ begin return new; end $$;
revoke execute on function public.passport_on_battle_result() from anon, authenticated;
create function public.record_bt_play(p_player_id uuid, p_mode_id text, p_score integer, p_correct integer, p_total integer,
  p_total_time double precision, p_best_combo integer, p_songs jsonb, p_xp_earned integer, p_group_mastery_updates jsonb)
  returns void language plpgsql security definer as $$ begin return; end $$;
revoke execute on function public.record_bt_play(uuid, text, integer, integer, integer, double precision, integer, jsonb, integer, jsonb) from anon, authenticated;
create function public.merge_anon_passport(p_user_id uuid, p_quizzes_played integer, p_blindtests_played integer,
  p_duels_voted integer, p_battles_played integer, p_group_stats jsonb)
  returns boolean language plpgsql security definer as $$ begin return false; end $$;
revoke execute on function public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb) from anon, authenticated;
create function public.ensure_daily_quiz(p_date text) returns uuid
  language plpgsql security definer set search_path = public as $$ begin return null; end $$;
revoke execute on function public.ensure_daily_quiz(text) from public, anon, authenticated;
grant execute on function public.ensure_daily_quiz(text) to service_role;

-- Rows schema.sql and the fixtures need -------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000001', 'team@kpopquiz.invalid', now());
insert into public.profiles (id, username, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'kpopquizz', 'KpopQuizz Team');
insert into public.groups (name, slug) values ('General K-pop', 'general-kpop');
