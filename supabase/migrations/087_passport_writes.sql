-- 087 - Passport write folding (Workstream M, step M0.2).
-- Every in-flight feature deposits into the passport spine FROM INSIDE the
-- existing write path (same transaction, no extra app round trips). Raw counters
-- + raw per group plays/correct only. No mastered/era/company derivation here
-- (that is M0.4); the mastered flag is left untouched.
--
-- Trust model note: record_play and cast_duel_vote stay anon/authenticated
-- callable (unchanged from migrations 081/082). The passport blocks added below
-- inherit the SAME trust model as the play/vote logic they sit next to:
--   - record_play deposits gate on p_player_id (the route passes the validated
--     auth.uid()) and on the first-completion guard, mirroring the route L1
--     anti-farm so replays cannot inflate.
--   - cast_duel_vote deposits use auth.uid() (the JWT subject, never a client
--     param) and only fire for a real recorded vote (double-fires return early).
--   - record_bt_play stays service-role only (revoked in 081); the record route
--     passes the validated user.id.

-- ============================================================================
-- 1. record_play: + profiles.quizzes_played and per group raw deposit.
--    Signature unchanged (5 args) so existing callers and the revoke ACL are
--    preserved by CREATE OR REPLACE.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_play(
  p_quiz_id UUID,
  p_player_id UUID,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_time_taken_seconds INTEGER
)
RETURNS TABLE(
  play_id UUID,
  percentile INTEGER
) AS $$
DECLARE
  new_play_id UUID;
  total_plays_count INTEGER;
  worse_plays_count INTEGER;
  pct INTEGER;
  quiz_creator UUID;
  quiz_group INTEGER;
BEGIN
  -- Insert play
  INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
  VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
  RETURNING id INTO new_play_id;

  -- Update quiz stats
  UPDATE public.quizzes
  SET play_count = play_count + 1,
      total_score_sum = total_score_sum + p_score,
      total_completions = total_completions + 1,
      updated_at = NOW()
  WHERE id = p_quiz_id
  RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

  -- Update group stats
  UPDATE public.groups
  SET total_plays = total_plays + 1
  WHERE id = quiz_group;

  -- Update creator stats
  UPDATE public.profiles
  SET total_plays_received = total_plays_received + 1,
      updated_at = NOW()
  WHERE id = quiz_creator;

  -- Passport deposit (authed players only). First-completion guard: the play row
  -- was just inserted above, so a count of exactly 1 means this is the user's
  -- first play of this quiz. Replays count > 1 and deposit nothing.
  IF p_player_id IS NOT NULL THEN
    SELECT COUNT(*) INTO total_plays_count
    FROM public.plays WHERE quiz_id = p_quiz_id AND player_id = p_player_id;

    IF total_plays_count = 1 THEN
      UPDATE public.profiles
        SET quizzes_played = quizzes_played + 1, updated_at = NOW()
        WHERE id = p_player_id;

      -- Per group raw deposit. player_group_mastery.player_id references
      -- players(id); a quiz-only user may have no players row, so guard the FK so
      -- a missing row never aborts the play. mastery_xp / mastered untouched.
      BEGIN
        INSERT INTO public.player_group_mastery (player_id, group_id, songs_played, songs_correct)
        VALUES (p_player_id, quiz_group, p_total_questions, LEAST(GREATEST(p_score, 0), p_total_questions))
        ON CONFLICT (player_id, group_id) DO UPDATE SET
          songs_played  = player_group_mastery.songs_played  + EXCLUDED.songs_played,
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          updated_at = NOW();
      EXCEPTION WHEN foreign_key_violation THEN
        NULL; -- no players row yet; skip the per group deposit
      END;
    END IF;
  END IF;

  -- Calculate percentile
  SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO worse_plays_count FROM public.plays
    WHERE quiz_id = p_quiz_id AND score < p_score;

  IF total_plays_count > 0 THEN
    pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
  ELSE
    pct := 50;
  END IF;

  RETURN QUERY SELECT new_play_id, pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. record_bt_play: + profiles.blindtests_played (games, distinct from
--    players.total_songs_played which counts songs). Per group already handled
--    by the existing step 5 group_mastery_updates loop. Signature unchanged;
--    stays service-role only (revoked in 081).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_bt_play(
  p_player_id UUID,
  p_mode_id TEXT,
  p_score INTEGER,
  p_correct INTEGER,
  p_total INTEGER,
  p_total_time FLOAT,
  p_best_combo INTEGER,
  p_songs JSONB,
  p_xp_earned INTEGER,
  p_group_mastery_updates JSONB
) RETURNS VOID AS $$
DECLARE
  i INTEGER;
  gm JSONB;
  g_id INTEGER;
  g_xp INTEGER;
  s JSONB;
  s_id UUID;
  s_correct BOOLEAN;
