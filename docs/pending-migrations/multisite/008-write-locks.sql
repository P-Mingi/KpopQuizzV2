-- 008-write-locks.sql (run O1, lane B3 (the brief of lot (c) part 1 gives it to B3); manifest.md row 12; BACKLOG 4.1 rows 16, 17, 18; schema.sql section "@file 008-write-locks")
-- DANGEROUS (two R-SQL reviewers): it redefines 11 functions that production runs on every play, like, quiz and sign-in.
--
-- What:   redefines award_xp, record_play, handle_new_quiz, increment_like_count, decrement_like_count,
--         notify_badge_earned, notify_group_quiz_alerts, cast_duel_vote, passport_on_battle_result and record_bt_play
--         with CREATE OR REPLACE (signature, return type, SECURITY DEFINER, search_path setting and ACL are today's,
--         read from the production schema dump of G3), and drops then recreates merge_anon_passport as the 7-argument
--         form with p_site text DEFAULT 'kpop' (ACL restored as today: PUBLIC and service_role).
-- How:    each function first finds the world of the thing it writes: the quiz's site_id (record_play,
--         increment_like_count, decrement_like_count, handle_new_quiz, notify_group_quiz_alerts), the badge's site_id
--         (notify_badge_earned), the group's site_id (cast_duel_vote, passport_on_battle_result via the battle's quiz
--         then its group, record_bt_play via the first group of the mastery updates, then app.site_id), p_site
--         (merge_anon_passport). A missing or 'kpop' site runs the KPOP BRANCH, which is today's body copied
--         verbatim from the production dump, statement for statement (the only edit of the whole file in a kpop
--         path is award_xp, below). Any other site runs the world branch, which writes world counters through 007
--         (bump_world_counter) and never writes a kpop column or a kpop-only table.
-- award_xp: has no world branch (a world uses award_world_xp); its badge counts (first_steps, dedicated_fan,
--         multi_stan) count plays of kpop quizzes only, so world plays never earn a kpop badge.
-- notify_*: the kpop branch inserts as today (site_id takes its default 'kpop'); the world branch sets site_id.
-- Triggers keep their names and definitions: on_quiz_insert (handle_new_quiz), trg_notify_badge_earned,
--         group_quiz_alerts_on_insert and group_quiz_alerts_on_publish (notify_group_quiz_alerts),
--         trg_passport_on_battle_result. Audited and unchanged (no file): grant_creator_tier_badge,
--         grant_group_master_badge, grant_streak_badges, handle_follow_change.
-- Decisions where the contract is silent (the world branches only; no kpop path depends on them):
--   - activity: emit_activity has no site argument and would file a world event under kpop, so the world branches
--     insert into activity_events directly with site_id; the world branches skip group mastery (player_group_mastery,
--     players, bt_plays and blind_test_songs have no site column).
--   - a battle played on a world counts as one games_played; a duel vote on a world has no counter (profiles.duels_voted
--     is a kpop column); a blind test counts blindtests_played; a quiz creation counts quizzes_created, a play counts
--     plays_received for the creator and quizzes_played for the player's first play of that quiz.
--   - merge_anon_passport on a world: needs the membership (else returns false), claims a once-per-world marker in
--     passport_prefs.dismissed ('anon_merged_<site>', which set_passport_prefs refuses to write), deposits
--     quizzes_played and blindtests_played (clamped at 200 as for kpop); duels, battles and group stats are dropped.
-- Rows:   no table, row or column is touched; 11 functions are replaced.
-- Needs:  002a (site_id columns), 003, 007 (bump_world_counter), 004 (passport_prefs). Rolled back before 007 and 003.
-- Verify: select proname, pg_get_function_identity_arguments(oid), prosecdef from pg_proc where pronamespace = 'public'::regnamespace and proname in ('award_xp', 'record_play', 'handle_new_quiz', 'increment_like_count', 'decrement_like_count', 'notify_badge_earned', 'notify_group_quiz_alerts', 'cast_duel_vote', 'passport_on_battle_result', 'record_bt_play', 'merge_anon_passport') order by 1;   expect 11 rows, prosecdef t, merge_anon_passport with 7 arguments
--         select tgname from pg_trigger where tgname in ('on_quiz_insert', 'trg_notify_badge_earned', 'group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish', 'trg_passport_on_battle_result');   expect 5 rows
--         select proacl from pg_proc where proname = 'merge_anon_passport';   expect {=X/postgres,postgres=X/postgres,service_role=X/postgres}
--         the equivalence batch (apps/quiz/e2e/o1/B3/equivalence.sh) gives the same md5 before and after this file
-- Undo:   008-write-locks.rollback.sql (today's definitions verbatim from the production dump, never a reconstruction).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

-- Preconditions: the world branches read site_id columns (002a) and call 007 and write passport_prefs (004). plpgsql
-- binds late, so without them every kpop call would still pass but the first world call would fail: refuse to start.
do $$
declare
  t text;
begin
  foreach t in array array['quizzes', 'groups', 'activity_events', 'creator_notifications', 'badge_definitions'] loop
    if to_regclass('public.' || t) is null
       or not exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.' || t) and a.attname = 'site_id' and not a.attisdropped) then
      raise exception '008-write-locks: public.%.site_id is missing (apply 002a first)', t;
    end if;
  end loop;
  if to_regclass('public.world_memberships') is null or to_regclass('public.passport_prefs') is null then
    raise exception '008-write-locks: world_memberships or passport_prefs is missing (apply 003 and 004 first)';
  end if;
  if to_regprocedure('public.bump_world_counter(uuid, text, text, integer)') is null then
    raise exception '008-write-locks: public.bump_world_counter is missing (apply 007 first)';
  end if;
end $$;


-- award_xp

CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_xp INTEGER;
  play_count_val INTEGER;
  quiz_count_val INTEGER;
  group_count_val INTEGER;
  likes_val INTEGER;
BEGIN
  UPDATE public.profiles SET xp = xp + p_amount WHERE id = p_user_id
  RETURNING xp INTO new_xp;

  -- First steps + dedicated fan
  IF p_reason = 'play' THEN
    SELECT COUNT(*) INTO play_count_val FROM public.plays pl JOIN public.quizzes q ON pl.quiz_id = q.id
      WHERE pl.player_id = p_user_id AND q.site_id = 'kpop';
    IF play_count_val >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'first_steps') ON CONFLICT DO NOTHING;
    END IF;
    IF play_count_val >= 100 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'dedicated_fan') ON CONFLICT DO NOTHING;
    END IF;
    -- Multi-stan
    SELECT COUNT(DISTINCT q.group_id) INTO group_count_val
    FROM public.plays pl JOIN public.quizzes q ON pl.quiz_id = q.id
    WHERE pl.player_id = p_user_id AND q.site_id = 'kpop';
    IF group_count_val >= 10 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'multi_stan') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Quiz maker + prolific creator
  IF p_reason = 'create' THEN
    SELECT total_quizzes_created INTO quiz_count_val FROM public.profiles WHERE id = p_user_id;
    IF quiz_count_val >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'quiz_maker') ON CONFLICT DO NOTHING;
    END IF;
    IF quiz_count_val >= 10 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'prolific_creator') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Community star
  IF p_reason = 'like_received' THEN
    SELECT total_likes_received INTO likes_val FROM public.profiles WHERE id = p_user_id;
    IF likes_val >= 100 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'community_star') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN new_xp;
