# kpopquiz.org — Pipeline 1: Duel → Ranking Engine (Cowork build spec)

The content engine that turns fan taps into crowd-truthful, SEO-valuable ranking pages with zero writing and zero possibility of being factually wrong. This redesigns the existing This-or-That game so every vote feeds a live Elo ranking, and auto-generates ranking landing pages.

This is a major strategic feature. Treat it as its own workstream (Workstream C) in the orchestration brief. Same rules apply: one step at a time, dual-skill audit (`/ui-ux-pro-max` + `/frontend-design`) on every UI step, backend skill for data/jobs.

---

## 0. The core principle (read before building)

Two content types only:
- **Opinion** (no objective truth: best dancer, ult bias, best b-side) → the crowd vote IS the answer. Cannot be wrong.
- We do NOT build fact-based auto-content here. No AI-written facts anywhere in this system. The ranking only ever states what fans voted.

Everything below produces opinion rankings. A ranking page never asserts a fact — it asserts "fans voted X." This is its safety guarantee and its SEO value.

---

## 1. Data model

Three new tables. Use the backend skill for migrations.

### 1a. `duel_questions`
Defines a matchup category. One row per `(group, question_type)`.
```
id            uuid pk
group_slug    text        -- 'bts', 'blackpink', 'general', etc.
question_type text        -- 'best-dancer', 'best-vocalist', 'ult-bias', 'best-bside', 'best-mv'
prompt        text        -- "Who is the better dancer?"
entity_kind   text        -- 'idol' | 'song' | 'group'
min_votes     int default 500   -- floor before the ranking page goes public
is_active     bool default true
created_at    timestamptz default now()
```

### 1b. `duel_votes`
One row per tap. This is the raw signal — never edited, only inserted.
```
id            uuid pk
question_id   uuid fk -> duel_questions.id
option_a_id   uuid        -- entity id (idol/song/group)
option_b_id   uuid
winner_id     uuid        -- equals option_a_id or option_b_id
voter_hash    text        -- anonymous: hash(ip + day) or session id; dedupe abuse, no account needed
created_at    timestamptz default now()
```
Index on `(question_id, created_at)`. The `voter_hash` exists only to throttle obvious abuse (same hash voting the same pair 100x), not to identify people. No auth required to vote.

### 1c. `duel_ratings`
Current Elo per entity per question. This is the computed state the ranking pages read from.
```
question_id   uuid fk -> duel_questions.id
entity_id     uuid
entity_name   text
entity_image  text
elo           numeric default 1500
wins          int default 0
losses        int default 0
last_delta    int default 0     -- for the "+12" animation on the live widget
updated_at    timestamptz default now()
primary key (question_id, entity_id)
```

---

## 2. The Elo computation

Plain Elo, K-factor 24. Never use raw vote counts for ranking — they reward fame, not the actual question. Elo lets an underdog who consistently wins "best dancer" climb above a more famous member.

The math, per resolved duel where A beat B:
```
expectedA = 1 / (1 + 10^((eloB - eloA) / 400))
expectedB = 1 - expectedA
deltaA = round(K * (1 - expectedA))     -- A won, actual = 1
deltaB = round(K * (0 - expectedB))     -- B lost, actual = 0  (negative)
eloA += deltaA
eloB += deltaB
last_delta for A = deltaA, for B = deltaB
wins/losses incremented accordingly
```

### Two ways to run it — build both:

**2a. Real-time (for the live widget).** On each vote insert, immediately update the two affected `duel_ratings` rows in the same transaction. This powers the live ranking that reorders as the fan plays. Keep it cheap — two row updates.

**2b. Nightly reconciliation job.** A batch job that recomputes Elo from scratch over all `duel_votes` for each question (chronological replay), and overwrites `duel_ratings`. This corrects any drift from the real-time path, handles late-arriving votes, and lets you tune K or the starting rating without losing history. Run it nightly. Use the backend skill / a scheduled function (Supabase cron or Vercel cron).

Why both: real-time gives the satisfying live reorder; nightly guarantees the public ranking pages are consistent and tunable. The raw `duel_votes` are the source of truth — ratings are always re-derivable.

---

## 3. API endpoints

Use the backend skill. Four endpoints.

### 3a. `GET /api/duels/next?group={slug}&type={type}`
Returns the next matchup to show. Logic:
- Pick two entities from the question's pool.
- Bias toward pairs with FEW prior votes (so coverage is even) and pairs with CLOSE Elo (more informative, more fun — close calls feel better than blowouts).
- Return both entities (id, name, image) + the current vote split for the reveal + total votes on this matchup.

