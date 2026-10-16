# Run O1: ledger

Lanes, rounds, shas, gates and when each is needed, decisions, change requests, verdicts, owner approvals of content
batches. ORCH is the only committer of this file; `scripts/o1/merge-lane.sh` appends to the Merge log (last section).

## Lanes

| lane | wave | kind | prio | needs | mergeAfter | reviewers | stage | round | sha | worktree |
|---|---|---|---|---|---|---|---|---|---|---|
| F0 | 0 | code | 0 | | | ARCH | building (3 slices) | 1 | e5b51a5 (spike a74c82f) | o1-F0 (+ spike o1-F0s) |
| Q0a | 0 | code | 0 | | | ARCH | building (3 slices) | 1 | 3f51f62 | o1-Q0a |
| D0 | 0 | static | 1 | | F0 | UX | rule 18 audit, then rework | 1 | dd39d7d + uncommitted | o1-D0 |
| Q0b | 1 | code | 1 | F0, Q0a | | ARCH | waits G1, G3 | | | |
| B1 | 1 | code | 1 | F0, Q0a | GH | ARCH, SEO | waits Wave 1 | | | |
| B2 | 1 | code | 0 | F0, Q0a | B1 | SQL + SQL-K2 | waits Wave 1, G1 | | | |
| B3 | 1 | code | 0 | F0, B2 | | SQL + SQL-K2 | | | | |
| B4 | 1 | code | 0 | F0, B1, B3, Q0b | | SEC | | | | |
| B5 | 1 | code | 0 | F0, B2, B3, Q0b | G3 | SQL + SQL-K2 | | | | |
| B6 | 1 | code | 1 | F0, B1, B3 | B4 | SEC, SEO | | | | |
| B7 | 1 | code | 0 | F0, B3, B4, Q0b | GU-D | SEC, SQL + SQL-K2 | | | | |
| E1a | 1 | script | 2 | F0 | | CONTENT | | | | |
| K1 | 1 | content | 2 | F0, E1a, B2 | G6 | CONTENT, SQL | | | | |
| K2 | 1 | content | 2 | K1, E1a | G6 | CONTENT | | | | |
| K3 | 1 | content | 2 | K1, E1a | | CONTENT | | | | |
| K4 | 1 | content | 2 | K1 | | CONTENT | | | | |
| O1 | 2 | code | 1 | B1, B2, F0, GH | G5 | UX, SEO | | | | |
| O2 | 2 | code | 1 | O1 | O3 | SEO, UX | | | | |
| O3 | 2 | code | 1 | O1, B3, B5, K1 | | SEO, UX, SQL | | | | |
| O4 | 2 | code | 1 | O1, O3, K1 | | UX, SEC | | | | |
| O5 | 2 | code | 1 | O1, B2 | K3 | UX, SQL | | | | |
| O6 | 2 | code | 1 | O1, B1, K4 | GU-B | UX, SEC, SQL | | | | |
| P1 | 2 | code | 1 | O1, B3, B4, B6, B7 | G5 | UX, SEC | | | | |
| H1 | 2 | code | 0 | B1, B3, B4, B6, B7 | G5 | UX, SEO, SEC | | | | |
| E1b | 2 | code | 1 | O1, B2, B3, E1a | | SEC, SQL | | | | |
| X1 | 3 | code | 1 | O2, O6, B6, K4, E1b | GU-C | SEO, CONTENT | | | | |
| L1 | 3 | code | 0 | O1 to O6, P1, H1, E1b, X1 | | ARCH | | | | |
| C1, C2, C3 | 4 | checkers | 0 | L1 | | n/a | | | | |
| RPT | 4 | docs | 0 | C1, C2, C3 | | n/a | | | | |

## Gates on the critical path (dates are when the answer is needed; estimates)

