-- 019-dle-core.sql (run O1, daily games step 1 "socle invisible", owner brief of 2026-10-29; RAPPORT-JEUX-DU-JOUR-v2.md sections 8
-- and 9, v1 section 7)
--
-- What:   the engine of the daily guessing games (Kpopdle, Otakudle), with no game switched on:
--         - tables dle_games, dle_attributes, dle_entities, dle_curation, dle_schedule, dle_daily_stats, dle_plays, dle_rate,
--           dle_salt: RLS on with no policy, everything revoked from public, anon and authenticated (like ranked_runs);
--         - two nullable columns on entity_images: license_verified (the admin's "licence verifiee" box) and thumb_path (the
--           96 px WebP made at upload, step 2). A picture reaches a game only when license_verified is true;
--         - dle_compare, the one comparator (the app never compares: it shows the statuses it receives; the cases live in
--           apps/quiz/src/lib/dle/fixtures/compare.json, run against this function by the SQL tests);
--         - the bank: 365 days per game drawn ahead, replayed from day 1 after day 365 while the game number keeps growing;
--           no target twice within min(no_repeat_days, 70 % of the pool) days, around the cycle too; a rebuild (the pool
--           changed) never moves today nor the 7 days after it, and a day already served keeps its target (dle_daily_stats);
--         - dle_guess, dle_give_up, dle_day, dle_pool: the only functions granted to anon and authenticated (SECURITY DEFINER,
--           search_path = public). The target leaves the database only once a play is over; yesterday's answer only once
--           yesterday stops being playable (03:00 UTC); day statistics stay null under 100 plays.
-- Why:    the games live on bunnyverse.org and call Postgres from the browser (v2 section 9): no Vercel function per guess.
-- Rows:   none. No game row: 020 adds the Kpopdle Idol game, switched off.
-- Needs:  001 (public.sites), 018 (public.entity_images). Supabase's auth.uid().
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename like 'dle\_%' and rowsecurity;   expect 9
--         select count(*) from pg_policies where schemaname = 'public' and tablename like 'dle\_%';   expect 0
--         select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\_%' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--           expect dle_day, dle_give_up, dle_guess, dle_pool
--         select count(*) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname like 'dle\_%' and c.relkind in ('r', 'v') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'));   expect 0
--         docs/pending-migrations/multisite/dle-smoke.sql (counts only, never an answer)
-- Undo:   019-dle-core.rollback.sql (refused while a dle game, a play or a verified picture exists).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null then
    raise exception '019-dle-core: public.sites is missing (apply 001 first)';
  end if;
  if to_regclass('public.entity_images') is null then
    raise exception '019-dle-core: public.entity_images is missing (apply 018 first)';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 1. Pictures: the two columns a game reads. The column grants of 018 stay the whole browser list (these two are not in it).
-- ---------------------------------------------------------------------------------------------------------------------------

alter table public.entity_images add column if not exists license_verified boolean not null default false;
alter table public.entity_images add column if not exists thumb_path text;
alter table public.entity_images drop constraint if exists entity_images_thumb_path_check;
alter table public.entity_images add constraint entity_images_thumb_path_check
  check (thumb_path is null or (thumb_path ~ '^[a-z0-9][a-z0-9/_.-]*[.]webp$' and thumb_path not like '%..%'));

-- ---------------------------------------------------------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------------------------------------------------------