END;
$function$;

-- record_play

CREATE OR REPLACE FUNCTION public.record_play(p_quiz_id uuid, p_player_id uuid, p_score integer, p_total_questions integer, p_time_taken_seconds integer)
 RETURNS TABLE(play_id uuid, percentile integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site TEXT;
  new_play_id UUID;
  total_plays_count INTEGER;
  worse_plays_count INTEGER;
  pct INTEGER;
  quiz_creator UUID;
  quiz_group INTEGER;
  v_group_slug TEXT;
  v_sp INTEGER;
  v_sc INTEGER;
  v_mastered BOOLEAN;
BEGIN
  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = p_quiz_id;
  IF v_site IS NULL OR v_site = 'kpop' THEN
  INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
  VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
  RETURNING id INTO new_play_id;

  UPDATE public.quizzes
  SET play_count = play_count + 1, total_score_sum = total_score_sum + p_score,
      total_completions = total_completions + 1, updated_at = NOW()
  WHERE id = p_quiz_id
  RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

  UPDATE public.groups SET total_plays = total_plays + 1 WHERE id = quiz_group;
  SELECT slug INTO v_group_slug FROM public.groups WHERE id = quiz_group;

  UPDATE public.profiles
  SET total_plays_received = total_plays_received + 1, updated_at = NOW()
  WHERE id = quiz_creator;

  IF p_player_id IS NOT NULL THEN
    SELECT COUNT(*) INTO total_plays_count
    FROM public.plays WHERE quiz_id = p_quiz_id AND player_id = p_player_id;

    IF total_plays_count = 1 THEN
      UPDATE public.profiles SET quizzes_played = quizzes_played + 1, updated_at = NOW() WHERE id = p_player_id;
      BEGIN
        INSERT INTO public.player_group_mastery (player_id, group_id, songs_played, songs_correct)
        VALUES (p_player_id, quiz_group, p_total_questions, LEAST(GREATEST(p_score, 0), p_total_questions))
        ON CONFLICT (player_id, group_id) DO UPDATE SET
          songs_played  = player_group_mastery.songs_played  + EXCLUDED.songs_played,
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          updated_at = NOW();

        -- group_mastered emit-once latch (quiz side).
        SELECT songs_played, songs_correct, mastered INTO v_sp, v_sc, v_mastered
        FROM public.player_group_mastery WHERE player_id = p_player_id AND group_id = quiz_group;
        IF NOT v_mastered AND v_sp >= 30 AND v_sc::numeric / NULLIF(v_sp, 0) >= 0.80 THEN
          UPDATE public.player_group_mastery SET mastered = true WHERE player_id = p_player_id AND group_id = quiz_group;
          PERFORM public.emit_activity('group_mastered', p_player_id, v_group_slug, jsonb_build_object('group_id', quiz_group));
        END IF;
      EXCEPTION WHEN foreign_key_violation THEN
        NULL;
      END;
    END IF;
  END IF;

  -- One activity event per completion (authed name or 'someone').
  IF p_total_questions > 0 AND p_score >= p_total_questions THEN
    PERFORM public.emit_activity('perfect_score', p_player_id, v_group_slug, jsonb_build_object('score', p_score, 'total', p_total_questions));
  ELSE
    PERFORM public.emit_activity('quiz_completed', p_player_id, v_group_slug, jsonb_build_object('score', p_score, 'total', p_total_questions));
  END IF;

  SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO worse_plays_count FROM public.plays WHERE quiz_id = p_quiz_id AND score < p_score;
  IF total_plays_count > 0 THEN pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
  ELSE pct := 50; END IF;

  RETURN QUERY SELECT new_play_id, pct;
  ELSE
    INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
    VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
    RETURNING id INTO new_play_id;

    UPDATE public.quizzes
    SET play_count = play_count + 1, total_score_sum = total_score_sum + p_score,
        total_completions = total_completions + 1, updated_at = NOW()
    WHERE id = p_quiz_id
    RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

    UPDATE public.groups SET total_plays = total_plays + 1 WHERE id = quiz_group;
    SELECT slug INTO v_group_slug FROM public.groups WHERE id = quiz_group;

    -- world counters through 007: profiles (kpop) is never written for a non-kpop quiz
    IF quiz_creator IS NOT NULL THEN
      PERFORM public.bump_world_counter(quiz_creator, v_site, 'plays_received', 1);
    END IF;

    IF p_player_id IS NOT NULL THEN
      SELECT COUNT(*) INTO total_plays_count
      FROM public.plays WHERE quiz_id = p_quiz_id AND player_id = p_player_id;

      IF total_plays_count = 1 THEN
        PERFORM public.bump_world_counter(p_player_id, v_site, 'quizzes_played', 1);
      END IF;
    END IF;

    -- one activity event per completion, on this world
    INSERT INTO public.activity_events (event_type, user_id, display_name, group_slug, payload, site_id)
    VALUES (CASE WHEN p_total_questions > 0 AND p_score >= p_total_questions THEN 'perfect_score' ELSE 'quiz_completed' END, p_player_id,
            COALESCE((SELECT username FROM public.profiles WHERE id = p_player_id AND banned_at IS NULL), 'someone'),
            v_group_slug, jsonb_build_object('score', p_score, 'total', p_total_questions), v_site);

    SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
    SELECT COUNT(*) INTO worse_plays_count FROM public.plays WHERE quiz_id = p_quiz_id AND score < p_score;
    IF total_plays_count > 0 THEN pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
    ELSE pct := 50; END IF;

    RETURN QUERY SELECT new_play_id, pct;
  END IF;
END;
$function$;

-- handle_new_quiz

CREATE OR REPLACE FUNCTION public.handle_new_quiz()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site TEXT;
  v_slug TEXT;
BEGIN
  v_site := COALESCE(NEW.site_id, 'kpop');
  IF v_site = 'kpop' THEN
  UPDATE public.profiles SET total_quizzes_created = total_quizzes_created + 1, updated_at = NOW() WHERE id = NEW.creator_id;
  UPDATE public.groups SET quiz_count = quiz_count + 1 WHERE id = NEW.group_id;
  SELECT slug INTO v_slug FROM public.groups WHERE id = NEW.group_id;
  PERFORM public.emit_activity('quiz_created', NEW.creator_id, v_slug, jsonb_build_object('title', NEW.title));
  RETURN NEW;
  ELSE
    PERFORM public.bump_world_counter(NEW.creator_id, v_site, 'quizzes_created', 1);
    UPDATE public.groups SET quiz_count = quiz_count + 1 WHERE id = NEW.group_id;
    SELECT slug INTO v_slug FROM public.groups WHERE id = NEW.group_id;
    INSERT INTO public.activity_events (event_type, user_id, display_name, group_slug, payload, site_id)
    VALUES ('quiz_created', NEW.creator_id,
            COALESCE((SELECT username FROM public.profiles WHERE id = NEW.creator_id AND banned_at IS NULL), 'someone'),
            v_slug, jsonb_build_object('title', NEW.title), v_site);
    RETURN NEW;
  END IF;
END;
$function$;

-- increment_like_count

CREATE OR REPLACE FUNCTION public.increment_like_count(quiz_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site TEXT;
  creator UUID;
BEGIN
  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = quiz_uuid;
  IF v_site IS NULL OR v_site = 'kpop' THEN
  UPDATE public.quizzes SET like_count = like_count + 1 WHERE id = quiz_uuid
  RETURNING creator_id INTO creator;
  UPDATE public.profiles SET total_likes_received = total_likes_received + 1 WHERE id = creator;
  ELSE
    UPDATE public.quizzes SET like_count = like_count + 1 WHERE id = quiz_uuid
    RETURNING creator_id INTO creator;
    PERFORM public.bump_world_counter(creator, v_site, 'likes_received', 1);
  END IF;
END;
$function$;

-- decrement_like_count

CREATE OR REPLACE FUNCTION public.decrement_like_count(quiz_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site TEXT;
  creator UUID;
BEGIN
  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = quiz_uuid;
  IF v_site IS NULL OR v_site = 'kpop' THEN
  UPDATE public.quizzes SET like_count = GREATEST(like_count - 1, 0) WHERE id = quiz_uuid
  RETURNING creator_id INTO creator;
  UPDATE public.profiles SET total_likes_received = GREATEST(total_likes_received - 1, 0) WHERE id = creator;
  ELSE
    UPDATE public.quizzes SET like_count = GREATEST(like_count - 1, 0) WHERE id = quiz_uuid
    RETURNING creator_id INTO creator;
    PERFORM public.bump_world_counter(creator, v_site, 'likes_received', -1);
  END IF;
END;
$function$;

-- notify_badge_earned

CREATE OR REPLACE FUNCTION public.notify_badge_earned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_site text;
  v_name text;
BEGIN
  select bd.site_id into v_site from public.badge_definitions bd where bd.id = new.badge_id;
  IF v_site is null or v_site = 'kpop' THEN
  select name into v_name from public.badge_definitions where id = new.badge_id;

  insert into public.creator_notifications (user_id, type, title, body, link_url)
  values (
    new.user_id,
    'badge_earned',
    'Congrats, you earned a new badge!',
    coalesce(v_name, 'A new badge') || ' is now on your passport.',
    '/me'
  );
  return null;
  ELSE
    select name into v_name from public.badge_definitions where id = new.badge_id;

    insert into public.creator_notifications (user_id, type, title, body, link_url, site_id)
    values (
      new.user_id,
      'badge_earned',
      'Congrats, you earned a new badge!',
      coalesce(v_name, 'A new badge') || ' is now on your passport.',
      '/me',
      v_site
    );
    return null;
  END IF;
END;
$function$;

-- notify_group_quiz_alerts

CREATE OR REPLACE FUNCTION public.notify_group_quiz_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_site text;
  v_group text;
BEGIN
  v_site := coalesce(new.site_id, 'kpop');
  IF v_site = 'kpop' THEN
  begin
    select name into v_group from public.groups where id = new.group_id;
    if v_group is null then
      return new;
    end if;

    insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url)
    select a.user_id,
           'followed_new_quiz',
           'A new ' || v_group || ' quiz is here',
           new.title,
           new.id,
           '/q/' || new.slug
    from public.group_quiz_alerts a
    where a.group_id = new.group_id
      and a.notified_at is null
      and a.user_id is distinct from new.creator_id;

    update public.group_quiz_alerts
       set notified_at = now()
     where group_id = new.group_id
       and notified_at is null;
  exception when others then
    -- never block a publish because of an alert
    return new;
  end;
  return new;
  ELSE
  begin
    select name into v_group from public.groups where id = new.group_id;
    if v_group is null then
      return new;
    end if;

    insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url, site_id)
    select a.user_id,
           'followed_new_quiz',
           'A new ' || v_group || ' quiz is here',
           new.title,
           new.id,
           '/q/' || new.slug,
           new.site_id
    from public.group_quiz_alerts a
    where a.group_id = new.group_id
      and a.notified_at is null
      and a.user_id is distinct from new.creator_id;

    update public.group_quiz_alerts
       set notified_at = now()
     where group_id = new.group_id
       and notified_at is null;
  exception when others then
    -- never block a publish because of an alert
    return new;
  end;
  return new;
  END IF;
END;
$function$;

-- cast_duel_vote

CREATE OR REPLACE FUNCTION public.cast_duel_vote(p_question_id uuid, p_option_a_id uuid, p_option_b_id uuid, p_winner_id uuid, p_voter_hash text DEFAULT NULL::text)
 RETURNS TABLE(entity_id uuid, elo numeric, last_delta integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_site text;
  v_loser_id uuid; v_elo_w numeric; v_elo_l numeric; v_expected_w numeric; v_delta int; v_gslug text;
BEGIN
  select g.site_id into v_site from public.duel_questions dq join public.groups g on g.slug = dq.group_slug where dq.id = p_question_id;
  IF v_site is null or v_site = 'kpop' THEN
  if p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id then
    raise exception 'winner_id % is not one of option_a_id % / option_b_id %', p_winner_id, p_option_a_id, p_option_b_id;
  end if;

  if p_voter_hash is not null and exists (
    select 1 from public.duel_votes
    where question_id = p_question_id and voter_hash = p_voter_hash
      and option_a_id = p_option_a_id and option_b_id = p_option_b_id
      and created_at > now() - interval '10 seconds'
  ) then
    return query select dr.entity_id, dr.elo, dr.last_delta from public.duel_ratings dr
      where dr.question_id = p_question_id and dr.entity_id in (p_option_a_id, p_option_b_id);
    return;
  end if;

  insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
  values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);

  if auth.uid() is not null then
    update public.profiles set duels_voted = duels_voted + 1, updated_at = now() where id = auth.uid();
    select group_slug into v_gslug from public.duel_questions where id = p_question_id;
    perform public.emit_activity('duel_voted', auth.uid(), v_gslug, '{}'::jsonb);
  end if;

  v_loser_id := case when p_winner_id = p_option_a_id then p_option_b_id else p_option_a_id end;
  select dr.elo into v_elo_w from public.duel_ratings dr where dr.question_id = p_question_id and dr.entity_id = p_winner_id for update;
  select dr.elo into v_elo_l from public.duel_ratings dr where dr.question_id = p_question_id and dr.entity_id = v_loser_id for update;
  if v_elo_w is null or v_elo_l is null then
    raise exception 'duel_ratings missing for question % (winner % / loser %)', p_question_id, p_winner_id, v_loser_id;
  end if;

  v_expected_w := 1.0 / (1.0 + power(10.0, (v_elo_l - v_elo_w) / 400.0));
  v_delta := round(24 * (1 - v_expected_w));
  update public.duel_ratings set elo = elo + v_delta, wins = wins + 1, last_delta = v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = p_winner_id;
  update public.duel_ratings set elo = elo - v_delta, losses = losses + 1, last_delta = -v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = v_loser_id;

  return query select dr.entity_id, dr.elo, dr.last_delta from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id in (p_winner_id, v_loser_id);
  ELSE
  if p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id then
    raise exception 'winner_id % is not one of option_a_id % / option_b_id %', p_winner_id, p_option_a_id, p_option_b_id;
  end if;

  if p_voter_hash is not null and exists (
    select 1 from public.duel_votes
    where question_id = p_question_id and voter_hash = p_voter_hash
      and option_a_id = p_option_a_id and option_b_id = p_option_b_id
      and created_at > now() - interval '10 seconds'
  ) then
    return query select dr.entity_id, dr.elo, dr.last_delta from public.duel_ratings dr
      where dr.question_id = p_question_id and dr.entity_id in (p_option_a_id, p_option_b_id);
    return;
  end if;

  insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
  values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);

  if auth.uid() is not null then
    select group_slug into v_gslug from public.duel_questions where id = p_question_id;
    INSERT INTO public.activity_events (event_type, user_id, display_name, group_slug, payload, site_id)
    VALUES ('duel_voted', auth.uid(),
            COALESCE((select username from public.profiles where id = auth.uid() and banned_at is null), 'someone'),
            v_gslug, '{}'::jsonb, v_site);
  end if;

  v_loser_id := case when p_winner_id = p_option_a_id then p_option_b_id else p_option_a_id end;
  select dr.elo into v_elo_w from public.duel_ratings dr where dr.question_id = p_question_id and dr.entity_id = p_winner_id for update;
  select dr.elo into v_elo_l from public.duel_ratings dr where dr.question_id = p_question_id and dr.entity_id = v_loser_id for update;
  if v_elo_w is null or v_elo_l is null then
    raise exception 'duel_ratings missing for question % (winner % / loser %)', p_question_id, p_winner_id, v_loser_id;
  end if;

  v_expected_w := 1.0 / (1.0 + power(10.0, (v_elo_l - v_elo_w) / 400.0));
  v_delta := round(24 * (1 - v_expected_w));
  update public.duel_ratings set elo = elo + v_delta, wins = wins + 1, last_delta = v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = p_winner_id;
  update public.duel_ratings set elo = elo - v_delta, losses = losses + 1, last_delta = -v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = v_loser_id;

  return query select dr.entity_id, dr.elo, dr.last_delta from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id in (p_winner_id, v_loser_id);
  END IF;