| gate | what | needed by | needed on | status |
|---|---|---|---|---|
| G0 | confirm the defaults (21 decisions of the v2 plan, the 9 of the run plan, the Working System exceptions) | F0 freeze | 2026-10-17 | asked 2026-10-16 (Phase 0 packet); exceptions of rule 17 accepted in the start message |
| G1 | create o1-dev and o1-scratch, run KPQ/fill-dev-env.sh | Q0b, B2 first SQL | 2026-10-18 | asked 2026-10-16 |
| G3 | pg_dump schema-only of public + prod-inventory.sql into KPQ | Q0b, branch-parity, B5 | 2026-10-18 | asked 2026-10-16 |
| G2 | o1:fixtures on both branches (after G1 and branch-parity) | Q0b auth suite, B3, B4 | 2026-10-19 | asked 2026-10-16 |
| GH | merge seo/redirects-exact into main | ORCH routing wiring, B1 middleware and allowlist, every Wave 2 page lane | 2026-10-18 | open (5 commits ahead of main, not merged) |
| GU-D | Mission U part D (account-deletion) merged | B7 | 2026-10-21 | open |
| G10 | Auth redirect URLs and email hook secret on both branches | B4, B7 integration | 2026-10-21 | day 1 packet |
| G5 | validate the D0 prototype | Wave 2 visual merges (O1, P1, H1) | 2026-10-22 | when D0 passes R |
| GU-B | Mission U part B (deezer) merged | O6 | 2026-10-24 | open |
| GU-C | Mission U part C (ost-covers, hide_cover) merged | X1 | 2026-10-28 | open |
| GU (all) | Mission U parts A to D merged | lifting the cap of 2 code builders | as soon as possible | open: none merged on 2026-10-16 |

## Owner gates (all)

| gate | status | asked | answered |
|---|---|---|---|
| G0 | asked | 2026-10-16 | |
| G1 | asked | 2026-10-16 | |
| G2 | asked (after G1) | 2026-10-16 | |
| G3 | asked | 2026-10-16 | |
| G4 | only if a content agent hits a network block (override 6) | | |
| G5 | when D0 passes R | | |
| G6 | asked (30 series, creator personas) | 2026-10-16 | |
| G7 | day 1 packet | | |
| G8 | day 1 packet | | |
| G9 | day 1 packet | | |
| G10 | day 1 packet | | |
| G11 | from the first content batch | | |
| G12 | end (report) | | |
| G13 | end (report) | | |
| G14 | asked (baseline numbers) | 2026-10-16 | |
| G15 | asked (Supabase Auth settings to read) | 2026-10-16 | |
| G16 | Wave 2 | | |
| G17 | asked (second anime reviewer) | 2026-10-16 | |
| G18 | any time (Fuki, trademark checks) | | |
| G19 | launch week | | |
| G20 | outside the run | | |
| GH | asked (merge seo/redirects-exact) | 2026-10-16 | |
| GU | asked (merge Mission U parts, D first) | 2026-10-16 | |

## Decisions

- D-001 (2026-10-16) EnterWorktree refused (the session was opened on /Users/louis/IT, not the repo): absolute-path
  mode (prompt section 2 step 4). The owner was told in one line.
- D-002 Disk: 32 GB free after setup (the run asks for 40). Continue: a build is about 220 MB, gate and parity
  worktrees are removed after each run, new-lane.sh refuses under 15 GB. Told to the owner in the Phase 0 packet.
- D-003 Builds before G1 use `scripts/o1/env.sh offline` (Supabase at 127.0.0.1:9). Measured: the kpop build passes
  offline in about 90 s (163 static pages, reads fail soft). Production stays readable only by parity.sh.
- D-004 F0's spike lives on `o1/F0s` (lane id F0s), never merges, may edit the HOT routing files (`hotExempt`), and is
  gated with F0 (`lanes.json` spike). ORCH applies the real routing wiring once, after GH, from F0's merged
  `lib/site/routing.ts`.
- D-005 Q0a may run `next build` under the build lock and its own `parity.sh` at most 4 times (it builds the harness).
- D-006 The merge step is `scripts/o1/merge-lane.sh`: parity on the merged tree uses a temporary commit object
  (`git commit-tree`), so `o1/integration` never moves before the checks are green and is never reset.
