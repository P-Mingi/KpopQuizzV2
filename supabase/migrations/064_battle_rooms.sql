-- ============================================================
-- BATTLE ROOMS - Schema, RLS, Functions, RPCs, Realtime
-- ============================================================

-- Extensions required for fuzzy answer matching
create extension if not exists fuzzystrmatch;
create extension if not exists pg_trgm;

-- ============================================================
-- TABLES
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
  guest_session_id text,
  display_name text not null check (length(display_name) between 2 and 20),
  avatar_color text not null default '#D4537E',
  avatar_initial text not null,
  score int not null default 0,
  is_host boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  correct_count int not null default 0,
  fastest_answer_seconds numeric(5,2),
  -- one of user_id OR guest_session_id must be set
  constraint battle_players_identity check (
    (user_id is not null and guest_session_id is null) or
    (user_id is null and guest_session_id is not null)
  ),
  unique(room_id, user_id),
  unique(room_id, guest_session_id)
);

create index battle_players_room_idx on public.battle_players(room_id);
create index battle_players_user_idx on public.battle_players(user_id);
create index battle_players_guest_idx on public.battle_players(guest_session_id);

-- Questions: the content pool (admin-curated + community-submitted)
create table public.battle_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  text_content text,
  image_url text,
  answer text not null,
  variants text[] default '{}',
  group_name text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Insane')),
  tags text[] default '{}',
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected')),
  submitter_user_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  moderator_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  plays int not null default 0,
  correct_count int not null default 0,
  upvotes int not null default 0,
  reports int not null default 0,
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
  round_ends_at timestamptz,
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.battle_rooms enable row level security;
alter table public.battle_players enable row level security;
alter table public.battle_questions enable row level security;
alter table public.battle_rounds enable row level security;
alter table public.battle_round_answers enable row level security;
alter table public.battle_chat_messages enable row level security;
alter table public.battle_moderation_tokens enable row level security;
alter table public.battle_question_reports enable row level security;

-- Rooms: anyone can read non-closed rooms
create policy battle_rooms_select on public.battle_rooms
  for select using (status != 'closed');

create policy battle_rooms_insert on public.battle_rooms
  for insert with check (auth.uid() = host_user_id);

create policy battle_rooms_update_host on public.battle_rooms
  for update using (auth.uid() = host_user_id);

-- Players: anyone in the room can see all players
create policy battle_players_select on public.battle_players
  for select using (
    room_id in (
      select room_id from public.battle_players p2
      where (p2.user_id = auth.uid())
         or (p2.guest_session_id is not null)
    )
  );

-- Inserts and updates are done via RPC only
create policy battle_players_no_direct_write on public.battle_players
  for insert with check (false);

-- Questions: approved are public; submitter can see own
create policy battle_questions_select_approved on public.battle_questions
  for select using (status = 'approved');

create policy battle_questions_select_own on public.battle_questions
  for select using (auth.uid() = submitter_user_id);

create policy battle_questions_insert_own on public.battle_questions
  for insert with check (auth.uid() = submitter_user_id and status in ('draft', 'pending'));

create policy battle_questions_update_own on public.battle_questions
  for update using (auth.uid() = submitter_user_id and status in ('draft', 'rejected'));

-- Rounds: visible to anyone in non-closed rooms
create policy battle_rounds_select on public.battle_rounds
  for select using (
    room_id in (
      select id from public.battle_rooms
      where status != 'closed'
    )
  );

-- Round answers: visible to anyone in the room
create policy battle_round_answers_select on public.battle_round_answers
  for select using (
    round_id in (select id from public.battle_rounds)
  );

-- Chat messages: visible to anyone in non-closed rooms
create policy battle_chat_select on public.battle_chat_messages
  for select using (
    room_id in (select id from public.battle_rooms where status != 'closed')
  );

-- Reports: write-only via RPC
create policy battle_reports_insert on public.battle_question_reports
  for insert with check (true);

-- Tokens: only readable by service role (RLS blocks all reads)
create policy battle_tokens_service_only on public.battle_moderation_tokens
  for select using (false);

-- ============================================================
-- FUZZY ANSWER MATCHING
-- ============================================================

-- Normalize: lowercase, strip whitespace and punctuation, keep hangul
create or replace function public.battle_normalize_answer(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(trim(coalesce(input, ''))),
    '[^a-z0-9\uAC00-\uD7A3]', '', 'g'
  );
