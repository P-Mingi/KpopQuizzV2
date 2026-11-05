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
--         - the bank: 365 days per game drawn ahead, replayed from day 1 after day 365 while the game number keeps growing, in blocks of N days
--           (N = the eligible targets): every target once per block, the last block with the 365 mod N targets that come once more (all
--           different), so inside the cycle no target comes back before every target has come once, a target comes ceil(365 / N) times at
--           most and the counts differ by 1 at most; no target twice within G = min(no_repeat_days, 70 % of the pool, the longest gap 365 days
--           hold) days, blocks and the turn of the cycle included, for every pool size from min_pool up (CR-019, CR-027; section 6 says
--           what holds across the wrap); a rebuild (the pool changed) reads the cycle from today, never moves today nor the 7 days after it,
--           and a day already served keeps its target (dle_daily_stats);
--         - dle_guess, dle_give_up, dle_day, dle_pool: the only functions granted to anon and authenticated (SECURITY DEFINER,
--           search_path = public). The target leaves the database only once a play is over; yesterday's answer only once
--           yesterday stops being playable (03:00 UTC); day statistics stay null under 100 plays;
--         - dle_daily_maintenance, the nightly step, game by game: a game that fails is rolled back alone and named in the result
--           ({"game", "error", "code"}), the other games and the purges still run (CR-019).
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