END;
$function$;

-- passport_on_battle_result

CREATE OR REPLACE FUNCTION public.passport_on_battle_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site text;
  v_challenger_hash text; v_challenger_score int; v_won boolean;
BEGIN
  SELECT COALESCE(
           (SELECT q.site_id FROM public.battles b JOIN public.quizzes q ON q.id = b.quiz_id WHERE b.id = NEW.battle_id),
           (SELECT g.site_id FROM public.battles b JOIN public.groups g ON g.slug = b.group_slug WHERE b.id = NEW.battle_id),
           'kpop') INTO v_site;
  IF v_site = 'kpop' THEN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT challenger_hash, challenger_score INTO v_challenger_hash, v_challenger_score
    FROM public.battles WHERE id = NEW.battle_id;
  v_won := (NEW.player_hash IS DISTINCT FROM v_challenger_hash) AND v_challenger_score IS NOT NULL AND NEW.score > v_challenger_score;

  UPDATE public.profiles
     SET battles_played = battles_played + 1,
         battles_won = battles_won + CASE WHEN v_won THEN 1 ELSE 0 END, updated_at = NOW()
   WHERE id = NEW.user_id;

  IF v_won THEN
    PERFORM public.emit_activity('battle_won', NEW.user_id, NULL, jsonb_build_object('score', NEW.score));
  END IF;
  RETURN NEW;
  ELSE
    IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
    SELECT challenger_hash, challenger_score INTO v_challenger_hash, v_challenger_score
      FROM public.battles WHERE id = NEW.battle_id;
    v_won := (NEW.player_hash IS DISTINCT FROM v_challenger_hash) AND v_challenger_score IS NOT NULL AND NEW.score > v_challenger_score;

    -- a battle played on a world counts as one game of that world; profiles (kpop) is never written
    PERFORM public.bump_world_counter(NEW.user_id, v_site, 'games_played', 1);

    IF v_won THEN
      INSERT INTO public.activity_events (event_type, user_id, display_name, group_slug, payload, site_id)
      VALUES ('battle_won', NEW.user_id,
              COALESCE((SELECT username FROM public.profiles WHERE id = NEW.user_id AND banned_at IS NULL), 'someone'),
              NULL, jsonb_build_object('score', NEW.score), v_site);
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

