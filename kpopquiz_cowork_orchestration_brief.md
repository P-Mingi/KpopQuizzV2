# kpopquiz.org — Cowork Orchestration Brief

You are Cowork, acting as the project lead for kpopquiz.org. Your job is to take the specification documents in this project and drive their implementation by handing **small, sequential, verifiable instructions to Claude Code** — one step at a time, never all at once.

You have six source documents in this project:
1. `kpopquiz_seo_indexation_fix.md` — the SEO/indexation fix (Workstream A).
2. `kpopquiz_redesign_instructions.md` — the full UX/UI redesign with exact code (Workstream B).
3. `kpopquiz_pipeline1_duel_ranking_spec.md` — the duel→Elo→ranking engine (Workstream C).
4. `kpopquiz_1v1_battle_spec.md` — the 1v1 async battle mode (Workstream E).
5. `kpopquiz_mascot_system_spec.md` — the rabbit mascot expression system (Workstream F).
6. This brief — the orchestration plan tying them together, including Workstream D (games discovery + daily game).

Six workstreams total (A-F), defined below. Run them in the priority order given in the final sequencing summary. Within each workstream, strictly sequential.

---

## Operating rules for the whole engagement

These apply to every step you hand to Claude Code.

1. **One step at a time.** Never paste a whole section. Give Claude Code a single numbered step, wait for it to complete and report back, verify, then give the next step. If a step is large, split it further.

2. **Use the right skill for each task. Always name the skill explicitly in the instruction to Claude Code:**
   - `/frontend-design` — for any component build, layout, styling, or visual work (the redesign CSS/HTML/JS). This is the primary skill for Workstream B.
   - `/ui-ux-pro-max` — for UX decisions, interaction states, accessibility checks, responsive behavior, and reviewing/auditing any UI Claude Code produces before marking a step done.
   - `/caveman` — use ONLY for status reports back to the user / between-step summaries to save tokens. Never use caveman for the actual instructions to Claude Code (they must be precise and complete).
   - Backend skills (database/migration/API): use the appropriate backend skill for Supabase migrations, API routes, SSR/SSG conversion, and the blindtest backend port. Name it explicitly when handing the step.
   - Any document/spec skill as needed for generating handoff notes.

3. **MANDATORY DUAL-SKILL AUDIT ON EVERY UI/UX CHANGE.** This is the most important rule. For EVERY single UI or UX transformation — before AND after Claude Code implements it — you must run BOTH `/ui-ux-pro-max` AND `/frontend-design` as a check. No UI/UX step is ever done in one pass. The cycle for every visual step is:
   - **(a) Pre-check** — before handing the step to Claude Code, run `/ui-ux-pro-max` and `/frontend-design` against the proposed change. Ask explicitly: "Is this the right thing to do? Does it harmonize with everything already built? Does it follow the design system?" If either skill flags a problem, adjust the instruction before sending it.
   - **(b) Implement** — Claude Code builds the step using `/frontend-design` and the exact code from the spec.
   - **(c) Post-audit** — after implementation, re-run BOTH `/ui-ux-pro-max` and `/frontend-design` on the actual result. Re-audit it: spacing, color tokens, typography scale, interaction states, accessibility, responsive behavior, and visual consistency with prior steps. If anything is off, send a correction step to Claude Code and re-audit again. Only mark the step done when both skills pass it.
   - This double-check (pre + post) is non-negotiable and applies to every UI/UX step in Workstream B and any visual touch in Workstream A.

4. **Verify before advancing.** After each step, run the verification check defined for that step (curl, the dual-skill audit above for any visual work, build passing, no console errors). Do not advance until green.

5. **Never break what works.** Respect the "DO NOT CHANGE" list at the end of `kpopquiz_redesign_instructions.md` (Section 17). Read it before starting Workstream B.

6. **Commit per step.** Each completed step = one git commit with a clear message (e.g. `feat: unify navbar (redesign step B2)`). This makes rollback trivial.

7. **Report after each step** to the user in `/caveman` mode: what was done, verification result (including both skill audits for visual steps), what's next. Keep it short.

---

