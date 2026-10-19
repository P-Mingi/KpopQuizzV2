-- Lot (c) part 1, lane B3, check 3: equivalence of 008-write-locks on the kpop paths.
--
-- A deterministic batch of at least 50 calls of each kpop write path that 008 redefines (plays, likes and unlikes, quiz
-- creates, follows, duel votes, battles, blind test plays, anon merges, badges), all on kpop data, all inside
-- BEGIN ... ROLLBACK, ending with ONE md5 over the touched profiles columns (xp, counters, streaks), the badges, the
-- notifications and the counters the paths write elsewhere. Run it before 008 and after 008 (equivalence.sh): the two
-- hashes must be equal. Nothing here depends on a random value, a sequence or a timestamp: ids are md5-derived, every
-- hashed line is ordered, and ids and timestamps are left out of the hash.
--
-- Lines starting with "EQ " are the output the runner keeps.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset footer off
set client_min_messages = warning;

begin;

create temp table eq_calls (path text primary key, n integer not null default 0);
create temp table eq_out (path text, k integer, v text);
create temp table eq_users as
  select i as idx, md5('eq-b3-user-' || i)::uuid as id, 'eq_u' || lpad(i::text, 2, '0') as username from generate_series(1, 20) i;

-- 20 users (profiles through auth.users, so the blind test player rows and the memberships exist as they do today)
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select id, 'authenticated', 'authenticated', username || '@eq-b3.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now() from eq_users;
insert into public.profiles (id, username, avatar_bg, avatar_text)
select id, username, '#222222', 'E' from eq_users;

-- the six badges award_xp can give, 12 groups
insert into public.badge_definitions (id, name, description, icon_type, color_bg, color_stroke, color_text)
select b, 'Eq ' || b, 'Eq badge ' || b, 'star', '#000000', '#111111', '#ffffff'
from unnest(array['first_steps', 'dedicated_fan', 'multi_stan', 'quiz_maker', 'prolific_creator', 'community_star', 'eq_extra']) b;
insert into public.groups (name, slug, display_color, text_color)
select 'Eq Group ' || i, 'eq-group-' || lpad(i::text, 2, '0'), '#123456', '#ffffff' from generate_series(1, 12) i;
create temp table eq_groups as
  select row_number() over (order by slug)::integer as gi, id, slug from public.groups where slug like 'eq-group-%';

-- group alerts: users 11 to 16 follow groups 1 to 6 (armed again between quiz batches below)
insert into public.group_quiz_alerts (user_id, group_id)
select u.id, g.id from eq_users u join eq_groups g on g.gi = u.idx - 10 where u.idx between 11 and 16;

-- ------------------------------------------------------------------------------------------------------------------
-- QUIZ CREATES: 60 inserts (handle_new_quiz, notify_group_quiz_alerts on insert), 20 of them draft then published by
-- an update (notify_group_quiz_alerts on publish). Creators are users 1 to 10; user 1 creates 12 (quiz_maker, prolific_creator).
-- ------------------------------------------------------------------------------------------------------------------
do $$
declare
  i integer;
  v_creator uuid;
  v_group integer;
begin
  for i in 1 .. 60 loop
    select id into v_creator from eq_users where eq_users.idx = case when i <= 12 then 1 else 2 + (i % 9) end;
    select id into v_group from eq_groups where eq_groups.gi = 1 + (i % 12);
    insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status)
    values (md5('eq-b3-quiz-' || i)::uuid, v_creator, v_group, 'Eq quiz number ' || i, 'eq-quiz-' || i,
            '[1, 2, 3]'::jsonb, case when i % 3 = 0 then 'draft' else 'published' end);
    if i % 10 = 0 then
      update public.group_quiz_alerts set notified_at = null;
    end if;
  end loop;
  insert into eq_calls values ('quiz_create', 60);
end $$;
do $$
declare
  i integer;
