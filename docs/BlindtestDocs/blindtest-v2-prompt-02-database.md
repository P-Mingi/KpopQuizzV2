# Prompt 2: Database Schema — All Tables

## Overview

Create all database tables for the blind test game. The songs table (`blind_test_songs`) already exists from the kpopquiz project. This prompt creates the player-facing tables: players, plays, mastery, achievements, daily challenges, and leaderboards.

**All tables are in the same Supabase project as kpopquiz.org.** The `blind_test_songs` and `groups` tables are already populated with 600+ songs.

---

## Table 1: `players`

The game-specific player profile. Links to `auth.users` via the `id` column. This is SEPARATE from the kpopquiz `profiles` table — a user can have both.

```sql
CREATE TABLE public.players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  avatar_bg TEXT NOT NULL DEFAULT '#ED93B1',
  avatar_text TEXT NOT NULL DEFAULT '#0D0D0F',

  -- Global stats
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_songs_played INTEGER NOT NULL DEFAULT 0,
  total_songs_correct INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,

  -- Streak
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,

  -- Liked songs
  liked_song_ids UUID[] NOT NULL DEFAULT '{}',

  -- Anonymous play tracking is client-side (localStorage), not here

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anyone can read any player profile (for leaderboards, profile pages)
CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);

-- Users can only insert/update their own profile
CREATE POLICY "players_insert_own" ON public.players FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "players_update_own" ON public.players FOR UPDATE USING (auth.uid() = id);

CREATE INDEX idx_players_username ON public.players(username);
CREATE INDEX idx_players_xp ON public.players(xp DESC);
CREATE INDEX idx_players_level ON public.players(level DESC);
CREATE INDEX idx_players_total_points ON public.players(total_points DESC);
```

### Auto-create player profile on first login

Create a database trigger that creates a `players` row when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_blindtest_player()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: if the kpopquiz app already has a trigger on auth.users,
-- this trigger should be ADDITIONAL (different name), not a replacement.
-- Check existing triggers first:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';

CREATE TRIGGER on_auth_user_created_blindtest
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_blindtest_player();
```

**Username collision handling**: If the auto-generated username already exists, append a random 4-digit number. The user can change their username later in settings.

---

## Table 2: `player_group_mastery`

Tracks per-player, per-group mastery level and XP.

```sql
CREATE TABLE public.player_group_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 1,
  mastery_xp INTEGER NOT NULL DEFAULT 0,
  songs_correct INTEGER NOT NULL DEFAULT 0,
  songs_played INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, group_id)
);

ALTER TABLE public.player_group_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mastery_select_all" ON public.player_group_mastery FOR SELECT USING (true);
CREATE POLICY "mastery_insert_own" ON public.player_group_mastery FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "mastery_update_own" ON public.player_group_mastery FOR UPDATE USING (auth.uid() = player_id);

CREATE INDEX idx_mastery_player ON public.player_group_mastery(player_id);
CREATE INDEX idx_mastery_group ON public.player_group_mastery(group_id);
CREATE INDEX idx_mastery_level ON public.player_group_mastery(mastery_level DESC);
```

### Mastery Level Thresholds

```sql
-- Mastery levels are calculated from XP, not stored separately.
-- But we store the level for fast queries.
-- Thresholds:
-- Level 1: 0 XP
-- Level 2: 50 XP
-- Level 3: 150 XP
-- Level 4: 350 XP
-- Level 5: 700 XP
-- Level 6: 1,200 XP
-- Level 7: 2,000 XP
-- Level 8: 3,500 XP
-- Level 9: 6,000 XP
-- Level 10: 10,000 XP

CREATE OR REPLACE FUNCTION public.calc_mastery_level(xp INTEGER) RETURNS INTEGER AS $$
BEGIN
  IF xp >= 10000 THEN RETURN 10;
  ELSIF xp >= 6000 THEN RETURN 9;
  ELSIF xp >= 3500 THEN RETURN 8;
  ELSIF xp >= 2000 THEN RETURN 7;
  ELSIF xp >= 1200 THEN RETURN 6;
  ELSIF xp >= 700 THEN RETURN 5;
  ELSIF xp >= 350 THEN RETURN 4;
  ELSIF xp >= 150 THEN RETURN 3;
  ELSIF xp >= 50 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## Table 3: `plays`

Records every game played (solo mode).

```sql
CREATE TABLE public.bt_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,  -- NULL for anonymous plays
  mode_id TEXT NOT NULL,              -- e.g. 'classic', 'group-bts', 'intro-challenge'
  score INTEGER NOT NULL,             -- total points (speed-weighted)
  correct INTEGER NOT NULL,           -- number of correct answers
  total INTEGER NOT NULL,             -- total songs in the round
  total_time FLOAT NOT NULL,          -- total answer time in seconds
  best_combo INTEGER NOT NULL DEFAULT 0,
  songs JSONB NOT NULL DEFAULT '[]',  -- [{ song_id, question_type, picked, correct, time, points, combo }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bt_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plays_select_all" ON public.bt_plays FOR SELECT USING (true);
CREATE POLICY "plays_insert_all" ON public.bt_plays FOR INSERT WITH CHECK (true);

CREATE INDEX idx_btplays_player ON public.bt_plays(player_id);
CREATE INDEX idx_btplays_mode ON public.bt_plays(mode_id);
CREATE INDEX idx_btplays_score ON public.bt_plays(score DESC);
CREATE INDEX idx_btplays_created ON public.bt_plays(created_at DESC);
```