BEGIN
  -- 1. Insert the play
  INSERT INTO public.bt_plays (player_id, mode_id, score, correct, total, total_time, best_combo, songs)
  VALUES (p_player_id, p_mode_id, p_score, p_correct, p_total, p_total_time, p_best_combo, p_songs);

  -- 2. Update player stats
  IF p_player_id IS NOT NULL THEN
    UPDATE public.players SET
      xp = xp + p_xp_earned,
      total_songs_played = total_songs_played + p_total,
      total_songs_correct = total_songs_correct + p_correct,
      total_points = total_points + p_score,
      best_combo = GREATEST(best_combo, p_best_combo),
      last_played_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = p_player_id;

    -- 3. Recalculate player level
    UPDATE public.players SET
      level = public.calc_player_level(xp)
    WHERE id = p_player_id;

    -- 4. Update streak
    PERFORM public.update_player_streak(p_player_id);

    -- 4b. Passport deposit: +1 blindtest GAME. No-op if the user has no profiles
    -- row (blindtest-only account that never onboarded the quiz platform).
    UPDATE public.profiles
      SET blindtests_played = blindtests_played + 1, updated_at = NOW()
      WHERE id = p_player_id;

    -- 5. Update group mastery
    IF p_group_mastery_updates IS NOT NULL AND jsonb_array_length(p_group_mastery_updates) > 0 THEN
      FOR i IN 0..jsonb_array_length(p_group_mastery_updates) - 1 LOOP
        gm := p_group_mastery_updates->i;
        g_id := (gm->>'group_id')::INTEGER;
        g_xp := (gm->>'mastery_xp')::INTEGER;

        INSERT INTO public.player_group_mastery (player_id, group_id, mastery_xp, songs_correct, songs_played)
        VALUES (p_player_id, g_id, g_xp, p_correct, p_total)
        ON CONFLICT (player_id, group_id)
        DO UPDATE SET
          mastery_xp = player_group_mastery.mastery_xp + g_xp,
          mastery_level = public.calc_mastery_level(player_group_mastery.mastery_xp + g_xp),
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          songs_played = player_group_mastery.songs_played + EXCLUDED.songs_played,
          best_score = GREATEST(player_group_mastery.best_score, p_score),
          updated_at = NOW();
      END LOOP;
    END IF;
  END IF;

  -- 6. Update per-song stats
  IF jsonb_array_length(p_songs) > 0 THEN
    FOR i IN 0..jsonb_array_length(p_songs) - 1 LOOP
      s := p_songs->i;
      s_id := (s->>'song_id')::UUID;
      s_correct := (s->>'correct')::BOOLEAN;

      UPDATE public.blind_test_songs SET
        times_played = times_played + 1,
        times_correct = CASE WHEN s_correct THEN times_correct + 1 ELSE times_correct END,
        updated_at = NOW()
      WHERE id = s_id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. cast_duel_vote: + profiles.duels_voted for the authed voter (auth.uid()).
--    Placed AFTER the real vote insert so a 10s double-fire (which returns early)
--    deposits nothing. Per group is intentionally NOT touched for duels: a vote
--    has no correct/played semantics and would corrupt the accuracy substrate
--    (flagged for M0.3 confirm). Signature unchanged; stays anon/authenticated.
-- ============================================================================
create or replace function public.cast_duel_vote(
  p_question_id  uuid,
  p_option_a_id  uuid,
  p_option_b_id  uuid,
  p_winner_id    uuid,
  p_voter_hash   text default null
)
returns table (entity_id uuid, elo numeric, last_delta int)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_loser_id   uuid;
  v_elo_w      numeric;
  v_elo_l      numeric;
  v_expected_w numeric;
  v_delta      int;
