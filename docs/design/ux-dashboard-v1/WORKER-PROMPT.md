# READ FIRST (v11, 2026-09-25): the implementation now runs from ONE prompt

Open `v11/WORKER-PROMPT-V11-MULTIAGENT.md` and follow it: orchestrator + foundation agent + 11 page
agents + pixel, backend and QA checkers, with ownership rules so nobody overwrites anybody.
DESIGN-SPEC section 17 (v11) wins over section 16 (v10). The v10 notes below still hold where 17 is silent.

# v10 "Air" update (2026-09-25)

The owner found v9 too heavy. The prototype is now v10 and it changes the shell:
- The 232px sidebar is gone. Top bar 64px (logo, Quizzes, Groups, Blindtest, Community, Leaderboard,
  search, Create, streak, bell, avatar) + bottom tabs on phones. Your Phase 1 shell (PR #43) must be
  redone on this top bar before Phase 2 pages go further. The flag, data-guard, parity e2e and
  data-safety contract do not change.
- DESIGN-SPEC section 16 supersedes the visual rules of sections 2 to 15 (tokens, pink budget, type,
  spacing, every page). WIRING-MAP has a new "v10 additions" table. DECISIONS-LOG 2026-09-25 explains
  why. `critique/` holds the direction and the three review rounds.
- Screenshots are in `shots-v10/` (desk-light-*, desk-dark-*, mob-light-* at 390px). The old v9
  `shot-*.png` files are in `archive-v9/` and are no longer the reference.
- In the prototype: every view is reachable from the top bar and buttons; the avatar menu has
  "Preview as guest" and "Design notes" (per-view rationale). Console: go('id'), openG('ATEEZ'),
  startQuiz(), btStart('Ranked'), openSignin().
- Anything in section 16 that needs a new column or table (in-progress runs, relaxed flag, notify-me
  for empty groups, ranked season columns) goes to docs/pending-migrations and waits for the owner.

---

# Mission: UX v1, pixel by pixel, on a new branch

You are the implementation worker for kpopquiz.org (repo `KpopQuizzV2`, app in `apps/quiz`, Next.js 16
App Router, Supabase, Vercel, pnpm). The owner (Mingi) merges every PR himself. You never push to main,
never merge, never run DDL against the production database, never store or print a credential, never
paste tokens in files or logs.

## What you are building

The redesign in `docs/design/ux-dashboard-v1/`:
- `prototype.html` - the clickable prototype, the single source of truth for layout, spacing, colour,
  type, states and motion. Open it in a browser. Every view is reachable from the top bar and the
  buttons; `openHub('BP')`, `go('ranked')`, `go('notifs')`, `startQuiz()`, `btStart('Ranked')` in the
  console open the rest. The moon icon in the top bar switches night mode.
- `DESIGN-SPEC.md` - tokens, components, per-view rules, data sources (sections 1 to 15).
- `WIRING-MAP.md` - every control in every view, what exists today (file, endpoint, table), what is
  partial, what is new. This is your checklist.
- `shot-*.png` - reference screenshots at 1440px. "Pixel by pixel" means: the implemented page at 1440px
  matches the screenshot for layout, spacing, radii, colours, type sizes and weights. Copy is the
  prototype's copy unless the wiring map says the real value replaces it.

Structure (v10): top bar 64px + mobile bottom tabs, content max 1120px, footer, Notion-minimal
skin with pink accents, Inter, zero emoji (SVG icons only), light and night themes.

## Rules that do not bend

1. Branch `feat/ux-v1` off main. One PR per phase, small enough to review in 20 minutes. PR description:
   what changed, screenshots (before / after / prototype side by side), what is still stubbed.
2. Nothing that Google reads changes: every public page keeps its URL, H1, intro paragraph, FAQ text,
   JSON-LD, canonical, `/pt` mirror, sitemap entries, and stays server-rendered. The shell wraps the
   page; it never turns it into a client-only page. Run the SEO checks in `apps/quiz` (lighthouse or
   the existing scripts) before each PR.
3. Real data only. No lorem, no invented handles in production. If a number in the prototype is a
   sample, the wiring map says where the real one comes from.
4. Existing behaviour stays. Every endpoint, table, RPC, analytics event and sound in the wiring map
   marked EXISTS keeps working through the new UI. Do not rewrite a working component when a re-skin
   is enough (`quiz-player.tsx`, `blindtest-game.tsx`, `create-funnel.tsx`,
   `question-list-editor.tsx`, `notifications-center.tsx` are re-skins, not rewrites).
5. New tables or columns: write the migration into `docs/pending-migrations/` with a one-paragraph
   note and STOP. The owner applies it. Code must fail soft until it is applied.
6. Playwright visual checks for every view, light and dark, 1440 and 390 wide, committed under
   `apps/quiz/e2e/ux-v1/`. `tsc --noEmit`, lint and the existing e2e must be green in each PR.
7. Report at the end of each phase in this exact shape: PR link, files touched, what matches the
   prototype, what does not and why, open questions for the owner (max 5), next phase.

## Phase 0 - audit (no UI code)

Verify `WIRING-MAP.md` line by line: open each file, call each endpoint locally, check each table.
Return the corrected map as `docs/design/ux-dashboard-v1/WIRING-MAP.verified.md` with three lists at
the top: (a) controls where the map was wrong, (b) endpoints that exist but are broken or unused, (c)
the exact list of NEW backend work with the table or endpoint to build, ordered by dependency. Also
confirm: which `lib/blind-test-playlists.ts` ids exist, whether `bt_players` and `ranked_plays` are
safe to reuse as-is, and what `battles` is used for today by `/api/game/[id]/play`.
One PR: the verified map plus `apps/quiz/src/lib/design-tokens.ts` extended with the light and dark
tokens from DESIGN-SPEC section 2 and 15 (no visual change yet).

## Phase 1 - shell, tokens, night mode, footer

Sidebar, top bar (search, streak, theme toggle, bell with unread count, avatar), mobile bottom nav,
footer, `data-theme` on `<html>` with system default, localStorage persistence, appearance setting in
`/settings`. Every existing page renders inside the shell unchanged. PR.

## Phase 2 - dashboard, quizzes browse, quiz page

`/` (hero = quiz of the day, keep playing from localStorage, three rows, community panel, blindtest
panel), `/quizzes` (tabs + chips + rail + grid), `/q/[slug]` (header card, right column, hall of fame,
your best, made by). Re-skin `quiz-card.tsx` once, used everywhere. PR.

## Phase 3 - quiz in-game and results

Re-skin `quiz-player.tsx`: 620px stage, top bar with sound toggle, streak dots, frozen ring after answer,
answer states and motion, fun fact, keyboard 1-4 / Enter. Results: photocard, ledger, keep playing,
share, comments, battle link (stub until migration 154 is applied). PR.

## Phase 4 - create

Re-skin `create-funnel.tsx` + `question-list-editor.tsx`: 3 visible steps + done state, live checklist,
card preview, one row open at a time, paste-several parser, preview mode, `?group=` prefill. PR.

## Phase 5 - blindtest hub, in-game, results, rank title wiring

`/blindtest` hero + setup card, ways to play, today's board, recent runs, playlists, group rail, FAQ.
Re-skin `blindtest-game.tsx` (dark stage, orb, reveal, points and combo display, skip, keyboard).
Wire `bt_players` + `bt_plays` + `award_bt_xp` + `update_player_rank` on play submit (rank title
Trainee to Legend). Remove Intro and Lyrics anywhere they still appear. PR.

## Phase 6 - ranked

Exactly DESIGN-SPEC section 15.4 and WIRING-MAP section 14: generate with `mode: 'ranked'`, server-side
points, `ranked_plays` submit (needs the two columns, pending migration), best-5 season score, tiers and
divisions, ladder endpoint with scopes, `/blindtest/ranked` page, season impact block on results, daily
cap, placement state, nightly Legend cron. Rewards can be a follow-up PR. PR.

## Phase 7 - community, group hubs, post view, editor

Posts tables (pending migration from DESIGN-SPEC 12.5), endpoints, `/community` feed with the four
modes, editor modal, post view with comments, right-column widgets (all existing), group hub template
(`/{slug}-quiz`) with the facts strip, tiles, sort tabs, two-column FAQ, community panel. Live rooms
stay a stub card. PR.

## Phase 8 - passport, leaderboard, notifications

Passport tabs (Overview, My quizzes, My posts, Mastered, Settings), leaderboard three panes,
notifications center with the five category tabs and prefs. PR.

## Phase 9 - blindtest challenge links, polish

`challenges` endpoints + `/bt/c/[code]`, motion pass on every view against the prototype, dark-mode
pass, mobile pass at 390, reduced-motion pass, final visual diff report. PR.

Start with Phase 0. Do not skip it.