# WORKSTREAM A — Fix indexation (do first)

Source: `kpopquiz_seo_indexation_fix.md`. This is the priority because indexation has been stalled ~20 days and it is independent of the visual redesign. Use the backend/rendering skill for these steps.

### Step A0 — Diagnose rendering (no code changes)
Instruction to Claude Code: run the verification curls from the SEO doc against 3 live quiz pages, 1 group page, the `/quizzes` page, and the home page. Report for each whether unique content (quiz title, questions, fun facts) appears in the raw HTML or only after JS hydration.
Verify: you have a clear yes/no per route on server-rendering.
This determines how much of Fix 1 is needed.

### Step A1 — Server-render / statically generate public content pages (Fix 1)
Instruction to Claude Code: using the backend skill, convert quiz pages (`/q/{slug}`), group pages (`/group/{name}`), user pages (`/u/{username}`), `/quizzes`, `/games`, and home to SSR or SSG (Next.js App Router: `generateStaticParams` + static generation, or server components; use ISR with `revalidate` for dynamic data). Unique quiz content must be in the server HTML.
Verify: `curl -s https://kpopquiz.org/q/{slug} | grep -i "question"` returns real content. Build passes.

### Step A2 — Unique titles, meta, H1, intro per page (Fix 2)
Instruction: per-page unique `<title>`, meta description, `<h1>` with real quiz title, and a 2-3 sentence unique intro generated from quiz metadata. Add `Quiz` + `BreadcrumbList` JSON-LD.
Verify: two different quiz pages return different `<title>` and `<h1>`; JSON-LD validates.

### Step A3 — Internal linking (Fix 3)
Instruction: real crawlable `<a href>` links on `/quizzes` to every quiz (paginated with crawlable URLs), group pages link to their quizzes, and each quiz page gets a related-quizzes block (4-6 links).
Verify: curl `/quizzes` shows anchor tags to quiz slugs, not just JS onClick.

### Step A4 — Fix 3 redirecting group pages (Fix 4)
Instruction: decide per the redesign (group pages resolve to real 200 content or to `/quizzes?group=`). Remove unintended redirects on `/group/aespa`, `/group/seventeen`, `/group/stray-kids`. Keep sitemap consistent with the decision.
Verify: `curl -sI https://kpopquiz.org/group/aespa | head -1` returns 200 (or a deliberate, documented redirect).

### Step A5 — robots.txt + noindex cleanup (Fix 5)
Instruction: remove robots.txt disallow on `/login`; add `<meta name="robots" content="noindex">` to `/login`, `/signup`, `/create`, `/admin/*`, settings. Do not noindex any public content page.
Verify: `curl -s https://kpopquiz.org/login | grep noindex` returns the tag; robots.txt no longer blocks it.

### Step A6 — Canonicals (Fix 7)
Instruction: self-referencing canonical tag in server HTML on every page.
Verify: curl any quiz page shows correct canonical.

### Step A7 — Sitemap + resubmit (Fix 6)
Instruction: regenerate `sitemap.xml` with only canonical indexable URLs, accurate `lastmod`, excluding redirects/noindex/JS chunks. Then resubmit in GSC and click "Validate Fix" on the "Détectée, actuellement non indexée" report.
Verify: sitemap reachable, well-formed, no excluded URL types present.

### Step A8 — Monitor
Report to user: indexation needs 2-4 weeks to recover. Set a reminder to re-check GSC weekly. Do not mass-request indexing manually.

---

# WORKSTREAM B — UX/UI redesign (step by step)

Source: `kpopquiz_redesign_instructions.md`. Primary skill: `/frontend-design` for building, `/ui-ux-pro-max` for reviewing each step. The document already contains exact CSS/HTML/JS — Claude Code must use that code verbatim where provided, not reinvent it.

Hand these steps to Claude Code **in this exact order**. The order is dependency-safe: deletions first, then the design system foundation, then page-by-page, then enhancements.

### Step B0 — Upfront harmonization audit (do this BEFORE any implementation)

Before touching a single line of code, run a full harmonization audit across the entire redesign spec. This prevents building 22 steps that individually look fine but collectively clash.

