# Battle Rooms — Full implementation prompt

> A new real-time multiplayer K-pop trivia mode for kpopquiz.org. JKLM-style 3-column gameplay, room codes, free-text fuzzy-matched answers, first to 100 points wins. Plus a community question creation flow with email-based admin moderation.

## How to use this prompt

- **6 phases**, implement in order. Stop at each phase boundary to test before continuing.
- **For UI code**: open the corresponding prototype `.jsx` file (provided separately in `/mnt/user-data/outputs/`) and copy the EXACT inline-styled JSX. Do NOT rewrite with Tailwind, do NOT change colors, do NOT change spacing. The prototypes are the spec.
- **For data layer**: all SQL, types, and API code is inline below.
- **Hidden launch**: do NOT add a `/battle` link to the public navbar. Admin reaches the route by typing `/battle` in the URL bar OR via a hidden link in the admin panel (added in Phase 2.4).

## Critical constraints

1. **Inline `style={{}}` everywhere**, copied verbatim from the prototype files. No Tailwind conversion.
2. **Adapt only**: `<a href>` → `<Link>`, hardcoded data → props/hooks, `useState` for navigation → `useRouter`. Visual styles never change.
3. **Color palette is fixed**: pink `#D4537E`, beige `#FAF9F6`, gray text `#888780`, light borders `#e8e6e0`, amber `#e8a060`, purple `#9a7acc`, green `#27ae60`, red `#e74c3c`. Game UI uses dark gradient `#1a0a1e → #2a1035 → #3a1848`.
4. **No visible navbar link in Phase 2**. Battle is reached only by direct URL or admin panel.
5. **Server-authoritative timer**: clients display countdown, server validates all answer submissions against round start timestamp.
6. **Free-tier infrastructure**: Supabase Realtime free tier (200 concurrent / 2M msgs/month) handles up to ~10k games/month. No new infrastructure required.

## Reference files (prototype JSX, copy-paste source of truth)

- `rooms-desktop-flow.jsx` — Hub, Join, Guest setup, Host Lobby, Player Lobby (desktop)
- `rooms-jklm-v2.jsx` — Active gameplay (desktop, 3-column with closeable chat) + Mobile gameplay
- `rooms-prototype-2.jsx` — Mobile gameplay screens (countdown, correct/wrong feedback, leaderboard, pause, report)
- `rooms-question-creation-v2.jsx` — My Questions hub, unified form, submitted state, admin email view

---

# PHASE 1 — Foundation (database + realtime + types)

Goal: get the data layer ready. No UI yet. After this phase, the database can hold rooms, players, rounds, and questions.

## 1.1 — Create Supabase migration for Battle tables

**File:** `supabase/migrations/YYYYMMDDHHMMSS_battle_rooms.sql` (use current timestamp)
**Action:** Create

Run the entire SQL block below. It creates 7 tables, indexes, and enables RLS.

```sql
-- ============================================================
-- BATTLE ROOMS - Schema
-- ============================================================

-- Rooms: one row per game session
create table public.battle_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) = 4),
  host_user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'ended', 'closed')),
  -- settings
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard', 'Insane')),
  group_filter_mode text not null default 'all' check (group_filter_mode in ('all', 'specific', 'by_gen')),
  group_filter_values text[] default '{}',
  time_per_round int not null default 15 check (time_per_round in (10, 15, 20, 30)),
  korean_mode boolean not null default false,
  privacy text not null default 'private' check (privacy in ('public', 'private')),
  -- state
  current_round_id uuid,
  winner_player_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  last_activity_at timestamptz not null default now()
);

create index battle_rooms_code_idx on public.battle_rooms(code);
create index battle_rooms_status_idx on public.battle_rooms(status);
create index battle_rooms_last_activity_idx on public.battle_rooms(last_activity_at);

-- Players: logged-in users OR guests, joined to a room
create table public.battle_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.battle_rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  guest_session_id text, -- localStorage UUID for guests
  display_name text not null check (length(display_name) between 2 and 20),
  avatar_color text not null default '#D4537E',
  avatar_initial text not null,
  score int not null default 0,
  is_host boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  -- stats during this game
  correct_count int not null default 0,
  fastest_answer_seconds numeric(5,2),
  -- one of user_id OR guest_session_id must be set
  constraint battle_players_identity check (
    (user_id is not null and guest_session_id is null) or
    (user_id is null and guest_session_id is not null)
  ),
  -- can't be in same room twice
  unique(room_id, user_id),
  unique(room_id, guest_session_id)
);

create index battle_players_room_idx on public.battle_players(room_id);
create index battle_players_user_idx on public.battle_players(user_id);
create index battle_players_guest_idx on public.battle_players(guest_session_id);

-- Questions: the content pool (admin-curated + community-submitted)
create table public.battle_questions (
  id uuid primary key default gen_random_uuid(),
  -- core challenge structure (matches JKLM PopSauce schema)
  prompt text not null, -- "What song is this?"
  text_content text, -- optional: lyric, quote
  image_url text, -- optional: Supabase storage URL
  answer text not null, -- the canonical answer
  variants text[] default '{}', -- accepted alternatives for fuzzy matching
  -- categorization
  group_name text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Insane')),
  tags text[] default '{}',
  -- moderation
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected')),
  submitter_user_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  moderator_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  -- stats (updated as the question gets played)
  plays int not null default 0,
  correct_count int not null default 0,
  upvotes int not null default 0,
  reports int not null default 0,
  -- meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- at least one content type required
  constraint battle_questions_content check (
    text_content is not null or image_url is not null
  )
);

create index battle_questions_status_idx on public.battle_questions(status);
create index battle_questions_difficulty_idx on public.battle_questions(difficulty) where status = 'approved';
create index battle_questions_group_idx on public.battle_questions(group_name) where status = 'approved';
create index battle_questions_submitter_idx on public.battle_questions(submitter_user_id);

-- Rounds: each question played in a room
create table public.battle_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.battle_rooms(id) on delete cascade not null,
  round_number int not null,
  question_id uuid references public.battle_questions(id) not null,
  status text not null default 'pending' check (status in ('pending', 'countdown', 'active', 'reveal', 'ended')),
  started_at timestamptz,
  countdown_ends_at timestamptz,
  round_ends_at timestamptz, -- started_at + time_per_round seconds
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique(room_id, round_number)
);

create index battle_rounds_room_idx on public.battle_rounds(room_id);
create index battle_rounds_status_idx on public.battle_rounds(status);

-- Round answers: each player's submission per round
create table public.battle_round_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.battle_rounds(id) on delete cascade not null,
  player_id uuid references public.battle_players(id) on delete cascade not null,
  answer_text text not null,
  is_correct boolean not null default false,
  points_awarded int not null default 0,
  time_taken_seconds numeric(5,2),
  attempt_number int not null default 1,
  submitted_at timestamptz not null default now(),
  unique(round_id, player_id, attempt_number)
);

create index battle_round_answers_round_idx on public.battle_round_answers(round_id);
create index battle_round_answers_player_idx on public.battle_round_answers(player_id);

-- Chat messages
create table public.battle_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.battle_rooms(id) on delete cascade not null,
  player_id uuid references public.battle_players(id) on delete cascade not null,
  message text not null check (length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index battle_chat_messages_room_idx on public.battle_chat_messages(room_id, created_at desc);

-- Moderation magic-link tokens (for email-based approve/reject)
create table public.battle_moderation_tokens (
  token text primary key,
  question_id uuid references public.battle_questions(id) on delete cascade not null,
  action text not null check (action in ('approve', 'reject', 'edit')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index battle_moderation_tokens_question_idx on public.battle_moderation_tokens(question_id);
create index battle_moderation_tokens_expires_idx on public.battle_moderation_tokens(expires_at);

-- Question reports (when players flag questions during gameplay)
create table public.battle_question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.battle_questions(id) on delete cascade not null,
  reporter_player_id uuid references public.battle_players(id),
  reporter_user_id uuid references auth.users(id),
  reason text not null check (reason in ('wrong', 'hard', 'nsfw', 'spam', 'other')),
  comment text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index battle_question_reports_question_idx on public.battle_question_reports(question_id) where resolved = false;
```

**Verify:**
- [ ] Migration runs without errors
- [ ] All 7 tables exist
- [ ] Check `\d battle_rooms` in psql shows correct columns

## 1.2 — Enable RLS and add policies

**File:** Same migration file (continue at the bottom)

```sql
-- ============================================================
-- BATTLE ROOMS - Row Level Security
-- ============================================================

alter table public.battle_rooms enable row level security;
alter table public.battle_players enable row level security;
alter table public.battle_questions enable row level security;
alter table public.battle_rounds enable row level security;
alter table public.battle_round_answers enable row level security;
alter table public.battle_chat_messages enable row level security;
alter table public.battle_moderation_tokens enable row level security;
alter table public.battle_question_reports enable row level security;

-- Rooms: anyone can read non-closed rooms (for the join flow)
create policy battle_rooms_select on public.battle_rooms
  for select using (status != 'closed');

-- Only authenticated users can create rooms (host)
create policy battle_rooms_insert on public.battle_rooms
  for insert with check (auth.uid() = host_user_id);

-- Only the host can update their room settings (during lobby)
create policy battle_rooms_update_host on public.battle_rooms
  for update using (auth.uid() = host_user_id);

-- Players: anyone in the room can see all players
create policy battle_players_select on public.battle_players
  for select using (
    room_id in (
      select room_id from public.battle_players p2
      where (p2.user_id = auth.uid())
         or (p2.guest_session_id is not null) -- guests visible
    )
  );

-- Inserts and updates are done via RPC only (no direct INSERT)
create policy battle_players_no_direct_write on public.battle_players
  for insert with check (false);

-- Questions: approved are public; submitter can see own pending/rejected/draft
create policy battle_questions_select_approved on public.battle_questions
  for select using (status = 'approved');

create policy battle_questions_select_own on public.battle_questions
  for select using (auth.uid() = submitter_user_id);

create policy battle_questions_insert_own on public.battle_questions
  for insert with check (auth.uid() = submitter_user_id and status in ('draft', 'pending'));

create policy battle_questions_update_own on public.battle_questions
  for update using (auth.uid() = submitter_user_id and status in ('draft', 'rejected'));

-- Rounds: visible to anyone in the room
create policy battle_rounds_select on public.battle_rounds
  for select using (
    room_id in (
      select id from public.battle_rooms
      where status != 'closed'
    )
  );

-- Round answers: visible to anyone in the room (so leaderboard works)
create policy battle_round_answers_select on public.battle_round_answers
  for select using (
    round_id in (select id from public.battle_rounds)
  );

-- Chat messages: visible to room members, written via RPC
create policy battle_chat_select on public.battle_chat_messages
  for select using (
    room_id in (select id from public.battle_rooms where status != 'closed')
  );

-- Reports: write-only via RPC
create policy battle_reports_insert on public.battle_question_reports
  for insert with check (true);

-- Tokens: only readable by service role (used in API routes)
create policy battle_tokens_service_only on public.battle_moderation_tokens
  for select using (false); -- always false; access via service_role bypasses RLS
```