-- One game per row. universe: the site whose passport gets the XP and the streak (kpop or anime, never the hub). source_view:
-- the dle_src_<game> view, the only place that turns the facts into attributes. epoch: the date of game n. 1 (set at activation).
create table if not exists public.dle_games (
  id text constraint dle_games_pkey primary key constraint dle_games_id_check check (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  universe text not null constraint dle_games_universe_fkey references public.sites(id),
  entity_kind text not null constraint dle_games_entity_kind_check check (entity_kind in ('idol', 'group', 'song', 'character', 'series')),
  source_view text not null constraint dle_games_source_view_check check (source_view ~ '^dle_src_[a-z0-9_]{1,50}$'),
  epoch date,
  no_repeat_days integer not null constraint dle_games_no_repeat_days_check check (no_repeat_days between 1 and 364),
  min_pool integer not null default 40 constraint dle_games_min_pool_check check (min_pool >= 2),
  hint_keys text[] not null default '{}',
  hint_after integer[] not null default '{}',
  active boolean not null default false,
  pool_hash text,
  created_at timestamptz not null default now(),
  constraint dle_games_hints_check check (cardinality(hint_keys) = cardinality(hint_after)),
  constraint dle_games_active_check check (not active or epoch is not null)
);

-- The columns of a game. single: one value; multi: a set; number: arrows, "near" within `near`; ordinal: arrows only.
-- A value is {"v": <value>, "p": [<parents>]}: a different value with a parent in common is "near" (sub-unit, mother company).
create table if not exists public.dle_attributes (
  game_id text not null constraint dle_attributes_game_id_fkey references public.dle_games(id) on delete cascade,
  key text not null constraint dle_attributes_key_check check (key ~ '^[a-z][a-z0-9_]{0,30}$'),
  kind text not null constraint dle_attributes_kind_check check (kind in ('single', 'multi', 'number', 'ordinal')),
  position smallint not null constraint dle_attributes_position_check check (position between 1 and 12),
  near numeric constraint dle_attributes_near_check check (near is null or near >= 0),
  constraint dle_attributes_pkey primary key (game_id, key),
  constraint dle_attributes_position_key unique (game_id, position),
  constraint dle_attributes_near_kind_check check (kind = 'number' or near is null)
);

-- The snapshot of the pool, refreshed from the source view (dle_refresh_entities); never edited by hand. hints is secret (it
-- leaves only through a play's unlocked hints); can_be_target and the curation weight never leave the database.
create table if not exists public.dle_entities (
  game_id text not null constraint dle_entities_game_id_fkey references public.dle_games(id) on delete cascade,
  entity_id text not null constraint dle_entities_entity_id_check check (char_length(entity_id) between 1 and 80),
  name text not null constraint dle_entities_name_check check (char_length(btrim(name)) between 1 and 120),
  search text[] not null default '{}',
  attrs jsonb not null constraint dle_entities_attrs_check check (jsonb_typeof(attrs) = 'object'),
  hints jsonb not null default '{}' constraint dle_entities_hints_check check (jsonb_typeof(hints) = 'object'),
  thumb_path text,
  balance_key text,
  can_be_target boolean not null default false,
  in_pool boolean not null default true,
  refreshed_at timestamptz not null default now(),
  constraint dle_entities_pkey primary key (game_id, entity_id)
);

-- The owner's decisions on an entity: leave it out of the game, or change its weight in the draw.
create table if not exists public.dle_curation (
  game_id text not null constraint dle_curation_game_id_fkey references public.dle_games(id) on delete cascade,
  entity_id text not null,
  excluded boolean not null default false,
  weight numeric not null default 1 constraint dle_curation_weight_check check (weight > 0 and weight <= 10),
  note text constraint dle_curation_note_check check (note is null or char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  constraint dle_curation_pkey primary key (game_id, entity_id)
);

-- The bank: the target of each of the 365 days of the cycle. No client access, ever.
create table if not exists public.dle_schedule (
  game_id text not null constraint dle_schedule_game_id_fkey references public.dle_games(id) on delete cascade,
  bank_day smallint not null constraint dle_schedule_bank_day_check check (bank_day between 1 and 365),
  entity_id text not null,
  drawn_at timestamptz not null default now(),
  constraint dle_schedule_pkey primary key (game_id, bank_day),
  constraint dle_schedule_entity_fkey foreign key (game_id, entity_id) references public.dle_entities(game_id, entity_id)
);

-- One row per game and date once the day is served: its number, its target (kept here, so a later rebuild of the bank never
-- changes a day already played) and its counts. guess_hist[n]: wins in n guesses (n = 20 holds 20 and more).
create table if not exists public.dle_daily_stats (
  game_id text not null constraint dle_daily_stats_game_id_fkey references public.dle_games(id) on delete cascade,
  play_date date not null,
  game_no integer not null constraint dle_daily_stats_game_no_check check (game_no >= 1),
  entity_id text not null,
  plays integer not null default 0,
  wins integer not null default 0,
  give_ups integer not null default 0,
  guess_hist integer[] not null default array_fill(0, array[20]),
  constraint dle_daily_stats_pkey primary key (game_id, play_date),
  constraint dle_daily_stats_entity_fkey foreign key (game_id, entity_id) references public.dle_entities(game_id, entity_id)
);

-- One row per play: the browser's random token (stored hashed) or the signed-in account, the guesses in order, the result.
create table if not exists public.dle_plays (
  id bigint generated always as identity constraint dle_plays_pkey primary key,
  game_id text not null constraint dle_plays_game_id_fkey references public.dle_games(id) on delete cascade,
  play_date date not null,
  token_hash text not null constraint dle_plays_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid constraint dle_plays_user_id_fkey references auth.users(id) on delete set null,
  guesses text[] not null default '{}',
  status text not null default 'playing' constraint dle_plays_status_check check (status in ('playing', 'won', 'given_up')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  xp_awarded_at timestamptz,
  constraint dle_plays_token_key unique (game_id, play_date, token_hash),
  constraint dle_plays_guesses_check check (cardinality(guesses) <= 300),
  constraint dle_plays_finished_check check ((status = 'playing') = (finished_at is null))
);
create unique index if not exists dle_plays_user_key on public.dle_plays (game_id, play_date, user_id) where user_id is not null;

-- Rate limit: calls per hashed address and minute. The salt of the day makes the hash useless the next day; both are purged daily.
create table if not exists public.dle_rate (
  bucket timestamptz not null,
  ip_hash text not null,
  calls integer not null default 0,
  constraint dle_rate_pkey primary key (bucket, ip_hash)
);
create table if not exists public.dle_salt (
  day date constraint dle_salt_pkey primary key,
  salt bytea not null
);

alter table public.dle_games enable row level security;
alter table public.dle_attributes enable row level security;
alter table public.dle_entities enable row level security;
alter table public.dle_curation enable row level security;
alter table public.dle_schedule enable row level security;
alter table public.dle_daily_stats enable row level security;
alter table public.dle_plays enable row level security;
alter table public.dle_rate enable row level security;
alter table public.dle_salt enable row level security;

-- Supabase grants every new table to anon and authenticated by default: everything is revoked, no policy is created, and only
-- the service role (and the SECURITY DEFINER functions below) reach these tables.
revoke all on table public.dle_games, public.dle_attributes, public.dle_entities, public.dle_curation, public.dle_schedule,
  public.dle_daily_stats, public.dle_plays, public.dle_rate, public.dle_salt from public, anon, authenticated;
grant all on table public.dle_games, public.dle_attributes, public.dle_entities, public.dle_curation, public.dle_schedule,
  public.dle_daily_stats, public.dle_plays, public.dle_rate, public.dle_salt to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 3. The comparator: one guess value against the target value, {"status": correct | near | wrong | unknown, "arrow": up | down | null}.
--    The arrow points from the guess to the target ("up": the target is higher).
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace function public.dle_values(p jsonb) returns text[]
language sql immutable
set search_path = public
as $$
  select case
    when p is null or jsonb_typeof(p) = 'null' then null
    when jsonb_typeof(p) = 'array' then array(select x from jsonb_array_elements_text(p) as x where x is not null)
    else array[p #>> '{}']
  end
$$;

create or replace function public.dle_compare(p_kind text, p_near numeric, p_guess jsonb, p_target jsonb) returns jsonb
language plpgsql immutable
set search_path = public
as $$
declare
  g text[] := public.dle_values(p_guess -> 'v');
  t text[] := public.dle_values(p_target -> 'v');
  gp text[] := coalesce(public.dle_values(p_guess -> 'p'), '{}');
  tp text[] := coalesce(public.dle_values(p_target -> 'p'), '{}');
  gn numeric;
  tn numeric;
  arrow text;
begin
  if g is null or t is null or cardinality(g) = 0 or cardinality(t) = 0 then
    return jsonb_build_object('status', 'unknown', 'arrow', null);
  end if;
  if p_kind in ('single', 'multi') then
    if g <@ t and t <@ g then
      return jsonb_build_object('status', 'correct', 'arrow', null);
    end if;
    if g && t or gp && tp then
      return jsonb_build_object('status', 'near', 'arrow', null);
    end if;
    return jsonb_build_object('status', 'wrong', 'arrow', null);
  end if;
  if p_kind in ('number', 'ordinal') then
    gn := g[1]::numeric;
    tn := t[1]::numeric;
    if gn = tn then
      return jsonb_build_object('status', 'correct', 'arrow', null);
    end if;
    arrow := case when tn > gn then 'up' else 'down' end;
    if p_kind = 'number' and p_near is not null and abs(tn - gn) <= p_near then
      return jsonb_build_object('status', 'near', 'arrow', arrow);
    end if;
    return jsonb_build_object('status', 'wrong', 'arrow', arrow);
  end if;
  raise exception 'dle_compare: unknown kind %', p_kind;
end $$;

-- Every column of a game, in order: [{"key", "status", "arrow"}].
create or replace function public.dle_compare_all(p_game text, p_guess jsonb, p_target jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', a.key) || public.dle_compare(a.kind, a.near, p_guess -> a.key, p_target -> a.key)
    order by a.position), '[]'::jsonb)
  from public.dle_attributes a
  where a.game_id = p_game
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 4. Days: the UTC date, the game number and the bank day. A day resets at 00:00 UTC; yesterday stays playable until 03:00 UTC.
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace function public.dle_utc_date(p_now timestamptz) returns date
language sql immutable
set search_path = public
as $$ select (p_now at time zone 'utc')::date $$;

create or replace function public.dle_bank_day(p_epoch date, p_date date) returns integer
language sql immutable
set search_path = public
as $$ select ((p_date - p_epoch) % 365 + 365) % 365 + 1 $$;

-- True when p_date may be played at p_now: today, or yesterday before 03:00 UTC; never before the game's first day.
create or replace function public.dle_playable(p_epoch date, p_now timestamptz, p_date date) returns boolean
language sql immutable
set search_path = public
as $$
  select p_date is not null and p_epoch is not null and p_date >= p_epoch
    and (p_date = public.dle_utc_date(p_now)
      or (p_date = public.dle_utc_date(p_now) - 1 and p_now < (public.dle_utc_date(p_now)::timestamp at time zone 'utc') + interval '3 hours'))
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 5. The pool: refresh the snapshot from the source view; the curation and the completeness of the columns decide the targets.
-- ---------------------------------------------------------------------------------------------------------------------------

-- A source view gives: entity_id text, name text, search text[], attrs jsonb, hints jsonb, thumb_path text, balance_key text,
-- can_be_target boolean. An entity can be a target only when every column of the game has a value.
create or replace function public.dle_refresh_entities(p_game text) returns integer
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  n integer;
begin
  select * into g from public.dle_games where id = p_game;
  if not found then
    raise exception 'dle_unknown_game';
  end if;
  execute format($f$
    insert into public.dle_entities as e (game_id, entity_id, name, search, attrs, hints, thumb_path, balance_key, can_be_target, in_pool, refreshed_at)
    select $1, s.entity_id, s.name, coalesce(s.search, '{}'), s.attrs, coalesce(s.hints, '{}'), s.thumb_path, s.balance_key,
      coalesce(s.can_be_target, false) and not coalesce(c.excluded, false)
        and not exists (select 1 from public.dle_attributes a where a.game_id = $1
          and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0),
      not coalesce(c.excluded, false), now()
    from public.%I s
    left join public.dle_curation c on c.game_id = $1 and c.entity_id = s.entity_id
    on conflict (game_id, entity_id) do update set
      name = excluded.name, search = excluded.search, attrs = excluded.attrs, hints = excluded.hints,
      thumb_path = excluded.thumb_path, balance_key = excluded.balance_key, can_be_target = excluded.can_be_target,
      in_pool = excluded.in_pool, refreshed_at = excluded.refreshed_at
  $f$, g.source_view) using p_game;
  -- An entity that left the view stays (a past day may point at it) but leaves the pool and the draw.
  execute format($f$
    update public.dle_entities e set in_pool = false, can_be_target = false, refreshed_at = now()
    where e.game_id = $1 and (e.in_pool or e.can_be_target)
      and not exists (select 1 from public.%I s where s.entity_id = e.entity_id)
  $f$, g.source_view) using p_game;
  select count(*) into n from public.dle_entities where game_id = p_game and in_pool;
  return n;
end $$;

-- The no-repeat window: min(no_repeat_days, 70 % of the targets), at least 1.
create or replace function public.dle_window(p_game text) returns integer
language sql stable
set search_path = public
as $$
  select greatest(1, least(g.no_repeat_days, floor(0.7 * count(e.entity_id))::integer))
  from public.dle_games g
  left join public.dle_entities e on e.game_id = g.id and e.can_be_target and e.in_pool
  where g.id = p_game
  group by g.no_repeat_days
$$;

create or replace function public.dle_pool_hash(p_game text) returns text
language sql stable
set search_path = public
as $$
  select md5(coalesce(string_agg(entity_id, ',' order by entity_id), ''))
  from public.dle_entities where game_id = p_game and can_be_target and in_pool
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 6. The bank of 365 days.
--    The cycle is read from a start day: day 1 on the first build; on a rebuild (p_today given and a bank exists), today,
--    and today with the 7 days after it keep their target. The 365 days are cut into m blocks of W to P days (W the window,
--    P the targets; such an m always exists for W <= 70 % of P or W <= 120). No target twice in a block; between two blocks
--    a target waits until W days have passed; the last block also ends W days before each target's day in the first block,
--    so the cycle holds when it starts again. Blocks are filled day by day with a weighted random choice that prefers a
--    group (balance key) not set within 14 days (a preference: at the end of the last block the deadlines can leave no
--    other choice). In the last block a choice must keep enough targets for every later day (Hall's condition), else the
--    closest deadline is taken. The construction cannot dead-end before the last block; a dead end there restarts the draw
--    (20 tries), then the function fails rather than break the window.
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace function public.dle_build_bank(p_game text, p_today date default null, p_seed double precision default null)
returns integer
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v_ids text[];
  v_weights numeric[];
  v_keys text[];
  v_count integer;
  v_win integer;
  v_m integer;
  v_fixed text[];
  v_nfixed integer := 0;
  v_b0 integer := 1;
  v_slots text[];
  v_last jsonb;
  v_first jsonb;
  v_kpos jsonb;
  v_block integer;
  v_bstart integer;
  v_bend integer;
  v_s integer;
  v_pick text;
  v_key text;
  v_try integer;
  v_ok boolean;
  v_drawn integer := 0;
  i integer;
begin
  select * into g from public.dle_games where id = p_game for update;
  if not found then
    raise exception 'dle_unknown_game';
  end if;
  if g.epoch is null then
    raise exception 'dle_no_epoch';
  end if;
  if p_seed is not null then
    perform setseed(p_seed);
  end if;

  select array_agg(e.entity_id order by e.entity_id), array_agg(coalesce(c.weight, 1) order by e.entity_id),
    array_agg(coalesce(e.balance_key, '') order by e.entity_id)
  into v_ids, v_weights, v_keys
  from public.dle_entities e
  left join public.dle_curation c on c.game_id = e.game_id and c.entity_id = e.entity_id
  where e.game_id = p_game and e.can_be_target and e.in_pool;
  v_count := coalesce(cardinality(v_ids), 0);
  if v_count < g.min_pool then
    raise exception 'dle_pool_too_small: % targets, % needed', v_count, g.min_pool;
  end if;
  v_win := public.dle_window(p_game);
  v_m := ceil(365.0 / v_count)::integer;
  while v_m * v_win > 365 loop
    v_m := v_m - 1;
  end loop;
  if v_m < 1 or v_m * v_count < 365 then
    raise exception 'dle_bank_unsatisfiable: % targets, window %', v_count, v_win;
  end if;

  -- Sequence position s (1 to 365) is bank day (v_b0 + s - 2) % 365 + 1.
  v_fixed := array_fill(null::text, array[365]);
  if p_today is not null and exists (select 1 from public.dle_schedule where game_id = p_game) then
    v_b0 := public.dle_bank_day(g.epoch, p_today);
    v_nfixed := 8;
    for i in 1..v_nfixed loop
      v_fixed[i] := (select entity_id from public.dle_schedule where game_id = p_game and bank_day = (v_b0 + i - 2) % 365 + 1);
    end loop;
  end if;

  for v_try in 1..20 loop
    v_slots := v_fixed;
    v_last := '{}'::jsonb;
    v_first := '{}'::jsonb;
    v_kpos := '{}'::jsonb;
    v_ok := true;
    <<blocks>>
    for v_block in 1..v_m loop
      v_bstart := (v_block - 1) * 365 / v_m + 1;
      v_bend := v_block * 365 / v_m;
      for v_s in v_bstart..v_bend loop
        v_pick := v_slots[v_s];
        if v_pick is null then
          -- The targets still free for this block: rel the first day they may come back, dl the last day they may be set
          -- (the last block only: W days before their day in the first block). A choice is safe when, for every later day t,
          -- enough targets can still fill the days t to the end of the block (Hall's condition on the suffixes): then the
          -- group preference and the random choice decide; the closest deadline decides only when nothing is safe.
          with ent as materialized (
            select c.id, c.w, c.bk, o.last_s,
              coalesce(o.last_s + v_win, 0) as rel,
              case when v_m > 1 and v_block = v_m and o.first_s is not null then 365 + o.first_s - v_win else 100000 end as dl
            from unnest(v_ids, v_weights, v_keys) as c(id, w, bk)
            cross join lateral (select (v_last ->> c.id)::integer as last_s, (v_first ->> c.id)::integer as first_s) o
            where o.last_s is null or o.last_s < v_bstart
          ), margin as materialized (
            -- The margin only drops just after a deadline: it is enough to read it there (none outside the last block).
            select t.t, (select count(*) from ent e where e.dl >= t.t and e.rel <= v_bend) - (v_bend - t.t + 1) as m
            from (select v_s + 1 as t union select e.dl + 1 from ent e where e.dl + 1 > v_s + 1 and e.dl + 1 <= v_bend) as t(t)
            where v_m > 1 and v_block = v_m and t.t <= v_bend
          )
          select c.id into v_pick
          from ent c
          cross join lateral (
            select max(k0::integer) as key_s from jsonb_array_elements_text(coalesce(v_kpos -> c.bk, '[]'::jsonb)) as k0
          ) mk
          where c.rel <= v_s and c.dl >= v_s
          order by
            coalesce((select min(mg.m) from margin mg where mg.t <= least(c.dl, v_bend)), 1) < 1,
            (c.bk <> '' and mk.key_s is not null and v_s - mk.key_s < 14),
            c.dl,
            -ln(1 - random()) / c.w
          limit 1;
          if v_pick is null then
            v_ok := false;
            exit blocks;
          end if;
          v_slots[v_s] := v_pick;
        end if;
        v_last := jsonb_set(v_last, array[v_pick], to_jsonb(v_s));
        if v_block = 1 and not (v_first ? v_pick) then
          v_first := jsonb_set(v_first, array[v_pick], to_jsonb(v_s));
        end if;
        v_key := coalesce(v_keys[array_position(v_ids, v_pick)], '');
        v_kpos := jsonb_set(v_kpos, array[v_key], coalesce(v_kpos -> v_key, '[]'::jsonb) || to_jsonb(v_s));
      end loop;
    end loop;
    exit when v_ok;
  end loop;
  if not v_ok then
    raise exception 'dle_bank_unsatisfiable: % targets, window %', v_count, v_win;
  end if;

  delete from public.dle_schedule s
  where s.game_id = p_game and not exists (
    select 1 from generate_series(1, v_nfixed) as f(i) where s.bank_day = (v_b0 + f.i - 2) % 365 + 1);
  for i in v_nfixed + 1..365 loop
    insert into public.dle_schedule (game_id, bank_day, entity_id) values (p_game, (v_b0 + i - 2) % 365 + 1, v_slots[i]);
    v_drawn := v_drawn + 1;
  end loop;
  update public.dle_games set pool_hash = public.dle_pool_hash(p_game) where id = p_game;
  return v_drawn;
end $$;

-- Switch a game on: snapshot, epoch, bank. The owner runs it on the day the game opens (step 4), never this file.
create or replace function public.dle_activate(p_game text, p_epoch date, p_seed double precision default null) returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  perform public.dle_refresh_entities(p_game);
  update public.dle_games set epoch = coalesce(epoch, p_epoch) where id = p_game;
  if not exists (select 1 from public.dle_schedule where game_id = p_game) then
    n := public.dle_build_bank(p_game, null, p_seed);
  else
    n := 0;
  end if;
  update public.dle_games set active = true where id = p_game;
  return n;
end $$;

-- The target of a day. The first call of the day writes the day's row (number and target), so a later rebuild of the bank
-- never changes a day already served.
create or replace function public.dle_target(p_game text, p_date date) returns text
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v text;
begin
  select entity_id into v from public.dle_daily_stats where game_id = p_game and play_date = p_date;
  if found then
    return v;
  end if;
  select * into g from public.dle_games where id = p_game;
  insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id)
  select p_game, p_date, (p_date - g.epoch) + 1, s.entity_id
  from public.dle_schedule s where s.game_id = p_game and s.bank_day = public.dle_bank_day(g.epoch, p_date)
  on conflict (game_id, play_date) do nothing;
  select entity_id into v from public.dle_daily_stats where game_id = p_game and play_date = p_date;
  if v is null then
    raise exception 'dle_no_schedule';
  end if;
  return v;
end $$;

-- Every night (cron ensure-daily-quiz of the hub build, step 4): snapshot, rebuild when the targets changed, today's row,
-- purge of the rate limit and the old salts. Returns counts only, never a target.
create or replace function public.dle_daily_maintenance(p_now timestamptz default now()) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v_today date := public.dle_utc_date(p_now);
  v_out jsonb := '[]'::jsonb;
  v_pool integer;
  v_rebuilt integer;
begin
  for g in select * from public.dle_games where active order by id loop
    v_pool := public.dle_refresh_entities(g.id);
    v_rebuilt := 0;
    if public.dle_pool_hash(g.id) is distinct from g.pool_hash then
      v_rebuilt := public.dle_build_bank(g.id, v_today);
    end if;
    perform public.dle_target(g.id, v_today);
    v_out := v_out || jsonb_build_object('game', g.id, 'pool', v_pool, 'rebuilt_days', v_rebuilt);
  end loop;
  delete from public.dle_rate where bucket < p_now - interval '1 hour';
  delete from public.dle_salt where day < v_today - 1;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 7. Plays. The public functions are thin wrappers over the *_at functions, which take the clock as a parameter (the tests set
--    it; no client can).
-- ---------------------------------------------------------------------------------------------------------------------------

-- Count one call of the caller's address, fail past 40 a minute. Address: cf-connecting-ip, else the last address of
-- x-forwarded-for (the one the nearest proxy added; the first one is whatever the client sent). No address (psql, the
-- service role): no limit. To check on o1-dev before launch (H9).
create or replace function public.dle_rate_hit(p_now timestamptz) returns void
language plpgsql
set search_path = public
as $$
declare
  h jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  ip text;
  v_salt bytea;
  v_calls integer;
begin
  ip := nullif(btrim(coalesce(h ->> 'cf-connecting-ip', (regexp_split_to_array(h ->> 'x-forwarded-for', '\s*,\s*'))[
    cardinality(regexp_split_to_array(h ->> 'x-forwarded-for', '\s*,\s*'))])), '');
  if ip is null then
    return;
  end if;
  insert into public.dle_salt (day, salt)
  values (public.dle_utc_date(p_now), sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')))
  on conflict (day) do nothing;
  select salt into v_salt from public.dle_salt where day = public.dle_utc_date(p_now);
  insert into public.dle_rate as r (bucket, ip_hash, calls)
  values (date_trunc('minute', p_now), encode(sha256(v_salt || convert_to(ip, 'UTF8')), 'hex'), 1)
  on conflict (bucket, ip_hash) do update set calls = r.calls + 1
  returning calls into v_calls;
  if v_calls > 40 then
    raise exception 'dle_rate_limited';
  end if;
end $$;

-- The public face of an entity (the answer of a finished play, yesterday's answer): never hints, weight or target flag.
create or replace function public.dle_public_entity(p_game text, p_entity text) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', e.entity_id, 'name', e.name, 'attrs', e.attrs, 'thumb', e.thumb_path)
  from public.dle_entities e where e.game_id = p_game and e.entity_id = p_entity
$$;

-- Day statistics, null under 100 plays (the floor is the server's).
create or replace function public.dle_public_stats(p_game text, p_date date) returns jsonb
language sql stable
set search_path = public
as $$
  select case when s.plays >= 100 then jsonb_build_object('plays', s.plays, 'wins', s.wins, 'give_ups', s.give_ups, 'guess_hist', to_jsonb(s.guess_hist)) end
  from public.dle_daily_stats s where s.game_id = p_game and s.play_date = p_date
$$;

-- The state of a play: every guess with its statuses, the hints its errors unlocked, and the target only once it is over.
create or replace function public.dle_play_state(p_play public.dle_plays) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v_target text := public.dle_target(p_play.game_id, p_play.play_date);
  v_target_attrs jsonb;
  v_errors integer;
  v_hints jsonb := '[]'::jsonb;
  v_entity_hints jsonb;
  v_over boolean := p_play.status <> 'playing';
  i integer;
begin
  select * into g from public.dle_games where id = p_play.game_id;
  select attrs, hints into v_target_attrs, v_entity_hints from public.dle_entities where game_id = g.id and entity_id = v_target;
  v_errors := cardinality(p_play.guesses) - case when p_play.status = 'won' then 1 else 0 end;
  for i in 1..cardinality(g.hint_keys) loop
    if v_errors >= g.hint_after[i] and v_entity_hints ? g.hint_keys[i] then
      v_hints := v_hints || jsonb_build_object('key', g.hint_keys[i], 'value', v_entity_hints -> g.hint_keys[i]);
    end if;
  end loop;
  return jsonb_build_object(
    'date', p_play.play_date,
    'game_no', (p_play.play_date - g.epoch) + 1,
    'status', p_play.status,
    'guesses', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'result', public.dle_compare_all(g.id, e.attrs, v_target_attrs)) order by x.n)
      from unnest(p_play.guesses) with ordinality as x(id, n)
      join public.dle_entities e on e.game_id = g.id and e.entity_id = x.id
    ), '[]'::jsonb),
    'hints', v_hints,
    'target', case when v_over then public.dle_public_entity(g.id, v_target) end,
    'stats', case when v_over then public.dle_public_stats(g.id, p_play.play_date) end
  );
end $$;

-- Checks shared by the play functions; returns the game.
create or replace function public.dle_check(p_game text, p_now timestamptz, p_date date, p_token text) returns public.dle_games
language plpgsql stable
set search_path = public
as $$
declare
  g public.dle_games;
begin
  select * into g from public.dle_games where id = p_game;
  if not found or not g.active then
    raise exception 'dle_unavailable';
  end if;
  if not public.dle_playable(g.epoch, p_now, p_date) then
    raise exception 'dle_bad_date';
  end if;
  if p_token is not null and p_token !~ '^[A-Za-z0-9_-]{16,64}$' then
    raise exception 'dle_bad_token';
  end if;
  return g;
end $$;

-- The play of a caller for a day: the signed-in account first, then the browser token. A guest play is given to the account
-- that goes on with it (once; never when the account already has a play that day). A token whose play belongs to another
-- account (a shared browser) raises dle_token_taken, so that play never reaches this account; the client draws a new token.
create or replace function public.dle_find_play(p_game text, p_date date, p_token_hash text) returns public.dle_plays
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  p public.dle_plays;
begin
  if v_user is not null then
    select * into p from public.dle_plays where game_id = p_game and play_date = p_date and user_id = v_user;
    if found then
      return p;
    end if;
  end if;
  select * into p from public.dle_plays where game_id = p_game and play_date = p_date and token_hash = p_token_hash;
  if found and v_user is not null and p.user_id is not null and p.user_id <> v_user then
    raise exception 'dle_token_taken';
  end if;
  if found and v_user is not null and p.user_id is null then
    update public.dle_plays set user_id = v_user where id = p.id returning * into p;
  end if;
  return p;
end $$;

create or replace function public.dle_guess_at(p_now timestamptz, p_game text, p_date date, p_token text, p_entity text) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v_hash text;
  v_target text;
  p public.dle_plays;
  v_won boolean;
begin
  if p_token is null then
    raise exception 'dle_bad_token';
  end if;
  g := public.dle_check(p_game, p_now, p_date, p_token);
  perform public.dle_rate_hit(p_now);
  if not exists (select 1 from public.dle_entities where game_id = g.id and entity_id = p_entity and in_pool) then
    raise exception 'dle_unknown_entity';
  end if;
  v_target := public.dle_target(g.id, p_date);
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  p := public.dle_find_play(g.id, p_date, v_hash);
  if p.id is null then
    insert into public.dle_plays (game_id, play_date, token_hash, user_id, started_at)
    values (g.id, p_date, v_hash, auth.uid(), p_now)
    returning * into p;
    update public.dle_daily_stats set plays = plays + 1 where game_id = g.id and play_date = p_date;
  end if;
  -- A finished play, or a guess already made: the same state, nothing counted twice.
  if p.status <> 'playing' or p_entity = any (p.guesses) then
    return public.dle_play_state(p);
  end if;
  if cardinality(p.guesses) >= 300 then
    raise exception 'dle_too_many_guesses';
  end if;
  v_won := p_entity = v_target;
  update public.dle_plays
  set guesses = guesses || p_entity,
      status = case when v_won then 'won' else 'playing' end,
      finished_at = case when v_won then p_now end
  where id = p.id
  returning * into p;
  if v_won then
    update public.dle_daily_stats
    set wins = wins + 1, guess_hist[least(cardinality(p.guesses), 20)] = guess_hist[least(cardinality(p.guesses), 20)] + 1
    where game_id = g.id and play_date = p_date;
  end if;
  return public.dle_play_state(p);
end $$;

create or replace function public.dle_give_up_at(p_now timestamptz, p_game text, p_date date, p_token text) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  p public.dle_plays;
begin
  if p_token is null then
    raise exception 'dle_bad_token';
  end if;
  g := public.dle_check(p_game, p_now, p_date, p_token);
  perform public.dle_rate_hit(p_now);
  p := public.dle_find_play(g.id, p_date, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'));
  if p.id is null or cardinality(p.guesses) = 0 then
    raise exception 'dle_no_guess';
  end if;
  if p.status = 'playing' then
    update public.dle_plays set status = 'given_up', finished_at = p_now where id = p.id returning * into p;
    update public.dle_daily_stats set give_ups = give_ups + 1 where game_id = g.id and play_date = p_date;
  end if;
  return public.dle_play_state(p);
end $$;

-- The day as the page needs it: the server clock, the number, the time left, yesterday's answer (once yesterday is closed),
-- the day's statistics (floored) and, with a token or an account, the caller's play to resume.
create or replace function public.dle_day_at(p_now timestamptz, p_game text, p_token text default null, p_date date default null) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_today date := public.dle_utc_date(p_now);
  v_date date := coalesce(p_date, v_today);
  g public.dle_games;
  p public.dle_plays;
  v_yesterday jsonb;
begin
  g := public.dle_check(p_game, p_now, v_date, p_token);
  -- It writes too (the day's row, a guest play given to the account), so it counts against the limit like a guess.
  perform public.dle_rate_hit(p_now);
  perform public.dle_target(g.id, v_date);
  if p_now >= (v_today::timestamp at time zone 'utc') + interval '3 hours' then
    select jsonb_build_object('date', s.play_date, 'game_no', s.game_no, 'answer', public.dle_public_entity(g.id, s.entity_id))
    into v_yesterday
    from public.dle_daily_stats s where s.game_id = g.id and s.play_date = v_today - 1;
  end if;
  if p_token is not null or auth.uid() is not null then
    p := public.dle_find_play(g.id, v_date, encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex'));
  end if;
  return jsonb_build_object(
    'game', g.id,
    'now', p_now,
    'date', v_date,
    'game_no', (v_date - g.epoch) + 1,
    'seconds_left', extract(epoch from ((v_date + 1)::timestamp at time zone 'utc') - p_now)::integer,
    'yesterday', v_yesterday,
    'stats', public.dle_public_stats(g.id, v_date),
    'play', case when p.id is not null then public.dle_play_state(p) end
  );
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 8. The four public functions.
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace function public.dle_guess(p_game text, p_date date, p_token text, p_entity text) returns jsonb
language sql volatile security definer set search_path = public
as $$ select public.dle_guess_at(now(), p_game, p_date, p_token, p_entity) $$;

create or replace function public.dle_give_up(p_game text, p_date date, p_token text) returns jsonb
language sql volatile security definer set search_path = public
as $$ select public.dle_give_up_at(now(), p_game, p_date, p_token) $$;

create or replace function public.dle_day(p_game text, p_token text default null, p_date date default null) returns jsonb
language sql volatile security definer set search_path = public
as $$ select public.dle_day_at(now(), p_game, p_token, p_date) $$;

-- The columns and every entity of the pool, with the 96 px picture only when its licence is verified (else null: the client
-- shows the initials). Never can_be_target, the weight or the hints: they would narrow the candidates.
create or replace function public.dle_pool(p_game text) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  g public.dle_games;
begin
  select * into g from public.dle_games where id = p_game;
  if not found or not g.active then
    raise exception 'dle_unavailable';
  end if;
  return jsonb_build_object(
    'game', g.id,
    'universe', g.universe,
    'attributes', (select coalesce(jsonb_agg(jsonb_build_object('key', a.key, 'kind', a.kind, 'near', a.near) order by a.position), '[]'::jsonb)
      from public.dle_attributes a where a.game_id = g.id),
    'entities', (select coalesce(jsonb_agg(jsonb_build_object('id', e.entity_id, 'name', e.name, 'search', to_jsonb(e.search),
        'attrs', e.attrs, 'thumb', e.thumb_path) order by e.name, e.entity_id), '[]'::jsonb)
      from public.dle_entities e where e.game_id = g.id and e.in_pool)
  );
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 9. Privileges. Postgres lets everyone execute a new function: every dle function is revoked from public, anon and
--    authenticated, then the four above are granted to the browser roles and the rest to the service role.
-- ---------------------------------------------------------------------------------------------------------------------------

revoke all on function public.dle_values(jsonb), public.dle_compare(text, numeric, jsonb, jsonb), public.dle_compare_all(text, jsonb, jsonb),
  public.dle_utc_date(timestamptz), public.dle_bank_day(date, date), public.dle_playable(date, timestamptz, date),
  public.dle_refresh_entities(text), public.dle_window(text), public.dle_pool_hash(text),
  public.dle_build_bank(text, date, double precision), public.dle_activate(text, date, double precision), public.dle_target(text, date),
  public.dle_daily_maintenance(timestamptz), public.dle_rate_hit(timestamptz), public.dle_public_entity(text, text),
  public.dle_public_stats(text, date), public.dle_play_state(public.dle_plays), public.dle_check(text, timestamptz, date, text),
  public.dle_find_play(text, date, text), public.dle_guess_at(timestamptz, text, date, text, text),
  public.dle_give_up_at(timestamptz, text, date, text), public.dle_day_at(timestamptz, text, text, date),
  public.dle_guess(text, date, text, text), public.dle_give_up(text, date, text), public.dle_day(text, text, date),
  public.dle_pool(text)
  from public, anon, authenticated;

grant execute on function public.dle_values(jsonb), public.dle_compare(text, numeric, jsonb, jsonb), public.dle_compare_all(text, jsonb, jsonb),
  public.dle_utc_date(timestamptz), public.dle_bank_day(date, date), public.dle_playable(date, timestamptz, date),
  public.dle_refresh_entities(text), public.dle_window(text), public.dle_pool_hash(text),
  public.dle_build_bank(text, date, double precision), public.dle_activate(text, date, double precision), public.dle_target(text, date),
  public.dle_daily_maintenance(timestamptz), public.dle_rate_hit(timestamptz), public.dle_public_entity(text, text),
  public.dle_public_stats(text, date), public.dle_play_state(public.dle_plays), public.dle_check(text, timestamptz, date, text),
  public.dle_find_play(text, date, text), public.dle_guess_at(timestamptz, text, date, text, text),
  public.dle_give_up_at(timestamptz, text, date, text), public.dle_day_at(timestamptz, text, text, date)
  to service_role;

grant execute on function public.dle_guess(text, date, text, text), public.dle_give_up(text, date, text),
  public.dle_day(text, text, date), public.dle_pool(text)
  to anon, authenticated, service_role;

-- Self-check: no policy, no browser grant on a table, exactly four functions for the browser roles.
do $$
declare
  n integer;
begin
  select count(*) into n from pg_policies where schemaname = 'public' and tablename like 'dle\_%';
  if n <> 0 then
    raise exception '019-dle-core: % policies on dle tables', n;
  end if;
  select count(*) into n from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relname like 'dle\_%' and c.relkind = 'r'
    and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'));
  if n <> 0 then
    raise exception '019-dle-core: % dle tables readable by a browser role', n;
  end if;
  select count(*) into n from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\_%'
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
  if n <> 4 then
    raise exception '019-dle-core: % dle functions executable by a browser role, 4 expected', n;
  end if;
end $$;

notify pgrst, 'reload schema';