### Play songs JSONB structure

```json
[
  {
    "song_id": "uuid-here",
    "question_type": "title",
    "picked": 2,
    "correct": true,
    "time": 2.3,
    "points": 143,
    "combo": 3
  },
  {
    "song_id": "uuid-here",
    "question_type": "artist",
    "picked": 0,
    "correct": false,
    "time": 10,
    "points": 0,
    "combo": 0
  }
]
```

- `question_type`: "title" or "artist" — what was asked
- `picked`: index of the choice the player tapped (0-3), or -1 for timeout
- `correct`: boolean
- `time`: seconds to answer (capped at clip duration)
- `points`: speed-weighted points for this song
- `combo`: the combo count AT THE TIME of this answer (0 if wrong or first correct)

---

## Table 4: `player_achievements`

```sql
CREATE TABLE public.player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select_all" ON public.player_achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert_own" ON public.player_achievements FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE INDEX idx_achievements_player ON public.player_achievements(player_id);
```

### Achievement definitions (in code, not in DB)

```typescript
// src/lib/achievements.ts
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'skill' | 'fandom' | 'dedication' | 'social';
  color: 'gold' | 'pink' | 'green' | 'default';
  condition: string;  // human-readable condition
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Skill ──
  { id: 'perfect_ear', name: 'Perfect Ear', description: '10/10 on any mode', category: 'skill', color: 'green', condition: 'Score 10/10 on any blind test mode' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Perfect speed round', category: 'skill', color: 'pink', condition: 'Score 20/20 on Speed Round mode' },
  { id: 'lightning_strike', name: 'Lightning Strike', description: 'Answer in under 1 second', category: 'skill', color: 'gold', condition: 'Answer a song correctly in under 1 second' },
  { id: 'combo_king', name: 'Combo King', description: '10-song combo streak', category: 'skill', color: 'gold', condition: 'Get 10 correct answers in a row in a single game' },
  { id: 'no_mercy', name: 'No Mercy', description: 'Perfect score + all under 3s', category: 'skill', color: 'gold', condition: 'Score 10/10 with every answer under 3 seconds' },

  // ── Fandom (auto-generated for each group at mastery 5) ──
  // These are created dynamically — see achievement checker

  // ── Dedication ──
  { id: 'multi_stan', name: 'Multi-stan', description: 'Level 3+ on 5 groups', category: 'dedication', color: 'pink', condition: 'Reach mastery level 3 on 5 different groups' },
  { id: 'all_rounder', name: 'All-rounder', description: 'Played every mode', category: 'dedication', color: 'default', condition: 'Play at least one game in every available mode' },
  { id: 'week_warrior', name: 'Week Warrior', description: '7-day streak', category: 'dedication', color: 'default', condition: 'Maintain a 7-day play streak' },
  { id: 'monthly_devotion', name: 'Monthly Devotion', description: '30-day streak', category: 'dedication', color: 'gold', condition: 'Maintain a 30-day play streak' },
  { id: 'centurion', name: 'Centurion', description: '100-day streak', category: 'dedication', color: 'gold', condition: 'Maintain a 100-day play streak' },
  { id: 'song_collector_100', name: 'Song Collector', description: '100 unique songs guessed', category: 'dedication', color: 'default', condition: 'Correctly guess 100 unique songs' },
  { id: 'song_collector_500', name: 'Song Master', description: '500 unique songs guessed', category: 'dedication', color: 'pink', condition: 'Correctly guess 500 unique songs' },
  { id: 'song_collector_1000', name: 'Song Legend', description: '1000 unique songs guessed', category: 'dedication', color: 'gold', condition: 'Correctly guess 1000 unique songs' },
  { id: 'daily_first', name: 'Daily Debut', description: 'Complete your first daily', category: 'dedication', color: 'default', condition: 'Complete your first daily challenge' },
  { id: 'daily_10', name: 'Daily Regular', description: '10 daily challenges done', category: 'dedication', color: 'default', condition: 'Complete 10 daily challenges' },
  { id: 'daily_50', name: 'Daily Devotee', description: '50 daily challenges done', category: 'dedication', color: 'pink', condition: 'Complete 50 daily challenges' },
];
```

---

## Table 5: `daily_challenges`

```sql
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  song_ids UUID[] NOT NULL,
  clip_point TEXT NOT NULL DEFAULT 'chorus',
  clip_duration INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_select_all" ON public.daily_challenges FOR SELECT USING (true);

CREATE INDEX idx_daily_date ON public.daily_challenges(date DESC);
```

### Daily challenge plays