**Verify:**
- [ ] RLS enabled on all 8 tables
- [ ] Test in SQL editor as authenticated user — can SELECT public rooms

## 1.3 — Create the fuzzy answer matching function

**File:** Same migration file (continue)

The fuzzy match logic: lowercase, strip punctuation/spaces, then compare against canonical answer + variants. Levenshtein distance ≤ 2 for short answers (≤10 chars), ≤3 for longer.

```sql
-- ============================================================
-- BATTLE ROOMS - Fuzzy answer matching
-- ============================================================

-- Normalize a string: lowercase, strip whitespace and punctuation
create or replace function public.battle_normalize_answer(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(trim(coalesce(input, ''))),
    '[^a-z0-9가-힣]', '', 'g'
  );
$$;

-- Check if two answers match (with fuzzy tolerance)
create or replace function public.battle_answers_match(submitted text, target text)
returns boolean
language plpgsql
immutable
as $$
declare
  s text := public.battle_normalize_answer(submitted);
  t text := public.battle_normalize_answer(target);
  max_distance int;
begin
  if s = '' or t = '' then return false; end if;
  if s = t then return true; end if;
  -- short answers (≤10 chars): tolerate 2 typos; long: tolerate 3
  max_distance := case when length(t) <= 10 then 2 else 3 end;
  return levenshtein(s, t) <= max_distance;
end;
$$;

-- Need pg_trgm + fuzzystrmatch for levenshtein
create extension if not exists fuzzystrmatch;
create extension if not exists pg_trgm;

-- Validate an answer against a question (canonical + all variants)
create or replace function public.battle_validate_answer(
  question_id uuid,
  submitted text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q_answer text;
  q_variants text[];
  variant text;
begin
  select answer, variants into q_answer, q_variants
  from public.battle_questions where id = question_id;

  if q_answer is null then return false; end if;

  -- check canonical
  if public.battle_answers_match(submitted, q_answer) then return true; end if;

  -- check variants
  if q_variants is not null then
    foreach variant in array q_variants loop
      if public.battle_answers_match(submitted, variant) then return true; end if;
    end loop;
  end if;

  return false;
end;
$$;
```

**Verify:**
- [ ] `select battle_answers_match('Pink Venom', 'pink venom')` → `true`
- [ ] `select battle_answers_match('PinkVenum', 'Pink Venom')` → `true` (typo tolerated)
- [ ] `select battle_answers_match('BTS', '방탄')` → `false` (different scripts; handle separately via variants)

## 1.4 — Create core RPCs

**File:** Same migration file (continue)

These RPCs are called from API routes. They run as `security definer` to bypass RLS for trusted operations.

```sql
-- ============================================================
-- BATTLE ROOMS - RPCs
-- ============================================================

-- Generate a unique 4-digit room code
create or replace function public.battle_generate_room_code()
returns text
language plpgsql
as $$
declare
  new_code text;
  attempts int := 0;
begin
  loop
    new_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    if not exists (select 1 from public.battle_rooms where code = new_code and status != 'closed') then
      return new_code;
    end if;
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Could not generate unique room code';
    end if;
  end loop;
end;
$$;

-- Create a room (called by host)
create or replace function public.battle_create_room(
  p_difficulty text default 'Medium',
  p_group_filter_mode text default 'all',
  p_group_filter_values text[] default '{}',
  p_time_per_round int default 15,
  p_korean_mode boolean default false,
  p_privacy text default 'private'
)
returns table(room_id uuid, room_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_room_id uuid;
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to host a room';
  end if;

  v_code := public.battle_generate_room_code();

  insert into public.battle_rooms (
    code, host_user_id, difficulty, group_filter_mode, group_filter_values,
    time_per_round, korean_mode, privacy
  ) values (
    v_code, v_user_id, p_difficulty, p_group_filter_mode, p_group_filter_values,
    p_time_per_round, p_korean_mode, p_privacy
  )
  returning id into v_room_id;

  -- Auto-join the host as the first player
  insert into public.battle_players (
    room_id, user_id, display_name, avatar_color, avatar_initial, is_host
  )
  select
    v_room_id, v_user_id,
    coalesce(raw_user_meta_data->>'name', email, 'Host'),
    '#D4537E',
    upper(left(coalesce(raw_user_meta_data->>'name', email, 'H'), 1)),
    true
  from auth.users where id = v_user_id;

  return query select v_room_id, v_code;
end;
$$;

-- Join a room (logged-in or guest)
create or replace function public.battle_join_room(
  p_code text,
  p_display_name text,
  p_avatar_color text default '#D4537E',
  p_guest_session_id text default null
)
returns table(player_id uuid, room_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_room_status text;
  v_player_count int;
  v_player_id uuid;
begin
  -- find the room
  select id, status into v_room_id, v_room_status
  from public.battle_rooms where code = p_code;

  if v_room_id is null then
    raise exception 'Room not found';
  end if;

  if v_room_status = 'closed' then
    raise exception 'Room is closed';
  end if;

  -- check player count
  select count(*) into v_player_count
  from public.battle_players where room_id = v_room_id and left_at is null;

  if v_player_count >= 8 then
    raise exception 'Room is full';
  end if;

  if v_user_id is null and p_guest_session_id is null then
    raise exception 'Must provide identity (logged in or guest session)';
  end if;

  -- check if already in room
  if v_user_id is not null then
    select id into v_player_id from public.battle_players
    where room_id = v_room_id and user_id = v_user_id and left_at is null;
  else
    select id into v_player_id from public.battle_players
    where room_id = v_room_id and guest_session_id = p_guest_session_id and left_at is null;
  end if;

  if v_player_id is not null then
    return query select v_player_id, v_room_id;
    return;
  end if;

  -- insert new player
  insert into public.battle_players (
    room_id, user_id, guest_session_id, display_name, avatar_color, avatar_initial
  ) values (
    v_room_id, v_user_id, p_guest_session_id, p_display_name, p_avatar_color,
    upper(left(p_display_name, 1))
  ) returning id into v_player_id;

  update public.battle_rooms set last_activity_at = now() where id = v_room_id;

  return query select v_player_id, v_room_id;
end;
$$;

-- Pick a question for the next round
create or replace function public.battle_pick_question(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_difficulty text;
  v_group_filter_mode text;
  v_group_filter_values text[];
  v_korean_mode boolean;
  v_question_id uuid;
begin
  -- get room settings
  select difficulty, group_filter_mode, group_filter_values, korean_mode
  into v_difficulty, v_group_filter_mode, v_group_filter_values, v_korean_mode
  from public.battle_rooms where id = p_room_id;

  -- pick a random approved question matching filters, excluding ones already used in this room
  select id into v_question_id
  from public.battle_questions q
  where q.status = 'approved'
    and q.difficulty = v_difficulty
    and (v_group_filter_mode = 'all' or q.group_name = any(v_group_filter_values))
    and not exists (
      select 1 from public.battle_rounds r
      where r.room_id = p_room_id and r.question_id = q.id
    )
  order by random()
  limit 1;

  return v_question_id;
end;
$$;

-- Start the next round
create or replace function public.battle_start_round(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_question_id uuid;
  v_round_number int;
  v_time_per_round int;
  v_round_id uuid;
  v_now timestamptz := now();
begin
  -- only host can start
  select host_user_id, time_per_round into v_host_id, v_time_per_round
  from public.battle_rooms where id = p_room_id;

  if v_host_id != v_user_id then
    raise exception 'Only the host can start a round';
  end if;

  -- pick question
  v_question_id := public.battle_pick_question(p_room_id);
  if v_question_id is null then
    raise exception 'No more questions available';
  end if;

  -- next round number
  select coalesce(max(round_number), 0) + 1 into v_round_number
  from public.battle_rounds where room_id = p_room_id;

  -- create round (with 3-second countdown)
  insert into public.battle_rounds (
    room_id, round_number, question_id, status,
    countdown_ends_at, started_at, round_ends_at
  ) values (
    p_room_id, v_round_number, v_question_id, 'countdown',
    v_now + interval '3 seconds',
    v_now + interval '3 seconds',
    v_now + interval '3 seconds' + (v_time_per_round || ' seconds')::interval
  ) returning id into v_round_id;

  update public.battle_rooms
    set current_round_id = v_round_id,
        status = 'active',
        started_at = coalesce(started_at, v_now),
        last_activity_at = v_now
    where id = p_room_id;

  return v_round_id;
end;
$$;

-- Submit an answer
create or replace function public.battle_submit_answer(
  p_player_id uuid,
  p_answer text
)
returns table(is_correct boolean, points int, total_score int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
  v_question_id uuid;
  v_room_id uuid;
  v_started_at timestamptz;
  v_round_ends_at timestamptz;
  v_now timestamptz := now();
  v_time_taken numeric(5,2);
  v_time_remaining numeric(5,2);
  v_total_time numeric(5,2);
  v_is_correct boolean := false;
  v_points int := 0;
  v_attempt_num int;
  v_total_score int;
begin
  -- get current round info
  select r.id, r.question_id, r.room_id, r.started_at, r.round_ends_at
  into v_round_id, v_question_id, v_room_id, v_started_at, v_round_ends_at
  from public.battle_rounds r
  join public.battle_players p on p.room_id = r.room_id
  where p.id = p_player_id and r.status = 'active'
  order by r.round_number desc limit 1;

  if v_round_id is null then
    raise exception 'No active round';
  end if;

  if v_now > v_round_ends_at then
    raise exception 'Round has ended';
  end if;

  -- check if already answered correctly this round
  if exists(
    select 1 from public.battle_round_answers
    where round_id = v_round_id and player_id = p_player_id and is_correct = true
  ) then
    raise exception 'Already answered correctly';
  end if;

  -- calculate timing
  v_time_taken := extract(epoch from (v_now - v_started_at));
  v_time_remaining := extract(epoch from (v_round_ends_at - v_now));
  v_total_time := extract(epoch from (v_round_ends_at - v_started_at));

  -- attempt number
  select coalesce(max(attempt_number), 0) + 1 into v_attempt_num
  from public.battle_round_answers
  where round_id = v_round_id and player_id = p_player_id;

  -- validate
  v_is_correct := public.battle_validate_answer(v_question_id, p_answer);

  if v_is_correct then
    -- points = (timeRemaining / totalTime) × 10, min 1
    v_points := greatest(1, round((v_time_remaining / v_total_time) * 10));

    update public.battle_players
      set score = score + v_points,
          correct_count = correct_count + 1,
          fastest_answer_seconds = least(coalesce(fastest_answer_seconds, 999), v_time_taken)
      where id = p_player_id;
  end if;

  -- record answer
  insert into public.battle_round_answers (
    round_id, player_id, answer_text, is_correct, points_awarded,
    time_taken_seconds, attempt_number
  ) values (
    v_round_id, p_player_id, p_answer, v_is_correct, v_points,
    v_time_taken, v_attempt_num
  );

  -- update question stats
  update public.battle_questions
    set plays = plays + (case when v_attempt_num = 1 then 1 else 0 end),
        correct_count = correct_count + (case when v_is_correct then 1 else 0 end)
    where id = v_question_id;

  -- check for game winner
  select score into v_total_score from public.battle_players where id = p_player_id;
  if v_total_score >= 100 then
    update public.battle_rooms
      set status = 'ended', ended_at = v_now, winner_player_id = p_player_id
      where id = v_room_id;
  end if;

  return query select v_is_correct, v_points, v_total_score;
end;
$$;

-- Submit a chat message
create or replace function public.battle_send_chat(
  p_player_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_msg_id uuid;
begin
  select room_id into v_room_id from public.battle_players where id = p_player_id;
  if v_room_id is null then raise exception 'Player not found'; end if;

  insert into public.battle_chat_messages (room_id, player_id, message)
  values (v_room_id, p_player_id, p_message)
  returning id into v_msg_id;

  return v_msg_id;
end;
$$;
```

