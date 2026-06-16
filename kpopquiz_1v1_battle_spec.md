# kpopquiz.org — 1v1 Async Battle (Cowork build spec)

The 1v1 battle mode. Sidesteps every cold-start risk: no new questions (reuses the existing quiz bank), no notification infrastructure (the share link IS the notification), no friend graph required (async ghost opponents + shareable links), and it reframes quiz creation as a competitive flex instead of a chore.

This is Workstream E. Same rules as the orchestration brief: one step at a time, dual-skill audit (`/ui-ux-pro-max` + `/frontend-design`) pre and post on every UI step, backend skill for data/matchmaking. The validated prototype is the canonical UI reference — match it exactly, same code.

---

## 0. The three honest constraints (read first)

1. **Must work with ZERO friends from day one.** If the mode needs a populated friend list or online opponents to function, it dies. The default mode is stranger/ghost matching. Friends are a later layer.
2. **No new questions are written for battle.** Battle is a new way to serve questions that already exist. It pulls from the live quiz bank and (optionally) the Pipeline 1 duel questions. Do not build a separate battle question authoring flow — the only authoring is the post-battle "add a question" hook, which feeds the same shared bank.
3. **No push notification infrastructure in V1.** The "challenge a friend" share link is the notification — sent by the user over KakaoTalk / Discord / Twitter / iMessage. Do not build in-app push or email notifications for V1.

---

## 1. The three battle types — build in this strict order

### Type 1 — Quick match (stranger ghost). BUILD FIRST. The foundation.
Tap "Battle" → system picks a quiz (or the user picks a group) → user plays 7 questions immediately → score locks → system pairs the user with a stored "ghost" score from another real player who played the same quiz set recently. The user sees "You vs @stranger — you won by 2." No waiting, no opponent online, works with zero friends instantly. This is the core that makes the mode viable on day one.

### Type 2 — Challenge a friend (async link). BUILD SECOND. The viral engine.
After any battle, "Challenge a friend" generates a share link. The link encodes the exact same 7 questions and the challenger's score. The friend opens the link, plays the same questions, sees if they beat the challenger. No account required to receive or play a challenge. Every battle becomes a shareable invite — the link is the growth loop and the marketing, distributed by users over their own channels.

### Type 3 — Rivalries (friend system + head-to-head record). BUILD LAST, possibly post-V1.
Persistent friends, head-to-head records ("you lead 4-2"), maybe notifications. Heavy: needs accounts, a friend graph, and notification infra. Only build once there are enough active users for friends to actually exist. Premature = wasted effort. Do NOT build this in the first pass.

---

## 2. Where it lives on the site (usage spec — be precise)

Battle is NOT a separate game like Name All or Blindtest. It is a second **mode** for playing quizzes. Wire it in these exact places:

### 2a. Quiz detail page — two play buttons
Every quiz detail page (redesign doc Section 4) gets two CTAs instead of one:
- "Play solo" — the existing normal flow.
- "Battle" — starts a quick match using this quiz's questions.
Same questions, two framings. The "Battle" button uses the brand fill; "Play solo" can be the outline style, or vice versa — test with `/ui-ux-pro-max`.

### 2b. Top-level "Battle" nav entry
Add "Battle" to the navbar. Tapping it drops the user straight into a quick match with a well-rated random quiz (no quiz-picking friction). This is the impulse entry point.
Revised navbar order: Home / Quizzes / Games / Battle / Blindtest / Leaderboard. (That is 6 items — on desktop fine; on mobile bottom nav keep 5 max, so Battle goes in the nav and Blindtest or Leaderboard moves to footer — Cowork decides during the harmonization audit.)

### 2c. Home page — "Battle of the day" in the daily row
The home daily row (Workstream D, the quiz-of-the-day + game-of-the-day pattern) gains an optional third daily slot or rotates battle in: "Battle of the day — beat today's quiz and challenge a friend." Ties battle into the daily ritual.

### 2d. Quizzes browse page — battle affordance on cards
Optional, lower priority: a small "Battle" icon-action on quiz cards in `/quizzes` so users can launch a battle directly from browse without opening the detail page. Propose during audit; only build if it doesn't clutter the card (the card hierarchy is already defined in redesign doc Section 10c).

