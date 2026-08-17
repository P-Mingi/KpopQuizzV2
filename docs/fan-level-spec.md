# kpopquiz.org — Fan Level (XP reward redesign) — Workstream L

The XP/level system was kept (only Byeol + gacha Cards were removed). It works but is flat. This
redesigns it into **"Fan Level"**: XP measured as *how much of a real fan you are*, earned a few
honest ways and felt through rich reward moments. Status-first (titles + visibility), not a points
economy — which is what K-pop fans actually chase, and reconciles with the "status, not points"
philosophy in the duel/creation specs. No currency, no shop, no gacha.

Same rules: one step at a time, dual-skill audit on UI steps, backend skill for award logic,
update Notion after each step.

---

## 0. Core principle

XP = **Fan Level**. Every level unlocks a **title** the user wears everywhere (next to their name on
quizzes, battles, comments, leaderboard, profile). The title is the reward — identity + visibility.
Few ways to EARN; many ways to FEEL it (count-up, level-up celebration, shareable card, battle pop).

---

## 1. Level → Title ladder (refine the existing level-titles.ts)

A fan-flavored ladder (tune exact level breakpoints in L1; review the existing titles first and
keep what's good):

| Levels | Title |
|---|---|
| 1–2 | New Fan |
| 3–5 | Casual Fan |
| 6–9 | Stan |
| 10–14 | Bias |
| 15–20 | Ride-or-Die |
| 21–29 | Superfan |
| 30+ | Legend |

XP curve: early levels come FAST (frequent reward), later levels are a long-tail status flex
(each level needs more cumulative XP). Keep `getLevelInfo(xp)` as the single source; tune the curve
so level ~5 is reachable in a session or two and level 30 is a genuine flex.

---

## 2. Earning model (5 sources only — short, weighted, un-farmable)

Round numbers, legible. Most already exist in the play/create routes — align + add the new ones.

| Action | XP | Notes |
|---|---|---|
| Play a quiz (FIRST completion) | +10 base, +5 if ≥70%, +15 if 100% | Already in /api/quiz/[id]/play. Replays ~0 (anti-farm). |
| **Win a battle** | **+25** | The biggest single-action reward — battles are the peak. |
| Lose a battle | +5 | Consolation, so losing still nudges progress. |
| Battle win streak | +5 per consecutive win | Capped (e.g. +25 max). |
| Daily streak | +5 for the daily; milestones +10/+25/+50/+100 at day 3/7/14/30 | Ties to the F6 daily-played signal. Replaces the old removed Byeol streak. |
| Create a quiz | +25 (first ever +75) | Already in /api/quiz/create. |
| Your quiz gets played | +1 per play received (cap 500) | Already in the play route (creator XP). |
| Battle question confirmed (E6) | +20 | Rewards the creation loop. |

Anti-farm: per-quiz first-completion only for play XP (record completed-for-XP set), daily streak
caps, creator XP capped at 500 plays. Audit existing award_xp call sites so nothing double-awards.

---

## 3. Reward moments (where "rewarding" lives — the moments, not the math)

1. **Count-up** on every XP gain (reuse RollingNumber). On the quiz result it already counts; extend
   to a small global "+N XP" toast/pill whenever XP is earned (battle reveal, daily, confirm).
2. **Level-up celebration (the marquee):** when an award crosses a level boundary (the play route
   already returns leveled_up / new_level / new_level_name), show an overlay: the **celebrate mascot**
   (F3) + "You're now a {Title}!" + the new title + a **"Share your level-up"** button → a
   **shareable level-up card** (reuse the H5 OG/share infra: "I reached BIAS on kpopquiz" + the
   rabbit). This is the single most important piece — the growth-loop moment.
3. **Battle reveal:** show the XP won ("+25 XP") prominently next to "You won by 2".
4. **Profile:** a **Fan Level card** — level, current title, a progress bar to the next title, and a
   tiny "how to earn" hint. (Replaces the current plain XP card.)
5. **Title everywhere (the status payoff):** the fan title next to the username on quiz cards
   (author), quiz detail, the battle reveal, comments, and the leaderboard.
6. **Leaderboard:** ranked by Fan Level (XP), title shown (already close — getTopPlayersByXp).

---

## 4. Per-group Fan Level — PHASE 2 (not V1)

`player_group_mastery` already exists. Later, surface "your BTS Fan Level" / "Top-10 BTS fan" — a
powerful per-group status hook. Keep V1 GLOBAL; add per-group as a phase-2 enhancement.

---

## 5. Build order (Workstream L)

1. **L0** — this spec + the title ladder + XP values + curve (sign-off; user said go, tunable).
2. **L1** — Earning model: align/add all XP awards (play already there; ADD battle win/loss + win
   streak, daily streak, question-confirmed; harden first-completion anti-farm); refine
   level-titles.ts ladder + the XP curve. Backend.
3. **L2** — Level-up celebration: overlay (celebrate mascot + title reveal) + shareable level-up card
   (OG). Wire to the leveled_up signal. Dual-skill audit.
4. **L3** — XP on the battle reveal (win/loss shown) — coordinate with E4.
5. **L4** — Streak XP wired to the F6 daily-played signal (escalating milestones).
6. **L5** — Title everywhere: fan title next to username on cards / detail / battle / comments /
   leaderboard. Dual-skill audit.
7. **L6** — Anti-farm hardening + monitor (XP per action, level distribution, no farm exploits).

Note: L1 may need a small migration if we track a "completed-for-XP" set per user (or reuse existing
plays rows). Keep it light; flag any SQL-editor migration for the deploy-prep pile.
