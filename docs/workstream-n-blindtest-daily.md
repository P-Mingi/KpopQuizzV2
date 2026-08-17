# Workstream N - Blindtest of the Day + Mobile Nav Fix

## Claude Code Implementation Prompt

---

Workstream N: two tightly related features. The blindtest is invisible on mobile (not in the
bottom tab bar) and has no daily ritual. Fix both: put it in the nav, give it a daily mode.
NO em dashes. Real mascot only. Git commit only, do NOT push.

Dual-skill audit: `/ui-ux-pro-max` + `/frontend-design` before and after.

---

### N0 - Mobile tab bar: swap Leaderboard for Blindtest

**File:** `apps/quiz/src/components/layout/mobile-tab-bar.tsx`

The current TABS array is:
```
Home | Quizzes | + Create | Games | Leaderboard
```

Change to:
```
Home | Quizzes | + Create | Blindtest | Games
```

Specifics:
- Replace the Leaderboard entry with `{ label: 'Blindtest', href: '/blindtest', match: ['/blindtest', '/blind-test'] }`
- Move Games to the last slot (position 5)
- Add the music-note icon for Blindtest in `TabIcon`. Use the same SVG as the desktop nav
  (`top-nav-links.tsx` line 41-43):
  ```
  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  ```
- Games keeps its trophy icon
- Leaderboard is removed from the tab bar. It remains accessible from:
  the Games hub page, profile/community pages, and result screens.

**Verify:** on mobile (430px), the 5 tabs render cleanly. Blindtest highlights when on
`/blindtest` or `/blindtest/*`. Games highlights on `/games` or `/games/*`. No layout shift.

---

### N1 - DB migration: `106_daily_blindtest.sql`

NOTE: 105 is taken (badge notification). This migration is **106**.

**File:** `supabase/migrations/106_daily_blindtest.sql`