**Verify:**
- [ ] All RPCs created without errors
- [ ] Test `select battle_generate_room_code()` returns a 4-digit string
- [ ] Test scoring: a correct answer at 50% time remaining returns ~5 points

## 1.5 — Enable Realtime on the relevant tables

**File:** Same migration

```sql
-- Enable Realtime broadcast for these tables
alter publication supabase_realtime add table public.battle_rooms;
alter publication supabase_realtime add table public.battle_players;
alter publication supabase_realtime add table public.battle_rounds;
alter publication supabase_realtime add table public.battle_round_answers;
alter publication supabase_realtime add table public.battle_chat_messages;
```

**Verify:**
- [ ] `select * from pg_publication_tables where pubname='supabase_realtime'` includes the 5 new tables

## 1.6 — Create Supabase Storage bucket for question images

In Supabase Dashboard → Storage → Create new bucket:

- **Name:** `battle-question-images`
- **Public:** Yes (questions are public)
- **File size limit:** 5MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`

Add a policy via SQL:

```sql
-- Anyone can read approved question images
create policy "battle_qimages_public_read"
  on storage.objects for select
  using (bucket_id = 'battle-question-images');

-- Authenticated users can upload (then admin approves)
create policy "battle_qimages_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'battle-question-images' and auth.uid() is not null);
```

**Verify:**
- [ ] Bucket exists and is public
- [ ] Test upload via Supabase dashboard

## 1.7 — Generate TypeScript types

**File:** `src/types/battle.ts`
**Action:** Create

```ts
// Database types
export type BattleRoomStatus = 'lobby' | 'active' | 'ended' | 'closed';
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane';
export type GroupFilterMode = 'all' | 'specific' | 'by_gen';
export type RoomPrivacy = 'public' | 'private';
export type RoundStatus = 'pending' | 'countdown' | 'active' | 'reveal' | 'ended';
export type QuestionStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ReportReason = 'wrong' | 'hard' | 'nsfw' | 'spam' | 'other';

export interface BattleRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: BattleRoomStatus;
  difficulty: Difficulty;
  group_filter_mode: GroupFilterMode;
  group_filter_values: string[];
  time_per_round: 10 | 15 | 20 | 30;
  korean_mode: boolean;
  privacy: RoomPrivacy;
  current_round_id: string | null;
  winner_player_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_activity_at: string;
}

export interface BattlePlayer {
  id: string;
  room_id: string;
  user_id: string | null;
  guest_session_id: string | null;
  display_name: string;
  avatar_color: string;
  avatar_initial: string;
  score: number;
  is_host: boolean;
  is_connected: boolean;
  joined_at: string;
  left_at: string | null;
  correct_count: number;
  fastest_answer_seconds: number | null;
}

export interface BattleQuestion {
  id: string;
  prompt: string;
  text_content: string | null;
  image_url: string | null;
  answer: string;
  variants: string[];
  group_name: string;
  difficulty: Difficulty;
  tags: string[];
  status: QuestionStatus;
  submitter_user_id: string | null;
  rejection_reason: string | null;
  plays: number;
  correct_count: number;
  upvotes: number;
  reports: number;
  created_at: string;
  updated_at: string;
}

export interface BattleRound {
  id: string;
  room_id: string;
  round_number: number;
  question_id: string;
  status: RoundStatus;
  started_at: string | null;
  countdown_ends_at: string | null;
  round_ends_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface BattleRoundAnswer {
  id: string;
  round_id: string;
  player_id: string;
  answer_text: string;
  is_correct: boolean;
  points_awarded: number;
  time_taken_seconds: number;
  attempt_number: number;
  submitted_at: string;
}

export interface BattleChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  message: string;
  created_at: string;
}

// Settings shape used by client when creating/configuring a room
export interface RoomSettings {
  difficulty: Difficulty;
  group_filter_mode: GroupFilterMode;
  group_filter_values: string[];
  time_per_round: 10 | 15 | 20 | 30;
  korean_mode: boolean;
  privacy: RoomPrivacy;
}

// Palette constants (use these for inline styles)
export const PALETTE = {
  pink: "#D4537E",
  pinkLight: "rgba(212,83,126,0.08)",
  pinkBorder: "rgba(212,83,126,0.15)",
  bg: "#FAF9F6",
  textDark: "#2c2c2a",
  textMuted: "#888780",
  textLight: "#b4b2a9",
  border: "#e8e6e0",
  borderLight: "#f0ede8",
  amber: "#e8a060",
  green: "#27ae60",
  red: "#e74c3c",
  purple: "#9a7acc",
  gameBg: "linear-gradient(160deg, #1a0a1e 0%, #2a1035 60%, #3a1848 100%)",
} as const;

export const GROUPS = [
  "BTS", "BLACKPINK", "Stray Kids", "aespa", "TWICE",
  "NewJeans", "SEVENTEEN", "IVE", "EXO", "Red Velvet",
  "(G)I-DLE", "ITZY",
];
```

**Verify:**
- [ ] File compiles without errors
- [ ] All exports importable from elsewhere

## 1.8 — Phase 1 stop point

🛑 Test the foundation:

1. Run the migration on staging.
2. In SQL editor, manually create a test room and player to verify constraints.
3. Insert a test question with `status='approved'` and verify `battle_pick_question` returns it.

Don't move to Phase 2 until: migration is clean, RPCs work, types compile.

---

# PHASE 2 — Pre-room pages (hub + join + guest setup)

Goal: build the entry points for `/battle`. Hidden from navbar — admin reaches it via direct URL or a hidden admin panel link added in 2.4.

## 2.1 — Set up `/battle` route group

**File:** `src/app/battle/layout.tsx`
**Action:** Create

```tsx
import { ReactNode } from "react";

export const metadata = {
  title: "Battle Rooms — kpopquiz",
  description: "Real-time K-pop trivia battles with friends",
};

export default function BattleLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

## 2.2 — Build `/battle` (Hub page)

**File:** `src/app/battle/page.tsx`
**Action:** Create

Use the **EXACT** code from `rooms-desktop-flow.jsx` → function `ScreenHub`. Adaptations:

1. Wrap with `'use client'` directive.
2. Replace `<a>` tags pointing to in-app routes with `next/link` `<Link>`. Specifically:
   - "Create room" big CTA → `/battle/create` (we'll create this in 2.5)
   - "Join with code" → `/battle/join`
   - "Submit a question" CTA at bottom → `/battle/questions/new`
3. Replace the `SiteNavbar` component with the project's existing navbar component, BUT pass `disableBattleLink={true}` (we'll handle this in 2.4 — for now, just import the existing navbar without modifying it).
4. Hardcoded "Recent rooms" data → fetch from API:

```tsx
const { data: recentRooms } = useSWR('/api/battle/rooms/recent', fetcher);
```

Where `/api/battle/rooms/recent` is built next.

**Full code skeleton** (copy ScreenHub JSX into the return):

```tsx
'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { PALETTE as C } from '@/types/battle';
// ... import existing site navbar

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BattleHubPage() {
  const { data: recentRooms = [] } = useSWR('/api/battle/rooms/recent', fetcher);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      {/* existing site navbar */}
      <div style={{ flex: 1, padding: "32px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* PASTE Hero + Two CTA cards + How it works + Recent rooms + Question CTA from ScreenHub here */}
          {/* IMPORTANT: replace hardcoded recent rooms with `recentRooms` from useSWR */}
        </div>
      </div>
    </div>
  );
}
```

**API route for recent rooms:**

**File:** `src/app/api/battle/rooms/recent/route.ts`
**Action:** Create

```ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json([]);

  const { data } = await supabase
    .from('battle_players')
    .select(`
      joined_at,
      battle_rooms!inner (
        id, code, host_user_id, status,
        battle_players!battle_players_room_id_fkey ( count )
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(3);

  // Format for the UI: { code, host, lastPlayed, players }
  const formatted = (data ?? []).map((row: any) => ({
    code: row.battle_rooms.code,
    host: 'someone', // TODO: join with auth.users to get host name
    lastPlayed: timeAgo(row.joined_at),
    players: row.battle_rooms.battle_players?.[0]?.count ?? 0,
  }));

  return NextResponse.json(formatted);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
```

**Verify:**
- [ ] Visit `/battle` → renders hub with hero, two CTAs, "How it works", recent rooms (empty if not played yet)
- [ ] Visual matches `ScreenHub` in `rooms-desktop-flow.jsx` pixel-for-pixel

## 2.3 — Build `/battle/join` (Code input)

**File:** `src/app/battle/join/page.tsx`
**Action:** Create

Copy `ScreenJoin` from `rooms-desktop-flow.jsx`. Adaptations:

1. `'use client'` directive.
2. The "Join room" button: on click, calls `/api/battle/rooms/[code]/check` to validate the code exists. If valid AND user is logged in → redirect to `/battle/r/[code]`. If valid AND user is not logged in → redirect to `/battle/r/[code]/guest` (guest setup).
3. Auto-advance the digit inputs: when a digit is entered, focus the next input.

```tsx
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { PALETTE as C } from '@/types/battle';

export default function BattleJoinPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const updateDigit = (i: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (!/^\d?$/.test(val)) return;
    const next = [...code]; next[i] = val; setCode(next);
    if (val && i < 3) inputs.current[i + 1]?.focus();
  };

  const isComplete = code.every(c => c !== '');

  const handleJoin = async () => {
    setError(null);
    setLoading(true);
    const codeStr = code.join('');

    const res = await fetch(`/api/battle/rooms/${codeStr}/check`);
    if (!res.ok) {
      setError('Room not found or full');
      setLoading(false);
      return;
    }
    const { exists, full } = await res.json();
    if (!exists) { setError('Room not found'); setLoading(false); return; }
    if (full) { setError('Room is full'); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push(`/battle/r/${codeStr}`);
    } else {
      router.push(`/battle/r/${codeStr}/guest`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      {/* PASTE ScreenJoin layout from rooms-desktop-flow.jsx */}
      {/* Bind inputs.current[i] = el on each digit input */}
      {/* Wire onClick={handleJoin} on the Join button, disable={!isComplete || loading} */}
      {/* Show error message below button if `error` is set */}
      {/* TODO: load recent rooms via SWR (same endpoint as hub) */}
    </div>
  );
}
```

**API route for code check:**

**File:** `src/app/api/battle/rooms/[code]/check/route.ts`

```ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createServerClient();

  const { data: room } = await supabase
    .from('battle_rooms')
    .select('id, status')
    .eq('code', code)
    .neq('status', 'closed')
    .single();

  if (!room) return NextResponse.json({ exists: false });

  const { count } = await supabase
    .from('battle_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .is('left_at', null);

  return NextResponse.json({
    exists: true,
    full: (count ?? 0) >= 8,
  });
}
```

**Verify:**
- [ ] Typing 4 digits and clicking Join → redirects correctly
- [ ] Invalid code → shows "Room not found"

## 2.4 — Add hidden admin entry point

The user's request: **no public navbar link**, but admin can reach `/battle` easily.

**Option A (preferred):** Add a tiny "Battle Rooms" entry to the existing admin sidebar/menu.

**File:** Locate the admin layout/sidebar component (probably `src/app/admin/layout.tsx` or `src/components/admin/AdminSidebar.tsx`).

Add a new menu item:

```tsx
{
  label: 'Battle Rooms',
  href: '/battle',
  icon: '⚔️',
  // Mark this as in beta / hidden
  badge: 'BETA',
}
```

**Option B (also do):** Make `/battle` not appear in the public navbar. Verify the project's navbar component does NOT include a Battle link. If you see it in `src/components/Navbar.tsx` or wherever, leave it commented out:

```tsx
// HIDDEN FOR LAUNCH — uncomment when launching publicly
// { label: 'Battle', href: '/battle', isNew: true },
```

**Verify:**
- [ ] No public users see "Battle" in the navbar
- [ ] Admin sees "Battle Rooms · BETA" in their admin sidebar
- [ ] Direct URL `/battle` still works for anyone with the link

## 2.5 — Build `/battle/create` (host-only handoff)

When a logged-in user clicks "Create room" on the hub, they need to actually create the room in DB and then get redirected to the lobby.

**File:** `src/app/battle/create/page.tsx`
**Action:** Create

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export default function BattleCreatePage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirect=/battle');
        return;
      }

      const { data, error } = await supabase.rpc('battle_create_room', {
        p_difficulty: 'Medium',
        p_time_per_round: 15,
        p_korean_mode: false,
        p_privacy: 'private',
      });

      if (error || !data?.[0]) {
        console.error('Failed to create room:', error);
        router.replace('/battle?error=create_failed');
        return;
      }

      router.replace(`/battle/r/${data[0].room_code}`);
    })();
  }, [router, supabase]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 14, color: "#888780" }}>Creating your room...</p>
    </div>
  );
}
```

**Verify:**
- [ ] Logged-in user clicks "Create room" → ends up at `/battle/r/XXXX` with their fresh code
- [ ] Logged-out user → redirected to login

## 2.6 — Build `/battle/r/[code]/guest` (guest onboarding)

**File:** `src/app/battle/r/[code]/guest/page.tsx`
**Action:** Create

Copy `ScreenGuest` from `rooms-desktop-flow.jsx`. Adaptations:

1. `'use client'` + read `code` from `useParams`.
2. Generate or reuse a guest session ID from localStorage:

```tsx
function getOrCreateGuestId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('kpq_guest_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('kpq_guest_id', id);
  }
  return id;
}
```

3. Pre-fill name from `localStorage.getItem('kpq_guest_name')` if exists.
4. On submit:

```tsx
const handleJoin = async () => {
  const guestId = getOrCreateGuestId();
  localStorage.setItem('kpq_guest_name', name);
  localStorage.setItem('kpq_guest_color', colors[colorIdx]);

  const { data, error } = await supabase.rpc('battle_join_room', {
    p_code: code,
    p_display_name: name,
    p_avatar_color: colors[colorIdx],
    p_guest_session_id: guestId,
  });

  if (error || !data?.[0]) {
    setError(error?.message || 'Failed to join');
    return;
  }
  router.push(`/battle/r/${code}`);
};
```

**Verify:**
- [ ] Guest fills name + color, clicks join → ends up in lobby as a guest player
- [ ] Refreshing the page later remembers their name (localStorage)

## 2.7 — Phase 2 stop point

🛑 Test the entry flow:

1. Visit `/battle` directly (don't add navbar link).
2. Click "Create room" while logged in → should land on `/battle/r/XXXX` (lobby will be a 404 for now — Phase 3).
3. From an incognito window, visit `/battle/join`, enter the code → goes to `/battle/r/XXXX/guest`.
4. Set up a guest name → tries to join (will 404 until Phase 3 lobby is built).

Don't move to Phase 3 until: hub, join, create, and guest setup all flow correctly and visually match the prototypes.

---

# PHASE 3 — Room lobby (3-column layout, host vs player views)

Goal: render the lobby. Settings panel, player roster, closeable chat panel. The "Start game" button works (calls `battle_start_round`) but actual gameplay is Phase 4.

## 3.1 — Build the room page shell

**File:** `src/app/battle/r/[code]/page.tsx`
**Action:** Create

This page has TWO states based on `room.status`: `'lobby'` shows the lobby UI (this phase), `'active'` shows gameplay (Phase 4). It also forks based on whether the current user is host vs player.

```tsx
'use client';
import { useParams } from 'next/navigation';
import { useBattleRoom } from '@/hooks/useBattleRoom';
import { LobbyView } from '@/components/battle/LobbyView';
import { GameplayView } from '@/components/battle/GameplayView';
import { PALETTE as C } from '@/types/battle';

export default function BattleRoomPage() {
  const { code } = useParams<{ code: string }>();
  const { room, players, currentPlayer, loading, error } = useBattleRoom(code);

  if (loading) return <LoadingState />;
  if (error || !room) return <ErrorState error={error} />;

  if (room.status === 'lobby') {
    return <LobbyView room={room} players={players} currentPlayer={currentPlayer} />;
  }

  if (room.status === 'active') {
    return <GameplayView room={room} players={players} currentPlayer={currentPlayer} />;
  }

  if (room.status === 'ended') {
    return <EndGameView room={room} players={players} />;
  }

  return <ErrorState error="Room is closed" />;
}

function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 14, color: C.textMuted }}>Connecting to room...</p>
    </div>
  );
}

function ErrorState({ error }: { error?: string | null }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: C.textDark }}>Can't open this room</p>
      <p style={{ fontSize: 12, color: C.textMuted }}>{error || "Try again later"}</p>
    </div>
  );
}

function EndGameView({ room, players }: any) {
  // Phase 4 will build this
  return <div>Game ended! (Phase 4 will style this)</div>;
}
```

## 3.2 — Build the `useBattleRoom` hook

**File:** `src/hooks/useBattleRoom.ts`
**Action:** Create

This is the core data subscription. Subscribes to Supabase Realtime for the room's tables.

```ts
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { BattleRoom, BattlePlayer } from '@/types/battle';

export function useBattleRoom(code: string) {
  const supabase = createBrowserClient();
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<BattlePlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let roomChannel: any;

    (async () => {
      try {
        // Initial load: fetch room
        const { data: roomData, error: rErr } = await supabase
          .from('battle_rooms')
          .select('*')
          .eq('code', code)
          .neq('status', 'closed')
          .single();
        if (rErr || !roomData) throw new Error(rErr?.message || 'Room not found');
        if (!mounted) return;
        setRoom(roomData);

        // Initial players
        const { data: playerData } = await supabase
          .from('battle_players')
          .select('*')
          .eq('room_id', roomData.id)
          .is('left_at', null)
          .order('joined_at');
        if (!mounted) return;
        setPlayers(playerData ?? []);

        // Identify current player (logged-in or guest)
        const { data: { user } } = await supabase.auth.getUser();
        const guestId = typeof window !== 'undefined' ? localStorage.getItem('kpq_guest_id') : null;
        const me = (playerData ?? []).find(p =>
          (user && p.user_id === user.id) || (!user && guestId && p.guest_session_id === guestId)
        );
        if (!me) {
          // Not in room yet — redirect to join/guest
          throw new Error('You are not in this room');
        }
        setCurrentPlayer(me);

        // Realtime subscription
        roomChannel = supabase
          .channel(`battle_room:${roomData.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomData.id}` },
            (payload: any) => {
              if (payload.new) setRoom(payload.new);
            })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_players', filter: `room_id=eq.${roomData.id}` },
            async () => {
              const { data } = await supabase
                .from('battle_players')
                .select('*')
                .eq('room_id', roomData.id)
                .is('left_at', null)
                .order('joined_at');
              if (mounted) setPlayers(data ?? []);
            })
          .subscribe();

        setLoading(false);
      } catch (e: any) {
        if (mounted) {
          setError(e.message);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (roomChannel) supabase.removeChannel(roomChannel);
    };
  }, [code, supabase]);

  return { room, players, currentPlayer, loading, error };
}
```

## 3.3 — Build the room top bar component

**File:** `src/components/battle/RoomTopBar.tsx`
**Action:** Create

Copy the `RoomTopBar` function from `rooms-desktop-flow.jsx`. Adaptations:

1. Accept `room` and `subtitle` as props.
2. The "kpopquiz · /r/XXXX" branding stays as-is.
3. The room title shows the host's display name from props.
4. The "Leave" button → `router.push('/battle')`.

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { PALETTE as C } from '@/types/battle';
import type { BattleRoom, BattlePlayer } from '@/types/battle';

export function RoomTopBar({ room, hostName, subtitle }: {
  room: BattleRoom;
  hostName: string;
  subtitle: string;
}) {
  const router = useRouter();

  return (
    <header style={{
      display: "flex", alignItems: "center", padding: "0 20px",
      background: "#fff", height: 56,
      borderBottom: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      {/* PASTE the rest of RoomTopBar JSX here, swapping:
          - "Mina's room" → `${hostName}'s room`
          - "Lobby · Waiting for players" → subtitle prop
          - Leave button onClick={() => router.push('/battle')}
          - Room code display → room.code
      */}
    </header>
  );
}
```

## 3.4 — Build the player roster column

**File:** `src/components/battle/PlayerRoster.tsx`
**Action:** Create

Copy `PlayerCard` (compact version) from `rooms-desktop-flow.jsx`. Adaptations:

1. Accept `players: BattlePlayer[]` and `canKick: boolean` (true if current user is host).
2. Map over players, render PlayerCard for each.
3. Kick button calls `/api/battle/rooms/[id]/kick/[playerId]` (POST).
4. Show "+ N more can join" hint if players < 8.
5. Show "🔒 Set by host" indicator at top.

```tsx
'use client';
import { PALETTE as C } from '@/types/battle';
import type { BattlePlayer } from '@/types/battle';

export function PlayerRoster({ players, canKick, currentPlayerId, roomId }: {
  players: BattlePlayer[];
  canKick: boolean;
  currentPlayerId: string;
  roomId: string;
}) {
  const handleKick = async (playerId: string) => {
    if (!confirm('Kick this player?')) return;
    await fetch(`/api/battle/rooms/${roomId}/kick/${playerId}`, { method: 'POST' });
  };

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      display: "flex", flexDirection: "column", gap: 5,
      padding: "16px 12px", overflowY: "auto",
      background: C.bg, borderLeft: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1 }}>Players</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.textMuted }}>{players.length}/8</span>
      </div>

      {players.map(p => (
        <PlayerCard
          key={p.id}
          player={p}
          isYou={p.id === currentPlayerId}
          canKick={canKick && !p.is_host && p.id !== currentPlayerId}
          onKick={() => handleKick(p.id)}
        />
      ))}

      {players.length < 8 && (
        <div style={{
          marginTop: 4, padding: "10px", borderRadius: 10,
          background: C.pinkLight, border: `1px dashed ${C.pinkBorder}`,
          textAlign: "center",
        }}>
          <p style={{ fontSize: 10, color: C.pink, fontWeight: 600, margin: 0 }}>
            🎟 Up to {8 - players.length} more can join
          </p>
        </div>
      )}
    </aside>
  );
}