Instruction to yourself (Cowork): read all of `kpopquiz_redesign_instructions.md` and, using BOTH `/ui-ux-pro-max` AND `/frontend-design`, audit every proposed UI/UX change together as one system. Check specifically:
- **Color consistency** — every component uses the same `:root` tokens (Section 10a). No one-off hex values. Verify the games page tints (13a), blindtest tints (16d), badge colors (10d), and dark mode palette (12d) all derive from or harmonize with the core palette.
- **Typography scale** — Syne + DM Sans (14b) applied consistently. One display scale, one body scale across home, quizzes, games, blindtest, quiz screen, results. No component inventing its own font sizes.
- **Spacing rhythm** — section gaps, card padding, grid gaps are consistent across all pages (the 80px/48px section rhythm, 14px card radius, 10-16px grid gaps).
- **Interaction language** — hover lift, pink-tinted shadow, 120ms transitions, pop/shake animations, stagger delays are identical everywhere. A card on the home page must behave like a card on the games page.
- **Component reuse** — the quiz card, the badge system, the button system, the ring timer, the filter pills appear on multiple pages. Confirm they are ONE shared component each, not re-implemented per page.
- **Border radius scale** — confirm one consistent radius scale (cards, pills, inputs) across all specs.
- **Naming collisions** — the blindtest uses `bt-` prefixes (16d); confirm no class-name clashes between the quiz screen (10k), games page (13a), and blindtest.

Output of B0: a short harmonization report listing any inconsistencies found across the spec, plus the corrected canonical values (the single source of truth for color, type, spacing, radius, motion) that ALL subsequent steps must follow. If the spec is already consistent, confirm that explicitly. Hand this canonical token sheet to every later step so Claude Code builds against one harmonized system.

Verify: you have a one-page canonical design-token sheet that B2 will encode into globals.css, and a list of any spec conflicts resolved.

### Phase 1 — Foundation

**Step B1 — Deletions (Section 0).**
Skill: backend + frontend-design. Delete Cards/Byeol, the old blindtest, XP/star system, Hall of Fame route, redundant mobile nav item. Project-wide search for `byeol`, `blindtest`, `kpopblindtest`, `hall-of-fame`, `star`, `xp` and remove orphans.
Verify: build passes, no dead imports, no references remain.

**Step B2 — Design system tokens (Section 10a + 14b).**
Skill: frontend-design. Add the CSS variables (`:root` palette from 10a) to globals.css. Add Syne + DM Sans fonts (14b) and the `--font-display` / `--font-body` variables. Set body bg and text color.
Verify (via /ui-ux-pro-max): tokens resolve, fonts load, no FOUT.

**Step B3 — Navigation (Section 1).**
Skill: frontend-design. Unify navbar to Home / Quizzes / Games / Blindtest / Leaderboard + Search + Create + Sign in. Rename Ranks → Leaderboard (redirect old routes). Fix footer three columns. Fix mobile bottom nav (5 items).
Verify (via /ui-ux-pro-max): all nav links resolve, active states correct, mobile nav ≤5 items.

### Phase 2 — Core pages

**Step B4 — Quizzes browse page (Section 3 + 10c + 10d).**
Skill: frontend-design. Build `/quizzes`: sticky dual-row filter bar, 2-col grid (1 col mobile), quiz cards using the exact code from 10c, badges from 10d, inline create CTA every 8 cards, load-more.
Verify (via /ui-ux-pro-max): filters work, cards hover correctly, responsive, staggered fade-in fires.

**Step B5 — Quiz detail pre-play + Reddit share (Section 4 + 7 + 14e).**
Skill: frontend-design. Hide avg score and pass rate pre-play (show only on result screen). Add format strip (14e). Fix Reddit share title (Section 7).
Verify: stats hidden pre-play, share title is quiz name only, UTM params intact.