---

## 3. Where the questions come from (usage spec — be precise)

- **Primary source: the existing quiz bank.** A battle = 7 questions drawn from a chosen quiz (when launched from a quiz detail page) OR from a group's question pool (when launched from the nav "Battle" entry). No new content.
- **Question selection per battle:** pick 7 questions. For a specific quiz, take that quiz's questions (or a 7-question sample if it has more). For a group-level battle, sample from all that group's quiz questions, weighted toward higher-quality / higher-play questions.
- **Both players answer the SAME 7 questions** in the same order. This is what makes the score comparison fair and the challenge link deterministic.
- **Optional later: Pipeline 1 duel questions** can feed an "opinion battle" variant, but that compares taste not knowledge — defer to post-V1, flag only.
- **Report flow (separate, small):** every battle question (and every question site-wide) gets a quiet "report" affordance. 3 reports on a question pulls it into a review state and out of rotation. This keeps the bank clean. It is independent of battle but worth shipping alongside, since battle increases question exposure.

---

## 4. The post-battle creation hook (usage spec — be precise)

This is how battle solves the UGC problem sideways. After the reveal screen:
- An amber "Think you can stump them?" card invites the user to add one question to the quiz.
- Tapping it opens an inline form: one question + four answers + tap-the-circle to mark the correct answer. ~20 seconds.
- The framing is ALWAYS competitive and fan-pride based: "Beat your friends with a question only a real fan would know." NEVER framed as "create a quiz" (the chore framing that nobody engages with).
- On submit: "Your question is in. Fans are reviewing it now — you'll see it appear in battles soon."

### CRITICAL framing rules for the creation hook
- The submitted question enters a pending pool and is shown to other players for lightweight confirmation before going live (crowd verification — same mechanism that keeps the bank trustworthy).
- The user is told ONLY that "other fans will confirm it." They are NEVER told the verification is a quality gate, NEVER shown any AI involvement, and there is NO AI involvement disclosed anywhere. AI is never mentioned to users in any part of this product. If AI is used internally at all (it should not be needed here — these are human-written questions), it stays fully invisible.
- This reframes creation from homework into a brag. The doorway people actually walk through.

---

## 5. Data model

Backend skill. New tables (names indicative; align with existing schema during build).

### 5a. `battles`
```
id              uuid pk
quiz_id         uuid fk (nullable — null for group-level battles)
group_slug      text (nullable)
question_ids    uuid[]        -- the exact 7 questions, ordered
challenger_hash text          -- anonymous session/voter hash of the originator
challenger_score int (nullable until they finish)
created_at      timestamptz default now()
```

### 5b. `battle_results`
```
id           uuid pk
battle_id    uuid fk -> battles.id
player_hash  text          -- anonymous; or user_id if logged in (Type 3 later)
score        int
per_question bool[]         -- correct/incorrect per question, for the breakdown
time_ms      int            -- total answer time, tiebreaker
created_at   timestamptz default now()
```

### 5c. `pending_questions`
```
id            uuid pk
quiz_id       uuid fk
group_slug    text
question      text
options       text[]
correct_index int
author_hash   text
confirms      int default 0
flags         int default 0
status        text default 'pending'   -- pending | live | killed
created_at    timestamptz default now()
```
Promotion rule: status → 'live' once confirms ≥ threshold (e.g. 15) and confirm ratio high; status → 'killed' if flags cross a kill threshold. Borderline → manual review. None of this surfaced to the author beyond "fans are reviewing it."

---

## 6. Matchmaking logic (ghost system)

The heart of Type 1. No real-time opponent.
- When a user finishes a quick match on a given question set, store their `battle_result`.
- To find an opponent: query other recent `battle_results` for the SAME `question_ids` (or same quiz, same 7-question sample). Pick one with a comparable skill level if possible (similar score distribution), otherwise random recent.
- If no prior result exists for that set (cold pool), generate a plausible ghost score OR pull from a different recent set of the same quiz, and label honestly ("@stranger's best on this quiz"). Never show a fake "live" opponent — async framing only ("played 2h ago").
- Store the user's own result so they become a ghost for the next player. The pool fills itself as people play.