-- record_bt_play

CREATE OR REPLACE FUNCTION public.record_bt_play(p_player_id uuid, p_mode_id text, p_score integer, p_correct integer, p_total integer, p_total_time double precision, p_best_combo integer, p_songs jsonb, p_xp_earned integer, p_group_mastery_updates jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site TEXT;
  i INTEGER; gm JSONB; g_id INTEGER; g_xp INTEGER; s JSONB; s_id UUID; s_correct BOOLEAN;
  v_sp INTEGER; v_sc INTEGER; v_mastered BOOLEAN; v_slug TEXT;
BEGIN
  -- the world of the play: app.site_id, else kpop. Never taken from the request's groups (a kpop call naming a world
  -- group would otherwise write a world counter).
  v_site := COALESCE(NULLIF(current_setting('app.site_id', true), ''), 'kpop');
  IF v_site = 'kpop' THEN
  INSERT INTO public.bt_plays (player_id, mode_id, score, correct, total, total_time, best_combo, songs)
  VALUES (p_player_id, p_mode_id, p_score, p_correct, p_total, p_total_time, p_best_combo, p_songs);

  IF p_player_id IS NOT NULL THEN
    UPDATE public.players SET
      xp = xp + p_xp_earned, total_songs_played = total_songs_played + p_total,
      total_songs_correct = total_songs_correct + p_correct, total_points = total_points + p_score,
      best_combo = GREATEST(best_combo, p_best_combo), last_played_date = CURRENT_DATE, updated_at = NOW()
    WHERE id = p_player_id;
    UPDATE public.players SET level = public.calc_player_level(xp) WHERE id = p_player_id;
    PERFORM public.update_player_streak(p_player_id);

    UPDATE public.profiles SET blindtests_played = blindtests_played + 1, updated_at = NOW() WHERE id = p_player_id;
    PERFORM public.emit_activity('blindtest_played', p_player_id, NULL, jsonb_build_object('correct', p_correct, 'total', p_total));

    IF p_group_mastery_updates IS NOT NULL AND jsonb_array_length(p_group_mastery_updates) > 0 THEN
      FOR i IN 0..jsonb_array_length(p_group_mastery_updates) - 1 LOOP
        gm := p_group_mastery_updates->i;
        g_id := (gm->>'group_id')::INTEGER;
        g_xp := (gm->>'mastery_xp')::INTEGER;

        INSERT INTO public.player_group_mastery (player_id, group_id, mastery_xp, songs_correct, songs_played)
        VALUES (p_player_id, g_id, g_xp, p_correct, p_total)
        ON CONFLICT (player_id, group_id) DO UPDATE SET
          mastery_xp = player_group_mastery.mastery_xp + g_xp,
          mastery_level = public.calc_mastery_level(player_group_mastery.mastery_xp + g_xp),
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          songs_played = player_group_mastery.songs_played + EXCLUDED.songs_played,
          best_score = GREATEST(player_group_mastery.best_score, p_score), updated_at = NOW();

        SELECT songs_played, songs_correct, mastered INTO v_sp, v_sc, v_mastered
        FROM public.player_group_mastery WHERE player_id = p_player_id AND group_id = g_id;
        IF NOT v_mastered AND v_sp >= 30 AND v_sc::numeric / NULLIF(v_sp, 0) >= 0.80 THEN
          UPDATE public.player_group_mastery SET mastered = true WHERE player_id = p_player_id AND group_id = g_id;
          SELECT slug INTO v_slug FROM public.groups WHERE id = g_id;
          PERFORM public.emit_activity('group_mastered', p_player_id, v_slug, jsonb_build_object('group_id', g_id));
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF jsonb_array_length(p_songs) > 0 THEN
    FOR i IN 0..jsonb_array_length(p_songs) - 1 LOOP
      s := p_songs->i; s_id := (s->>'song_id')::UUID; s_correct := (s->>'correct')::BOOLEAN;
      UPDATE public.blind_test_songs SET
        times_played = times_played + 1,
        times_correct = CASE WHEN s_correct THEN times_correct + 1 ELSE times_correct END, updated_at = NOW()
      WHERE id = s_id;
    END LOOP;
  END IF;
  ELSE
    -- a blind test played on a world: bt_plays, players, player_group_mastery and blind_test_songs are kpop tables
    -- (no site column), so only the world counter and the world activity event are written
    IF p_player_id IS NOT NULL THEN
      PERFORM public.bump_world_counter(p_player_id, v_site, 'blindtests_played', 1);
      INSERT INTO public.activity_events (event_type, user_id, display_name, group_slug, payload, site_id)
      VALUES ('blindtest_played', p_player_id,
              COALESCE((SELECT username FROM public.profiles WHERE id = p_player_id AND banned_at IS NULL), 'someone'),
              NULL, jsonb_build_object('correct', p_correct, 'total', p_total), v_site);
    END IF;
  END IF;