**Step B6 — Live quiz screen (Section 10k).**
Skill: frontend-design for UI, backend skill for wiring quiz data. Use the exact CSS/HTML/JS from 10k verbatim: ring timer (15s), streak dots, answer pop/shake, fun-fact reveal, live score, A/B/C/D chips. Apply mobile overrides.
Verify (via /ui-ux-pro-max): full playthrough works, timer colors shift at 8s/5s, correct=pop, wrong=shake, fun fact shows after every answer, mobile 1-column.

**Step B7 — Result screen count-up (Section 10i + 12b).**
Skill: frontend-design. Result screen with `animateResult()` count-up (10i), then the shareable result card with Web Share API (12b).
Verify: score counts up, bar fills, share works on mobile, "play another" routes correctly.

**Step B8 — Home page lobby (Section 2 + 2d blindtest teaser + 14c hero).**
Skill: frontend-design. Build the lobby in section order: hero with rewritten headline "Are you a real fan?" (14c) + 2 CTAs, Quiz of the day (10e), Trending carousel, Games teaser including the Blindtest card (2d + 16g), Browse-by-group pills (10f). No quiz grid on home.
Verify (via /ui-ux-pro-max): section order correct, daily quiz above fold, all teasers link out, group pills navigate.

**Step B9 — Games page (Section 13).**
Skill: frontend-design. Build `/games` using exact code from 13a-13d: hero, two mode hero cards, filter bar, two game-card sections with name-all initial chips, stagger.
Verify (via /ui-ux-pro-max): filter works across both sections, mode cards correct colors, responsive.

### Phase 3 — Blindtest merge

**Step B10 — Blindtest backend migration (Section 16a). HIGH-RISK STEP — read this in full.**

This is a cross-codebase backend migration from a SEPARATE existing project (`https://kpop-quizz-v2-blindtest.vercel.app/`, its own repo) INTO the kpopquiz.org monorepo. A careless migration here breaks audio, loses the 22,000-song database, or duplicates schema. Treat it with maximum care. Skill: backend skill.

**Mandatory before writing ANY migration code — Claude Code must read BOTH backends end to end and produce a written migration map. Do not let Claude Code start porting until this map exists and you have reviewed it.** Instruct Claude Code explicitly:

1. **Read the SOURCE backend in full** (the blindtest Vercel repo). Inventory and document:
   - Every Supabase table, column, type, constraint, index, and foreign key related to songs, playlists, game sessions, and play tracking. Capture the exact DDL.
   - Every migration file in order (e.g. `024_songs_deezer.sql` and any others), so the schema history is understood, not just the current state.
   - The song population scripts (e.g. `populate-songs.mjs`) — how songs are fetched, normalized, and inserted; where Deezer preview URLs and album art come from.
   - The Deezer integration: API calls, rate limits, auth/keys, how preview clips and metadata are retrieved.
   - The `/api/game/generate` endpoint (or equivalent): exact request params, exact response shape, and specifically HOW the `wrongAnswers` distractors are generated for each song (this is required for the 4-choice answer mode).
   - The `use-audio-player` hook: the full YouTube IFrame API integration AND the iOS Safari AudioContext unlock workaround (the most fragile, most easily-broken piece).
   - The admin panel for managing songs (routes, auth, write operations).
   - Any env vars / secrets the blindtest backend depends on.

2. **Read the TARGET backend in full** (kpopquiz.org). Document:
   - The existing Supabase schema, migration numbering convention, and naming conventions (snake_case tables, etc.).
   - The existing API route structure and conventions (so the ported endpoints match house style).
   - The existing auth/session model (so blindtest plays attach correctly, anonymously for V1).
   - Any naming collisions between the two schemas (a `songs` or `plays` table existing in both, etc.).

3. **Produce a written MIGRATION MAP before coding.** A short document listing, for every source object: its target name, target location, any rename to avoid collision, and any transformation needed. Flag every risk (collisions, env var differences, migration-number conflicts, Deezer key handling, the iOS audio unlock). You (Cowork) review this map and get user sign-off on anything ambiguous BEFORE Claude Code writes a single migration.