```sql
-- Workstream N: Blindtest of the Day

-- 1. The daily blindtest definition (one row per day)
CREATE TABLE IF NOT EXISTS daily_blindtests (
  date       date PRIMARY KEY DEFAULT CURRENT_DATE,
  song_ids   uuid[] NOT NULL,                        -- exactly 10 song IDs
  question_types text[] NOT NULL,                     -- 'artist' or 'title' per song
  seed       int NOT NULL DEFAULT (floor(random() * 2147483647)::int),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Player scores (one play per user per day)
CREATE TABLE IF NOT EXISTS daily_blindtest_scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date NOT NULL REFERENCES daily_blindtests(date),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  score      smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  time_ms    int NOT NULL CHECK (time_ms >= 0),       -- total answer time across all 10 songs
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, user_id)
);

-- Index for leaderboard queries (score DESC, time_ms ASC = faster wins ties)
CREATE INDEX idx_dbt_scores_leaderboard
  ON daily_blindtest_scores (date, score DESC, time_ms ASC);

-- RLS: anyone can read daily_blindtests (the questions are public after generation).
-- Scores: users can read all (leaderboard), insert their own.
ALTER TABLE daily_blindtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_blindtest_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_blindtests_read" ON daily_blindtests
  FOR SELECT USING (true);

CREATE POLICY "daily_bt_scores_read" ON daily_blindtest_scores
  FOR SELECT USING (true);

CREATE POLICY "daily_bt_scores_insert" ON daily_blindtest_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. ensure_daily_blindtest(p_date) - like ensure_daily_quiz but for blindtest.
-- Picks 10 songs from the curated 'all' pool with the daily tier mix:
-- 3 iconic, 3 popular, 3 medium, 1 hard, 0 unknown.
-- Avoids songs used in the last 7 days. Idempotent (returns existing row if already set).
CREATE OR REPLACE FUNCTION ensure_daily_blindtest(p_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing date;
  v_song_ids uuid[];
  v_question_types text[];
  v_tier_targets int[] := ARRAY[3, 3, 3, 1, 0]; -- iconic, popular, medium, hard, unknown
  v_tiers text[] := ARRAY['iconic', 'popular', 'medium', 'hard', 'unknown'];
  v_recent_ids uuid[];
  v_picked uuid[];
  v_tier text;
  v_target int;
  v_batch uuid[];
  v_types text[];
  v_i int;
  v_group_count int;
  v_rng float;
BEGIN
  -- Idempotent: return if already exists
  SELECT date INTO v_existing FROM daily_blindtests WHERE date = p_date;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- Songs used in the last 7 days (avoid repeats)
  SELECT COALESCE(array_agg(s), ARRAY[]::uuid[])
  INTO v_recent_ids
  FROM (
    SELECT unnest(song_ids) AS s
    FROM daily_blindtests
    WHERE date >= p_date - 7 AND date < p_date
  ) sub;

  v_picked := ARRAY[]::uuid[];

  -- Pick per tier
  FOR v_i IN 1..5 LOOP
    v_tier := v_tiers[v_i];
    v_target := v_tier_targets[v_i];
    IF v_target = 0 THEN CONTINUE; END IF;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_batch
    FROM (
      SELECT id FROM songs
      WHERE status = 'active'
        AND is_curated = true
        AND tier = v_tier
        AND id != ALL(v_picked)
        AND id != ALL(v_recent_ids)
        AND title NOT ILIKE '%remix%'
        AND title NOT ILIKE '%instrumental%'
        AND title NOT ILIKE '%inst.%'
        AND title NOT ILIKE '%karaoke%'
      ORDER BY random()
      LIMIT v_target
    ) sub;

    v_picked := v_picked || v_batch;
  END LOOP;

  -- Fill to 10 if any tier was short (pull from popular, then medium, then iconic)
  IF array_length(v_picked, 1) IS NULL OR array_length(v_picked, 1) < 10 THEN
    SELECT v_picked || COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_picked
    FROM (
      SELECT id FROM songs
      WHERE status = 'active'
        AND is_curated = true
        AND id != ALL(v_picked)
        AND id != ALL(v_recent_ids)
        AND title NOT ILIKE '%remix%'
        AND title NOT ILIKE '%instrumental%'
      ORDER BY
        CASE tier WHEN 'popular' THEN 1 WHEN 'medium' THEN 2 WHEN 'iconic' THEN 3 WHEN 'hard' THEN 4 ELSE 5 END,
        random()
      LIMIT 10 - COALESCE(array_length(v_picked, 1), 0)
    ) sub;
  END IF;

  -- Shuffle the picked array (Fisher-Yates in plpgsql)
  FOR v_i IN REVERSE array_length(v_picked, 1)..2 LOOP
    DECLARE
      v_j int := 1 + floor(random() * v_i)::int;
      v_tmp uuid := v_picked[v_i];
    BEGIN
      v_picked[v_i] := v_picked[v_j];
      v_picked[v_j] := v_tmp;
    END;
  END LOOP;

  v_song_ids := v_picked[1:10];

  -- Assign question types: ~60% artist, ~40% title (same logic as generate endpoint).
  -- But skip 'artist' for songs where many songs share the same artist (group playlists
  -- aren't relevant here since daily is always 'all', but we keep it balanced).
  v_group_count := 6; -- base: 6 artist, 4 title
  v_rng := random();
  IF v_rng < 0.33 THEN v_group_count := 5;
  ELSIF v_rng > 0.66 THEN v_group_count := 7;
  END IF;
  v_group_count := LEAST(v_group_count, 10);

  v_types := ARRAY[]::text[];
  FOR v_i IN 1..10 LOOP
    IF v_i <= v_group_count THEN
      v_types := v_types || 'artist';
    ELSE
      v_types := v_types || 'title';
    END IF;
  END LOOP;

  -- Shuffle question types so they interleave
  FOR v_i IN REVERSE array_length(v_types, 1)..2 LOOP
    DECLARE
      v_j2 int := 1 + floor(random() * v_i)::int;
      v_tmp2 text := v_types[v_i];
    BEGIN
      v_types[v_i] := v_types[v_j2];
      v_types[v_j2] := v_tmp2;
    END;
  END LOOP;

  INSERT INTO daily_blindtests (date, song_ids, question_types)
  VALUES (p_date, v_song_ids, v_types);

  RETURN p_date;
END;
$$;

-- REVOKE direct execution from anon/authenticated (server-only, like ensure_daily_quiz)
REVOKE EXECUTE ON FUNCTION ensure_daily_blindtest FROM anon, authenticated;

-- 4. Submit score + return rank
CREATE OR REPLACE FUNCTION submit_daily_bt_score(
  p_date date,
  p_score smallint,
  p_time_ms int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rank int;
  v_total int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Insert (unique constraint prevents double-play)
  INSERT INTO daily_blindtest_scores (date, user_id, score, time_ms)
  VALUES (p_date, v_user_id, p_score, p_time_ms)
  ON CONFLICT (date, user_id) DO NOTHING;

  -- Compute rank
  SELECT COUNT(*) + 1 INTO v_rank
  FROM daily_blindtest_scores
  WHERE date = p_date
    AND (score > p_score OR (score = p_score AND time_ms < p_time_ms));

  SELECT COUNT(*) INTO v_total FROM daily_blindtest_scores WHERE date = p_date;

  RETURN jsonb_build_object(
    'rank', v_rank,
    'total', v_total,
    'score', p_score,
    'time_ms', p_time_ms
  );
END;
$$;

-- 5. Get today's leaderboard (top 20)
CREATE OR REPLACE FUNCTION get_daily_bt_leaderboard(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  score smallint,
  time_ms int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.score DESC, s.time_ms ASC) AS rank,
    s.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    s.score,
    s.time_ms
  FROM daily_blindtest_scores s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.date = p_date
  ORDER BY s.score DESC, s.time_ms ASC
  LIMIT 20;
$$;
```