begin
  for i in 1 .. 60 loop
    if i % 3 = 0 then
      update public.quizzes set status = 'published' where id = md5('eq-b3-quiz-' || i)::uuid;
    end if;
  end loop;
  insert into eq_calls values ('quiz_publish', 20);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- PLAYS: 130 record_play calls (users 5 to 20 and anonymous, repeats of the same quiz, perfect scores, a player who
-- passes 100 plays and a group mastery). Then award_xp 'play' for 60 plays, 'create' for 24, 'like_received' and the
-- other reasons for 20 (badges: first_steps, dedicated_fan, multi_stan, quiz_maker, prolific_creator, community_star).
-- ------------------------------------------------------------------------------------------------------------------
do $$
declare
  i integer;
  v_player uuid;
  v_quiz uuid;
  v_score integer;
  r record;
begin
  for i in 1 .. 130 loop
    v_player := case when i % 11 = 0 then null
                     when i <= 115 then (select id from eq_users where eq_users.idx = 5)
                     else (select id from eq_users where eq_users.idx = 5 + (i % 16)) end;
    v_quiz := md5('eq-b3-quiz-' || (1 + (i * 7) % 60))::uuid;
    v_score := (i * 7) % 11;
    select * into r from public.record_play(v_quiz, v_player, v_score, 10, 20 + (i % 40));
    insert into eq_out values ('record_play', i, r.percentile::text);
  end loop;
  insert into eq_calls values ('record_play', 130);
end $$;

do $$
declare
  i integer;
  v_user uuid;
  v_reason text;
  v_xp integer;
begin
  for i in 1 .. 110 loop
    v_user := (select id from eq_users where eq_users.idx = 1 + (i % 10));
    v_reason := (array['play', 'create', 'like_received', 'like_given', 'daily', 'play_received'])[1 + (i % 6)];
    if i <= 8 then v_user := (select id from eq_users where eq_users.idx = 5); v_reason := 'play'; end if;
    select public.award_xp(v_user, 3 + (i % 5), v_reason) into v_xp;
    insert into eq_out values ('award_xp', i, coalesce(v_xp::text, 'null'));
  end loop;
  insert into eq_calls values ('award_xp', 110);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- LIKES AND UNLIKES: 120 increment_like_count (110 on the quizzes of user 1, past the community_star threshold),
-- 60 decrement_like_count (the first 5 on a quiz still at 0), then award_like_xp for 60 distinct (liker, quiz) pairs.
-- ------------------------------------------------------------------------------------------------------------------
do $$
declare
  i integer;
  v_quiz uuid;
  v_liker uuid;
  v_res jsonb;
begin
  for i in 1 .. 120 loop
    v_quiz := md5('eq-b3-quiz-' || (case when i <= 110 then 1 + (i % 12) else 13 + (i % 40) end))::uuid;
    perform public.increment_like_count(v_quiz);
  end loop;
  insert into eq_calls values ('increment_like_count', 120);
  for i in 1 .. 60 loop
    v_quiz := md5('eq-b3-quiz-' || (case when i <= 5 then 59 else 13 + (i % 40) end))::uuid;
    perform public.decrement_like_count(v_quiz);
  end loop;
  insert into eq_calls values ('decrement_like_count', 60);
  for i in 1 .. 60 loop
    v_quiz := md5('eq-b3-quiz-' || (1 + (i % 12)))::uuid;
    v_liker := (select id from eq_users where eq_users.idx = 11 + (i % 10));
    v_res := public.award_like_xp(v_quiz, v_liker);
    insert into eq_out values ('award_like_xp', i, v_res::text);
  end loop;
  insert into eq_calls values ('award_like_xp', 60);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- BADGES: 60 direct user_badges inserts (trg_notify_badge_earned); the awards above add their own.
-- ------------------------------------------------------------------------------------------------------------------
do $$
declare
  i integer;