begin
  if p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id then
    raise exception 'winner_id % is not one of option_a_id % / option_b_id %',
      p_winner_id, p_option_a_id, p_option_b_id;
  end if;

  if p_voter_hash is not null and exists (
    select 1 from public.duel_votes
    where question_id = p_question_id
      and voter_hash  = p_voter_hash
      and option_a_id = p_option_a_id
      and option_b_id = p_option_b_id
      and created_at  > now() - interval '10 seconds'
  ) then
    return query
      select dr.entity_id, dr.elo, dr.last_delta
      from public.duel_ratings dr
      where dr.question_id = p_question_id
        and dr.entity_id in (p_option_a_id, p_option_b_id);
    return;
  end if;

  insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
  values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);

  -- Passport deposit: authed voter only. auth.uid() is the validated JWT subject,
  -- never a client param. No-op if the voter has no profiles row.
  if auth.uid() is not null then
    update public.profiles
      set duels_voted = duels_voted + 1, updated_at = now()
      where id = auth.uid();
  end if;

  v_loser_id := case when p_winner_id = p_option_a_id then p_option_b_id else p_option_a_id end;

  select dr.elo into v_elo_w from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id = p_winner_id for update;
  select dr.elo into v_elo_l from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id = v_loser_id for update;

  if v_elo_w is null or v_elo_l is null then
    raise exception 'duel_ratings missing for question % (winner % / loser %)',
      p_question_id, p_winner_id, v_loser_id;
  end if;

  v_expected_w := 1.0 / (1.0 + power(10.0, (v_elo_l - v_elo_w) / 400.0));
  v_delta := round(24 * (1 - v_expected_w));

  update public.duel_ratings
    set elo = elo + v_delta, wins = wins + 1, last_delta = v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = p_winner_id;

  update public.duel_ratings
    set elo = elo - v_delta, losses = losses + 1, last_delta = -v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = v_loser_id;

  return query
    select dr.entity_id, dr.elo, dr.last_delta
    from public.duel_ratings dr
    where dr.question_id = p_question_id
      and dr.entity_id in (p_winner_id, v_loser_id);
end;
$$;

-- ============================================================================
-- 4. Battle result deposit via trigger (anon-first route, no RPC to fold into).
--    Add user_id so authed runs are attributable (the "or user_id later"
--    evolution noted in migration 073), a unique partial index so a replayed run
--    cannot double-count, and an AFTER INSERT trigger that deposits the counters
--    inside the same insert transaction (zero extra app round trips).
-- ============================================================================
ALTER TABLE public.battle_results
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS battle_results_battle_user_uniq
  ON public.battle_results (battle_id, user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.passport_on_battle_result()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_hash text;
  v_challenger_score int;
  v_won boolean;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW; -- anon run; client-side merge handles it on sign-in
  END IF;

  SELECT challenger_hash, challenger_score
    INTO v_challenger_hash, v_challenger_score
    FROM public.battles WHERE id = NEW.battle_id;

  -- Raw win signal: an opponent run (not the challenger) that beats the
  -- finalized challenger score. Challenger-side wins are derived later (M0.4).
  v_won := (NEW.player_hash IS DISTINCT FROM v_challenger_hash)
           AND v_challenger_score IS NOT NULL
           AND NEW.score > v_challenger_score;

  UPDATE public.profiles
     SET battles_played = battles_played + 1,
         battles_won    = battles_won + CASE WHEN v_won THEN 1 ELSE 0 END,
         updated_at = NOW()
   WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_passport_on_battle_result ON public.battle_results;
CREATE TRIGGER trg_passport_on_battle_result
  AFTER INSERT ON public.battle_results
  FOR EACH ROW EXECUTE FUNCTION public.passport_on_battle_result();

-- Trigger-fired only (never RPC-called): revoke direct execute per 081/082.
REVOKE EXECUTE ON FUNCTION public.passport_on_battle_result() FROM anon, authenticated;

-- ============================================================================
-- 5. Anon merge replay (reuse the create-funnel claim-on-auth pattern).
--    On first sign-in the client replays the localStorage counters it actually
--    collected into the spine + player_group_mastery, ONCE. A one-time flag
--    (passport_anon_merged_at) is claimed atomically so a second call cannot
--    double-count. Client-supplied amounts are clamped (untrusted input).
--    Service-role only; revoked from anon/authenticated.
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS passport_anon_merged_at timestamptz;

CREATE OR REPLACE FUNCTION public.merge_anon_passport(
  p_user_id           uuid,
  p_quizzes_played    int,
  p_blindtests_played int,
  p_duels_voted       int,
  p_battles_played    int,
  p_group_stats       jsonb
) RETURNS boolean AS $$
DECLARE
  cap CONSTANT int := 200; -- clamp untrusted client-supplied anon counts
  claimed_rows int;
  gs jsonb;
  i int;
  g_id int;
  g_played int;
  g_correct int;
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION
  public.merge_anon_passport(uuid, int, int, int, int, jsonb)
  FROM anon, authenticated;