$$;

-- Check if two answers match with fuzzy tolerance
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
  max_distance := case when length(t) <= 10 then 2 else 3 end;
  return levenshtein(s, t) <= max_distance;
end;
$$;

-- Validate an answer against a question (canonical + all variants)
create or replace function public.battle_validate_answer(
  p_question_id uuid,
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
  from public.battle_questions where id = p_question_id;

  if q_answer is null then return false; end if;

  if public.battle_answers_match(submitted, q_answer) then return true; end if;

  if q_variants is not null then
    foreach variant in array q_variants loop
      if public.battle_answers_match(submitted, variant) then return true; end if;
    end loop;
  end if;

  return false;
end;
$$;

-- ============================================================
-- RPCs
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
  select id, status into v_room_id, v_room_status
  from public.battle_rooms where code = p_code;

  if v_room_id is null then
    raise exception 'Room not found';
  end if;

  if v_room_status = 'closed' then
    raise exception 'Room is closed';
  end if;

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
    where battle_players.room_id = v_room_id and battle_players.user_id = v_user_id and left_at is null;
  else
    select id into v_player_id from public.battle_players
    where battle_players.room_id = v_room_id and battle_players.guest_session_id = p_guest_session_id and left_at is null;
  end if;

  if v_player_id is not null then
    return query select v_player_id, v_room_id;
    return;
  end if;

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
  select difficulty, group_filter_mode, group_filter_values, korean_mode
  into v_difficulty, v_group_filter_mode, v_group_filter_values, v_korean_mode
  from public.battle_rooms where id = p_room_id;

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
  select host_user_id, time_per_round into v_host_id, v_time_per_round
  from public.battle_rooms where id = p_room_id;

  if v_host_id != v_user_id then
    raise exception 'Only the host can start a round';
  end if;

  v_question_id := public.battle_pick_question(p_room_id);
  if v_question_id is null then
    raise exception 'No more questions available';
  end if;

  select coalesce(max(round_number), 0) + 1 into v_round_number
  from public.battle_rounds where room_id = p_room_id;

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

  if exists(
    select 1 from public.battle_round_answers
    where round_id = v_round_id and player_id = p_player_id and is_correct = true
  ) then
    raise exception 'Already answered correctly';
  end if;

  v_time_taken := extract(epoch from (v_now - v_started_at));
  v_time_remaining := extract(epoch from (v_round_ends_at - v_now));
  v_total_time := extract(epoch from (v_round_ends_at - v_started_at));

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_num
  from public.battle_round_answers
  where round_id = v_round_id and player_id = p_player_id;

  v_is_correct := public.battle_validate_answer(v_question_id, p_answer);

  if v_is_correct then
    v_points := greatest(1, round((v_time_remaining / v_total_time) * 10));

    update public.battle_players
      set score = score + v_points,
          correct_count = correct_count + 1,
          fastest_answer_seconds = least(coalesce(fastest_answer_seconds, 999), v_time_taken)
      where id = p_player_id;
  end if;

  insert into public.battle_round_answers (
    round_id, player_id, answer_text, is_correct, points_awarded,
    time_taken_seconds, attempt_number
  ) values (
    v_round_id, p_player_id, p_answer, v_is_correct, v_points,
    v_time_taken, v_attempt_num
  );

  update public.battle_questions
    set plays = plays + (case when v_attempt_num = 1 then 1 else 0 end),
        correct_count = correct_count + (case when v_is_correct then 1 else 0 end)
    where id = v_question_id;

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

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.battle_rooms;
alter publication supabase_realtime add table public.battle_players;
alter publication supabase_realtime add table public.battle_rounds;
alter publication supabase_realtime add table public.battle_round_answers;
alter publication supabase_realtime add table public.battle_chat_messages;

-- ============================================================
-- STORAGE POLICIES (bucket must be created via Dashboard)
-- ============================================================

-- Create the storage bucket
insert into storage.buckets (id, name, public)
values ('battle-question-images', 'battle-question-images', true)
on conflict (id) do nothing;

-- Anyone can read approved question images
create policy "battle_qimages_public_read"
  on storage.objects for select
  using (bucket_id = 'battle-question-images');

-- Authenticated users can upload
create policy "battle_qimages_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'battle-question-images' and auth.uid() is not null);