begin
  for i in 1 .. 60 loop
    insert into public.user_badges (user_id, badge_id)
    values ((select id from eq_users where eq_users.idx = 1 + (i % 20)),
            (array['first_steps', 'dedicated_fan', 'multi_stan', 'quiz_maker', 'prolific_creator', 'community_star', 'eq_extra'])[1 + (i % 7)])
    on conflict do nothing;
  end loop;
  insert into eq_calls values ('user_badges_insert', 60);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- FOLLOWS: 60 inserts then 20 deletes (handle_follow_change, untouched by 008 but part of the counters).
-- ------------------------------------------------------------------------------------------------------------------
do $$
declare
  i integer;
  a integer;
  b integer;
begin
  for i in 1 .. 60 loop
    a := 1 + (i % 20);
    b := 1 + ((i * 3 + 7) % 20);
    if a <> b then
      insert into public.follows (follower_id, followed_id)
      values ((select id from eq_users where eq_users.idx = a), (select id from eq_users where eq_users.idx = b))
      on conflict do nothing;
    end if;
  end loop;
  insert into eq_calls values ('follow_insert', 60);
  for i in 1 .. 20 loop
    a := 1 + (i % 20);
    b := 1 + ((i * 3 + 7) % 20);
    delete from public.follows
     where follower_id = (select id from eq_users where eq_users.idx = a) and followed_id = (select id from eq_users where eq_users.idx = b);
  end loop;
  insert into eq_calls values ('follow_delete', 20);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- DUEL VOTES: 3 questions on 3 groups, 2 options each, 70 cast_duel_vote calls (signed-in and anonymous voters, the
-- 10 second duplicate path, both winners).
-- ------------------------------------------------------------------------------------------------------------------
insert into public.duel_questions (id, group_slug, question_type, prompt, entity_kind)
select md5('eq-b3-duel-' || i)::uuid, 'eq-group-' || lpad(i::text, 2, '0'), 'bias', 'Eq duel ' || i, 'idol' from generate_series(1, 3) i;
insert into public.duel_ratings (question_id, entity_id, entity_name, elo, wins, losses, last_delta)
select md5('eq-b3-duel-' || q)::uuid, md5('eq-b3-duel-' || q || '-opt-' || o)::uuid, 'Eq option ' || q || '-' || o, 1500, 0, 0, 0
from generate_series(1, 3) q cross join generate_series(1, 2) o;
do $$
declare
  i integer;
  q integer;
  v_rows text;
begin
  for i in 1 .. 70 loop
    q := 1 + (i % 3);
    perform set_config('request.jwt.claim.sub', case when i % 4 = 0 then '' else (select id::text from eq_users where eq_users.idx = 1 + (i % 20)) end, true);
    -- the function returns its two rows in heap order: the order is not part of the contract, so sort before hashing
    select string_agg(r.elo::text || ':' || r.last_delta::text, ',' order by r.elo, r.last_delta) into v_rows
      from public.cast_duel_vote(md5('eq-b3-duel-' || q)::uuid,
             md5('eq-b3-duel-' || q || '-opt-1')::uuid, md5('eq-b3-duel-' || q || '-opt-2')::uuid,
             md5('eq-b3-duel-' || q || '-opt-' || (1 + (i % 2)))::uuid,
             case when i % 5 = 0 then 'eq-voter-' || (i % 3) else null end) r;
    insert into eq_out values ('cast_duel_vote', i, v_rows);
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  insert into eq_calls values ('cast_duel_vote', 70);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- BATTLES: 10 battles (quiz and group based), 70 battle_results (passport_on_battle_result), signed-in and anonymous,
-- wins and losses.
-- ------------------------------------------------------------------------------------------------------------------
insert into public.battles (id, quiz_id, group_slug, question_ids, challenger_hash, challenger_score)
select md5('eq-b3-battle-' || i)::uuid, case when i % 2 = 0 then md5('eq-b3-quiz-' || i)::uuid end,
       'eq-group-' || lpad(i::text, 2, '0'), array[md5('q1')::uuid, md5('q2')::uuid], 'eq-challenger-' || i, 3 + (i % 5)
