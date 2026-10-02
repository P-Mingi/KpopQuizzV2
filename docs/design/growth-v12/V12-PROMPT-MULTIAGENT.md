# Mission V12: build all of v12 on every page, pixel by pixel, with a team of subagents

You are the ORCHESTRATOR for kpopquiz.org (repo `KpopQuizzV2`, app `apps/quiz`, Next.js 16 App Router, Supabase
project `rdkgouofytwfdpbxbzio`, Vercel project `kpopquiz`, pnpm). You do not write feature code. You set up the
run, spawn the agents below, keep them inside their paths, integrate their work and run the check loop until
section 8 is true. This is the same method as the v11 run (W2), which worked: read
`docs/design/ux-dashboard-v1/v11/WORKER-PROMPT-V11-MULTIAGENT.md`, `v11/REPORT.md` and `v11/RUN-STATE.md`
(Run environment) before anything; this prompt only says what changes.

Starting point: `main` after the R1 release (v11 merged, its fixes and migrations applied). Production may still
run with `NEXT_PUBLIC_UX_V1` off (owner, 2026-09-30); previews run with it on. Check it in Phase 0: `gh pr view 66` says merged, `docs/release/R1-REPORT.md` is on `origin/main` and
`docs/release/R1-STATE.md` there says DONE. If R1 is not done, stop and tell the owner. Where SYSTEM.md and this prompt differ (file names like
`w3-*.sql` or `styles/growth`, the standalone bridge quiz, where the load test runs), this prompt wins.

Design reference, two copies of the same build:
- Live, for looking: https://claude.ai/artifact/AcDCcgsUaeM39VqeQC7B5d (never measure against it).
- Pinned, for measuring: `docs/design/growth-v12/prototype.html` (`window.UX_VERSION = "v12.2 growth (2026-09-29)"`).
  It contains every v11.2 page plus the v12 views. The button "New in v12" lists the new views. Dashed boxes
  starting with "Design note" are annotations, never shipped copy.
- System and rules: `docs/design/growth-v12/SYSTEM.md` (sections 1 to 5.6 are all in scope, section 6 is void).
The owner (Mingi) validated the design. Nothing is open for redesign. Disagreements go in reports.

---

## 0. Rules that do not bend (copy into every brief)

1. Never push to `main`, never merge into `main`, never force-push. The owner merges.
2. Never write, print or commit a secret. Env vars only. Generated secrets go straight into their store.
3. No DDL and no data write against production. Every table, column, policy, function, cron or data insert is a
   file `docs/pending-migrations/v12-<agent>-<topic>.sql` (idempotent, header: what, why, rows, verify, undo).
   The code fails soft until it is applied. A file is applied only after the owner types `go <filename>` (4c).
4. Data safety (v11 decision 1 still stands): the dev server and previews use the production database, so no
   mutating request reaches it from a check. Every spec uses the v11 `guardWrites` helper
   (`apps/quiz/e2e/ux-v1/helpers/`), which answers POST/PUT/PATCH/DELETE locally and asserts the payload.
   Exceptions, only after the owner's `go` for that test: the live load test (4d) and one tracking proof, both
   writing rows marked `is_test = true` in tables created by this run. Never load `/me` or `/profile` signed in
   (they write on view). Never change anyone's XP, level, streak, badges, likes, comments, settings or plays.
5. Everything ships behind `NEXT_PUBLIC_UX_V12` (default off), read through `isUxV12()` in `lib/ux-v12.ts`,
   which is true only when `NEXT_PUBLIC_UX_V1` is on too (production may run with v11 off: v12 is then off
   too). Every build, dev server and
   checker baseline in this run sets `NEXT_PUBLIC_UX_V1=1`. Flag off = today's v11 code paths, byte for byte:
   every new page, API route and cron answers 404 or does nothing unless `isUxV12()`; rewrites and the
   REFONTE exceptions in `next.config.ts` exist only when the flag is on at build; new themed modes join
   `STATIC_MODES` only with the flag. Data is not code: groups and songs added by G2's approved SQL appear on the
   v11 pages too (that is the point). Two switches of their own: blindtest tracking (`NEXT_PUBLIC_BT_TRACKING`)
   and the score helpers (always on: they recompute every guess-from-clues score and average). Exception to the
   gating above: `/api/track/bt-run`, the legacy tracking calls and `/admin/blind-tests/runs` follow
   `NEXT_PUBLIC_BT_TRACKING` alone, so runs are recorded in production while the UI flags stay off.