### 3b. `POST /api/duels/vote`
Body: `{ question_id, option_a_id, option_b_id, winner_id, voter_hash }`.
- Insert into `duel_votes`.
- Run real-time Elo (2a) on the two entities.
- Return the updated top-N ranking for that question (so the widget can reorder), plus the `last_delta` of the winner for the "+N" animation.
- Abuse guard: if `voter_hash` voted this exact pair within the last hour, accept the UI interaction but do not double-count.

### 3c. `GET /api/rankings/{group}/{type}`
Returns the full ranking for a question (all entities sorted by Elo, with wins/losses, total vote count). Used by the ranking page and the live widget's initial render. Only returns a "public" flag = true if `total votes >= min_votes`.

### 3d. `GET /api/rankings/index`
Returns all public rankings (for the rankings hub page and sitemap generation).

---

## 4. Ranking pages (the SEO payoff)

### 4a. Route structure
- `/rankings` — hub page listing all public rankings, grouped by group.
- `/rankings/{group}/{type}` — individual ranking, e.g. `/rankings/bts/best-dancer`.

### 4b. Generation rule
A ranking page becomes public (indexable, in sitemap) only once its question passes `min_votes` (default 500). Below that, the data exists but the page returns noindex and shows "not enough votes yet — play to unlock." This prevents thin pages from hurting the SEO recovery (ties into the indexation fix doc).

### 4c. Rendering — MUST be server-rendered
Per the SEO indexation fix, these pages must be SSR/SSG with ISR. The ranking, vote counts, and entity names must be in the server HTML. Use `revalidate` (e.g. hourly) so the nightly Elo job's results appear without a rebuild.

### 4d. Page content (each ranking page)
- Server-rendered `<h1>`: "BTS best dancers — ranked by {totalVotes} fan votes".
- Unique meta description generated from the data: "Fans voted {topEntity} the best dancer in BTS. See the full fan-voted ranking of all 7 members."
- The ranked list (entity image, name, Elo or a friendlier "fan score", win rate, position).
- `ItemList` schema.org JSON-LD for the ranking (helps Google show it as a list).
- A prominent "Vote on these matchups →" button that drops the visitor into the duel game for this question (the loop-back).
- Related rankings block linking to other questions for the same group and the same question for other groups (internal linking for crawl).

### 4e. The loop-back wiring
Every ranking page → "Vote" button → `/games/this-or-that?group={group}&type={type}` with the live widget. Every live widget → "See full ranking page →" link → the ranking page. This closed loop is the growth engine: Google visitor lands on ranking → plays duels → votes refine ranking → page improves → ranks higher → more visitors.

---

## 5. This-or-That game redesign (frontend)

Skill: `/frontend-design` to build, `/ui-ux-pro-max` to audit. Use the prototype already validated in the design conversation as the canonical reference — match it exactly.

### 5a. Layout (top to bottom)
1. Question label (uppercase, brand color) + question prompt (display font, bold).
2. Matchup meta: "{n} fans have voted on this matchup".
3. The duel: two large image cards with a circular `VS` badge between them.
4. Skip + Next buttons.
5. Session vote tally: "Your votes this session: {n}".
6. The live ranking card (the differentiator).

### 5b. Duel cards
```css
.opt {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  position: relative;
}
.opt:hover:not(.locked) {
  transform: translateY(-3px);
  border-color: var(--brand);
  box-shadow: 0 10px 28px rgba(232,69,122,.12);
}
.opt.picked     { border-color: var(--brand); border-width: 2.5px; }
.opt.notpicked  { opacity: .55; }
.opt-img        { width: 100%; height: 150px; object-fit: cover; }
.opt-body       { padding: 12px 14px; text-align: center; }
.opt-name       { font-size: 15px; font-weight: 700; color: var(--txt1); }
.opt-sub        { font-size: 11px; color: var(--txt3); margin-top: 1px; }
```

### 5c. The VS badge (site signature)
```css
.vs {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 13px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  letter-spacing: .03em; flex-shrink: 0;
}
```

### 5d. The vote reveal
On tap: both cards lock. The picked card gets a 2.5px brand border, the other dims to 55% opacity. A result strip slides open inside each card (height 0 → 34px) showing a mini progress bar + the vote percentage. Animate the bar width and count the percentage in over ~600ms.
```css
.opt-result { height: 0; overflow: hidden; transition: height 300ms ease; background: var(--brand-light); }
.opt.locked .opt-result { height: 34px; }
.opt-bar-fill { height: 100%; background: var(--brand); border-radius: 100px; width: 0; transition: width 600ms ease; }
.opt.notpicked .opt-bar-fill { background: var(--txt3); }
```