**Then migrate, in this order, verifying each before the next:**
   a. Port the Supabase schema (songs, playlists, play tracking) using the target's migration numbering. Verify tables exist and match source DDL.
   b. Port + run the song population so the 22,000+ songs, Deezer preview URLs, and album art land in the target DB. Verify row counts match the source.
   c. Port the Deezer integration + admin panel under `/admin/songs`. Verify the admin panel can read and write songs in the target.
   d. Port `/api/game/generate`. Verify it returns songs WITH the `wrongAnswers` array (the 4-choice mode depends on this exact field).
   e. Port the `use-audio-player` hook with the iOS AudioContext unlock intact. This is the highest-fragility item — test on real iOS Safari, not just desktop.

**Do NOT port:** party mode, ranked mode, daily challenge mode, the XP/combo/powerup/mastery systems, the multiplayer room-code system, the lightstick mascot, the `use-game-state` XP/mastery logic, the dark purple gradient theme. V1 is solo only and uses the kpopquiz.org design system.

**Verify (do not advance until all green):**
   - Source vs target song row counts match.
   - `/api/game/generate` returns valid songs + `wrongAnswers` for several groups and difficulties.
   - Admin panel reads and writes songs in the target DB.
   - Audio actually plays on desktop AND on a real iOS Safari device (the unlock workaround is the make-or-break).
   - No schema collision with existing kpopquiz.org tables; migration numbers are sequential and clean.

**Step B11 — Blindtest frontend (Section 16b-16f).**
Skill: frontend-design for UI, backend for API wiring. Build the 4-screen `/blindtest` page using exact code from 16d-16f. 4-choice answers (NOT free text). Wire YouTube audio. Replace mock data with real API.
Verify (via /ui-ux-pro-max): full playthrough, 4 choices shuffle correctly, ring timer, hint at 50%, reveal animations, results breakdown. Test on iOS Safari (audio unlock).

**Step B12 — Blindtest nav + home integration (Section 16g + 16h).**
Skill: frontend-design. Add Blindtest to navbar (between Games and Leaderboard) and the home teaser card. Update mobile bottom nav.
Verify: nav entry resolves, teaser links to /blindtest.

### Phase 4 — Enhancements (lower priority, after core is stable)

**Step B13 — Games page descriptions (Section 5).** Add one-line descriptions per game type. Remove any remaining XP badges.

**Step B13b — Name All Members redesign (Section 18).** Skill: frontend-design for UI, backend for member/song data + `alts` curation. Use the exact code from Section 18: hidden `• • • •` slots that flip green on hit, ring timer, Levenshtein + nickname matching, three input feedback states, end screen revealing missed members. Dual-skill audit pre + post. Critical: curate the `alts` array per member (nicknames, romanization variants) — this is the top data-quality factor.

**Step B14 — Dark mode (Section 12d).** Skill: frontend-design. Full dark palette, `prefers-color-scheme` + manual toggle in navbar. Verify both modes via /ui-ux-pro-max.

**Step B15 — Scroll reveals (Section 12e).** IntersectionObserver section reveals on home, respect `prefers-reduced-motion`.

**Step B16 — Shared element transition (Section 12a).** View Transitions API quiz-card → quiz screen, with fallback.

**Step B17 — Swipe-to-next mobile (Section 12c).** Mobile-only swipe after answer, 60px threshold.

**Step B18 — Empty states (Section 14h).** Filtered-view empty state with CTA.

**Step B19 — Create onboarding (Section 14g).** 3-step strip above the editor.

**Step B20 — Leaderboard podium (Section 14f).** Podium + ranked list redesign.

**Step B21 — VS badge signature (Section 14a).** The VS motif on This-or-That cards and games hero.

**Step B22 — Contextual auth (Section 6).** LAST. Remove Sign in from navbar, trigger auth modal at high-intent moments. Only after everything else is stable.

---

# WORKSTREAM C — Duel → Ranking engine (Pipeline 1)

Source: `kpopquiz_pipeline1_duel_ranking_spec.md`. This is the strategic answer to "nobody creates quizzes." Fans never write — they tap, taps feed Elo, Elo builds crowd-truthful ranking pages that Google indexes. Run AFTER Workstream B foundation (B0-B3) exists, since it depends on the design tokens and navbar. Can overlap with B enhancements.