6. SEO is a blocker: every existing public URL keeps its URL, title, description, H1, intro, FAQ, JSON-LD,
   canonical, hreflang, `/pt` mirror and server rendering, flag on and off. New URLs: indexable only where
   SYSTEM.md says so (the four landings, themed playlists, Which member, Name them all, the KPop Demon Hunters
   quiz), in the sitemap only when the flag is on; `/live`, `/join`, `/creators`, `/admin/*` noindex.
7. Real data only. No floored, random or invented number. A number that does not exist is hidden.
8. Editorial accounts (SYSTEM.md 5.6) always carry the Team badge and never act as fans. No agent creates an
   account or handles a password: the owner creates the editorial accounts when G9 asks and gives their ids.
9. No emoji, no em or en dashes in UI copy, docs, reports and code comments you add.
10. Do not redraw group logos or the KpopQuiz logo; photos only from `apps/quiz/public/idols/`; KPop Demon Hunters:
    text and audio only; TikTok: the word only.
11. Stay inside your owned paths (`docs/design/growth-v12/run/OWNERSHIP.json`); the guard rejects anything else.
12. Judgment, so the run never stalls on noise. A check that disagrees only for a reason nobody sees (hashed
    `/_next/static` paths, the build id, the order of the streamed page data `self.__next_f`, timestamps,
    sitemap `lastmod`, live counters, the order of equal items, rows added by SQL the owner approved, recomputed
    guess-from-clues figures) is not a
    failure: normalize it, write the normalization in the report, continue. Stop and ask the owner only for:
    a production write, a secret, a change a visitor or a crawler would see with the flags off, an SEO field
    change, a failing security test, or a decision this prompt or SYSTEM.md marks as the owner's. Everything else
    you decide, write down and keep going.

---

## 1. Inputs

- `docs/design/growth-v12/`: `SYSTEM.md`, `prototype.html`, `capture-v12.mjs` (40 v12 states x 1440/390 x
  light/dark, plus `styles.json` of the v12 landmarks), `V12-OWNERSHIP.template.json`.
- v11 references still valid: `docs/design/ux-dashboard-v1/DESIGN-SPEC.md` 16 and 17, `WIRING-MAP.md`,
  `v11/capture-prototype.mjs` (its 38 states also run against the v12 prototype: that is the regression set for
  the v11 pages v12 touches).
- The v11 code map: shared components in `components/ux-v1/` (button, chip, dropdown, form, panel, person-name,
  post-card, quiz-card, section-header, segmented, share-sheet, sheet, sign-in-sheet, story-image, tabs,
  text-card, toast, badge-medal, avatar, icon...), per page `components/<area>/ux-v1/`, `lib/ux-v1/<p>/`,
  `styles/ux-v1/<p>.css`, `app/api/ux-v1/<p>/`. The v11 blindtest game has one run hook:
  `components/blindtest/ux-v1/use-run.ts`.
- Facts to build on (checked 2026-09-25 to 29): blindtest runs are recorded nowhere (SYSTEM.md 1); clue quizzes
  score up to 3 points per question and every inline average goes above 100% (SYSTEM.md 2); `generate` cannot
  apply year, generation plus gender, clip point or length, and the title-tracks pool is empty (v11 decision
  33); `songs` has no accuracy stats (decision 36); the community feed shows Verse threads and blogs only when
  `VERSE_PUBLIC` is true (decision 27, `lib/ux-v1/p8/verse-gate.ts`): editorial topics and blogs must be visible
  in production, so G9 finds where they can live (Verse spaces made public for them, or the community tables of
  `v11-p8-community.sql`) and records it as an owner decision without waiting; `next.config.ts` 301s
  `/which-:group-member-are-you` and `/personality*` (REFONTE P1); the middleware 301s unknown routes
  (`lib/route-allowlist.ts`, startsWith, `UX_V1_ROUTES` pattern for flag-only routes).