**Apply this migration to prod immediately** (rdkgouofytwfdpbxbzio, NOT Bloom). The Supabase
MCP connects to Bloom, so apply via the Supabase dashboard SQL editor or `psql` directly.

---

### N2 - API endpoints

#### N2.1 `apps/quiz/src/app/api/daily/blindtest/route.ts` (GET)

Returns today's 10 questions. Server-only (calls `ensure_daily_blindtest` via service role,
then hydrates each song from the `songs` table + re-fetches Deezer preview URLs).

```
GET /api/daily/blindtest
Response: {
  date: "2026-07-20",
  questions: Question[],  // same shape as /api/blind-test/generate
  timer_duration: 10,
  songs_count: 10
}
```

Flow:
1. `createServiceRoleClient()` to call `ensure_daily_blindtest(CURRENT_DATE)`.
2. Read back the row: `SELECT song_ids, question_types FROM daily_blindtests WHERE date = today`.
3. Fetch the 10 songs from `songs` table by ID (single query, `id = ANY(song_ids)`).
4. Re-fetch Deezer preview URLs (same logic as `/api/blind-test/generate` lines 236-248).
5. Build the `Question[]` array using the stored `question_types` to decide artist vs title
   per song. Use the same `wrong_answers_artist` / `wrong_answers_title` + fallback logic
   from the generate endpoint.
6. Return the questions in the song_ids order (deterministic for everyone).

Cache: `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` so Vercel edge caches
it for 5 minutes (reduces Deezer API calls). The questions are the same all day.

#### N2.2 `apps/quiz/src/app/api/daily/blindtest/submit/route.ts` (POST)

```
POST /api/daily/blindtest/submit
Body: { score: number, time_ms: number }
Response: { rank, total, score, time_ms, streak_result?: DailyCompleteResult }
```

Flow:
1. Auth check via `createServerClient()` + `getUser()`. Return 401 if not signed in.
2. Call RPC `submit_daily_bt_score(today, score, time_ms)` via service role.
3. Also call `completeDaily('blindtest')` for the streak. NOTE: extend `DailyKind` type in
   `daily-played.ts` to include `'blindtest'`. The server-side `awardDailyStreak` is already
   kind-agnostic (it just checks `last_daily_date`), so playing either QOTD or BToTD on the
   same day is idempotent. The first one awards XP, the second is a no-op.
4. Return combined result: rank info + streak info.

#### N2.3 `apps/quiz/src/app/api/daily/blindtest/leaderboard/route.ts` (GET)

```
GET /api/daily/blindtest/leaderboard?date=2026-07-20
Response: { entries: [...], user_entry?: {...} }
```

Calls `get_daily_bt_leaderboard(date)`. If the user is signed in and not in the top 20, also
query their personal row and append as `user_entry`.

---

### N3 - Home page: Blindtest of the Day card