Hand these to Claude Code in order. Backend skill for C1-C4, frontend-design + ui-ux-pro-max (dual audit) for C5-C8.

- **C1** — Migrations: `duel_questions`, `duel_votes`, `duel_ratings` (backend skill).
- **C2** — Seed launch questions + starting Elo so first visitors see populated rankings (spec Section 6). Launch with 2-3 questions (best dancer, ult bias, best b-side) for the biggest groups only.
- **C3** — Elo: real-time update on vote + nightly reconciliation job (spec Section 2, backend skill).
- **C4** — API endpoints: `/api/duels/next`, `/api/duels/vote`, `/api/rankings/{group}/{type}`, `/api/rankings/index` (spec Section 3).
- **C5** — This-or-That game redesign frontend (spec Section 5 / redesign doc Section 13 + the validated duel prototype). Vote reveal, VS badge, dual-skill audit pre + post.
- **C6** — Live ranking widget wired to the vote endpoint: reorder on vote, pink bump highlight, "+N" Elo delta animation.
- **C7** — Ranking pages `/rankings/*` SSR with ISR + `ItemList` JSON-LD (spec Section 4). Coordinate with Workstream A: these are new indexable pages, only public above `min_votes`. Dual-skill audit.
- **C8** — Loop-back wiring both directions: ranking page → "Vote on these matchups" → duel; duel widget → "See full ranking page" → ranking page (spec Section 4e).
- **C9** — Add `/rankings` to navbar or footer; add public ranking pages to sitemap (coordinate with A7).
- **C10** — Monitor which questions get traction; expand the question set.

---

# WORKSTREAM D — Games discovery + daily game on home (design thinking required)

This workstream is partly open-ended on purpose. Before building, Cowork must THINK and propose, using `/ui-ux-pro-max` and `/frontend-design`, then get user sign-off. Do not just implement the first idea.

### Step D0 — Think: how to display all games on the games page
The games page now has more than two modes: This-or-That (with live rankings), Name All Members, Blindtest, plus future game types. The current two-hero-card layout (redesign doc Section 13) was designed for two modes — it will not scale cleanly to four-plus.

Instruction to Cowork: using `/ui-ux-pro-max` and `/frontend-design`, design 2-3 layout options for a games page that scales to many game types AND surfaces the live rankings (which are a major draw). Consider:
- A primary row of game-mode hero cards (This-or-That, Name All, Blindtest) + a secondary "trending rankings" strip pulling live Elo rankings as their own browsable cards.
- Whether rankings deserve their own top-level destination (`/rankings`) linked from games, or live inline on the games page.
- How a new game type slots in without a redesign each time (a repeatable game-card pattern).
- Mobile: how four-plus modes stack without endless scroll.
Output: a short proposal with 2-3 options, a recommendation, and a rationale. Get user sign-off before building. Then build the chosen option with dual-skill audit pre + post.

### Step D1 — Think + build: "game of the day" on the home page
The home page already has "Quiz of the day" (redesign doc Section 2b). Add a parallel daily game slot beside it so every day surfaces a different rotating game — one day a featured duel ("Today's matchup: Jungkook vs V — best dancer"), another day a name-all challenge ("Can you name all of SEVENTEEN in 60s?"), another day a blindtest set.

Instruction to Cowork: using `/ui-ux-pro-max` and `/frontend-design`, design the home-page daily layout. Consider:
- A two-up layout: "Quiz of the day" beside "Game of the day", equal visual weight, each a tappable card.
- The game-of-the-day rotates by type on a schedule (duel → name-all → blindtest → repeat, or weighted by engagement). Specify the rotation logic.
- The duel variant should show the actual matchup (two faces + VS badge) and tease the live ranking ("see where fans rank them"), so it doubles as a Pipeline 1 entry point.
- A daily reset countdown on both cards, mirroring the quiz-of-the-day pattern.
- Backend: a small `daily_features` table or scheduled job that picks each day's quiz AND each day's game, so they're deterministic per day (everyone sees the same daily — important for the shared-experience / Wordle-style hook).
Output: a layout proposal + the rotation/selection logic, get user sign-off, then build with dual-skill audit. This ties the daily ritual (a known retention powerhouse) to both the quiz engine and the Pipeline 1 duel engine.