## 2. The team

Spawn each agent with the Agent tool and `isolation: "worktree"` (v11 Run environment: worktrees are bare, symlink
`node_modules`, `apps/quiz/node_modules`, `apps/quiz/.env.local` from the main checkout, never stage them). Max 4
builders at once. One `next build` at a time across the whole run, none while CI or Vercel is building; a build
that fails on a Supabase timeout is retried once and is not a code bug. Branches `v12/<id>-<name>` from `feat/v12`. Agents never push; you push `feat/v12` only
(agent branches do not build on Vercel since R1).

| Id | Agent | Scope (prototype views and SYSTEM.md sections) |
|---|---|---|
| A1 | Foundation v12 | `lib/ux-v12.ts` flag, Team badge in PersonName and PostCard (`.teamtag`, `.ava.team`, `.teamnote`), theme card (`.thm`), ways-to-play tile (`.gtile`), three steps (`.steps3`), language switch (`.langsw`), colour + shape answer tiles (`.lt`, `.pb`, shapes), result card parts (`.rescard`, `.traits`, `.dist`), story image variants, kit additions |
| G1 | Tracking + scores | SYSTEM 1 and 2: `bt_runs`, `/api/track/bt-run`, `trackBtRun()` in `use-run.ts` and every legacy flow, claim, `/admin/blind-tests/runs`; score helpers and every inline average outside other agents' files |
| G2 | Catalogue + generate | SYSTEM 3: RESCENE, NCT WISH, songs for Hearts2Hearts, KickFlip, RESCENE, NCT WISH, 2026 releases, KPDH songs (own status), sourced title tracks; `generate` support for year, generation + gender, curated ids, the KPDH status, so decision 33's modes play as named where the data exists |
| G3 | Blindtest acquisition | views `blindtest` (Playlists rail, live band, language row), `btpl` (themed playlist pages), `btland` x4 (en, fr, es, id), localized game strings in the v11 game, sitemap and hreflang |
| G4 | Live blindtest | view `livegame` + the phone: `/live` host, `/join` phone, rooms, realtime, scoring, moderation, load and chaos tests (SYSTEM 5.5) |
| G5 | Personality engine | views `wma` and `kpdh`: Which member are you (per group), the KPop Demon Hunters bridge quiz on the same engine, bias offer, distribution |
| G6 | Name them all | view `nta`: per group, 60 s, spellings, results, share |
| G7 | This or that + Fans picked data | quiz results bonus (`#e-tot`), votes, anti-abuse, nightly ranking, the Fans picked API |
| G8 | Group hub + creators | hub `#hb-modes` ways to play, `#hb-fp` Fans picked section (G7 data), empty and thin hub states, create done "Open the share kit", share kit sheet, `/creators`, leaderboard link |
| G9 | Editorial seeding | SYSTEM 5.6: `editorial_accounts`, `editorial_drafts`, `/admin/editorial`, publisher cron, draft templates from real data, Team badge data on every surface, exclusions from boards |
| C1 | Pixel checker | every v12 state + the v11 regression set, 1440 and 390, light and dark |
| C2 | Backend checker | every wiring row of section 6 end to end, the live proofs, data guard |
| C3 | QA + SEO + report | e2e, axe, keyboard, SEO diff, performance, REPORT.md |

Order: Phase 1 = A1, G1, G2 (G1 and G2 own no UI). Phase 2 = G3 to G9 (start with G4, G3, G9, G7; then G5, G6;
G8 last: its tiles and Fans picked need G5, G6, G7 merged). Phase 3 = C1, C2, C3 and the fix loops (max 3).

## 3. How nobody overwrites anybody