function PlayerCard({ player, isYou, canKick, onKick }: any) {
  // PASTE the PlayerCard component from rooms-desktop-flow.jsx
  // Adaptations:
  //  - Replace dummy props: name → player.display_name, initial → player.avatar_initial,
  //    color → player.avatar_color, isHost → player.is_host
  //  - Wire onClick={onKick} on the Kick button
}
```

## 3.5 — Build the closeable chat panel

**File:** `src/components/battle/ChatPanelClosable.tsx`
**Action:** Create

Copy `ChatPanelClosable` + tab content components from `rooms-jklm-v2.jsx` (the v2 with 5 tabs and close button). Adaptations:

1. Accept `room`, `players`, `currentPlayer` as props.
2. ChatTabContent: subscribe to `battle_chat_messages` realtime, post via `battle_send_chat` RPC.
3. PlayersTabContent: use real `players` prop.
4. RulesTabContent: static (matches prototype).
5. HomeTabContent: real room code, host name, settings from `room` prop.
6. SettingsTabContent: localStorage-backed toggles.

```tsx
'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { PALETTE as C } from '@/types/battle';
import type { BattleRoom, BattlePlayer, BattleChatMessage } from '@/types/battle';

export function ChatPanelClosable({ room, players, currentPlayer, open, onToggle }: {
  room: BattleRoom;
  players: BattlePlayer[];
  currentPlayer: BattlePlayer;
  open: boolean;
  onToggle: () => void;
}) {
  const [tab, setTab] = useState<'chat' | 'players' | 'rules' | 'home' | 'settings'>('chat');

  if (!open) {
    return <ClosedChatSidebar onOpen={onToggle} />;
  }

  return (
    <aside style={{
      display: "flex", flexDirection: "column",
      width: 280, flexShrink: 0,
      background: "#F5EFF1", borderLeft: `1px solid #EADBE0`,
    }}>
      {/* Tab bar with 5 icons + close button */}
      {/* PASTE tab bar JSX from rooms-jklm-v2.jsx ChatPanelClosable open state */}

      {tab === 'chat' && <ChatTabContent room={room} currentPlayer={currentPlayer} />}
      {tab === 'players' && <PlayersTabContent players={players} />}
      {tab === 'rules' && <RulesTabContent />}
      {tab === 'home' && <HomeTabContent room={room} hostName={hostName(players)} />}
      {tab === 'settings' && <SettingsTabContent />}
    </aside>
  );
}

function ClosedChatSidebar({ onOpen }: { onOpen: () => void }) {
  // PASTE the closed-state JSX from rooms-jklm-v2.jsx
}