### Step D2 — Optional: daily streak on the dailies
Once the daily quiz + daily game exist, consider a lightweight streak counter ("Day 12") on the home page tied to playing the daily. This is the Wordle retention mechanic. Propose with `/ui-ux-pro-max` first — it may need the contextual auth (Workstream B Step B22) to persist per user, so sequence accordingly. Do not build a streak that resets on every anonymous session.

---

# WORKSTREAM E — 1v1 Async Battle

Source: `kpopquiz_1v1_battle_spec.md`. A major feature that sidesteps three cold-start risks: no new questions (reuses the quiz bank), no notification infra (share link is the notification), no friend graph (async ghost opponents + links). It also reframes quiz creation as a competitive flex via a post-battle "add a question" hook.

Run AFTER Workstream B core pages exist (needs the quiz bank, quiz detail page, shared tokens, VS badge, ring timer). Can overlap with Workstream D.

**MANDATORY before building: Step E0 audit.** Cowork must first review the entire battle spec with BOTH `/ui-ux-pro-max` AND `/frontend-design`, confirm the design harmonizes with the rest of the site, confirm the matchmaking/ghost approach is sound, and confirm the creation-hook framing never exposes AI and never uses "create a quiz" language. Produce a report, validate the approach is real and coherent, and get user sign-off — BEFORE handing any implementation step to Claude Code. Then Claude Code builds with the exact prototype UI code.

- **E0** — Audit the spec with both skills + get user sign-off (mandatory gate, see above).
- **E1** — Migrations: `battles`, `battle_results`, `pending_questions` (backend skill).
- **E2** — Battle question selection: pull 7 from a quiz or group pool, reuse existing bank, no new content (backend skill).
- **E3** — Ghost matchmaking + seed the ghost pool for top quizzes (backend skill, spec Section 6).
- **E4** — Quick match frontend (Type 1): match → play → reveal, exact prototype UI. Dual-skill audit pre + post.
- **E5** — Challenge link (Type 2): `/battle/{id}` route, link generation, friend-plays-link flow, UTM params (spec Section 7).
- **E6** — Post-battle creation hook: inline add-question form → `pending_questions` → crowd-confirm promotion. Framing rules non-negotiable (never "create a quiz", never expose AI). Dual-skill audit.
- **E7** — Entry points: two CTAs on quiz detail (solo + battle), "Battle" nav entry, coordinate with D for "battle of the day". Dual-skill audit.
- **E8** — Report-question affordance site-wide, 3-report pull-to-review (spec Section 3).
- **E9** — Monitor: battle completion, challenge-link CTR, question-submission rate, ghost-pool health.
- **Type 3 (rivalries / friends / notifications)** — DEFERRED, post-V1 only. Do not build now.

Usage placement (spec Section 2): battle is a second MODE for quizzes, not a separate game. Quiz detail page gets "Play solo" + "Battle" buttons. Navbar gets a "Battle" entry (impulse quick-match). Home daily row gets "Battle of the day". Questions come from the existing quiz bank (spec Section 3) — both players answer the same 7. The creation hook (spec Section 4) is framed only as competitive fan-pride, never as a chore, never mentioning AI.

---

# WORKSTREAM F — Rabbit mascot system (LAST cosmetic layer)

Source: `kpopquiz_mascot_system_spec.md`. The black rabbit logo becomes an expressive mascot with 5 emotional states (default, celebrating, sad, thinking, sleeping), placed only at emotional peaks and dead moments. Turns a static logo into a character. Mostly frontend; the only backend touch is picking which expression to show by state.

Runs LAST — it decorates screens that must already exist (win/result, loading, empty states, daily-done, 404). Do not start until the screens it lands on are built.

**Mandatory F0 audit gate:** Cowork reviews the spec + the placement prototype with BOTH `/ui-ux-pro-max` and `/frontend-design`, confirms the scarcity/placement rules harmonize with the built screens, confirms where the mascot must NOT appear (play surfaces stay clean), and confirms the two animations respect `prefers-reduced-motion`. Report + user sign-off before building.