- D-007 One owner per file at any time (`scripts/o1/ownership-check.mjs`). A file needed by a later lane (B1 codemod
  targets, F0's app/sites, E1a then E1b) moves at that lane's start; each transfer is recorded here.
- D-008 HOT list: squash-merged branches (#100 seo/m1-bing-fixes, #99 seo/m1-trust, #98 seo/m1-stats-facts, #96
  seo/indexation-max) are not hot (`scripts/o1/hot-merged.txt`). 328 hot files from 18 open branches at Phase 0.
- D-009 Mission U parts A to D: none merged on 2026-10-16, so at most 2 code builders (start message, rule 4).
- D-010 `apps/quiz/package.json` and `vercel.json` are HOT: no alias now; scripts run with `tsx` directly; ORCH adds
  the aliases (`dev:multi`, `o1:fixtures`, `check:site-scope`) when the files leave the list.
- D-011 `docs/o1/contracts/**` is written in F0's worktree and arrives with F0's merge (exception to "the run folder is
  written only in O1"); lane reports likewise.
- D-012 Q0a gets priority 0 with F0 (Wave 1 needs both merged).
- D-013 D0 frames are checked at 360, 390, 1120 and 1440 px (BACKLOG says 360 and 1120, the prompt's R says 390 and
  1440).
- D-014 Parity builds use the production flags `NEXT_PUBLIC_UX_V1=1` and `NEXT_PUBLIC_UX_V12=1` (v12 launch report,
  PR #97), pending Q0a's confirmation from the repo.
- D-015 Dummy lane DUMMY (`docs/o1/dummy/**`), 2026-10-16: worktree by new-lane.sh; one slice committed under the
  guard (a commit outside its paths was refused); gate green on 674c086 (guard, hot, copy, secrets, tsc 36 s, unit
  18 s, builds kpop 93 s, anime 56 s, hub 52 s serialized under the lock, parity skipped for a docs-only diff); R ARCH
  PASS with 4 minor findings (`docs/o1/reviews/DUMMY-r1-ARCH.md`); merged by merge-lane.sh as 8f4ab45; worktree
  removed by remove-lane.sh. `migrate-dev.sh --self-test` refuses the production ref and a URL without the branch ref.
- D-017 R's DUMMY findings applied: the guard never owns a path with a `.` or `..` segment (it accepted
  `docs/o1/dummy/../../...` in --paths mode); the gate marks a step not needed as `skipped` (was `pending`) and
  explains both in summary.json. The DUMMY report being thin is accepted (pipeline test).
- D-018 Rule 18 (owner, 16 October 2026, start of tick 2): OtakuQuiz and FanQuiz are kpopquiz.org re-skinned. Copied
  into COMMON.md (rule 18), REVIEWER.md (point 9), REVIEW-LOG.md, the D0 brief and new brief stubs for O1 to O6, P1,
  H1, E1b. ORCH drafted the twins table (`briefs/TWINS-draft.md`); F0 freezes it as `contracts/TWINS.md` and
  `contracts/twins.json`; Q0a writes `apps/quiz/scripts/o1/twins.mts`, run by the new `scripts/o1/check.sh` on every
  gate (step `twins`). Consequences: O2 builds no `components/series/hub.tsx` (the series page renders the shared
  `components/group/ux-v1/hub.tsx` with slots added by its owner); O1, P1, H1 build no new shell, passport or settings
  UI; the post-result oshi row on quiz results has no kpop twin and needs a CR. New dependency for Wave 2: many twin
  components are HOT today (hub.tsx, hub-growth.tsx, ux-home.tsx, blindtest-band.tsx, quiz-page.tsx, quiz-run.tsx,
  results.tsx, run-context.tsx, profile settings.tsx): importing them is free, adding a prop waits for their SEO or
  Mission U branch.
- D-019 Tick 1 stopped by ORCH (TaskStop) to apply rule 18 at once: F0 (3 slices, e5b51a5, spike a74c82f) and Q0a
  (3 slices, 3f51f62) had sliced out cleanly; D0 was interrupted in slice 3 (dd39d7d plus 8 uncommitted files). R
  audits everything already drawn or built against rule 18 (`reviews/D0-rule18-UX.md`, `reviews/F0-rule18-UX.md`)
  before tick 2; what departs goes back to its builder.
- D-016 Engine: the Workflow tool, one tick at a time (Appendix A adapted), maxCode 2, maxOther 2 (D0 is static).

## Change requests

| CR | lane | change | review | status |
|---|---|---|---|---|

## Review verdicts

| lane | round | profile | sha | verdict | file |
|---|---|---|---|---|---|
| DUMMY | 1 | ARCH | 674c086 | PASS (4 minor) | reviews/DUMMY-r1-ARCH.md |

## Owner approvals of content batches

| batch | lane | approved | sample | errors | date |
|---|---|---|---|---|---|

## Usage

Measured after Wave 0 (rule: give the owner a dated estimate).

## Merge log

| when (UTC) | lane | sha | parity | SQL |
|---|---|---|---|---|
| 2026-10-16T11:18:10Z | DUMMY | 674c0861f649 | not needed | 0 SQL file(s) |
