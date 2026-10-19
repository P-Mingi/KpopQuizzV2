-- 003-memberships.sql (run O1, lane B3; manifest.md row 7; BACKLOG 4.1 rows 6, 7, 8; schema.sql section "@file 003-memberships")
-- DANGEROUS (two R-SQL reviewers): it adds a trigger on profiles, the sign-up table.
--
-- What:   creates public.world_memberships (one row per member and world, PK user_id + site_id), its check
--         world_memberships_kpop_null_check (a kpop row never carries progression: profiles.* stays the kpop source of
--         truth), two indexes and one read policy (world_memberships_select_own); backfills one kpop row per profile;
--         creates trg_profiles_membership (AFTER INSERT ON profiles, function profiles_membership) and the two RPCs
--         ensure_membership and create_profile_for_site.
-- Why:    the passport: a member holds one stamp per world, and every later file (004 to 008, the hub, anime) keys on
--         it. kpop keeps profiles.* as its only truth, so the kpop row carries no progression.
-- Rows:   1 new table; 1 row inserted per existing profile (joined_via 'backfill', joined_at, activated_at and
--         notice_seen_at = profiles.created_at). No existing row or column is touched.
-- Sign-up safety: profiles_membership wraps its whole body in EXCEPTION WHEN OTHERS, so no failure inside it can
--         block a profile insert (the profile is created, the membership is then missing and ensure_membership or
--         the next sign-in repairs it). The site comes from current_setting('app.site_id', true), default 'kpop';
--         kpop's /api/auth/create-profile insert is unchanged and therefore creates the kpop row.
-- Decisions where the contract is silent: the trigger activates the stamp at once on kpop only (a world stamp is
--         activated by the member's first counted action, 007, or by create_profile_for_site, which is the
--         member's own onboarding on that site); create_profile_for_site checks the username rules of
--         /api/auth/create-profile (trim, ^[a-z0-9_]{3,20}$, the RESERVED_USERNAMES list of lib/constants.ts, taken,
--         profile already there) and restores app.site_id afterwards.
-- Verify: select (select count(*) from public.world_memberships where site_id = 'kpop') = (select count(*) from public.profiles);   expect t
--         select count(*) from public.world_memberships where site_id = 'kpop' and (xp is not null or daily_streak is not null);  expect 0
--         select tgname, tgenabled from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'trg_profiles_membership';  expect 1 row, O
--         select polname, polcmd from pg_policy where polrelid = 'public.world_memberships'::regclass;  expect world_memberships_select_own | r
--         select sum(xp) from public.profiles;   expect the same value before and after this file
-- Undo:   003-memberships.rollback.sql (refused while a non-kpop membership exists: it would delete world data).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

create table if not exists public.world_memberships (
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
create index if not exists world_memberships_site_joined_idx on public.world_memberships (site_id, joined_at desc);
create index if not exists world_memberships_site_xp_idx on public.world_memberships (site_id, xp desc) where xp is not null;
alter table public.world_memberships enable row level security;

-- policy: a signed-in user reads only their own memberships. No write policy: writes go through
-- ensure_membership, create_profile_for_site, update_my_membership and the service role. Another member's public
-- fields are read server side with the service role (the projection is frozen in rpcs.md) or via public_passport.
do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.world_memberships'::regclass and polname = 'world_memberships_select_own') then
    create policy world_memberships_select_own on public.world_memberships for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- trg_profiles_membership: AFTER INSERT on profiles, inserts a membership for
-- coalesce(nullif(current_setting('app.site_id', true), ''), 'kpop'), activated at once for 'kpop';
-- the body is wrapped in EXCEPTION WHEN OTHERS (it can never block a sign-up).
create or replace function public.profiles_membership() returns trigger
  language plpgsql security definer set search_path = public
  as $$
declare
  v_site text;
  v_at   timestamptz;
begin
  begin
    v_site := coalesce(nullif(current_setting('app.site_id', true), ''), 'kpop');
    v_at   := coalesce(new.created_at, now());
    insert into public.world_memberships (user_id, site_id, joined_at, joined_via, activated_at, notice_seen_at)
    values (new.id, v_site, v_at, 'signup',
            case when v_site = 'kpop' then v_at end,
            case when v_site = 'kpop' then v_at end)
    on conflict on constraint world_memberships_pkey do nothing;
  exception when others then
    -- never block a sign-up because of a stamp; the membership is repaired by ensure_membership
    raise warning 'profiles_membership: membership not created (sqlstate %)', sqlstate;
  end;
  return new;
end
$$;
revoke all on function public.profiles_membership() from public, anon, authenticated;
create or replace trigger trg_profiles_membership after insert on public.profiles
  for each row execute function public.profiles_membership();

-- Backfill: one kpop membership per existing profile (idempotent; the trigger above already covers new profiles).
insert into public.world_memberships (user_id, site_id, joined_at, joined_via, activated_at, notice_seen_at)
select p.id, 'kpop', p.created_at, 'backfill', p.created_at, p.created_at
from public.profiles p
on conflict on constraint world_memberships_pkey do nothing;

-- ensure_membership: idempotent, for auth.uid() (raises when null), on every sign-in and handoff on every site.
-- p_via in the joined_via enum, p_via_code null or the via regex. created = true when the row was inserted.
create or replace function public.ensure_membership(p_site text, p_via text, p_via_code text default null)
  returns table (site_id text, joined_via text, via_code text, joined_at timestamptz, activated_at timestamptz, created boolean)
  language plpgsql security definer set search_path = public
  as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_row public.world_memberships%rowtype;
  v_created boolean;
begin
  if v_uid is null then
    raise exception 'ensure_membership: not signed in';
  end if;
  if p_site is null then
    raise exception 'ensure_membership: site is required';
  end if;
  if p_via is null or p_via not in ('backfill', 'signup', 'jump', 'continue', 'seed', 'play') then
    raise exception 'ensure_membership: unknown joined_via %', p_via;
  end if;
  if p_via_code is not null and p_via_code !~ '^[kaf]\.[a-z]{2,8}$' then
    raise exception 'ensure_membership: bad via_code';
  end if;

  insert into public.world_memberships as m (user_id, site_id, joined_via, via_code, activated_at, notice_seen_at)
  values (v_uid, p_site, p_via, p_via_code,
          case when p_site = 'kpop' then now() end,
          case when p_site = 'kpop' then now() end)
  on conflict on constraint world_memberships_pkey do nothing
  returning m.* into v_row;
  v_created := found;
  if not v_created then
    select m.* into v_row from public.world_memberships m where m.user_id = v_uid and m.site_id = p_site;
  end if;

  return query select v_row.site_id, v_row.joined_via, v_row.via_code, v_row.joined_at, v_row.activated_at, v_created;
end
$$;
revoke all on function public.ensure_membership(text, text, text) from public, anon, authenticated;
grant execute on function public.ensure_membership(text, text, text) to authenticated;

-- create_profile_for_site: set_config('app.site_id', p_site, true), then inserts the profile (so the trigger
-- creates the p_site membership), with the username rules of today. An authenticated caller creates its own
-- profile (p_user_id null or auth.uid()); the service role passes p_user_id (K2's editorial accounts).
create or replace function public.create_profile_for_site(p_username text, p_site text, p_avatar_bg text, p_avatar_text text,
  p_via text default 'signup', p_via_code text default null, p_user_id uuid default null)
  returns uuid
  language plpgsql security definer set search_path = public
  as $$
declare
  v_caller   uuid := auth.uid();
  v_uid      uuid;
  v_username text := btrim(p_username);
  v_prev     text := current_setting('app.site_id', true);
  v_n        integer;
begin
  -- who is the profile for
  if v_caller is not null then
    if p_user_id is not null and p_user_id <> v_caller then
      raise exception 'create_profile_for_site: a signed-in user creates its own profile only';
    end if;
    v_uid := v_caller;
  else
    if p_user_id is null then
      raise exception 'create_profile_for_site: user id is required';
    end if;
    v_uid := p_user_id;
  end if;

  -- the arguments
  if p_site is null or not exists (select 1 from public.sites s where s.id = p_site) then
    raise exception 'create_profile_for_site: unknown site';
  end if;
  if p_via is null or p_via not in ('backfill', 'signup', 'jump', 'continue', 'seed', 'play') then
    raise exception 'create_profile_for_site: unknown joined_via %', p_via;
  end if;
  if p_via_code is not null and p_via_code !~ '^[kaf]\.[a-z]{2,8}$' then
    raise exception 'create_profile_for_site: bad via_code';
  end if;
  if p_avatar_bg is null or p_avatar_text is null then
    raise exception 'create_profile_for_site: avatar colours are required';
  end if;

  -- the username rules of today (/api/auth/create-profile; RESERVED_USERNAMES of lib/constants.ts)
  if v_username is null or v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only';
  end if;
  if v_username in ('admin', 'api', 'auth', 'create', 'login', 'onboarding', 'trending', 'new', 'group', 'q', 'u',
                    'settings', 'about', 'contact', 'terms', 'privacy', 'help', 'support', 'search') then
    raise exception 'This username is reserved';
  end if;
  if exists (select 1 from public.profiles p where p.username = v_username) then
    raise exception 'Username is already taken';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'Profile already exists';
  end if;

  perform set_config('app.site_id', p_site, true);
  insert into public.profiles (id, username, avatar_bg, avatar_text)
  values (v_uid, v_username, p_avatar_bg, p_avatar_text);
  perform set_config('app.site_id', coalesce(v_prev, ''), true);

  -- the trigger created the p_site stamp; it swallows its own failures, so check it here and roll the profile back
  update public.world_memberships m
     set joined_via = p_via, via_code = p_via_code, activated_at = coalesce(m.activated_at, now())
   where m.user_id = v_uid and m.site_id = p_site;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'create_profile_for_site: the membership of % was not created', p_site;
  end if;

  return v_uid;
end
$$;
revoke all on function public.create_profile_for_site(text, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_profile_for_site(text, text, text, text, text, text, uuid) to authenticated, service_role;

-- Self-check: every profile has its kpop stamp and no kpop stamp carries progression.
do $$
begin
  if exists (select 1 from public.profiles p where not exists (
        select 1 from public.world_memberships m where m.user_id = p.id and m.site_id = 'kpop')) then
    raise exception '003-memberships: a profile has no kpop membership after the backfill';
  end if;
end $$;