- **F0** — Audit spec + prototype with both skills, get user sign-off (mandatory gate).
- **F1** — Drop the 5 PNG assets in the repo; build one reusable `<Mascot>` component (variant + animate props).
- **F2** — Navbar + favicon (default).
- **F3** — Win / result / battle-win (celebrating + bob), including the shareable result card.
- **F4** — Loading / finding-opponent / generating (thinking + tilt) — highest-ROI placement.
- **F5** — Empty states + wrong-answer + lost-battle (sad, static).
- **F6** — Daily-already-played + streak rest (sleeping), coordinate with Workstream D.
- **F7** — 404 + optional first-visit welcome + optional faint home/footer watermark.
- **F8** — Final in-context audit with both skills: no screen noisy, core play surfaces clean.

Placement scarcity rule (spec Section 1): mascot only at emotional peaks + dead moments. NEVER on the quizzes grid, quiz question screen, duel question screen, blindtest playing screen, or leaderboard table. The icon-generation process for producing new expression variants from the base logo is documented at the END of the mascot spec (Section 5) — use it if more emotions are needed later.

---

# WORKSTREAM G — Notion documentation (do EARLY, then keep updated)

The user wants the full project plan in their Notion DB. Cowork has the Notion connector.

- **G0** — Create (or locate) a Notion database for the kpopquiz.org project. Then create one page/entry per workstream (A-F) plus an overview page. Each workstream entry contains: its goal, its ordered steps, current status, and a link/reference to its source spec doc.
- **G1** — Populate a master tracker: a table with every step (A0...A8, B0...B22, C1...C10, D0...D2, E0...E9, F0...F8) as rows, with columns for: workstream, step id, description, status (todo / in-progress / blocked / done), skill(s) used, and verification result. This becomes the live project board.
- **G2** — After EACH completed step in any workstream, update its status in the Notion tracker before moving to the next step. The Notion DB is the single source of truth for project state, so the user can see progress without reading chat.

Do G0 and G1 near the start (right after reading all specs, around the time of B0). Then G2 is a standing habit for the whole engagement.

---

## Final sequencing summary

```
WORKSTREAM A (SEO):   A0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8(monitor)
WORKSTREAM B (UI):    B0(harmonization audit, FIRST)
                      → B1 → B2 → B3   (foundation)
                      → B4 → B5 → B6 → B7 → B8 → B9   (core pages)
                      → B10 → B11 → B12   (blindtest merge)
                      → B13 → B13b ... → B22   (enhancements, B22 last)
WORKSTREAM C (Duel):  after B0-B3 → C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10
WORKSTREAM D (Disc.): after C5-C6 and B8 exist → D0(think) → D1(think+build) → D2(optional)
WORKSTREAM E (1v1):   after B core (esp. B5 quiz detail, B6 quiz screen) → E0(audit+sign-off, MANDATORY) → E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9
WORKSTREAM F (Mascot):LAST cosmetic layer, after target screens exist → F0(audit+sign-off) → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8
WORKSTREAM G (Notion):G0 + G1 EARLY (around B0), then G2 standing update after every step
```

Order of priority across workstreams: G0/G1 (set up tracking) → A (SEO is bleeding) first/parallel → B foundation → B core + C in parallel → D (needs the duel engine from C and home lobby from B8) → E (needs B core: quiz bank, quiz detail, shared components) → B enhancements → F mascot LAST (decorates finished screens). C, D, E all reuse B's foundation, so B0-B6 must land before they get far. G2 runs continuously throughout.

Within every workstream, strictly sequential. One step to Claude Code, verify (dual-skill audit on every visual step), commit, update Notion (G2), next. Steps requiring a THINK/AUDIT-and-sign-off phase before building: D0, D1, E0, F0.

Begin with G0/G1 (Notion setup), Step A0 (SEO diagnosis), and Step B0 (UI harmonization audit). Do NOT start B1 until the B0 canonical token sheet exists. Report back in /caveman after each step.