Same mechanics as v11 section 3, with v12 names: integration branch `feat/v12` from `origin/main`; ownership in
`docs/design/growth-v12/run/OWNERSHIP.json` written from `V12-OWNERSHIP.template.json` in Phase 0 (fill the
exact file lists marked TODO by reading the tree); guard `scripts/v12-owner-guard.mjs` installed per worktree
with `git config --worktree core.hooksPath scripts/v12-hooks` and the agent id in `git config --worktree
v12.agent <id>` (env vars do not survive between shell calls). Shared requests go to
`docs/design/growth-v12/run/requests/<id>.md`; the owner of the file does them. Routes known only with the flag
go in a `UX_V12_ROUTES` list next to `UX_V1_ROUTES` (you own `route-allowlist.ts`, `next.config.ts` and
`vercel.json`: agents request rewrites, redirects and crons from you). The allowlist uses startsWith: the
per-group URLs need a suffix rule (`endsWith('-name-all-members')`, `startsWith('/which-')` +
`endsWith('-member-are-you')`), flag-only, with tests in `middleware-matcher.test.ts`. App Router has no partial
dynamic segments: those URLs are rewrites to internal routes (`/personality/[group]`, `/name-all/[group]`) whose
direct URLs are noindex with a canonical to the pretty URL.
You write the guard in Phase 0 (copy `scripts/ux11-owner-guard.mjs` to `scripts/v12-owner-guard.mjs`, reading
`v12.agent` and the v12 OWNERSHIP.json) before any agent starts; you own it and `scripts/v12-hooks/**`.

## 3b. Signed-in testing

Exactly v11 3b: only the parity test user, through the Playwright setup project `e2e/ux-v1/auth.setup.ts`
(storage state outside git, deleted at the end), service role for OTP minting and read-only SQL only.

## 4. Phases

Phase 0 (you): RESUME check (`docs/design/growth-v12/run/RUN-STATE.md` on `feat/v12`). Otherwise: R1 check;
create `feat/v12` from `origin/main`; first commit "docs(v12): growth package" with `git add -f
docs/design/growth-v12` (the folder is in `.git/info/exclude`), then delete that exclude line (and its comment)
from `.git/info/exclude` so later files under it are seen by git; OWNERSHIP.json; guard; Run environment
(ports: A1 3060, G1..G9 3061..3069, integration and checkers 3071); capture the references into
`docs/design/growth-v12/run/checks/reference/` (from `apps/quiz`: `node ../../docs/design/growth-v12/capture-v12.mjs
<dir>` and a copy of `docs/design/ux-dashboard-v1/v11/capture-prototype.mjs` in `run/checks/` with `.tour-t,.dnote` added to
its hidden list, run on `../../docs/design/growth-v12/prototype.html` into `<dir>/v11` (never edit the v11 folder); PNGs local only, `styles.json` committed); ask the owner once for the editorial account ids (5.9) and
for the Lighthouse dependency OK; spawn A1, G1, G2. Playwright: `UX11_CHROMIUM` as in v11, and
`PW_CHROMIUM=$UX11_CHROMIUM` for `capture-v12.mjs`.

Phase 1, 2: each agent builds on the real backend, writes its e2e spec `e2e/ux-v12/<id>.spec.ts`, captures its
own states with the same state list, writes `docs/design/growth-v12/run/reports/<id>.md` (Progress block on
top) and tells you "ready" (branch, sha). "Ready" means code, tests, SQL files and dry runs done; applying SQL and
the write tests of 4d happen in Phase 3 and never block an agent. You merge into `feat/v12` one at a time
(`--no-ff`, guard first). You may push `feat/v12` and open its draft PR; nothing else is pushed.

Phase 3 (C1, C2, C3): on local production builds of `feat/v12` with the flag on (the Vercel preview sits behind
SSO: use it only if the owner gives `VERCEL_AUTOMATION_BYPASS_SECRET`), signed in as the test user and as a
guest. Issues in `docs/design/growth-v12/run/issues/<owner>.md`. Up to 3 loops.