from generate_series(1, 10) i;
do $$
declare
  i integer;
begin
  for i in 1 .. 70 loop
    insert into public.battle_results (battle_id, player_hash, score, per_question, time_ms, user_id)
    values (md5('eq-b3-battle-' || (1 + ((i - 1) % 10)))::uuid, 'eq-player-' || i, (i * 5) % 9, array[true, false, true], 1000 + i,
            case when i % 6 = 0 then null else (select id from eq_users where eq_users.idx = 1 + ((i - 1) / 10) * 3) end);
  end loop;
  insert into eq_calls values ('battle_result', 70);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- BLIND TEST PLAYS: 10 songs, 70 record_bt_play calls (players and anonymous, mastery updates on 3 groups so one
-- group gets mastered).
-- ------------------------------------------------------------------------------------------------------------------
insert into public.blind_test_songs (id, title, artist, youtube_id, year)
select md5('eq-b3-song-' || i)::uuid, 'Eq song ' || i, 'Eq artist', 'eqyt' || i, 2020 from generate_series(1, 10) i;
do $$
declare
  i integer;
  v_player uuid;
  v_g integer;
begin
  for i in 1 .. 70 loop
    v_player := case when i % 9 = 0 then null else (select id from eq_users where eq_users.idx = 1 + (i % 20)) end;
    select id into v_g from eq_groups where eq_groups.gi = 1 + (i % 3);
    perform public.record_bt_play(v_player, 'classic', 100 + i, 5 + (i % 6), 10, 30.5 + i, 2 + (i % 5),
      jsonb_build_array(jsonb_build_object('song_id', md5('eq-b3-song-' || (1 + (i % 10)))::uuid, 'correct', i % 2 = 0),
                        jsonb_build_object('song_id', md5('eq-b3-song-' || (1 + ((i + 3) % 10)))::uuid, 'correct', true)),
      10 + i, jsonb_build_array(jsonb_build_object('group_id', v_g, 'mastery_xp', 5 + (i % 4))));
  end loop;
  insert into eq_calls values ('record_bt_play', 70);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- ANON MERGES: 20 users x 3 calls (the first claims the one-time slot, the next two return false), 6 arguments.
-- ------------------------------------------------------------------------------------------------------------------
do $$
declare
  i integer;
  c integer;
  v_u uuid;
  v_g integer;
  v_ok boolean;
begin
  for i in 1 .. 20 loop
    v_u := (select id from eq_users where eq_users.idx = i);
    select id into v_g from eq_groups where eq_groups.gi = 1 + (i % 12);
    for c in 1 .. 3 loop
      v_ok := public.merge_anon_passport(v_u, i * 3, i, i * 2, i % 7, jsonb_build_array(
                jsonb_build_object('group_id', v_g, 'songs_played', 10 + i, 'songs_correct', 5 + i),
                jsonb_build_object('group_id', 999999, 'songs_played', 5, 'songs_correct', 1)));
      insert into eq_out values ('merge_anon_passport', i * 10 + c, v_ok::text);
    end loop;
  end loop;
  insert into eq_calls values ('merge_anon_passport', 60);
end $$;

-- ------------------------------------------------------------------------------------------------------------------
-- THE HASH. One line per fact, every set ordered; ids and timestamps left out.
-- ------------------------------------------------------------------------------------------------------------------
create temp table eq_lines (section text, line text);
insert into eq_lines
select 'profiles', concat_ws('|', u.username, p.xp, p.daily_streak, p.daily_streak_longest, p.last_daily_date, p.total_quizzes_created,
       p.total_plays_received, p.total_likes_received, p.quizzes_played, p.blindtests_played, p.duels_voted, p.battles_played,
       p.battles_won, p.battle_xp_count, p.battle_xp_date, p.follower_count, p.following_count, p.passport_anon_merged_at is not null)