END;
$function$;

-- merge_anon_passport: the 6-argument form is dropped and the 7-argument form (p_site text DEFAULT 'kpop') is created in
-- this transaction; a call with 6 arguments resolves to the new form. The ACL is restored as production has it
-- (PUBLIC and service_role; migration 087 revoked anon and authenticated only, request F0-14).
DROP FUNCTION IF EXISTS public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb);

CREATE OR REPLACE FUNCTION public.merge_anon_passport(p_user_id uuid, p_quizzes_played integer, p_blindtests_played integer, p_duels_voted integer, p_battles_played integer, p_group_stats jsonb, p_site text DEFAULT 'kpop'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  cap CONSTANT int := 200; -- clamp untrusted client-supplied anon counts
  claimed_rows int;
  gs jsonb;
  i int;
  g_id int;
  g_played int;
  g_correct int;
BEGIN
  IF p_site IS NULL OR p_site = 'kpop' THEN
  -- Claim the one-time merge slot atomically. 0 rows = already merged (or no
  -- profile row) -> deposit nothing, idempotent.
  UPDATE public.profiles
    SET passport_anon_merged_at = NOW()
    WHERE id = p_user_id AND passport_anon_merged_at IS NULL;
  GET DIAGNOSTICS claimed_rows = ROW_COUNT;
  IF claimed_rows = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET
    quizzes_played    = quizzes_played    + LEAST(GREATEST(COALESCE(p_quizzes_played, 0), 0), cap),
    blindtests_played = blindtests_played + LEAST(GREATEST(COALESCE(p_blindtests_played, 0), 0), cap),
    duels_voted       = duels_voted       + LEAST(GREATEST(COALESCE(p_duels_voted, 0), 0), cap),
    battles_played    = battles_played    + LEAST(GREATEST(COALESCE(p_battles_played, 0), 0), cap),
    updated_at = NOW()
  WHERE id = p_user_id;

  IF p_group_stats IS NOT NULL AND jsonb_typeof(p_group_stats) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(p_group_stats) - 1 LOOP
      gs := p_group_stats->i;
      g_id := NULLIF(gs->>'group_id', '')::int;
      g_played := LEAST(GREATEST(COALESCE(NULLIF(gs->>'songs_played', '')::int, 0), 0), cap);
      g_correct := LEAST(GREATEST(COALESCE(NULLIF(gs->>'songs_correct', '')::int, 0), 0), g_played);
      IF g_id IS NOT NULL AND g_played > 0 THEN
        BEGIN
          INSERT INTO public.player_group_mastery (player_id, group_id, songs_played, songs_correct)
          VALUES (p_user_id, g_id, g_played, g_correct)
          ON CONFLICT (player_id, group_id) DO UPDATE SET
            songs_played  = player_group_mastery.songs_played  + EXCLUDED.songs_played,
            songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
            updated_at = NOW();
        EXCEPTION WHEN foreign_key_violation THEN
          NULL; -- no players row yet; skip this group
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
  ELSE
    -- a world: the one-time marker lives in passport_prefs.dismissed ('anon_merged_<site>', which set_passport_prefs
    -- refuses to write), the deposit goes to the world counters; duels, battles and group stats have no world column
    IF NOT EXISTS (SELECT 1 FROM public.world_memberships m WHERE m.user_id = p_user_id AND m.site_id = p_site) THEN
      RETURN false;
    END IF;

    INSERT INTO public.passport_prefs AS pp (user_id, dismissed)
    VALUES (p_user_id, jsonb_build_object('anon_merged_' || p_site, to_jsonb(NOW())))
    ON CONFLICT (user_id) DO UPDATE
      SET dismissed = pp.dismissed || jsonb_build_object('anon_merged_' || p_site, to_jsonb(NOW())), updated_at = NOW()
      WHERE NOT (pp.dismissed ? ('anon_merged_' || p_site));
    GET DIAGNOSTICS claimed_rows = ROW_COUNT;
    IF claimed_rows = 0 THEN
      RETURN false;
    END IF;

    IF LEAST(GREATEST(COALESCE(p_quizzes_played, 0), 0), cap) > 0 THEN
      PERFORM public.bump_world_counter(p_user_id, p_site, 'quizzes_played', LEAST(GREATEST(COALESCE(p_quizzes_played, 0), 0), cap));
    END IF;
    IF LEAST(GREATEST(COALESCE(p_blindtests_played, 0), 0), cap) > 0 THEN
      PERFORM public.bump_world_counter(p_user_id, p_site, 'blindtests_played', LEAST(GREATEST(COALESCE(p_blindtests_played, 0), 0), cap));
    END IF;

    RETURN true;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) TO PUBLIC, service_role;

