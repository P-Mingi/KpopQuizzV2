# F2b - Community v2, part 2 (CONVERSATION layer + Daily Debate)

## Claude Code Implementation Prompt

---

F2b: the conversation half of Community v2. Prereq: F2a shipped. Adds to `/leaderboard`:
Daily Debate (centerpiece), comments wall, fresh quizzes shelf, this week's battles, and
cheers on the happening-now feed.

Hard rules: NO em dashes. Real `<Mascot>` + real badge PNGs. REAL DATA ONLY, every module
hides when empty (MIN_BOARD = 4 for boards). Git commit only per step, do NOT push. New
public routes -> route allowlist + `check:routes` green. Page stays static/ISR; personal
bits = client islands. NANO-safe: baked queries, safeFetch, no new hot-path writes except
the debate vote + cheer (both single-row, indexed). Dual-skill audit before + after.

Migration numbering: 105/106/107 taken. This workstream = **108**.

---

## Target page order after F2b (inserts in CAPS)

```
1. Header + today strip
2. Your standing v2
3. DAILY DEBATE                 <- centerpiece, above the feed
4. Happening now feed (+ CHEERS)
5. Daily ritual cards
6. Fandom war map
7. COMMUNITY PICKS (comments wall)
8. FRESH QUIZZES shelf
9. THIS WEEK'S BATTLES
10. Hall of Fame tabs
11. Badge showcase
12. Community pulse
```

---

## B1 - Migration `108_daily_debate_cheers.sql`

```sql
-- 1. Question bank (owner-seeded)
CREATE TABLE IF NOT EXISTS debate_questions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL,
  side_a     text NOT NULL,
  side_b     text NOT NULL,
  used_on    date,                  -- null = unused; set when picked
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. One debate per day
CREATE TABLE IF NOT EXISTS daily_debates (
  date        date PRIMARY KEY DEFAULT CURRENT_DATE,
  question_id uuid NOT NULL REFERENCES debate_questions(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Votes: one per user per day, optional comment attached to the side
CREATE TABLE IF NOT EXISTS debate_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date NOT NULL REFERENCES daily_debates(date),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  side       char(1) NOT NULL CHECK (side IN ('a','b')),
  comment    text CHECK (char_length(comment) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, user_id)
);
CREATE INDEX idx_debate_votes_date ON debate_votes (date, side);

-- 4. Cheers on activity events: one tap, one per user per event
CREATE TABLE IF NOT EXISTS activity_cheers (
  event_id   bigint NOT NULL REFERENCES activity_events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- RLS
ALTER TABLE debate_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_cheers ENABLE ROW LEVEL SECURITY;
CREATE POLICY dq_read  ON debate_questions FOR SELECT USING (used_on IS NOT NULL); -- unused stay secret
CREATE POLICY dd_read  ON daily_debates    FOR SELECT USING (true);
CREATE POLICY dv_read  ON debate_votes     FOR SELECT USING (true);
CREATE POLICY dv_ins   ON debate_votes     FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ac_read  ON activity_cheers  FOR SELECT USING (true);
CREATE POLICY ac_ins   ON activity_cheers  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ensure_daily_debate: idempotent, picks random unused question, marks used_on
CREATE OR REPLACE FUNCTION ensure_daily_debate(p_date date DEFAULT CURRENT_DATE)
RETURNS date LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_qid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM daily_debates WHERE date = p_date) THEN RETURN p_date; END IF;
  SELECT id INTO v_qid FROM debate_questions WHERE used_on IS NULL ORDER BY random() LIMIT 1;
  IF v_qid IS NULL THEN RETURN NULL; END IF;  -- bank empty: no debate today (UI hides)
  UPDATE debate_questions SET used_on = p_date WHERE id = v_qid;
  INSERT INTO daily_debates (date, question_id) VALUES (p_date, v_qid);
  RETURN p_date;
END $$;
REVOKE EXECUTE ON FUNCTION ensure_daily_debate FROM anon, authenticated;

-- cast_debate_vote: vote + optional comment, one shot, returns live split
CREATE OR REPLACE FUNCTION cast_debate_vote(p_side char, p_comment text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_a int; v_b int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;
  IF p_side NOT IN ('a','b') THEN RETURN jsonb_build_object('error','bad_side'); END IF;
  INSERT INTO debate_votes (date, user_id, side, comment)
  VALUES (CURRENT_DATE, v_uid, p_side, NULLIF(trim(p_comment), ''))
  ON CONFLICT (date, user_id) DO NOTHING;
  SELECT count(*) FILTER (WHERE side='a'), count(*) FILTER (WHERE side='b')
    INTO v_a, v_b FROM debate_votes WHERE date = CURRENT_DATE;
  PERFORM emit_activity('debate_voted', v_uid, NULL, jsonb_build_object('side', p_side));
  RETURN jsonb_build_object('a', v_a, 'b', v_b);
END $$;
```

Owner runs 108 on prod dashboard (NOT Bloom). Seed the bank right after (B2).

## B2 - Seed the question bank