function ChatTabContent({ room, currentPlayer }: any) {
  const supabase = createBrowserClient();
  const [messages, setMessages] = useState<(BattleChatMessage & { player_name?: string; player_color?: string })[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('battle_chat_messages')
        .select('*, battle_players!inner(display_name, avatar_color, is_host)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(50);
      setMessages((data ?? []).map((m: any) => ({
        ...m,
        player_name: m.battle_players.display_name,
        player_color: m.battle_players.avatar_color,
      })));
    })();

    const ch = supabase
      .channel(`battle_chat:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'battle_chat_messages', filter: `room_id=eq.${room.id}` },
        async (payload: any) => {
          const { data: pd } = await supabase
            .from('battle_players')
            .select('display_name, avatar_color, is_host')
            .eq('id', payload.new.player_id)
            .single();
          setMessages(prev => [...prev, {
            ...payload.new,
            player_name: pd?.display_name,
            player_color: pd?.avatar_color,
          }]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room.id, supabase]);

  const send = async () => {
    if (!input.trim()) return;
    await supabase.rpc('battle_send_chat', { p_player_id: currentPlayer.id, p_message: input });
    setInput('');
  };

  return (
    /* PASTE ChatTabContent JSX from rooms-jklm-v2.jsx */
    /* Replace mock messages with `messages` array */
    /* Bind input value/onChange/onKeyDown(Enter→send) */
    /* Bind Send button onClick={send} */
  );
}

function PlayersTabContent({ players }: { players: BattlePlayer[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  // PASTE PlayersTabContent JSX from rooms-jklm-v2.jsx, mapping over `sorted`
}

function RulesTabContent() {
  // PASTE RulesTabContent JSX exactly — it's static
  // The "Report current question" button: TODO in Phase 4 (only relevant during gameplay)
}

function HomeTabContent({ room, hostName }: any) {
  // PASTE HomeTabContent JSX, replacing:
  // - "7392" → room.code
  // - Settings → from `room` (room.difficulty, etc.)
  // - "Mina 👑" → hostName
}

function SettingsTabContent() {
  // PASTE SettingsTabContent JSX as-is, with localStorage-backed toggles:
  //   localStorage.getItem('kpq_battle_hide_chat'), etc.
}

function hostName(players: BattlePlayer[]) {
  return players.find(p => p.is_host)?.display_name ?? 'Host';
}
```

## 3.6 — Build the LobbyView component

**File:** `src/components/battle/LobbyView.tsx`
**Action:** Create

This component is the LOBBY state of the room page. Copy `ScreenHostLobby` and `ScreenPlayerLobby` from `rooms-desktop-flow.jsx`, fork based on `currentPlayer.is_host`.

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { RoomTopBar } from './RoomTopBar';
import { PlayerRoster } from './PlayerRoster';
import { ChatPanelClosable } from './ChatPanelClosable';
import { PALETTE as C, GROUPS } from '@/types/battle';
import type { BattleRoom, BattlePlayer } from '@/types/battle';

export function LobbyView({ room, players, currentPlayer }: {
  room: BattleRoom;
  players: BattlePlayer[];
  currentPlayer: BattlePlayer;
}) {
  const [chatOpen, setChatOpen] = useState(true);

  if (currentPlayer.is_host) {
    return <HostLobby room={room} players={players} currentPlayer={currentPlayer} chatOpen={chatOpen} setChatOpen={setChatOpen} />;
  }
  return <PlayerLobby room={room} players={players} currentPlayer={currentPlayer} chatOpen={chatOpen} setChatOpen={setChatOpen} />;
}

function HostLobby({ room, players, currentPlayer, chatOpen, setChatOpen }: any) {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  // Settings state — initialize from room, write back via update
  const [difficulty, setDifficulty] = useState(room.difficulty);
  const [groupMode, setGroupMode] = useState(room.group_filter_mode);
  const [groups, setGroups] = useState<string[]>(room.group_filter_values ?? []);
  const [time, setTime] = useState(room.time_per_round);
  const [korean, setKorean] = useState(room.korean_mode);
  const [privacy, setPrivacy] = useState(room.privacy);

  const persist = async (patch: any) => {
    await supabase.from('battle_rooms').update(patch).eq('id', room.id);
  };

  const handleStart = async () => {
    if (players.length < 2) { alert('Need at least 2 players'); return; }
    setStarting(true);
    const { error } = await supabase.rpc('battle_start_round', { p_room_id: room.id });
    setStarting(false);
    if (error) alert(error.message);
    // Realtime will auto-update room.status to 'active' → page re-renders to GameplayView
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      <RoomTopBar room={room} hostName={currentPlayer.display_name} subtitle="Lobby · Waiting for players" />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <main style={{ flex: 1, minWidth: 0, padding: "20px 24px", overflowY: "auto" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* PASTE the host lobby center column from ScreenHostLobby:
                - Big room code card (use room.code)
                - Settings panel (wire pills onClick to setX + persist)
                - "First to 100..." footer
                - Big "Start game →" button onClick={handleStart}
            */}
          </div>
        </main>

        <PlayerRoster players={players} canKick={true} currentPlayerId={currentPlayer.id} roomId={room.id} />
        <ChatPanelClosable room={room} players={players} currentPlayer={currentPlayer} open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
      </div>
    </div>
  );
}

function PlayerLobby({ room, players, currentPlayer, chatOpen, setChatOpen }: any) {
  // PASTE the player lobby column from ScreenPlayerLobby
  // Read-only settings from `room`
  // Show "Waiting for host to start..." with bouncing dots
}
```

## 3.7 — API: Kick player

**File:** `src/app/api/battle/rooms/[id]/kick/[playerId]/route.ts`
**Action:** Create

```ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id, playerId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Verify caller is the host of this room
  const { data: room } = await supabase
    .from('battle_rooms')
    .select('host_user_id')
    .eq('id', id)
    .single();
  if (room?.host_user_id !== user.id) {
    return NextResponse.json({ error: 'not host' }, { status: 403 });
  }

  // Soft-delete by setting left_at
  await supabase
    .from('battle_players')
    .update({ left_at: new Date().toISOString(), is_connected: false })
    .eq('id', playerId)
    .eq('room_id', id);

  return NextResponse.json({ ok: true });
}
```

## 3.8 — Phase 3 stop point

🛑 Test the lobby:

1. Host creates a room, lands at `/battle/r/XXXX`. Sees host lobby (3-column, settings editable).
2. Open another browser/incognito as guest, join via code → see player lobby (read-only settings).
3. Host changes a setting (e.g. difficulty) → guest sees it update in real-time.
4. Host kicks guest → guest's page redirects to `/battle` (handle this in `useBattleRoom` when current player's `left_at` becomes set).
5. Host clicks "Start game" with 2+ players → `room.status` changes to `'active'`, page re-renders. (Will be 404'd by `GameplayView` until Phase 4.)

Don't move to Phase 4 until: lobby works for host + player, settings sync via realtime, chat works, kick works.

---

# PHASE 4 — Active gameplay (countdown → question → scoring → leaderboard)

Goal: full game loop. Server picks question, broadcasts countdown, players type answers, scores update live, round ends, next round, until someone hits 100.

## 4.1 — Build the GameplayView component

**File:** `src/components/battle/GameplayView.tsx`
**Action:** Create

```tsx
'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useBattleRound } from '@/hooks/useBattleRound';
import { CountdownScreen } from './gameplay/CountdownScreen';
import { ActiveQuestion } from './gameplay/ActiveQuestion';
import { RevealScreen } from './gameplay/RevealScreen';
import { LeaderboardScreen } from './gameplay/LeaderboardScreen';
import { PlayerRoster } from './PlayerRoster';
import { ChatPanelClosable } from './ChatPanelClosable';
import { GameTopBar } from './gameplay/GameTopBar';
import { PALETTE as C } from '@/types/battle';
import type { BattleRoom, BattlePlayer } from '@/types/battle';

export function GameplayView({ room, players, currentPlayer }: {
  room: BattleRoom;
  players: BattlePlayer[];
  currentPlayer: BattlePlayer;
}) {
  const [chatOpen, setChatOpen] = useState(true);
  const { round, question, myAnswer, otherAnswers, timeRemaining } = useBattleRound(room, currentPlayer);

  // Decide which screen to show
  let content;
  if (!round || round.status === 'pending') {
    content = <LoadingState />;
  } else if (round.status === 'countdown') {
    content = <CountdownScreen room={room} round={round} />;
  } else if (round.status === 'active') {
    content = (
      <ActiveQuestion
        room={room}
        round={round}
        question={question}
        currentPlayer={currentPlayer}
        myAnswer={myAnswer}
        otherAnswers={otherAnswers}
        timeRemaining={timeRemaining}
      />
    );
  } else if (round.status === 'reveal' || round.status === 'ended') {
    content = (
      <RevealScreen
        round={round}
        question={question}
        players={players}
        currentPlayer={currentPlayer}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      <GameTopBar room={room} round={round} currentPlayer={currentPlayer} />
      <div style={{ display: "flex", flex: 1, minHeight: 0, background: C.gameBg }}>
        <main style={{ flex: 1, minWidth: 0, padding: "20px 24px", overflowY: "auto" }}>
          {content}
        </main>
        <PlayerRoster players={players} canKick={currentPlayer.is_host} currentPlayerId={currentPlayer.id} roomId={room.id} />
        <ChatPanelClosable room={room} players={players} currentPlayer={currentPlayer} open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
      </div>
    </div>
  );
}

function LoadingState() {
  return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>Loading round...</div>;
}
```

## 4.2 — Build the `useBattleRound` hook

**File:** `src/hooks/useBattleRound.ts`
**Action:** Create

This hook manages: current round, the question content, my answer attempts, other players' answer states, and the live countdown timer.

```ts
import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { BattleRoom, BattlePlayer, BattleRound, BattleQuestion, BattleRoundAnswer } from '@/types/battle';

export function useBattleRound(room: BattleRoom, currentPlayer: BattlePlayer) {
  const supabase = createBrowserClient();
  const [round, setRound] = useState<BattleRound | null>(null);
  const [question, setQuestion] = useState<BattleQuestion | null>(null);
  const [myAnswer, setMyAnswer] = useState<BattleRoundAnswer | null>(null);
  const [otherAnswers, setOtherAnswers] = useState<BattleRoundAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const tickRef = useRef<any>(null);

  // Load and subscribe to current round
  useEffect(() => {
    if (!room.current_round_id) { setRound(null); return; }
    let mounted = true;
    let ch: any;

    (async () => {
      const { data: r } = await supabase
        .from('battle_rounds')
        .select('*')
        .eq('id', room.current_round_id!)
        .single();
      if (mounted) setRound(r);

      if (r) {
        const { data: q } = await supabase
          .from('battle_questions')
          .select('*')
          .eq('id', r.question_id)
          .single();
        if (mounted) setQuestion(q);

        const { data: ans } = await supabase
          .from('battle_round_answers')
          .select('*')
          .eq('round_id', r.id);
        if (mounted) {
          const mine = ans?.find(a => a.player_id === currentPlayer.id) ?? null;
          setMyAnswer(mine);
          setOtherAnswers((ans ?? []).filter(a => a.player_id !== currentPlayer.id));
        }
      }

      // Subscribe to round + answer changes
      ch = supabase
        .channel(`battle_round:${room.current_round_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rounds', filter: `id=eq.${room.current_round_id}` },
          (payload: any) => { if (payload.new && mounted) setRound(payload.new); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'battle_round_answers', filter: `round_id=eq.${room.current_round_id}` },
          (payload: any) => {
            if (!mounted) return;
            const a = payload.new;
            if (a.player_id === currentPlayer.id) setMyAnswer(a);
            else setOtherAnswers(prev => [...prev, a]);
          })
        .subscribe();
    })();

    return () => { mounted = false; if (ch) supabase.removeChannel(ch); };
  }, [room.current_round_id, currentPlayer.id, supabase]);

  // Countdown ticker
  useEffect(() => {
    if (!round?.round_ends_at) return;
    const tick = () => {
      const remaining = Math.max(0, (new Date(round.round_ends_at!).getTime() - Date.now()) / 1000);
      setTimeRemaining(remaining);

      // If time expired and round still active, host's client triggers end
      if (remaining === 0 && round.status === 'active' && currentPlayer.is_host) {
        supabase.rpc('battle_end_round', { p_round_id: round.id });
      }
    };
    tick();
    tickRef.current = setInterval(tick, 100);
    return () => clearInterval(tickRef.current);
  }, [round, currentPlayer.is_host, supabase]);

  return { round, question, myAnswer, otherAnswers, timeRemaining };
}
```

## 4.3 — Build the GameTopBar

**File:** `src/components/battle/gameplay/GameTopBar.tsx`
**Action:** Create

Copy `GameTopBar` from `rooms-prototype-2.jsx`. Adaptations:

1. Real round number from `round.round_number`.
2. Real player score from `currentPlayer.score`.
3. Game mode label: "Lyric Battle · Hard" → use `room.difficulty` (mode is gone — keep it simple: "Round X · Difficulty").
4. Hamburger menu opens host menu drawer (only shown if host).

```tsx
'use client';
import { useState } from 'react';
import { PALETTE as C } from '@/types/battle';
import type { BattleRoom, BattleRound, BattlePlayer } from '@/types/battle';

export function GameTopBar({ room, round, currentPlayer }: {
  room: BattleRoom;
  round: BattleRound | null;
  currentPlayer: BattlePlayer;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      display: "flex", alignItems: "center", padding: "0 20px",
      background: "#fff", height: 56, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      {/* PASTE GameTopBar JSX from rooms-prototype-2.jsx */}
      {/* Round info: `Round ${round?.round_number ?? 0} · First to 100` */}
      {/* Player score: currentPlayer.score */}
      {/* Hamburger only if currentPlayer.is_host — opens HostMenuOverlay */}
      {menuOpen && currentPlayer.is_host && (
        <HostMenuOverlay room={room} round={round} onClose={() => setMenuOpen(false)} />
      )}
    </header>
  );
}

function HostMenuOverlay({ room, round, onClose }: any) {
  // PASTE the host menu overlay from rooms-prototype-2.jsx ScreenHostMenu
  // Wire the buttons:
  //   Pause → supabase.from('battle_rounds').update({ status: 'pending' }).eq('id', round.id)
  //     (clear round_ends_at; resume sets it again)
  //   Skip → supabase.rpc('battle_end_round', { p_round_id: round.id }), then auto-start next
  //   End game → supabase.from('battle_rooms').update({ status: 'ended', ended_at: now() }).eq('id', room.id)
}
```

## 4.4 — CountdownScreen

**File:** `src/components/battle/gameplay/CountdownScreen.tsx`
**Action:** Create

Copy `ScreenCountdown` from `rooms-prototype-2.jsx`. Adaptations:

1. Compute `n` (3, 2, 1, GO!) from `round.countdown_ends_at - now`.
2. Auto-advances when countdown hits 0 — host's client triggers `battle_advance_to_active`.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { PALETTE as C } from '@/types/battle';
import type { BattleRoom, BattleRound } from '@/types/battle';

export function CountdownScreen({ room, round }: { room: BattleRoom; round: BattleRound }) {
  const supabase = createBrowserClient();
  const [n, setN] = useState(3);

  useEffect(() => {
    if (!round.countdown_ends_at) return;
    const tick = () => {
      const remaining = (new Date(round.countdown_ends_at!).getTime() - Date.now()) / 1000;
      const display = Math.ceil(remaining);
      if (display <= 0) {
        setN(0);
        // Move to active state (any client can do this; idempotent on server)
        supabase.from('battle_rounds').update({ status: 'active' }).eq('id', round.id).eq('status', 'countdown');
      } else {
        setN(Math.min(3, display));
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [round, supabase]);

  // PASTE the JSX visual from ScreenCountdown in rooms-prototype-2.jsx
  // Use n as the displayed number (or "GO!" if n === 0)
}
```

Add a small DB function so any client can flip `countdown` → `active` idempotently:

```sql
-- Add to migration or run separately
create or replace function public.battle_advance_to_active(p_round_id uuid)
returns void
language sql
security definer
as $$
  update public.battle_rounds set status = 'active' where id = p_round_id and status = 'countdown';
$$;
```

## 4.5 — ActiveQuestion screen

**File:** `src/components/battle/gameplay/ActiveQuestion.tsx`
**Action:** Create

Copy the appropriate version from prototypes:
- Text-only question → use `ActiveQuestion` JSX from `rooms-jklm-v2.jsx`
- Image-only question → use `PhotoQuestion` JSX from `rooms-jklm-v2.jsx`
- Both text + image → render image above the text card

The component decides which layout to render based on `question.text_content` and `question.image_url`.

```tsx
'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ScoreBar } from './ScoreBar';
import { TimerBar } from './TimerBar';
import { PALETTE as C } from '@/types/battle';
import type { BattleRoom, BattleRound, BattleQuestion, BattlePlayer, BattleRoundAnswer } from '@/types/battle';

export function ActiveQuestion({
  room, round, question, currentPlayer, myAnswer, otherAnswers, timeRemaining,
}: {
  room: BattleRoom;
  round: BattleRound;
  question: BattleQuestion | null;
  currentPlayer: BattlePlayer;
  myAnswer: BattleRoundAnswer | null;
  otherAnswers: BattleRoundAnswer[];
  timeRemaining: number;
}) {
  const supabase = createBrowserClient();
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  if (!question) return null;

  const totalTime = room.time_per_round;
  const percent = (timeRemaining / totalTime) * 100;
  const alreadyAnsweredCorrectly = myAnswer?.is_correct;

  const submit = async () => {
    if (!answer.trim() || submitting || alreadyAnsweredCorrectly) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('battle_submit_answer', {
      p_player_id: currentPlayer.id,
      p_answer: answer,
    });
    setSubmitting(false);

    if (error) { setFeedback('wrong'); return; }
    const result = data?.[0];
    if (result?.is_correct) {
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      setAnswer('');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  // Live "got it" pills from otherAnswers
  const gotItPlayers = otherAnswers.filter(a => a.is_correct);

  // Image-only / text-only / hybrid layout decision:
  const hasText = !!question.text_content;
  const hasImage = !!question.image_url;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ScoreBar players={[]} /> {/* TODO: pass real players from parent */}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 0" }}>
        {/* Render based on content type. PASTE the visual blocks from:
            - ActiveQuestion (text) in rooms-jklm-v2.jsx if hasText && !hasImage
            - PhotoQuestion in rooms-jklm-v2.jsx if hasImage && !hasText
            - Hybrid: image on top, text card below
        */}

        {/* Question prompt */}
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", margin: "10px 0 8px", fontWeight: 600 }}>
          {question.prompt}
        </p>

        {/* Live "got it" pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {gotItPlayers.map(a => (
            <span key={a.id} style={{ /* PASTE pill style */ }}>
              ✓ Player got it · {a.time_taken_seconds}s
            </span>
          ))}
        </div>
      </div>

      {/* Timer */}
      <TimerBar percent={percent} timeRemaining={timeRemaining} />

      {/* Answer input — switches to feedback if just answered */}
      {alreadyAnsweredCorrectly ? (
        <CorrectFeedback points={myAnswer.points_awarded} answer={myAnswer.answer_text} />
      ) : (
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onSubmit={submit}
          disabled={submitting || timeRemaining <= 0}
          feedback={feedback}
        />
      )}
    </div>
  );
}

function AnswerInput({ value, onChange, onSubmit, disabled, feedback }: any) {
  // PASTE input + send button from rooms-prototype-2.jsx ScreenLyric (input area)
  // If feedback === 'wrong', add shake animation + red border (PASTE wrong styles)
}

function CorrectFeedback({ points, answer }: { points: number; answer: string }) {
  // PASTE the green checkmark + "+X pts" from rooms-prototype-2.jsx ScreenCorrect
}
```

## 4.6 — Build ScoreBar and TimerBar

**File:** `src/components/battle/gameplay/ScoreBar.tsx`

Copy `ScoreBar` from `rooms-prototype-2.jsx`. Accept `players: BattlePlayer[]` prop, sort by score, render up to 8.

**File:** `src/components/battle/gameplay/TimerBar.tsx`

Copy the timer bar block from `rooms-prototype-2.jsx`. Color shifts: green > 50%, amber 25-50%, red < 25%.

## 4.7 — RevealScreen

**File:** `src/components/battle/gameplay/RevealScreen.tsx`

Copy `ScreenReveal` from `rooms-prototype-2.jsx`. Show the answer big, list who got it / who missed, auto-advance countdown.

After ~5 seconds, host's client calls `battle_start_round` for the next round (or shows EndGameView if a player has 100 points).

```tsx
useEffect(() => {
  if (!currentPlayer.is_host) return;
  const t = setTimeout(async () => {
    // Check if any player has 100+
    const winner = players.find((p: any) => p.score >= 100);
    if (winner) {
      await supabase.from('battle_rooms').update({ status: 'ended', winner_player_id: winner.id, ended_at: new Date().toISOString() }).eq('id', round.room_id);
      return;
    }
    // Otherwise next round
    await supabase.rpc('battle_start_round', { p_room_id: round.room_id });
  }, 5000);
  return () => clearTimeout(t);
}, [round, currentPlayer.is_host, players]);
```

## 4.8 — Add server-side `battle_end_round` RPC

**File:** Add to migration or new migration

```sql
create or replace function public.battle_end_round(p_round_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.battle_rounds
    set status = 'reveal', ended_at = now()
    where id = p_round_id and status = 'active';
end;
$$;
```

## 4.9 — Question reporting

**File:** `src/components/battle/gameplay/ReportDialog.tsx`

Copy `ScreenReport` from `rooms-prototype-2.jsx`. Show as modal. On submit:

```tsx
await supabase.from('battle_question_reports').insert({
  question_id: question.id,
  reporter_player_id: currentPlayer.id,
  reporter_user_id: currentPlayer.user_id,
  reason, comment,
});
```

Wire the "Report current question" button in the Rules tab of the chat panel to open this modal.

## 4.10 — Mobile gameplay (optional but recommended)

For mobile screens (≤640px), use the mobile layout from `rooms-jklm-v2.jsx` `MobileLayout`. Detect screen size:

```tsx
const isMobile = useMediaQuery('(max-width: 640px)');
return isMobile ? <MobileGameplayView ... /> : <GameplayView ... />;
```

Copy the entire mobile structure (compact top bar, horizontal score strip, bottom tab bar with Game/Players/Rules/Chat, slide-up drawers).

## 4.11 — Phase 4 stop point

🛑 Test gameplay end-to-end:

1. Insert ~10 approved test questions into `battle_questions` (mix of text and image).
2. Host starts game → countdown 3-2-1-GO → question appears.
3. Type a correct answer → see green feedback + score updates.
4. Other player gets a wrong answer → wrong shake → can retry.
5. Timer expires → reveal screen → after 5s, next round starts.
6. Continue until someone hits 100 → end game screen.
7. Test pause / skip / kick from host menu.

Don't move to Phase 5 until: full game loop works, scoring is correct, realtime sync is smooth.

---

# PHASE 5 — Question creation flow

Goal: users can submit questions. Admin gets emails with magic-link approve/reject buttons.

## 5.1 — Build `/battle/questions` (My Questions hub)

**File:** `src/app/battle/questions/page.tsx`

Copy `ScreenHub` from `rooms-question-creation-v2.jsx`. Adaptations:

1. `'use client'`.
2. Fetch user's questions via `/api/battle/questions/mine`.
3. The "+ New question" button → `/battle/questions/new`.
4. The "Continue" / "Resubmit" / "View" buttons on each question → `/battle/questions/[id]`.

```tsx
'use client';
import useSWR from 'swr';
import Link from 'next/link';
// ... rest of imports

export default function MyQuestionsPage() {
  const { data: questions = [] } = useSWR('/api/battle/questions/mine', fetcher);
  // PASTE ScreenHub JSX, replacing MY_QUESTIONS with `questions`
}
```

**API:**

**File:** `src/app/api/battle/questions/mine/route.ts`

```ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data } = await supabase
    .from('battle_questions')
    .select('*')
    .eq('submitter_user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}
```

## 5.2 — Build `/battle/questions/new` (the form)

**File:** `src/app/battle/questions/new/page.tsx`

Copy `ScreenForm` from `rooms-question-creation-v2.jsx`. Adaptations:

1. `'use client'`.
2. State for all fields (`prompt`, `text`, `image`, `answer`, `variants`, `group`, `difficulty`).
3. Image upload: when user adds an image, upload to Supabase Storage `battle-question-images/{user_id}/{uuid}.{ext}`, store the public URL.
4. Submit handler:

```tsx
const handleSubmit = async () => {
  let imageUrl: string | null = null;
  if (imageFile) {
    const ext = imageFile.name.split('.').pop();
    const filename = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('battle-question-images')
      .upload(filename, imageFile);
    if (upErr) { alert('Image upload failed'); return; }
    imageUrl = supabase.storage.from('battle-question-images').getPublicUrl(filename).data.publicUrl;
  }

  const { data, error } = await supabase.from('battle_questions').insert({
    prompt,
    text_content: text || null,
    image_url: imageUrl,
    answer,
    variants,
    group_name: group,
    difficulty,
    status: 'pending',
    submitter_user_id: user.id,
  }).select().single();

  if (error) { alert(error.message); return; }

  // Trigger admin notification email (Phase 5.4)
  await fetch('/api/battle/questions/notify-admin', {
    method: 'POST',
    body: JSON.stringify({ questionId: data.id }),
  });

  router.push(`/battle/questions/${data.id}/submitted`);
};
```

5. Live preview: copy the dark gradient preview block exactly. The preview adapts based on `text` and `hasImage`:
   - If `text` only → centered quoted text
   - If image only → centered 180x180 image preview
   - If both → image above text card

6. Validation checklist: copy the 5-item checklist from prototype.

## 5.3 — Build `/battle/questions/[id]/submitted`

**File:** `src/app/battle/questions/[id]/submitted/page.tsx`

Copy `ScreenSubmitted` from `rooms-question-creation-v2.jsx`. Show animated checkmark + email envelope visualization + status timeline. CTA buttons → `/battle/questions/new` and `/battle/questions`.

## 5.4 — Email notification on submission

**File:** `src/app/api/battle/questions/notify-admin/route.ts`

Use the project's existing email service (Resend / SendGrid / etc.). If none, set up Resend (5k emails/month free):

```ts
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY!);
const ADMIN_EMAIL = process.env.BATTLE_ADMIN_EMAIL || 'admin@kpopquiz.org';

export async function POST(req: Request) {
  const { questionId } = await req.json();
  const supabase = await createServerClient();

  const { data: q } = await supabase
    .from('battle_questions')
    .select('*, submitter:auth.users!submitter_user_id(email, raw_user_meta_data)')
    .eq('id', questionId)
    .single();
  if (!q) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Generate magic-link tokens for approve/reject/edit
  const tokens = await Promise.all(['approve', 'reject', 'edit'].map(async action => {
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    await supabase.from('battle_moderation_tokens').insert({
      token,
      question_id: questionId,
      action,
    });
    return { action, token };
  }));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const links = Object.fromEntries(tokens.map(t => [t.action, `${baseUrl}/api/battle/moderation/${t.token}`]));

  const html = renderEmail({ question: q, links });

  await resend.emails.send({
    from: 'KpopQuiz Battle <noreply@kpopquiz.org>',
    to: ADMIN_EMAIL,
    subject: `New Battle question — "${q.answer}" (${q.group_name} · ${q.difficulty})`,
    html,
  });

  return NextResponse.json({ ok: true });
}

function renderEmail({ question, links }: any) {
  // Match the email visualization from ScreenAdmin in rooms-question-creation-v2.jsx
  // Plain HTML email — keep it simple, use inline styles.
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2c2c2a; font-size: 18px;">New Battle question — "${question.answer}"</h1>
      <p style="color: #888780; font-size: 13px;">
        From <strong>@${question.submitter?.raw_user_meta_data?.name || question.submitter?.email}</strong>
      </p>

      <div style="padding: 16px; background: linear-gradient(160deg, #1a0a1e, #2a1035); border-radius: 12px; text-align: center; color: #fff; margin: 14px 0;">
        ${question.image_url ? `<img src="${question.image_url}" style="max-width: 200px; border-radius: 8px; margin-bottom: 12px;" />` : ''}
        ${question.text_content ? `<p style="font-style: italic; font-size: 14px;">"${question.text_content}"</p>` : ''}
        <p style="color: rgba(255,255,255,0.5); font-size: 11px;">${question.prompt}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
        <tr><td style="padding: 4px 0; color: #888780; font-size: 12px;">Answer:</td><td style="font-weight: 700;">${question.answer}</td></tr>
        <tr><td style="padding: 4px 0; color: #888780; font-size: 12px;">Variants:</td><td><code>${(question.variants ?? []).join(', ') || '(none)'}</code></td></tr>
        <tr><td style="padding: 4px 0; color: #888780; font-size: 12px;">Group:</td><td>${question.group_name}</td></tr>
        <tr><td style="padding: 4px 0; color: #888780; font-size: 12px;">Difficulty:</td><td>${question.difficulty}</td></tr>
      </table>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <a href="${links.approve}" style="padding: 12px 18px; border-radius: 10px; background: #27ae60; color: #fff; text-decoration: none; font-weight: 700; text-align: center;">✓ Approve & publish</a>
        <a href="${links.edit}" style="padding: 11px 16px; border-radius: 10px; background: #fff; border: 1.5px solid #e8a060; color: #e8a060; text-decoration: none; font-weight: 600; text-align: center;">✎ Edit on the site</a>
        <a href="${links.reject}" style="padding: 11px 16px; border-radius: 10px; background: rgba(231,76,60,0.05); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; text-decoration: none; font-weight: 600; text-align: center;">✕ Reject (with reason)</a>
      </div>

      <p style="font-size: 10px; color: #b4b2a9; margin-top: 16px; text-align: center;">
        Magic links expire in 7 days. No login required.
      </p>
    </div>
  `;
}
```

## 5.5 — Magic link handler

**File:** `src/app/api/battle/moderation/[token]/route.ts`

When admin clicks ✓ Approve or ✕ Reject in the email, this endpoint handles it.

```ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createServerClient();

  // Token lookup needs service role to bypass RLS
  // For brevity using regular client — switch to service role in production
  const { data: t } = await supabase
    .from('battle_moderation_tokens')
    .select('*, battle_questions(*)')
    .eq('token', token)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (!t) {
    return new Response(renderResultPage('error', 'This link is invalid or expired.'), {
      headers: { 'content-type': 'text/html' },
    });
  }

  // Mark used
  await supabase.from('battle_moderation_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);

  if (t.action === 'approve') {
    await supabase.from('battle_questions').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('id', t.question_id);
    return new Response(renderResultPage('approved', `"${t.battle_questions.answer}" is now live in the question pool.`), {
      headers: { 'content-type': 'text/html' },
    });
  }

  if (t.action === 'reject') {
    // Redirect to a reject form for entering reason
    return NextResponse.redirect(new URL(`/battle/moderation/reject/${token}`, process.env.NEXT_PUBLIC_SITE_URL));
  }

  if (t.action === 'edit') {
    return NextResponse.redirect(new URL(`/battle/moderation/edit/${t.question_id}?token=${token}`, process.env.NEXT_PUBLIC_SITE_URL));
  }

  return new Response(renderResultPage('error', 'Unknown action.'), { headers: { 'content-type': 'text/html' } });
}

function renderResultPage(status: 'approved' | 'rejected' | 'error', message: string) {
  const color = status === 'approved' ? '#27ae60' : status === 'error' ? '#e74c3c' : '#e8a060';
  const icon = status === 'approved' ? '✓' : '⚠';
  return `
    <html>
      <head><title>Battle Moderation</title></head>
      <body style="font-family: -apple-system, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAF9F6;">
        <div style="text-align: center; padding: 40px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: ${color}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 38px;">${icon}</div>
          <h1 style="font-size: 22px; color: #2c2c2a; margin-top: 16px;">${status === 'approved' ? 'Approved' : status === 'error' ? 'Error' : 'Rejected'}</h1>
          <p style="color: #888780;">${message}</p>
        </div>
      </body>
    </html>
  `;
}
```

## 5.6 — Reject reason form

**File:** `src/app/battle/moderation/reject/[token]/page.tsx`

Simple page: shows the question, asks for rejection reason, on submit calls an API that sets `status='rejected', rejection_reason=X` and emails the submitter.

## 5.7 — Notify submitter on decision

After approve/reject, send an email to the submitter:

```ts
// In the approve branch of the magic link handler:
const submitterEmail = t.battle_questions.submitter?.email;
if (submitterEmail) {
  await resend.emails.send({
    from: 'KpopQuiz Battle <noreply@kpopquiz.org>',
    to: submitterEmail,
    subject: `Your question was approved! 🎉`,
    html: `
      <p>Your Battle question "${t.battle_questions.answer}" is now live.</p>
      <p>You earned <strong>+30 별</strong>. Track its performance at <a href="${baseUrl}/battle/questions">My Questions</a>.</p>
    `,
  });
  // Also award byeol via existing system
}
```

For rejection, include the reason in the email.

## 5.8 — Phase 5 stop point

🛑 Test the question flow:

1. As a regular user, visit `/battle/questions` → see your (empty) list.
2. Click "+ New question", fill the form (text + answer + group + difficulty), submit.
3. Check the admin email inbox → should arrive with all metadata + 3 magic link buttons.
4. Click ✓ Approve in the email → see the success page → question status flips to `approved`.
5. Submitter gets approval email with byeol reward.
6. Click ✕ Reject in another submission → reject form → submitter gets rejection email.

Don't move to Phase 6 until: emails arrive correctly, magic links work, status updates propagate.

---

# PHASE 6 — Polish + edge cases

## 6.1 — Game-end screen

When `room.status === 'ended'`, render `<EndGameView>` from `BattleRoomPage`. Build it based on the leaderboard prototype (`ScreenLeaderboard` from `rooms-prototype-2.jsx`). Show winner big, full final standings, "Play again" + "Back to hub" buttons.

"Play again" → creates a new room with same settings, redirects all players (Realtime broadcast).

## 6.2 — Auto-close idle rooms

Add a Supabase cron job (or pg_cron) that runs every 5 minutes:

```sql
create or replace function public.battle_close_idle_rooms()
returns int
language sql
as $$
  with closed as (
    update public.battle_rooms
    set status = 'closed'
    where status in ('lobby', 'ended')
      and last_activity_at < now() - interval '10 minutes'
    returning id
  )
  select count(*) from closed;
$$;

select cron.schedule('battle-close-idle', '*/5 * * * *', $$select battle_close_idle_rooms()$$);
```

## 6.3 — Disconnection handling

On every player heartbeat (every 10s), update `is_connected = true, last_seen_at = now()`. If a player's `last_seen_at > 30s ago`, mark `is_connected = false` (visible in roster as faded).

## 6.4 — Profile stats

Add to user profile page: "Battle stats" section showing `room_games_played`, `wins`, `win_rate`. Compute from:

```sql
-- room games played
select count(*) from battle_players where user_id = $userId;
-- wins
select count(*) from battle_rooms where winner_player_id in (select id from battle_players where user_id = $userId);
```

## 6.5 — Rate limits

Add rate limits on:
- Question submission: max 5/day per user (in API route, check `select count(*) from battle_questions where submitter_user_id = $uid and created_at > now() - interval '1 day'`)
- Chat messages: max 10/minute per player (similar check)
- Room creation: max 3 active rooms per host

## 6.6 — Final QA checklist

Before marking the feature done, verify each item:

- [ ] `/battle` works as direct URL, NOT linked from public navbar
- [ ] Admin sees Battle in admin sidebar
- [ ] Hub page matches `ScreenHub` prototype pixel-for-pixel
- [ ] Join page matches `ScreenJoin` prototype
- [ ] Guest setup matches `ScreenGuest` prototype
- [ ] Host lobby matches `ScreenHostLobby` prototype, settings update other players via Realtime
- [ ] Player lobby matches `ScreenPlayerLobby` prototype, read-only settings
- [ ] Chat panel: 5 tabs work, close button collapses to 44px sidebar
- [ ] Gameplay: countdown 3-2-1-GO works
- [ ] Question display: text, image, and hybrid all render correctly
- [ ] Free-text input: fuzzy matching tolerates typos
- [ ] Scoring: faster answers get more points (max 10 per round)
- [ ] First to 100 ends the game
- [ ] Live "X got it ✓" pills appear in real-time for other players
- [ ] Round end → reveal screen → 5s auto-advance → next round
- [ ] Host menu: pause / skip / end early / kick all work
- [ ] Question reporting from chat panel works
- [ ] My Questions hub shows user's submissions with correct status
- [ ] Question form: text-only, image-only, hybrid all work
- [ ] Image upload to Supabase Storage works
- [ ] Live preview adapts based on what's filled
- [ ] Admin email arrives on submission
- [ ] Magic link approve works (one click → live)
- [ ] Magic link reject → reject form → submitter notified
- [ ] Submitter gets +30 별 on approval
- [ ] Mobile gameplay works (compact top bar, bottom tabs, drawers)
- [ ] Idle rooms auto-close after 10 min
- [ ] Realtime works in production (test with two devices)

---

# Done

You should now have:

- A complete `/battle` feature, hidden from public navbar but reachable via admin
- Full game loop with realtime sync
- Community question pool with email-based admin moderation
- All UI matching prototypes pixel-for-pixel

If anything visual deviates from a prototype, that's a bug — fix the implementation, NOT the prototype.

When ready to launch publicly, simply uncomment the navbar link in `src/components/Navbar.tsx` and remove the BETA badge.