```sql
CREATE TABLE public.daily_challenge_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  total_time FLOAT NOT NULL,
  songs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, challenge_id)  -- ONE play per player per day
);

ALTER TABLE public.daily_challenge_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dcp_select_all" ON public.daily_challenge_plays FOR SELECT USING (true);
CREATE POLICY "dcp_insert_own" ON public.daily_challenge_plays FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE INDEX idx_dcp_player ON public.daily_challenge_plays(player_id);
CREATE INDEX idx_dcp_challenge ON public.daily_challenge_plays(challenge_id);
CREATE INDEX idx_dcp_score ON public.daily_challenge_plays(score DESC);
```

---

## Table 6: Weekly leaderboard cache (optional optimization)

For fast leaderboard queries, maintain a materialized view or cache table:

```sql
-- This is optional — can compute leaderboards on-the-fly for now
-- Add this optimization when player count exceeds ~1000

CREATE TABLE public.bt_leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id),
  period TEXT NOT NULL,           -- 'daily', 'weekly', 'alltime'
  period_key TEXT NOT NULL,       -- '2026-03-28', '2026-W13', 'alltime'
  total_points INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, period, period_key)
);
```

For MVP, compute leaderboards directly from `bt_plays` table with queries. Add caching later.

---

## Database Functions

### Record a solo play + update all stats

```sql
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
  p_group_mastery_updates JSONB  -- [{ group_id, mastery_xp }]
) RETURNS VOID AS $$
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
      level = public.calc_player_level(xp + p_xp_earned)
    WHERE id = p_player_id;

    -- 4. Update streak
    PERFORM public.update_player_streak(p_player_id);

    -- 5. Update group mastery
    IF p_group_mastery_updates IS NOT NULL THEN
      FOR i IN 0..jsonb_array_length(p_group_mastery_updates) - 1 LOOP
        DECLARE
          gm JSONB := p_group_mastery_updates->i;
          g_id UUID := (gm->>'group_id')::UUID;
          g_xp INTEGER := (gm->>'mastery_xp')::INTEGER;
        BEGIN
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
        END;
      END LOOP;
    END IF;
  END IF;

  -- 6. Update per-song stats in blind_test_songs
  FOR i IN 0..jsonb_array_length(p_songs) - 1 LOOP
    DECLARE
      s JSONB := p_songs->i;
      s_id UUID := (s->>'song_id')::UUID;
      s_correct BOOLEAN := (s->>'correct')::BOOLEAN;
      s_time FLOAT := (s->>'time')::FLOAT;
    BEGIN
      UPDATE public.blind_test_songs SET
        times_played = times_played + 1,
        times_correct = CASE WHEN s_correct THEN times_correct + 1 ELSE times_correct END,
        updated_at = NOW()
      WHERE id = s_id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Player level calculation

```sql
CREATE OR REPLACE FUNCTION public.calc_player_level(xp INTEGER) RETURNS INTEGER AS $$
BEGIN
  IF xp >= 500000 THEN RETURN 50;
  ELSIF xp >= 150000 THEN RETURN 30;
  ELSIF xp >= 80000 THEN RETURN 25;
  ELSIF xp >= 40000 THEN RETURN 20;
  ELSIF xp >= 15000 THEN RETURN 15;
  ELSIF xp >= 5000 THEN RETURN 10;
  ELSIF xp >= 2500 THEN RETURN 8;
  ELSIF xp >= 1000 THEN RETURN 5;
  ELSIF xp >= 500 THEN RETURN 4;
  ELSIF xp >= 250 THEN RETURN 3;
  ELSIF xp >= 100 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Update streak

```sql
CREATE OR REPLACE FUNCTION public.update_player_streak(p_player_id UUID) RETURNS VOID AS $$
DECLARE
  last_date DATE;
  cur_streak INTEGER;
BEGIN
  SELECT last_played_date, current_streak INTO last_date, cur_streak
  FROM public.players WHERE id = p_player_id;

  IF last_date IS NULL OR last_date < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak broken or first play
    UPDATE public.players SET
      current_streak = 1,
      longest_streak = GREATEST(longest_streak, 1),
      last_played_date = CURRENT_DATE
    WHERE id = p_player_id;
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day — extend streak
    UPDATE public.players SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_played_date = CURRENT_DATE
    WHERE id = p_player_id;
  ELSIF last_date = CURRENT_DATE THEN
    -- Already played today — no change
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Verification

After running all migrations, verify:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('players', 'player_group_mastery', 'player_achievements', 'bt_plays', 'daily_challenges', 'daily_challenge_plays')
ORDER BY table_name;
```

Should return all 6 tables.

Also verify the existing songs table is accessible:
```sql
SELECT COUNT(*) FROM blind_test_songs WHERE status = 'active';
```

Should return 600+.

---

## What NOT To Do

- Do NOT modify the existing `profiles` table from kpopquiz — the `players` table is separate
- Do NOT modify the existing `blind_test_songs` table schema — only READ from it
- Do NOT modify the existing `groups` table — only READ from it
- Do NOT create duplicate auth triggers if one already exists — check first
- Do NOT add Arena or Party tables — those are post-MVP
- Do NOT forget to create the database functions (calc_player_level, calc_mastery_level, update_player_streak, record_bt_play)
- Do NOT use the old `blind_test_plays` table from kpopquiz — use the new `bt_plays` table
