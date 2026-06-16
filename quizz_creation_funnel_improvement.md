# kpopquiz.org — Quiz Creation Funnel Improvement (Cowork build spec)

Workstream I. A set of mechanics layered on top of the creation funnel (Workstream H) to push more fans to create AND share quizzes. The strategy is deliberate: stop showing "create a quiz" as a standing button people ignore; instead catch fans at emotional moments, lower the floor to almost nothing, and pull creators back with loud stats, status, and notifications.

**Cowork: read this ENTIRE file first, then run a pertinence audit before building.** Using `/ui-ux-pro-max` and `/frontend-design` (and product judgement), review every mechanic below and confirm it is genuinely worth building, that it harmonizes with the existing site, and that nothing is redundant with what already exists. Report findings and get user sign-off before handing steps to Claude Code. Same engagement rules as the orchestration brief: one step at a time, dual-skill audit pre + post on every UI step, backend skill for data/notifications, update Notion after each step.

Dependency note: several mechanics here need accounts to persist (notifications, profile stats tied to a user, creator boards). Those sequence AFTER the contextual auth work (orchestration brief Workstream B, Step B22). Anything that can work anonymously (play counts on the quiz itself, the hot-moment prompts) can ship earlier. Cowork flags the auth dependency per step during the audit.

---

## 0. Strategic principle (read first)

Nobody wakes up wanting to "create content." The 1% creator rule is real and will stay real — so this workstream is NOT a bet that we can turn most fans into creators. It is a set of nudges to lift the creation+share rate above its current near-zero baseline. The real content foundation remains the duel→ranking engine (Workstream C), which makes content from taps and needs zero creators. Treat this workstream as the cherry, not the cake.

Three jobs:
- **Get them IN** — hot-moment prompts (Section 1).
- **Get them THROUGH** — the low floor (Section 4).
- **Pull them BACK** — stats, status, notifications (Sections 2, 3).

---

## 1. Hot-moment creation prompts

Never show a generic standing "create" CTA and hope. Show a specific, contextual invitation at the exact moment a fan feels something. Each prompt pre-fills the group and drops the user straight into the creation funnel (Workstream H, Screen 1 with the group already selected). Common design rules for all prompts: pre-fill the group always; one line of copy + one tap; never more than one prompt visible at a time (no nagging); use the contextual mascot expression where it fits (Workstream F); track which trigger converts best and weight toward it.

### 1a. Lost a battle badly — "think you'd do better?"
- **Trigger:** on the 1v1 battle reveal screen (Workstream E), when the player LOSES by a margin (e.g. 3+ points, tune the threshold).
- **UI:** a single line under the result — "Ouch. Think you'd do better? Make your own quiz and challenge them back." + a tap target.
- **Pre-fill:** the group of the quiz they just lost.
- **Why it works:** converts the sting of losing into motivation; ties creation directly to the competitive loop. The loser has something to prove — the most motivated a fan ever is.
- **Mascot:** none or a cheeky expression; keep it light, not mocking.

### 1b. Perfect score — "prove it, make a harder one"
- **Trigger:** a solo quiz or battle ends at 100%.
- **UI:** on the result screen — "You clearly know BTS. Prove it — make a quiz so hard only real fans can pass." + a tap target.
- **Pre-fill:** that group.
- **Why it works:** a perfect score is a peak ego moment; channel proven expertise into authorship. The "only real fans can pass" framing makes the quiz they'd create a flex object, not homework — it explicitly invites them to make something HARD, which is a more appealing creative brief than "make a quiz."
- **Mascot:** celebrating variant.

### 1c. Empty search / filter — "you make the first one"
- **Trigger:** a group filter or text search returns ZERO quizzes (ties to redesign doc empty-state, Section 14h).
- **UI:** the empty state — "No NewJeans quizzes yet — you could make the first one." + a tap target, paired with the sad mascot (Workstream F).
- **Pre-fill:** that group (or the searched group if detectable).
- **Why it works:** catches demand at the exact moment it is unmet. Someone searching for a quiz that does not exist is the single most qualified person to make it — they wanted it enough to look. First-mover status is a real flex.
- **Mascot:** sad variant.