-- The gap G (CR-027): the least number of days between two days of one target in the bank, the turn of the cycle included:
-- max(1, min(no_repeat_days, floor(0.7 * targets), floor(365 / ceil(365 / targets)))). The third term is the longest gap 365 days can hold
-- for a target that comes ceil(365 / targets) times (its gaps add up to 365); with 365 targets or more it is 365. It never binds for
-- no_repeat_days up to 120 (the games' values): 70 % of the targets is under 121 up to 172 targets, and above that the third term is at
-- least 121. It rules out an impossible gap for a larger no_repeat_days instead of failing the bank. The name stays dle_window (the window
-- of 019 before blocks was the same number); the tests and V-L14 read it as the gap the bank must hold.
create or replace function public.dle_window(p_game text) returns integer
language sql stable
set search_path = public
as $$
  select greatest(1, least(g.no_repeat_days, floor(0.7 * count(e.entity_id))::integer,
    case when count(e.entity_id) = 0 then 1 else (365 / ((365 + count(e.entity_id) - 1) / count(e.entity_id)))::integer end))
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
-- 6. The bank of 365 days, in blocks.
--    CR-027 (CR-019 gave the frame, CR-027 gives the blocks). N = the targets (can_be_target and in_pool). The bank is read from its first day
--    (bank day 1 on a first build, today's bank day on a rebuild) as blocks of N days: days 1 to N hold every target once, days N + 1 to 2N
--    again, and so on; the last block holds the 365 mod N targets that come once more, all different. Inside the cycle no target comes back
--    before every target has come once (read by block: no target of block 2 is drawn before block 1 holds every target; between two days of
--    one target there are at least G - 1 other days, not N - 1); a target comes ceil(365 / N) times at most and the counts differ by 1 at most.
--    G, the least gap between two days of one target, across the blocks and across the wrap (day 365, then day 1 again), is dle_window:
--        G = max(1, min(no_repeat_days, floor(0.7 N), floor(365 / ceil(365 / N))))        (N >= 365: the last term is 365)
--    Why this G, in 5 lines:
--    1. floor(365 / ceil(365 / N)) is the most any scheme can give: a target that comes m = ceil(365 / N) times has m gaps that add up to 365.
--       The frame below reaches it for every N from 2 to 1400 (checked), which is why the bank cannot dead-end.
--    2. 0.7 N is the share of a block that stays free (the owner's 70 %, unchanged): a target may come up to 0.3 N places earlier in the next
--       block, so the orders differ. Measured on 48 to 150 targets: 0.20 to 0.31 of the pairs of targets swap places between two blocks (0 is the
--       same order every block, 0.5 two independent shuffles) and under 5 % of the targets keep their place. A larger share makes blocks alike.
--    3. "The last g targets of a block are not among the first g of the next" gives G = g + 1 <= N / 2 + 1 and says nothing of the wrap;
--       this scheme gives 0.7 N and holds the wrap, at the price of a frame that a mixing then shuffles.
--    4. no_repeat_days stays the owner's cap (120 for the games): the gap asked for, cut to what the pool and the cycle can hold.
--    5. The same G binds every state of the mixing and of a rebuild (see below), so nothing here can dead-end or be left half done.
--    The wrap. N divides 365 only for 73 (and 5, 1, 365): the last block is then full and everything above holds around the cycle too.
--    For every other N the last block holds r = 365 mod N targets and block 1 starts again after it: the gap G holds across that turn,
--    but "every target before any returns" does not (the r targets of the last block come back in block 1 before the N - r others have
--    come once since their last day in block B). N >= 365: one block of 365 targets, once each, the heaviest weights first; the others are
--    not drawn (as in CR-019).
--    How: 1. a frame (one place per target, 365 positions cut in blocks) that holds G by construction; 2. the targets take the places
--    (a kept target its own, the others in a weighted random order, a group not set within 14 days of the place when one is left);
--    3. a mixing that swaps days inside a block, keeping G, the blocks and the counts, and the days of one group 14 days apart or more.
--    A rebuild: the cycle is read from today, so the blocks start at today's bank day; today and the 7 days after it are the first 8 days
--    of block 1, fixed points. A kept target of the pool takes its own place in the frame and the others are built around it; nothing
--    moves it. What a kept day can break: a kept target that left the pool is written all the same and the target whose place it takes is
--    missing from block 1, so "every target once per block" and the counts (1 apart) fail by one per such day. The same target on two kept
--    days (only possible when the old gap was under 8 days) breaks G for that target. G holds for every other target of the pool.
--    A rebuild reads nothing before today (as before CR-027): G holds inside the new bank, not between the days served before today and the
--    first days of the new bank.
--    V-DLE-KEPT counts the kept days whose target left the pool (KO, never a name, RUNBOOK L6); V-L14 checks 3 and 8 say KO for them too.
--    The only impossible inputs are fewer targets than min_pool (dle_pool_too_small); dle_bank_unsatisfiable stays as a guard that the
--    frame's shortest gap is at least G, which it is for every N (so it never fires).
-- ---------------------------------------------------------------------------------------------------------------------------

create or replace function public.dle_build_bank(p_game text, p_today date default null, p_seed double precision default null)
returns integer
language plpgsql
set search_path = public
as $$
-- bank-blocks-v1 (D02-dev-rebuild-banks.sql looks for this marker)
declare
  g public.dle_games;
  v_ids text[];
  v_weights double precision[];
  v_keys text[];
  v_kid integer[];
  v_nk integer;
  v_count integer;
  v_win integer;
  v_fixed text[];
  v_nfixed integer := 0;
  v_b0 integer := 1;
  v_slots text[];
  -- the frame
  v_q integer;
  v_r integer;
  v_tt integer;
  v_olo integer;
  v_ohi integer;
  v_o integer;
  v_pat integer[];
  v_nxt integer[];
  v_lastp integer[];
  v_firstp integer[];
  v_w0 integer := 365;
  v_pos integer;
  v_blk integer;
  v_bk integer;
  v_x integer;
  v_off integer;
  v_i integer;
  v_e integer;
  -- who takes which place
  v_ord integer[];
  v_pool integer[];
  v_idxent integer[];
  v_taken boolean[];
  v_kat integer[];
  v_stamp integer[];
  v_st integer := 0;
  v_hh integer;
  v_j integer;
  v_pass integer;
  v_p integer;
  v_t integer;
  v_pick integer;
  v_fb integer;
  -- the mixing and the polish
  v_out integer[];
  v_kp integer[];
  v_occ integer[];
  v_ocn integer[];
  v_s integer;
  v_att integer := 0;
  v_cap integer;
  v_conf integer;
  v_best integer := 1000000;
  v_stall integer := 0;
  v_sweep integer := 0;
  v_lo integer;
  v_hi integer;
  v_c integer;
  v_ntry integer;
  v_cmax integer;
  v_ka integer;
  v_kb integer;
  v_np integer;
  v_nz integer;
  v_oz integer;
  v_z integer;
  v_a integer;
  v_b integer;
  v_dd integer;
  v_d2 integer;
  v_o2 integer;
  v_u integer;
  v_ok boolean;
  v_drawn integer := 0;
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

  select array_agg(e.entity_id order by e.entity_id), array_agg(coalesce(c.weight, 1)::double precision order by e.entity_id),
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

  -- The group of each target as a number (0: no balance key).
  select array_agg(coalesce(r.d, 0) order by t.i), coalesce(max(r.d), 0)
  into v_kid, v_nk
  from unnest(v_keys) with ordinality as t(k, i)
  left join (select x.k, dense_rank() over (order by x.k)::integer as d from (select distinct k from unnest(v_keys) as k where k <> '') as x) r on r.k = t.k;

  -- Sequence position s (1 to 365) is bank day (v_b0 + s - 2) % 365 + 1. On a rebuild the first v_nfixed positions keep their target.
  v_fixed := array_fill(null::text, array[8]);
  if p_today is not null and exists (select 1 from public.dle_schedule where game_id = p_game) then
    v_b0 := public.dle_bank_day(g.epoch, p_today);
    for v_i in 1..8 loop
      v_fixed[v_i] := (select entity_id from public.dle_schedule where game_id = p_game and bank_day = (v_b0 + v_i - 2) % 365 + 1);
      exit when v_fixed[v_i] is null;
      v_nfixed := v_i;
    end loop;
  end if;

  -- 1. The frame: the 365 positions are cut into blocks of v_count positions (v_q full blocks, then a last block of v_r positions).
  --    v_pat[position] is the place on that position: places 1 to v_r are the ones that come once more (v_q + 1 times, the "often"
  --    places), places v_r + 1 to v_count come v_q times. A full block holds every place once; the last block holds the often places
  --    in their order (positions 1 to v_r). The others keep one order in every block. The often places sit in a band of v_r
  --    positions that starts v_o positions into the first block and moves v_o / v_q positions earlier at each block until it is
  --    the last block; the others that the band passes over jump over it (later, so their gap only grows). v_o is the middle of
  --    the values that give every often place a gap of floor(365 / (v_q + 1)) days at least: the best a target that comes
  --    v_q + 1 times can have. The shortest gap of the frame, v_w0, is that number (checked for 2 to 1400 targets) or v_count.
  v_q := 365 / v_count;
  v_r := 365 % v_count;
  v_o := 0;
  if v_q > 0 and v_r > 0 then
    v_tt := 365 / (v_q + 1);
    v_olo := greatest(0, v_tt - v_r);
    v_ohi := least(v_count - v_r, v_q * (v_count - v_tt));
    v_o := (v_olo + v_ohi) / 2;
  end if;
  v_pat := array_fill(0, array[365]);
  for v_pos in 1..365 loop
    v_blk := (v_pos - 1) / v_count + 1;
    v_x := v_pos - (v_blk - 1) * v_count;
    if v_blk > v_q then
      v_pat[v_pos] := v_x;
    else
      v_off := v_o * (v_q + 1 - v_blk) / v_q;
      if v_x <= v_off then
        v_pat[v_pos] := v_r + v_x;
      elsif v_x <= v_off + v_r then
        v_pat[v_pos] := v_x - v_off;
      else
        v_pat[v_pos] := v_x;
      end if;
    end if;
  end loop;
  v_lastp := array_fill(0, array[v_count]);
  v_firstp := array_fill(0, array[v_count]);
  v_nxt := array_fill(0, array[365]);
  for v_pos in 1..365 loop
    v_i := v_pat[v_pos];
    if v_lastp[v_i] = 0 then
      v_firstp[v_i] := v_pos;
    else
      v_nxt[v_lastp[v_i]] := v_pos;
      v_w0 := least(v_w0, v_pos - v_lastp[v_i]);
    end if;
    v_lastp[v_i] := v_pos;
  end loop;
  for v_i in 1..v_count loop
    if v_lastp[v_i] > 0 then
      v_nxt[v_lastp[v_i]] := v_firstp[v_i];
      v_w0 := least(v_w0, 365 - v_lastp[v_i] + v_firstp[v_i]);
    end if;
  end loop;
  if v_win > v_w0 then
    raise exception 'dle_bank_unsatisfiable: % targets, window %', v_count, v_win;
  end if;

  -- 2. The targets take the places. A target kept by a rebuild first (its own place), then the others in a weighted random order.
  v_idxent := array_fill(0, array[v_count]);
  v_taken := array_fill(false, array[v_count]);
  for v_pos in 1..v_nfixed loop
    v_e := coalesce(array_position(v_ids, v_fixed[v_pos]), 0);
    if v_e > 0 and not v_taken[v_e] and v_idxent[v_pat[v_pos]] = 0 then
      v_idxent[v_pat[v_pos]] := v_e;
      v_taken[v_e] := true;
    end if;
  end loop;
  select array_agg(t.i::integer order by -ln(1 - random()) / t.w) into v_ord from unnest(v_weights) with ordinality as t(w, i);
  v_pool := '{}';
  for v_j in 1..v_count loop
    if not v_taken[v_ord[v_j]] then
      v_pool := v_pool || v_ord[v_j];
    end if;
  end loop;
  v_hh := 1;
  v_kat := array_fill(0, array[365]);
  v_stamp := array_fill(0, array[v_nk + 1]);
  for v_pos in 1..365 loop
    if v_idxent[v_pat[v_pos]] > 0 then
      v_kat[v_pos] := v_kid[v_idxent[v_pat[v_pos]]];
    end if;
  end loop;
  -- The places that come once more first (they take the targets that come first in the weighted order), then the others.
  for v_pass in 1..2 loop
    for v_pos in 1..365 loop
      v_i := v_pat[v_pos];
      continue when v_idxent[v_i] <> 0 or v_firstp[v_i] <> v_pos or (v_i <= v_r) <> (v_pass = 1);
      -- The groups set within 13 days of a place of this one.
      v_st := v_st + 1;
      v_p := v_pos;
      loop
        for v_j in v_p - 13..v_p + 13 loop
          v_t := (v_j + 364) % 365 + 1;
          if v_kat[v_t] > 0 then
            v_stamp[v_kat[v_t]] := v_st;
          end if;
        end loop;
        v_p := v_nxt[v_p];
        exit when v_p = v_pos;
      end loop;
      v_pick := 0;
      v_fb := 0;
      v_j := v_hh;
      while v_j <= cardinality(v_pool) loop
        v_e := v_pool[v_j];
        if not v_taken[v_e] then
          if v_kid[v_e] = 0 or v_stamp[v_kid[v_e]] <> v_st then
            v_pick := v_e;
            exit;
          end if;
          if v_fb = 0 then
            v_fb := v_e;
          end if;
        end if;
        v_j := v_j + 1;
      end loop;
      if v_pick = 0 then
        v_pick := v_fb;
      end if;
      if v_pick = 0 then
        raise exception 'dle_bank_unsatisfiable: % targets, window %', v_count, v_win;
      end if;
      v_taken[v_pick] := true;
      v_idxent[v_i] := v_pick;
      while v_hh <= cardinality(v_pool) and v_taken[v_pool[v_hh]] loop
        v_hh := v_hh + 1;
      end loop;
      v_p := v_pos;
      loop
        v_kat[v_p] := v_kid[v_pick];
        v_p := v_nxt[v_p];
        exit when v_p = v_pos;
      end loop;
    end loop;
  end loop;
  v_out := array_fill(0, array[365]);
  for v_pos in 1..365 loop
    v_out[v_pos] := v_idxent[v_pat[v_pos]];
  end loop;

  -- 3. The mixing. The frame gives every block the same order, which a player could read. Two days of one block are swapped when
  --    both targets keep their gap G (the other days of each, 1 to 13 of them, are read, around the cycle) and the days of the same
  --    group within 14 days (around the cycle) do not become more. Every state the mixing passes through holds G, the blocks and
  --    the counts, so it can be stopped at any time; the first v_nfixed days never move. 12 sweeps give each day 2 partners (the
  --    orders have stopped changing by then: measured on 6, 12, 24, 60 and 120 sweeps); a day in conflict gets 30 partners per
  --    sweep, and sweeps on the days in conflict go on until none is left or 3 sweeps in a row leave as many (a preference).
  v_s := v_q + 1;
  v_cap := 2 * 227760 / greatest(13, v_s);
  v_occ := array_fill(0, array[v_count * v_s]);
  v_ocn := array_fill(0, array[v_count]);
  v_kp := array_fill(0, array[365 + 26]);
  for v_pos in 1..365 loop
    v_e := v_out[v_pos];
    v_ocn[v_e] := v_ocn[v_e] + 1;
    v_occ[(v_e - 1) * v_s + v_ocn[v_e]] := v_pos;
    v_kp[v_pos + 13] := v_kid[v_e];
  end loop;
  for v_i in 1..13 loop
    v_kp[v_i + 378] := v_kp[v_i + 13];
    v_kp[v_i] := v_kp[v_i + 365];
  end loop;
  loop
    v_sweep := v_sweep + 1;
    v_conf := 0;
    for v_p in v_nfixed + 1..365 loop
      exit when v_att >= v_cap;
      v_bk := (v_p - 1) / v_count;
      v_lo := greatest(v_bk * v_count + 1, v_nfixed + 1);
      v_hi := least((v_bk + 1) * v_count, 365);
      continue when v_hi <= v_lo;
      v_cmax := 0;
      v_ka := v_kp[v_p + 13];
      if v_ka > 0 then
        v_cmax := -1;
        for v_u in v_p..v_p + 26 loop
          if v_kp[v_u] = v_ka then
            v_cmax := v_cmax + 1;
          end if;
        end loop;
      end if;
      if v_cmax > 0 then
        v_conf := v_conf + 1;
      end if;
      v_ntry := case when v_cmax > 0 then 30 when v_sweep <= 12 then 2 else 0 end;
      for v_c in 1..v_ntry loop
        v_att := v_att + 1;
        v_z := v_lo + floor(random() * (v_hi - v_lo + 1))::integer;
        continue when v_z = v_p;
        v_a := v_out[v_p];
        v_b := v_out[v_z];
        v_ok := true;
        for v_u in 1..v_ocn[v_a] loop
          v_o2 := v_occ[(v_a - 1) * v_s + v_u];
          if v_o2 <> v_p then
            v_d2 := abs(v_o2 - v_z);
            if least(v_d2, 365 - v_d2) < v_win then
              v_ok := false;
              exit;
            end if;
          end if;
        end loop;
        if v_ok then
          for v_u in 1..v_ocn[v_b] loop
            v_o2 := v_occ[(v_b - 1) * v_s + v_u];
            if v_o2 <> v_z then
              v_d2 := abs(v_o2 - v_p);
              if least(v_d2, 365 - v_d2) < v_win then
                v_ok := false;
                exit;
              end if;
            end if;
          end loop;
        end if;
        continue when not v_ok;
        v_kb := v_kp[v_z + 13];
        if v_ka <> v_kb then
          -- The days p and z now (v_cmax and v_oz) and after the swap (v_np and v_nz): group kb at p, ka at z, the other one of
          -- the two days no longer counted in the window of the first.
          v_dd := abs(v_p - v_z);
          v_dd := least(v_dd, 365 - v_dd);
          v_np := 0;
          v_oz := 0;
          if v_kb > 0 then
            for v_u in v_p..v_p + 26 loop
              if v_kp[v_u] = v_kb then
                v_np := v_np + 1;
              end if;
            end loop;
            for v_u in v_z..v_z + 26 loop
              if v_kp[v_u] = v_kb then
                v_oz := v_oz + 1;
              end if;
            end loop;
            v_oz := v_oz - 1;
            if v_dd <= 13 then
              v_np := v_np - 1;
            end if;
          end if;
          v_nz := 0;
          if v_ka > 0 then
            for v_u in v_z..v_z + 26 loop
              if v_kp[v_u] = v_ka then
                v_nz := v_nz + 1;
              end if;
            end loop;
            if v_dd <= 13 then
              v_nz := v_nz - 1;
            end if;
          end if;
          -- Fewer days of one group close together, or as many (a sideways move lets the search leave a dead end).
          continue when v_np + v_nz > v_cmax + v_oz;
        end if;
        v_out[v_p] := v_b;
        v_out[v_z] := v_a;
        v_kp[v_p + 13] := v_kb;
        v_kp[v_z + 13] := v_ka;
        if v_p <= 13 then v_kp[v_p + 378] := v_kb; end if;
        if v_p >= 353 then v_kp[v_p - 352] := v_kb; end if;
        if v_z <= 13 then v_kp[v_z + 378] := v_ka; end if;
        if v_z >= 353 then v_kp[v_z - 352] := v_ka; end if;
        for v_u in 1..v_ocn[v_a] loop
          if v_occ[(v_a - 1) * v_s + v_u] = v_p then
            v_occ[(v_a - 1) * v_s + v_u] := v_z;
            exit;
          end if;
        end loop;
        for v_u in 1..v_ocn[v_b] loop
          if v_occ[(v_b - 1) * v_s + v_u] = v_z then
            v_occ[(v_b - 1) * v_s + v_u] := v_p;
            exit;
          end if;
        end loop;
        exit;
      end loop;
    end loop;
    -- 12 sweeps of mixing, then sweeps on the days in conflict only, until none is left or 3 sweeps leave as many.
    if v_sweep > 12 then
      if v_conf < v_best then
        v_best := v_conf;
        v_stall := 0;
      else
        v_stall := v_stall + 1;
      end if;
      exit when v_conf = 0 or v_stall >= 3;
    end if;
    exit when v_att >= v_cap;
  end loop;

  v_slots := array_fill(null::text, array[365]);
  for v_pos in 1..365 loop
    v_slots[v_pos] := v_ids[v_out[v_pos]];
  end loop;
  for v_pos in 1..v_nfixed loop
    v_slots[v_pos] := v_fixed[v_pos];
  end loop;

  delete from public.dle_schedule s
  where s.game_id = p_game and not exists (
    select 1 from generate_series(1, v_nfixed) as f(i) where s.bank_day = (v_b0 + f.i - 2) % 365 + 1);
  for v_pos in v_nfixed + 1..365 loop
    insert into public.dle_schedule (game_id, bank_day, entity_id) values (p_game, (v_b0 + v_pos - 2) % 365 + 1, v_slots[v_pos]);
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
-- CR-019: each game runs in its own block. A game that fails (under min_pool, epoch still in the future) keeps its state of the
-- day before and comes back as {"game", "error", "code"}, for the cron's log; the other games and the purges still run. A
-- statement timeout is not caught (Postgres keeps query_canceled out of OTHERS): it fails the whole call, and the cron logs that.
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
    begin
      v_pool := public.dle_refresh_entities(g.id);
      v_rebuilt := 0;
      if public.dle_pool_hash(g.id) is distinct from g.pool_hash then
        v_rebuilt := public.dle_build_bank(g.id, v_today);
      end if;
      perform public.dle_target(g.id, v_today);
      v_out := v_out || jsonb_build_object('game', g.id, 'pool', v_pool, 'rebuilt_days', v_rebuilt);
    exception when others then
      v_out := v_out || jsonb_build_object('game', g.id, 'error', sqlerrm, 'code', sqlstate);
    end;
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