Seed the ghost pool before launch for the top quizzes so the very first players get real-feeling opponents.

---

## 7. Challenge link (Type 2)

- "Challenge a friend" creates a `battles` row with the challenger's `question_ids` and `challenger_score`, returns a short URL like `/battle/{battle_id}`.
- Opening the link: the friend sees "@challenger scored 6/7 — can you beat them?", plays the same 7 questions, then sees the head-to-head reveal.
- No account required. The link works for anyone, anywhere. The friend can then "challenge a friend" themselves, propagating the loop.
- Include UTM params on shared links for attribution (consistent with the existing Reddit share UTM pattern in the redesign doc).

---

## 8. UI — use the validated prototype exactly

Skill: `/frontend-design` to build, `/ui-ux-pro-max` to audit. The prototype shown and approved in the design conversation is canonical. Match its screens, classes, animations, and timings exactly:
- **Match screen:** you-vs-opponent faces with the VS badge, the quiz card, "Start battle."
- **Play screen:** progress bar + question count + 10-second ring timer (faster than solo to raise stakes), answer chips with pop (correct) / shake (wrong), live "N correct" pill.
- **Reveal screen:** outcome banner (win/lose/tie), the duel scoreboard with the winner's avatar outlined green and scores counting up, the per-question breakdown showing both players' check/x per question.
- **Two CTAs:** "Challenge a friend" (copies link, shows toast) and "New battle" (fresh ghost opponent).
- **The creation hook:** the amber "Think you can stump them?" card → inline add-question form → success state.

Reuse the shared design tokens, the ring timer from the quiz screen spec, and the VS badge from the This-or-That spec — do not reinvent them. Dual-skill audit pre and post.

### Mobile
- Answer grid collapses to 1 column below 480px (consistent with the quiz screen).
- Faces and scoreboard stay side by side (the duel framing is the point).
- Input font-size 16px to prevent iOS zoom.
- All touch targets ≥ 44px.

---

## 9. Build order (Workstream E)

Cowork must FIRST audit this whole spec with `/ui-ux-pro-max` and `/frontend-design` and confirm the design harmonizes with the rest of the site (shared tokens, VS badge, ring timer, card patterns) and that the flow is sound — BEFORE handing any step to Claude Code. Make it real (validate the approach) before building.

1. **E0** — Audit: review this spec with both skills. Confirm harmonization with existing specs, confirm the matchmaking/ghost approach is sound, confirm the creation-hook framing never exposes AI and never uses "create a quiz" language. Report + get user sign-off.
2. **E1** — Migrations: `battles`, `battle_results`, `pending_questions` (backend skill).
3. **E2** — Battle question selection: pull 7 from a quiz or group pool (backend skill, reuse existing quiz bank — no new content).
4. **E3** — Ghost matchmaking + seed the ghost pool for top quizzes (backend skill, Section 6).
5. **E4** — Quick match frontend (Type 1): match → play → reveal, using the exact prototype UI. Dual-skill audit pre + post.
6. **E5** — Challenge link (Type 2): `/battle/{id}` route, link generation, friend-plays-link flow, UTM params (Section 7).
7. **E6** — Post-battle creation hook: inline add-question form → `pending_questions` → crowd-confirm promotion (Section 4). Framing rules are non-negotiable. Dual-skill audit.
8. **E7** — Wire entry points: two CTAs on quiz detail (2a), "Battle" nav entry (2b), coordinate with Workstream D for "battle of the day" (2c). Dual-skill audit.
9. **E8** — Report-question affordance site-wide (Section 3), 3-report pull-to-review.
10. **E9** — Monitor: battle completion rate, challenge-link click-through, question-submission rate, ghost-pool health. Expand.
11. **Type 3 (rivalries/friends/notifications)** — DEFERRED. Only scope after V1 proves engagement and accounts exist. Do not build now.

---

## 10. Why this is strategically right

Three cold-start risks, all sidestepped: no new questions (reuses the bank), no notification infra (share link is the notification), no friend graph (async ghosts + links). And the post-battle hook turns quiz creation into a competitive brag — the doorway fans actually walk through — feeding the shared question bank that makes every other mode better. Battle is not a new content silo; it is a multiplier on the content that already exists.