Owner curates `docs/debate-question-bank.md` (60 drafted, edit freely), then Claude Code
writes `109_debate_seed.sql` INSERTing the approved rows. Questions with a group/artist
comparison stay as-written (factual matchups OK); nothing targeting an individual idol
negatively. 280-char comment cap enforced by schema.

## B3 - Daily Debate UI (the centerpiece)

**Component:** `components/community/daily-debate.tsx` + tiny client island for voting.

- Server-baked: today's question via `ensure_daily_debate` (service role, same pattern as
  ensure_daily_quiz on home load) + current split + top comments.
- Card: "DAILY DEBATE" label + countdown pill (UTC midnight, same as QOTD) + the question
  big + two side buttons (side_a / side_b) + live split bar between them.
- Vote flow (island): tap side -> optimistic split update -> comment box appears
  ("Defend your pick, 280 max, optional") -> submit -> your comment joins your side's column.
- After voting (or if already voted, localStorage + server check): buttons lock, split bar
  shows %, comments visible in two columns (mobile: stacked A then B), each = PersonCard
  mini + comment + report button. Top 5 per side by recency, "see all" expands inline.
- Anon: sees question + split + comments, tap side -> sign-in nudge (reuse ResultLoop nudge
  styling + `result_signin_click` analytics with type 'debate' NO - keep event names frozen:
  fire `cross_promo_click` from='community' to='login-debate' instead).
- Bank empty / no debate today: whole card hides. NEVER a placeholder question.
- Report on comments: reuse the existing report pattern (question_reports / ReportForm infra)
  pointed at debate_votes.id. If that table is quiz-specific, add a `debate_comment` type to
  it in 108 rather than a new table.
- No streak credit for debate votes (ritual = quiz/blindtest/game only). XP: none v1. Keep
  the loop pure: debate = expression, not grind.

## B4 - Community picks (comments wall)

- Query: latest 8 quiz comments site-wide (quiz_comments + profiles flair + quiz title/slug,
  score/total from mig 099 when present). Exclude comments < 3 chars.
- Row: PersonCard mini + comment (2-line clamp) + "on {quiz title}" link + score chip when
  score-anchored ("after scoring 9/10") + report button (existing report infra).
- ALL comments shown (owner decision), report button on every row.
- Section hides under 4 comments.

## B5 - Fresh quizzes shelf

- Query: latest 6 published quizzes + creator flair. Reuse QuizCard if it fits a compact
  2-col grid; else slim rows (cover chip + title + creator PersonCard mini + play count).
- End cap: "Make your own" card -> /create (fires `cross_promo_click` from='community'
  to='create').
- Hides under 3 quizzes in last 30 days (stale shelf = dead signal).

## B6 - This week's battles

- Query: top 5 battle wins this week (battles tables from mig 073) + winner flair; if
  battles thin (< 4), fall back to most-voted duel matchups this week (duel tables, mig 067);
  if both thin, section hides.
- Row: winner PersonCard + "won a battle" / matchup title + score + coarse time.

## B7 - Cheers on the feed

- Happening-now rows (F2a) get a cheer button: heart-hands icon + count.
- Island: one tap -> POST insert into activity_cheers (ON CONFLICT DO NOTHING) -> optimistic
  count bump -> button locks. Anon tap -> sign-in nudge.
- Cheer count baked at ISR time; only the user's own tap is live. Honest counts, slightly
  stale = fine.
- Notification to the cheered user: reuse notification system, type 'cheer' (add to the
  allowed types if mig 095 whitelist needs it - check first). Batch-safe: notify on first
  cheer per event only (no spam).
- Feed rows for 'someone' (anon) get no cheer button.

## Build order (commit each, NO push)

1. B1 migration 108 written -> OWNER RUNS IT -> verify tables + RPCs on prod. Commit.
2. B2 seed: owner curates bank -> 109 seed migration -> OWNER RUNS -> verify count. Commit.
3. B3 Daily Debate (server card + vote island + comments + report). Commit.
4. B4 comments wall. Commit.
5. B5 fresh quizzes shelf. Commit.
6. B6 battles. Commit.
7. B7 cheers (button + notification). Commit.
8. Consistency pass: dark/light, 430px/desktop, empty-state audit (bank empty, no comments,
   no battles), page still ISR, check:routes, tsc, build. Commit.

## Verification

- [ ] ensure_daily_debate idempotent; bank-empty day = card hidden, no error
- [ ] One vote per user per day enforced by DB (test double-vote via API = no-op)
- [ ] Comment cap 280 enforced DB-side; report button on every debate comment + wall comment
- [ ] Debate vote emits activity event; feed shows "picked a side in today's debate"
- [ ] Cheers: one per user per event (DB), notification fires once per event, anon = nudge
- [ ] No streak/XP from debate votes
- [ ] All new sections hide when empty; zero fabricated data
- [ ] Page ISR unchanged; islands only: debate vote, cheers, played-state, tabs, standing
- [ ] Analytics: existing event names only
- [ ] check:routes green; tsc clean; build green; zero em/en dashes

/caveman report per step: screenshots, real query outputs, deviations + why.