**New file:** `apps/quiz/src/components/home/home-btotd.tsx`

This mirrors `HomeQotd` but for blindtest. Placed in the existing `daily-twoup` grid alongside
QOTD (replacing or sitting beside the current `GameOfTheDay` component).

Layout:
```
<div className="daily-twoup">
  <HomeQotd quiz={qotd} />        // existing
  <HomeBtotd />                    // NEW (replaces GameOfTheDay)
</div>
```

The card design:
- Section label: music-note icon + "Blindtest of the day"
- Card with a purple-ish gradient banner (`--blind` accent: #7c5cfc family)
- Countdown pill "Resets in Xh Ym" (same UTC midnight logic as QOTD)
- Audio waveform motif in the banner (reuse the WAVE bars from `home-blindtest-cta.tsx`)
- Body: "10 songs, same for everyone" subtitle, streak chip if active
- CTA: pulsing "Play today's blindtest" button (or "Played today - come back tomorrow" with
  sleeping mascot if already played)
- The card links to `/blindtest?daily=true`

Data: this is a client component. It reads `hasPlayedDaily('blindtest')` on mount (localStorage).
No server data fetch needed for the card itself (the actual questions load when you tap Play).

**Update `apps/quiz/src/app/page.tsx`:**
- Import `HomeBtotd`
- In `QotdSection`, change from `<GameOfTheDay data={gotd} />` to `<HomeBtotd />`
- Move `GameOfTheDay` to a lower position (below the blindtest CTA or merge into
  `HomeGamesTeaser`). The This-or-That duel still gets home exposure, just not in the
  premium daily-twoup slot.

**Update `apps/quiz/src/lib/daily-played.ts`:**
- Extend `DailyKind` to: `'quiz' | 'game' | 'blindtest'`
- The existing `markDailyPlayed` / `hasPlayedDaily` / `completeDaily` functions work unchanged
  since they're parameterized by kind.

**Also update `apps/quiz/src/app/api/daily/complete/route.ts`:**
- Extend the kind validation to accept `'blindtest'` alongside `'quiz'` and `'game'`.

**Remove the standalone `HomeBlindtestCta`** from the home page (line 199 in page.tsx). It was
the "primary mobile discovery path" when blindtest wasn't in the bottom bar. Now it IS in the
bottom bar + has a daily card, so the old CTA strip is redundant.

---

### N4 - Daily blindtest play flow

**File:** `apps/quiz/src/components/blind-test/blindtest-game.tsx`

When the URL has `?daily=true`, the blindtest enters daily mode:

1. **Skip the setup screen.** No playlist picker. Go straight to loading.
2. **Fetch from `/api/daily/blindtest`** instead of POST to `/api/blind-test/generate`.
3. **Track answer times.** For each question, record the ms between question appearing and
   answer being tapped. Sum all 10 into `total_time_ms`. This is the tiebreak for the
   leaderboard. Store in component state (an array of per-question ms alongside the existing
   `answers` array, or extend the Answer interface to include `time_ms`).
4. **One play only.** After finishing, `markDailyPlayed('blindtest')` prevents replaying today.
   If `hasPlayedDaily('blindtest')` is true on mount in daily mode, show the results/leaderboard
   directly (or a "you already played today" state with the leaderboard + countdown).
5. **No "Play again" button** in daily mode. Instead show "Come back tomorrow" + the countdown.
   The "Change playlist" back button becomes "Play free mode" (links to `/blindtest` without
   `?daily=true`).

The non-daily (free play) mode is completely unchanged.

---

### N5 - Result screen: leaderboard

After the daily blindtest finishes:

1. Call `POST /api/daily/blindtest/submit` with `{ score, time_ms: totalTimeMs }`.
2. Display the result card (same style as current: score/10 + label + mascot).
3. Below the result card, show **"Today's leaderboard"**:
   - Fetch `GET /api/daily/blindtest/leaderboard?date=today`
   - Render a compact table: rank, avatar+name, score/10, time (formatted as "42.1s")
   - Highlight the current user's row
   - If user is not in top 20, show their row at the bottom with "..." separator
4. Share text:
   `"I scored X/10 on today's K-pop Blindtest of the Day in Y.Zs - kpopquiz.org/blindtest"`
5. If not signed in: show the score + breakdown, nudge to sign in to "join the leaderboard
   and save your streak", but do NOT submit to the leaderboard (anon plays are valid but
   unranked, same philosophy as the current blindtest nudge at 3+ plays).