Phase 4 (you): draft PR `feat/v12` -> `main`, flag default off, REPORT.md, pending SQL with status, env vars,
crons, owner decisions. RUN-STATE says DONE.

## 4b. Run state and resume

Exactly v11 4b, with the file `docs/design/growth-v12/run/RUN-STATE.md` and the same NEXT ACTION line.

## 4c. Pending SQL

Show the owner each file (what, rows, what it unlocks, undo) in one grouped message; apply only on `go <filename>`,
one at a time, with the Supabase MCP if this session has one on `rdkgouofytwfdpbxbzio`, else the owner pastes it
in the SQL editor and answers "applied <filename>"; then run its verification queries. Order in the file headers.

## 4d. Tests that write (owner go each time)

- Tracking proof (G1, C2): one guest run and one abandoned run on a local production build, rows `is_test = true`.
- Live load test (G4, C2): scripted phones against a local production build and the production Supabase
  Realtime: 5 rooms x 50 players at once, then 1 room x 50 for 20 rounds; rooms and answers `is_test = true`;
  cleaned by the room expiry. Needs the project's real Realtime limits first (the owner reads them in the Supabase
  dashboard; Pro default 500 concurrent connections).

---

## 5. Briefs

Template: v11 section 5 with `v12` names, plus "Prototype states you own: <names from capture-v12.mjs and
capture-prototype.mjs>" and "SYSTEM.md sections: <n>".

5.1 A1 Foundation v12. The shared pieces listed in section 2 (the guard is ORCH's), in `components/ux-v1/` (same folder, new files or
additive props), every piece in the kit route in every state, light and dark. PersonName and PostCard get an
`isTeam` prop: Team pill after the name, team avatar, no level, and the `teamnote` line on post and profile.
Done when the kit matches the prototype pieces and flag off is unchanged.

5.2 G1 Tracking + scores. Everything in SYSTEM.md 1 and 2 (`is_test` from `VERCEL_ENV`, never the Host header;
`bt_bump_song_plays` executable by service role only and never for test runs; `bt_song_stats` with
`security_invoker`). Wire `trackBtRun()` in `use-run.ts` (every v11 flow: playlists, groups, themes, daily,
challenge, ranked with `mode='ranked'`) and in the legacy components. Score helpers in `lib/quiz/scoring.ts`;
replace every inline average and `score/total` label in files you own; file a request for each one in another
agent's files. Done: the tracking proof passes (4d), `/admin/blind-tests/runs` shows it, no page can show an
average above 100%.

5.3 G2 Catalogue + generate. SYSTEM.md 3, plus: KPDH songs by fictional acts get their own non-active status so
they never enter the daily, the all-songs pool, group playlists or ranked; soundtrack songs by real groups (TWICE)
keep their group and are listed by id. Before its `go`, prove with a grep of every `from('songs')` reader
(site, crons, ranked, daily, search, stats), on `origin/main` and on `feat/v12`, that the new status is excluded
everywhere; if `main` would include it, the KPDH rows go in their own SQL file that waits for the `feat/v12` merge. The ingestion script reads
with the anon key and runs under `env -u SUPABASE_SERVICE_ROLE_KEY`; it writes only with an explicit `--apply`,
which this run never uses. `generate` gains year ranges, generation + gender, curated id lists and
the KPDH playlist; each of decision 33's modes plays as named when the data allows (list the rest). Dry-run mode
for the ingestion script; only the SQL files reach the database. Done: files applied after `go`, playlists count
and clean songs per group verified, every themed playlist has at least 10 playable songs or stays hidden.

5.4 G3 Blindtest acquisition. SYSTEM.md 4 on the v11 components: `/blindtest` gains the Playlists rail, the live
band (links `/live`), the language row; `/blindtest/<theme>` pages as `btpl` (hero, tracks list, Play, Play it
live, KPDH bridge card); `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`,
`/id/tebak-lagu-kpop` as `btland` with the v11 game, localized strings (`lib/growth/bt-strings.ts`, English output
identical), `lang` like `/pt`, own hreflang cluster (x-default en), FAQ + FAQPage JSON-LD, BreadcrumbList; "fans
playing today" only from `bt_runs`, hidden otherwise. Done: states `bthub-*`, `land-*`, `theme-*` pass C1; SEO
checks; each landing plays.