from eq_users u join public.profiles p on p.id = u.id;
insert into eq_lines
select 'badges', u.username || '|' || ub.badge_id from public.user_badges ub join eq_users u on u.id = ub.user_id;
insert into eq_lines
select 'notifications', concat_ws('|', u.username, n.type, n.title, n.body, n.link_url, n.site_id, n.is_read, q.slug, n.group_key)
from public.creator_notifications n join eq_users u on u.id = n.user_id left join public.quizzes q on q.id = n.quiz_id;
insert into eq_lines
select 'quizzes', concat_ws('|', q.slug, q.status, q.play_count, q.like_count, q.total_score_sum, q.total_completions)
from public.quizzes q where q.slug like 'eq-quiz-%';
insert into eq_lines
select 'groups', concat_ws('|', g.slug, g.quiz_count, g.total_plays) from public.groups g where g.slug like 'eq-group-%';
insert into eq_lines
select 'alerts', concat_ws('|', u.username, g.slug, a.notified_at is not null)
from public.group_quiz_alerts a join eq_users u on u.id = a.user_id join public.groups g on g.id = a.group_id;
insert into eq_lines
select 'activity', concat_ws('|', a.event_type, a.display_name, a.group_slug, a.payload::text, a.site_id)
from public.activity_events a where a.display_name like 'eq_u%' or a.group_slug like 'eq-group-%';
insert into eq_lines
select 'mastery', concat_ws('|', u.username, g.slug, m.songs_played, m.songs_correct, m.mastery_xp, m.mastery_level, m.mastered, m.best_score)
from public.player_group_mastery m join eq_users u on u.id = m.player_id join public.groups g on g.id = m.group_id;
insert into eq_lines
select 'players', concat_ws('|', u.username, p.xp, p.level, p.total_songs_played, p.total_songs_correct, p.total_points, p.best_combo,
       p.current_streak, p.longest_streak, p.last_played_date)
from public.players p join eq_users u on u.id = p.id;
insert into eq_lines
select 'bt_plays', concat_ws('|', coalesce(u.username, 'anon'), b.mode_id, b.score, b.correct, b.total, b.total_time, b.best_combo, b.songs::text)
from public.bt_plays b left join eq_users u on u.id = b.player_id where b.mode_id = 'classic' and (b.player_id is null or u.id is not null);
insert into eq_lines
select 'songs', concat_ws('|', s.title, s.times_played, s.times_correct) from public.blind_test_songs s where s.youtube_id like 'eqyt%';
insert into eq_lines
select 'duels', concat_ws('|', r.entity_name, r.elo, r.wins, r.losses, r.last_delta) from public.duel_ratings r where r.entity_name like 'Eq option%';
insert into eq_lines
select 'duel_votes', count(*)::text from public.duel_votes v join public.duel_questions dq on dq.id = v.question_id where dq.prompt like 'Eq duel%';
insert into eq_lines
select 'plays', concat_ws('|', coalesce(u.username, 'anon'), q.slug, p.score, p.total_questions) from public.plays p
  join public.quizzes q on q.id = p.quiz_id left join eq_users u on u.id = p.player_id where q.slug like 'eq-quiz-%';
insert into eq_lines
select 'battle_results', concat_ws('|', coalesce(u.username, 'anon'), r.player_hash, r.score) from public.battle_results r
  left join eq_users u on u.id = r.user_id where r.player_hash like 'eq-player-%';
insert into eq_lines
select 'returns:' || o.path, o.k || '|' || o.v from eq_out o;

select 'EQ CALLS ' || path || ' ' || n from eq_calls order by path;
select 'EQ SECTION ' || section || ' rows=' || count(*) || ' md5=' || md5(string_agg(line, E'\n' order by line)) from eq_lines group by section order by section;
select 'EQ HASH ' || md5(string_agg(section || ':' || line, E'\n' order by section, line)) from eq_lines;

rollback;