---

### N6 - Streak integration

The daily streak system (`daily-streak.ts`) is already kind-agnostic. It checks
`profiles.last_daily_date` against today:
- If already today: no-op (awarded: 0)
- If yesterday: streak + 1
- Otherwise: streak resets to 1

Playing QOTD OR BToTD on the same day awards XP only once (the first one). The second is a
no-op. This is correct: we want either daily to keep the streak alive, not require both.

Changes needed:
- `daily-played.ts`: add `'blindtest'` to `DailyKind` (N3 above)
- `api/daily/complete/route.ts`: accept `'blindtest'` kind (N3 above)
- `HomeStreakNudge`: if it currently only mentions "quiz", update copy to say "daily quiz or
  blindtest" so users know either one counts

---

### N7 - Portuguese i18n

Add dictionary entries for all new UI strings in `apps/quiz/src/lib/i18n/dictionaries/en.json`
and `pt.json`:

```json
{
  "daily_blindtest": "Blindtest of the day",
  "daily_blindtest_sub": "10 songs, same for everyone",
  "play_daily_blindtest": "Play today's blindtest",
  "played_daily_blindtest": "Played today - come back tomorrow",
  "todays_leaderboard": "Today's leaderboard",
  "join_leaderboard_nudge": "Sign in to join the leaderboard",
  "play_free_mode": "Play free mode",
  "come_back_tomorrow": "Come back tomorrow"
}
```

Portuguese translations:
```json
{
  "daily_blindtest": "Blindtest do dia",
  "daily_blindtest_sub": "10 musicas, iguais para todos",
  "play_daily_blindtest": "Jogar o blindtest de hoje",
  "played_daily_blindtest": "Ja jogou hoje - volte amanha",
  "todays_leaderboard": "Ranking de hoje",
  "join_leaderboard_nudge": "Entre para aparecer no ranking",
  "play_free_mode": "Jogar modo livre",
  "come_back_tomorrow": "Volte amanha"
}
```

---

### Build order (execute sequentially, commit after each)

1. **N1** - Apply migration 106 to prod. Verify tables + RPCs exist.
2. **N0** - Mobile tab bar swap. Verify on 430px. Commit.
3. **N2** - API endpoints (daily/blindtest, submit, leaderboard). Test with curl. Commit.
4. **N3** - Home page: HomeBtotd card + remove old BlindtestCta + move GameOfTheDay. Commit.
5. **N4** - Daily mode in blindtest-game.tsx (?daily=true flow). Commit.
6. **N5** - Result screen leaderboard. Commit.
7. **N6** - Streak integration (DailyKind extension + copy update). Commit.
8. **N7** - i18n strings. Commit.

**After each step: `git commit` only, do NOT `git push`.** Owner batches pushes to control
Vercel build costs.

---

### Verification checklist

- [ ] Mobile tab bar shows Blindtest with music icon, highlights correctly on /blindtest
- [ ] `ensure_daily_blindtest` is idempotent (calling twice returns same date)
- [ ] `GET /api/daily/blindtest` returns 10 questions, same across multiple calls same day
- [ ] `POST /api/daily/blindtest/submit` records score, returns rank, rejects duplicate plays
- [ ] Home page daily-twoup shows QOTD + BToTD side by side
- [ ] BToTD card shows "Played today" state after playing (localStorage)
- [ ] `/blindtest?daily=true` skips setup, loads daily questions, tracks per-question time
- [ ] Result screen shows rank + mini leaderboard
- [ ] Playing BToTD awards daily streak XP (first daily of the day only)
- [ ] Playing QOTD then BToTD same day: second awards 0 XP (idempotent)
- [ ] Anon can play daily but cannot submit to leaderboard
- [ ] No em dashes or en dashes in any string
- [ ] `tsc` clean, build green, /blindtest page stays static (daily questions fetched client-side)
- [ ] Dark mode + light mode both look correct
- [ ] Old HomeBlindtestCta removed, GameOfTheDay relocated

/caveman report after each step.