### 5e. The live ranking card (the whole point)
Below the duel, a card titled "Best dancers in BTS" with a green "Live" pill. It lists the entities sorted by Elo. On each vote:
- The two affected entities' Elo updates.
- The list reorders (sort by Elo).
- The entity that just moved gets a pink highlight background (`.bump`) for ~1s.
- A "+N" delta in green appears next to the winner's score, "—" for everyone else.
- A "See full ranking page →" link at the bottom routes to the ranking page.

```css
.rank-card  { background: var(--surface); border: .5px solid var(--border); border-radius: 16px; padding: 16px; margin-top: 8px; }
.rank-live  { font-size: 10px; font-weight: 700; color: #166534; background: #DCFCE7; padding: 2px 8px; border-radius: 100px; }
.rank-row   { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: .5px solid var(--border); transition: background 300ms; }
.rank-row.bump { background: var(--brand-light); border-radius: 8px; padding-left: 8px; padding-right: 8px; }
.rank-pos.top  { color: var(--brand); }
.rank-elo   { font-size: 12px; font-weight: 700; color: var(--txt2); font-variant-numeric: tabular-nums; }
.rank-delta.up { color: #166534; font-weight: 700; }
```

Note: show the Elo as a friendlier "fan score" if a raw number like 1612 feels too technical for fans — but tabular-nums and a climbing number is satisfying, so test both with `/ui-ux-pro-max`.

### 5f. Category picker
At the top of `/games/this-or-that`, let the user pick the question: a row of pills — "Best dancer", "Best vocalist", "Ult bias", "Best b-side", "Best MV" — and a group filter. Changing either loads a new question and its live ranking. Default to the most-played question for the selected group.

### 5g. Mobile
- Duel cards stay side by side (they're the core interaction) but shrink image height to ~120px.
- VS badge shrinks to 36px.
- Ranking card full width below.
- Everything one-thumb reachable.

---

## 6. Seeding (avoid the empty-ranking problem)

A ranking with 3 votes looks dead and ranks nothing. Seed before launch:
- For each launch question (start with ~5 questions × top 8 groups = 40 rankings), pre-generate a plausible starting Elo spread so the first visitor sees a populated, believable ranking, then let real votes take over.
- Set `min_votes` so pages only go public once real engagement validates them.
- Launch with 2-3 questions (best dancer, ult bias, best b-side) for the biggest groups only. Expand once the loop proves out.

---

## 7. Anti-abuse (light touch)

- `voter_hash` = hash(ip + date) or session id. Throttle: same hash can't move the same pair more than once per hour (UI still feels responsive, just doesn't double-count).
- Nightly job can discard statistical outliers (e.g. a single hash casting 1000 votes in an hour).
- No account required. Friction kills the loop. The whole point is tap-and-go.

---

## 8. Build order (Workstream C)

1. **C1** — migrations: `duel_questions`, `duel_votes`, `duel_ratings` (backend skill).
2. **C2** — seed the launch questions + starting Elo (Section 6).
3. **C3** — Elo: real-time update (2a) + nightly job (2b) (backend skill).
4. **C4** — API endpoints 3a-3d (backend skill).
5. **C5** — This-or-That game redesign frontend (Section 5), dual-skill audit pre + post.
6. **C6** — live ranking widget wired to the vote endpoint, reorder + bump + delta animations.
7. **C7** — ranking pages `/rankings/*` SSR with ISR + JSON-LD (Section 4), dual-skill audit.
8. **C8** — loop-back wiring both directions (4e).
9. **C9** — add `/rankings` to navbar or footer, add ranking pages to sitemap (coordinate with SEO doc).
10. **C10** — monitor: which questions get traction, expand the set.

---

## 9. Why this is the strategic answer to "nobody creates quizzes"

This sidesteps the UGC problem entirely. Fans never write. They tap. Each tap is a vote that feeds an Elo that builds a ranking page that Google indexes that brings visitors who tap. The content (hundreds of ranking pages across groups × question types) is authored by nobody, can never be factually wrong, and grows itself. The quiz-creation flow stays for the rare 0.1% who want it, but the site no longer depends on it. The new identity: kpopquiz is where fans rank everything by voting.