### 1d. Comeback drop — "be the first" — DEFERRED, DO NOT BUILD YET
Keep in mind for the future; do NOT build in this pass.
- **The idea:** when a group releases a new song/album, fire a 7-day "be the first to make a quiz about [new release]" prompt on that group's pages and the home daily row, pre-filling the group. Highest-value trigger in theory because it compounds creation + peak fan energy + comeback-week SEO.
- **Why it is deferred:** it requires a comeback/new-release detection system that is genuinely reliable. Scraping news or guessing from YouTube uploads produces false positives (remixes, live clips, fan uploads) and false negatives (missed drops). For a prompt that literally says "be the FIRST," being wrong is embarrassing and erodes trust. A trustworthy version would need authoritative music-metadata sources (e.g. official music APIs) with a two-source confirmation check and a human approval queue for edge cases — a real sub-project. Until that detection is built and proven, this prompt stays off. Revisit only when the detection is reliable.
- **Action now:** none. Logged here so the idea is not lost.

---

## 2. Per-quiz creator stats

Today a creator publishes into a void — no feedback, no reason to return. Make the creator SEE their impact loudly; the number becomes the dopamine that pulls them back to make more. Every creator sees, on their own quiz:

- **Plays** — the headline number, largest type on the page. The core dopamine metric.
- **Completion rate** — how many finished vs bounced.
- **Average score + pass rate** — surfaced as a brag: "your quiz stumped 73% of players."
- **Likes / saves.**
- **Comments count.**
- **Shares + inbound source breakdown** — plays attributed by where they came from: Reddit / Discord / X / direct link. This is powered by the UTM params already on every share link (redesign doc reuses the Reddit UTM pattern). Each inbound play carries its `utm_source`, so the creator sees "412 plays from Reddit, 88 from Discord, 30 from X, 210 direct." This breakdown is genuinely motivating — it tells them which channel to share on next.

Design: the play count is the hero number. Stats render on the creator's own view of their quiz (and feed the profile, Section 2b). Anonymous-friendly stats (raw play count, pass rate) can show even before the full account system; per-creator attribution needs auth.

---

## 2b. Creator profile page (`/u/{username}`) — AUDIT AND HARMONIZE, do not rebuild

Some of these stats already exist on the current profile page. **Cowork must first AUDIT the existing `/u/{username}` page** (what stats/sections already render), then add ONLY the most pertinent missing ones, using `/frontend-design` and `/ui-ux-pro-max` to harmonize the whole page into a coherent design rather than bolting new stats on. This is a considered enhancement, not a teardown.

Candidate data to surface (audit which already exist, add the pertinent rest):
- Total plays across all their quizzes (the compounding vanity metric).
- Number of quizzes made.
- Their quizzes listed, sortable by plays.
- A lifetime "fans reached" number.
- Per-platform inbound totals (their personal Reddit / Discord / X pull across all quizzes).
- Creator rank / badge if they are a top creator (Section 3).

The audit output: a short before/after of the profile page — what exists, what to add, what to reorganize — reviewed before building. The goal is one harmonized profile, not a stats dump.

---

## 3. Notifications — the return hook

The most important missing piece for retention: a creator needs a reason to come back. Build a notification system.

- **Default channel: in-app notifications.** A bell icon with an unread count in the navbar, opening a notification center. This is the default for everyone.
- **Optional channel: weekly email recap.** Users can opt in to receive a once-a-week email digest of their notifications instead of/in addition to in-app. Opt-in, never default-on. One email a week max — a recap, not a drip.

Notify a creator when:
- Their quiz crosses play milestones: "Your BTS quiz just passed 100 plays" (e.g. 100, 500, 1k, 5k, 10k...).
- Someone comments on their quiz.
- Their quiz enters a top-creator board or starts trending.
- An inbound-share milestone: "50 people came from your Reddit post."

Rules:
- Positive momentum only. Never guilt ("nobody played your quiz") — that drives people away.
- In-app first, email opt-in second.
- Needs accounts to persist → sequence after contextual auth (orchestration brief B22). Until auth exists, milestone celebration can still appear on the quiz/share screens for the current session.

---

## 4. Creator status & leaderboards — status, not points

