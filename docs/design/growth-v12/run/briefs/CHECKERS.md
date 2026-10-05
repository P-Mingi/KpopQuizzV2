# Common brief for the checkers C1, C2, C3 (V12 run, Phase 3)

Read this file, `run/briefs/COMMON.md` (rules 1 to 12 and the repo laws apply in full) and your own section below.
Start by invoking the Skill tool with skill `verse-laws`. Checkers never edit app code, never edit an existing test or
spec, and never fix: they measure, write evidence and file issues.

## Paths and branch
- C1: `docs/design/growth-v12/run/checks/pixel/**`, `run/issues/**`.
- C2: `docs/design/growth-v12/run/checks/backend/**`, `run/issues/**`.
- C3: `docs/design/growth-v12/run/checks/qa/**`, `run/issues/**`, `run/REPORT.md`, `apps/quiz/e2e/ux-v12/qa-*.spec.ts`.
- Branch `v12/<id>-check` from `feat/v12` in your Agent worktree (`git switch -c v12/<id>-check feat/v12`, local branch),
  guard `sh scripts/v12-hooks/install.sh <ID>`, symlinks as in COMMON.md. Never push.

## What you check against
- The implementation: ONE shared flag-on production build of `feat/v12` (`NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1`,
  `NEXT_PUBLIC_BT_TRACKING` unset) served by ORCH at `http://localhost:3071` from `.worktrees/v12-integration` (ORCH
  gives the sha). Never start a server on 3071, never stop it, never run `next build`. If you need another flag state,
  ask ORCH: it builds one at a time.
- The reference: `/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/growth-v12/run/checks/reference/` (`d-`, `dk-`,
  `m-`, `mk-` = 1440 light, 1440 dark, 390 light, 390 dark; 40 v12 states; `styles.json`) and `reference/v11/`
  (the 38 v11 states on the v12 prototype, `<width>-<theme>-<state>.png` + `styles.json`). State JS:
  `docs/design/growth-v12/capture-v12.mjs` and `run/checks/capture-prototype-v11.mjs`.
- Expected deviations (not failures): the shipped v11 deviations (v11 REPORT.md "Deviations": nav spacing, warm light
  ground and white surfaces, tablet chrome to 900px, 94% nav and tab bar glass) and the agent deviations recorded in
  `run/RUN-STATE.md` "Owner decisions needed" and in each `run/reports/<id>.md`.
- State owners (for issues): A1 kit pieces; G3 bthub-*, land-*, theme-*; G4 live-*; G5 wma-*, kpdh-*; G6 nta-*;
  G7 quiz-bonus*; G8 hub-*, share-kit, creators; G9 community-team-post, post-team; v11 regression states: the agent
  that touched the file (else ORCH).

## Data that does not exist yet (pending SQL, never applied in this run unless the owner says go)
Hidden or empty until their SQL: kpop-hits-2026 and KPDH themes (G2), "fans playing today" (G1), Fans picked and the
This or that card beyond aespa, BLACKPINK, BTS (G7), every editorial surface (G9), live rooms (G4), Name them all
community lines (G6), share link plays (G8). Such a state is "NOT verified until <file> is applied", checked in its
hidden or not-live form. Never mark it passed.

## Run rules (binding)
- No production writes: every mutating request is intercepted with `guardWrites(page)`
  (`apps/quiz/e2e/ux-v1/helpers/guard`). Never load `/me` or `/profile` signed in. Do not run `e2e/ux-v1/parity.spec.ts`.
- Signed in = the Playwright setup project only; never print, attach or commit the storage state; delete it at the end.
- Playwright: `UX11_CHROMIUM` as in COMMON.md, `PW_CHROMIUM=$UX11_CHROMIUM` for the capture scripts.
- ANTI-STALL (agents died on this in Phase 2): no single Write or Edit larger than about 120 lines; every command that
  can take more than a minute runs with run_in_background: true and you poll its output; commit after each batch.
  Work in batches of at most 10 states; write results to files as you go.
- A cold `next start` can hang AVIF image keys: warm images one at a time before measuring. Under load, retry a lost
  render; never relax an assertion to pass.
- Issues: append-only lines to `run/issues/<owner id>.md`:
  `<issue id> | <state or row> | <width> | <theme> | expected | actual | <evidence path>`. Ids `C1-001`, `C2-001`, `C3-001`.
- Final answer to ORCH: 20 lines max: status, branch, sha, pass / fail / not-verified counts, issues per owner, blockers.

## C1 Pixel checker
Every v12 state (40) and the v11 regression set (38), 1440 and 390, light and dark, on :3071 against the reference:
landmark boxes within 2px and computed styles equal to `styles.json` (masks for photos and text; real data changes
text), no sideways scroll at 390, hover and focus on new controls, dark tokens, reduced motion. Evidence per state in
`run/checks/pixel/<state>/` (side by side + numbers; PNGs may stay local if large, the numbers file is committed). A
table `run/checks/pixel/SUMMARY.md`: state x variant -> pass / fail / not verified (reason).

## C2 Backend checker
First write `run/checks/backend/ROWS.md`: one wiring row per control of every v12 view, from the prototype and
SYSTEM.md (control, endpoint, method, expected request shape, expected effect, flag-off behaviour, owner). Then prove
each row on :3071 by request shape (guardWrites records the payload) plus read-only SQL through the service role for
reads (only the test user's rows when user data is involved), and that flag off does nothing new (ask ORCH for the
v11-only build when you reach that part). The data guard before and after: counts of `plays`, `profiles` XP of the
test user, `duel_votes`, `name_all_member_results`, `personality_results`, `daily_blindtest_scores`: unchanged. The two
write tests of the V12 prompt 4d (tracking proof, live load test) are NOT run without the owner's go: list them as
"waiting for go". Evidence in `run/checks/backend/<row>.md`; summary `run/checks/backend/SUMMARY.md`.

## C3 QA + SEO + report
e2e: run every `e2e/ux-v12/*.spec.ts` against :3071 (projects ux-1440 and ux-390) and the v11 specs with the v12
flag unset when ORCH serves that build; axe 0 serious or critical on every v12 state; keyboard walk of every new
page; sheets close with X, Escape, backdrop and return focus. SEO on the new URLs (title, description, H1, canonical,
hreflang cluster of the 4 landings with x-default en, robots: indexable only where SYSTEM.md says, noindex for
`/live`, `/join`, `/creators`, `/admin/*`; sitemap entries only flag on; FAQPage and BreadcrumbList JSON-LD equal to
the visible text). Performance on the new pages (LCP, CLS with Playwright as in v11; Lighthouse only if the owner
OKs it). The production parity of V12 prompt section 6 (both flags off, `feat/v12` vs `origin/main`, the 40 URLs of
`docs/release/snapshots/after-fixes.json` + sitemap + robots) runs when ORCH serves those two builds: ORCH tells you.
Then `run/REPORT.md`: one section per agent with status, states, wiring, e2e, a11y, SEO, perf, open issues, pending
SQL, owner decisions (from RUN-STATE.md), NOT verified items with reasons.