5.5 G4 Live blindtest. SYSTEM.md 5.5, blindtest only (the quiz version is parked). First, read only: R1 found
that the existing `party_rooms` and `party_players` tables still have public write rules. Find what uses them
(old party feature or nothing); reuse them only if they fit, otherwise leave them; in both cases write
`v12-g4-party-rls.sql` that closes their public writes the same way as R1's `r1-rls-tighten.sql`, after moving
any client writer behind a server route. `live_rooms`, `live_players`,
`live_answers` (RLS, service-role writes), 6-character room codes, QR, `/join` and `/join/<code>`, nickname
filter (reuse the site's moderation word list), host token for host actions, player token per phone, max 50
players, host can remove a player, rooms expire after 2 hours (cron). Audio only on the host. Answers through the
API with server time; points 500 + 500 x (1 - t/T) rounded to 10, streak +100 from the 3rd right answer in a row,
capped +300; ties by total answer time. Realtime on private channels (Realtime Authorization, policies on `realtime.messages`): phones only receive;
every host or player action goes through the API, and the server broadcasts round and score events. The host tab
drives the rounds through the API; a host reload
resumes the room; a phone that drops rejoins with its token and keeps its score; late answers are refused.
Tests: unit (points, streak, ties, code alphabet), API (every route: auth, limits, late answers, duplicates),
e2e with one host context and three phone contexts (the whole game, reload, drop and rejoin, removal, expiry),
the load test of 4d with p95 answer latency and message loss reported. Done: all of that green, numbers in the
report, states `live-*` pass C1.

5.6 G5 Personality engine. Which member are you on `personality_questions`, `personality_profiles`,
`personality_results` (never dropped), one page per group with a profile set at `/which-<group>-member-are-you`
(you request from ORCH a rewrite to an internal route and the removal of the REFONTE redirect for those groups
only), result by public role only, three traits, share of fans with the same result, distribution, story and
square share images, "Set <member> as your bias tag" through `/api/auth/update-profile` (stubbed in tests),
retake. The KPop Demon Hunters bridge quiz (`/kpop-demon-hunters-quiz`, 6 questions, 6 real groups, 3 songs
each) on the same engine, picture-free. Done: states `wma-*`, `kpdh-*` pass C1; SEO for the new URLs.

5.7 G6 Name them all. Per group with members data, `/<group>-name-all-members` (rewrite from ORCH), 60 seconds,
accepted spellings (romanizations, stage and birth names, Hangul, one-letter typos on 5+ letters), give up, result
with found/total and time, share, "named first most often" (never a "most forgotten" stat), results in
`name_all_member_results`. Done: states `nta-*` pass C1; every member list checked against the database.

5.8 G7 This or that + Fans picked data. The results bonus card (songs only, never member against member, up to 5
pairs, skip), votes in `duel_questions` / `duel_votes` (never dropped), one vote per pair per anon id per day,
nightly ranking (Bradley-Terry) into a table with weekly movement (cron from ORCH), API for Fans picked. Done:
states `quiz-bonus*` pass C1, anti-abuse tests, ranking unit tests on fixed vote sets.

5.9 G9 Editorial seeding. SYSTEM.md 5.6 exactly. Topics, debates and blogs live in the community tables of
`v11-p8-community.sql` (applied by R1) where they fit; what they cannot hold (threads, blogs) gets its own table
in `v12-g9-editorial.sql`. Record the Verse option as an owner decision and keep building without waiting. The publisher writes without any XP, badge, streak, ticker or
activity side effect (no reuse of a fan route that grants them). When you reach the accounts step, the owner
creates 3 to 5 accounts and gives their user ids;
`v12-g9-editorial.sql` creates the tables and inserts those ids. `/admin/editorial` (admin gate as other admin
pages, existing admin styling): queue, preview identical to the post, edit, approve with a date, reject.
Publisher cron every 15 minutes (from ORCH), max 3 items a day, never two in a row from one account, only
`reviewed_by` admin items, through the same write path as a fan post, marked editorial. Draft templates from real
data (weekly recap, comeback topics, This or that splits) with sources. The Team badge data reaches every surface
that shows a person (feed, post, profile, notifications, search, activity); editorial accounts are excluded from
leaderboards, creators board, Fans picked, fan counts and XP (requests to the owners of those files). Done:
states `community-team-post` and `post-team` pass C1; a draft goes from queue to published in a test with the
write stubbed; exclusions proven by C2 with read-only SQL.

5.10 G8 Group hub + creators. On the P3 hub: ways to play tiles (links to Which member, Name them all, This or
that, live, the group blindtest, only those that exist for that group), Fans picked section (G7 API), empty hub
"Be the first" with real signals and 3 templates, thin hub nudge with the real play count; create done "Open the
share kit"; the share kit sheet (link, QR, story, captions with the fandom name, challenge link, plays from the
creator's link); `/creators` (this month, all time, rising per fandom, rules, tiers; own plays excluded,
editorial accounts excluded); leaderboard link. Done: states `hub-*`, `share-kit`, `creators` pass C1.