K-pop fans chase being SEEN as the expert, not points or XP. Sell visibility. (No XP system — that was deleted site-wide, orchestration brief Workstream B Step 0.)

- **Creator credit everywhere:** "by @username" on every quiz card (redesign Section 10c has the author field — elevate it), on the quiz detail page, and on the share card itself (Workstream H share card). When a quiz goes viral on Reddit, the creator's name rides along. Fits the site's credit-culture value (fansite attribution, "made by" matters to fans).
- **Top creators board, per group, weekly:** "Top BTS quiz creators this week," ranked by plays-on-their-quizzes that week. Per-group + weekly keeps it winnable — a new creator can top the aespa board this week even if they will never out-rank the all-time BTS leader. Resets weekly so it is always fresh and always has a new winner.
- **Stumped-rate as a flex stat:** "Your quiz stumped 73% of players" surfaced on their quiz and shareable as its own brag ("can you beat my quiz that 73% of fans failed?"). Hard quizzes become status objects.
- **Creator badges:** lightweight tiers tied to total lifetime plays (e.g. a small icon at 1k / 10k / 100k plays) shown next to their name. NOT XP — just a visible mark of "this person makes quizzes people actually play."

Throughline: every mechanic answers "how do other fans know I am good?" not "what do I earn?"

---

## 5. Lower the floor — 3-question minimum

The enemy is the blank 10-question form. Shrink the minimum viable quiz.

- **3-question minimum to publish** (instead of requiring more). A 3-question quiz shipped today beats a 10-question quiz abandoned at question 4. The one-question-at-a-time funnel (Workstream H, Screen 2) already makes this natural — after question 3, "Done / Publish" becomes fully enabled. Show a subtle "You can publish now (3 questions) — or keep adding" hint at question 3 so people know the floor is low and feel permission to stop.

### 5b. One-tap assembled question types — DROPPED, DO NOT BUILD
Considered (auto-assembling "guess who" / "odd one out" / "which group" questions from the idol/song database) and deliberately dropped as overkill for now. Logged so it is not re-proposed without reason. The 3-question minimum is the floor-lowering mechanic for this pass.

---

## 6. Build order (Workstream I)

1. **I0** — Pertinence audit: review this entire file with `/ui-ux-pro-max` + `/frontend-design` + product judgement. Confirm each mechanic is worth building, harmonizes with the site, and is not redundant. Flag every auth dependency. Report + user sign-off before any build.
2. **I1** — 3-question minimum + the "you can publish now" hint in the creation funnel (Workstream H Screen 2). Small, do early.
3. **I2** — Hot-moment prompts: lost-battle (1a), perfect-score (1b), empty-search (1c). Pre-fill group, single-prompt rule, mascot tie-ins. Dual-skill audit. (Comeback 1d deferred.)
4. **I3** — Per-quiz stats incl. UTM inbound-source breakdown (Section 2). Backend for attribution, frontend for display. Dual-skill audit.
5. **I4** — Creator credit everywhere: quiz cards, quiz detail, share card (Section 4 credit). Dual-skill audit.
6. **I5** — Profile page AUDIT + harmonized enhancement (Section 2b). Audit first, sign-off, then build.
7. **I6** — Notification system: in-app bell + center, milestone/comment/board/share triggers, positive-only (Section 3). Needs auth (after B22).
8. **I7** — Weekly email recap opt-in (Section 3). After I6.
9. **I8** — Top-creators-per-group-weekly board + stumped-rate flex + creator badges (Section 4). Needs auth.
10. **I9** — Monitor: creation start rate, start→publish completion, publish→share rate, and which hot-moment trigger converts best; weight toward the winner.

Deferred / dropped, kept on record: comeback-drop prompt (1d, needs reliable release detection — revisit later) and one-tap assembled questions (5b, overkill for now).

---

## 7. Why this works together

Hot-moment prompts get fans IN at peak emotion (loss, perfect score, unmet demand). The 3-question floor gets them THROUGH without the blank-form wall. Stats, credit, boards, and notifications pull them BACK by making impact visible and status real. None of it depends on turning most fans into creators — it just lifts the rate, while the duel→ranking engine (Workstream C) remains the zero-creator content foundation.