-- Self-check: 11 functions, all SECURITY DEFINER, the ACL of merge_anon_passport as production has it, the 5 triggers still there.
do $$
declare
  n integer;
begin
  select count(*) into n from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and p.proname in ('award_xp', 'record_play', 'handle_new_quiz', 'increment_like_count', 'decrement_like_count',
                       'notify_badge_earned', 'notify_group_quiz_alerts', 'cast_duel_vote', 'passport_on_battle_result',
                       'record_bt_play', 'merge_anon_passport');
  if n <> 11 then
    raise exception '008-write-locks: expected 11 SECURITY DEFINER functions, found %', n;
  end if;
  if to_regprocedure('public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb)') is not null
     or to_regprocedure('public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text)') is null then
    raise exception '008-write-locks: merge_anon_passport must exist only in its 7-argument form';
  end if;
  if exists (select 1 from pg_proc p, aclexplode(p.proacl) a
              where p.oid = 'public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text)'::regprocedure
                and a.privilege_type = 'EXECUTE' and a.grantee in (select r.oid from pg_roles r where r.rolname in ('anon', 'authenticated'))) then
    raise exception '008-write-locks: anon or authenticated holds an explicit EXECUTE on merge_anon_passport';
  end if;
  select count(*) into n from pg_trigger
   where not tgisinternal and tgname in ('on_quiz_insert', 'trg_notify_badge_earned', 'group_quiz_alerts_on_insert',
                                         'group_quiz_alerts_on_publish', 'trg_passport_on_battle_result');
  if n <> 5 then
    raise exception '008-write-locks: expected the 5 locked triggers, found %', n;
  end if;
end $$;