## 6. Checkers

C1: capture-v12.mjs states and the v11 regression states (capture-prototype.mjs run on the v12 prototype) against
the implementation, 1440 and 390, light and dark, landmark boxes within 2px and `styles.json` values equal (masks
for photos and text), no sideways scroll at 390. The shipped v11 deviations are the expected values, not failures
(v11 REPORT.md "Deviations": nav spacing, warm light ground and white surfaces, tablet chrome to 900px, 94% nav and
tab bar glass). C2: one wiring row per control of every v12 view (write the list
first in `run/checks/backend/ROWS.md` from the prototype and SYSTEM.md), proven by request shape plus read-only
SQL, the two write tests of 4d, the data guard before and after. C3: e2e, axe 0 serious or critical, keyboard,
SEO diff flag on and off against `main` (only the listed additions), performance on the new pages (LCP, CLS, and
Lighthouse if the owner OKs it), REPORT.md. Production parity with both flags off (the state production runs
in): a production build of `feat/v12` and one of `origin/main`, both with `NEXT_PUBLIC_UX_V1` and
`NEXT_PUBLIC_UX_V12` unset, built one after the other and compared at the same moment on the 40 URLs of R1's
snapshot list (`docs/release/snapshots/after-fixes.json`), plus `sitemap.xml` and `robots.txt`: status, title,
description, canonical, hreflang, robots, H1 and parsed JSON-LD identical; the server HTML identical once the
`/_next/static` paths, the build id and the streamed page data (`self.__next_f` scripts) are removed; the
sitemap compared as the set of URLs with their hreflang alternates (`lastmod` is a live value); `robots.txt`
byte for byte. Allowed differences: live counters, rows added by SQL the owner approved, and guess-from-clues
figures recomputed by the score helpers. Any other difference
blocks the merge.

## 7. Env vars, crons, flags (listed for the owner in Phase 4)

`NEXT_PUBLIC_UX_V12`, `NEXT_PUBLIC_BT_TRACKING`; crons: live room expiry, Fans picked nightly ranking, editorial
publisher; everything else in pending SQL.

## 8. Definition of done

Every v12 state and the v11 regression set: C1 pass. Every wiring row: C2 pass. C3 green. Flag off: v11 unchanged.
Both flags off: production parity with `origin/main` passes (C3), with no difference but live counters, approved
data and recomputed guess-from-clues figures.
Live: load and chaos tests green with numbers. Pending SQL written; the files the owner approved applied and
verified. One draft PR `feat/v12` -> `main` with REPORT.md. RUN-STATE says DONE, test storage state deleted.

## 9. End message

Short, in French, no dashes: what is done, the PR, SQL waiting for `go`, env vars and crons to set, decisions.
