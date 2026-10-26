# Run O1: ledger

Lanes, rounds, shas, gates and when each is needed, decisions, change requests, verdicts, owner approvals of content
batches. ORCH is the only committer of this file; `scripts/o1/merge-lane.sh` appends to the Merge log (last section).

## Lanes

| lane | wave | kind | prio | needs | mergeAfter | reviewers | stage | round | sha | worktree |
|---|---|---|---|---|---|---|---|---|---|---|
| F0 | 0 | code | 0 | | | ARCH | MERGED 667902f, tag o1-contract-v1 | 2 | 4d771d9 | |
| Q0a | 0 | code | 0 | | | ARCH | MERGED d28e316 | 3 | 5e535a8 | |
| D0 | 0 | static | 1 | | F0 | UX | STOPPED (D-035), not merged | | abb1cf7 | |
| Q0c | 1 | code | 0 | Q0a | | SEC, ARCH | DROPPED (D-035), proxy by ORCH (D-037) | | 7d9e03d | |
| Q0b | 1 | code | 1 | F0, Q0a | | ARCH | ready to start (G1, G2, G3 answered) | | | |
| B1 | 1 | code | 1 | F0, Q0a | GH | ARCH, SEO | MERGED aad34b5 | 1 | 3c2dfb7 | |
| B2 | 1 | code | 0 | F0, Q0a | B1 | SQL | MERGED e39b310, SQL on o1-dev | 1 | 170bbae | |
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
| O5 | 2 | code | 1 | O1, B2 | K3 | UX, SQL | after the run (D-029) | | | |
| O6 | 2 | code | 1 | O1, B1, K4 | GU-B | UX, SEC, SQL | | | | |
| P1 | 2 | code | 1 | O1, B3, B4, B6, B7 | G5 | UX, SEC | | | | |
| H1 | 2 | code | 0 | B1, B3, B4, B6, B7 | G5 | UX, SEO, SEC | | | | |
| E1b | 2 | code | 1 | O1, B2, B3, E1a | | SEC, SQL | after the run (D-029) | | | |
| X1 | 3 | code | 1 | O2, O6, B6, K4, E1b | GU-C | SEO, CONTENT | after the run (D-029) | | | |
| L1 | 3 | code | 0 | O1 to O6, P1, H1, E1b, X1 | | ARCH | | | | |
| C1, C2, C3 | 4 | checkers | 0 | L1 | | n/a | | | | |
| RPT | 4 | docs | 0 | C1, C2, C3 | | n/a | | | | |

## Gates on the critical path (dates are when the answer is needed; estimates)

| gate | what | needed by | needed on | status |
|---|---|---|---|---|
| G0 | confirm the defaults (21 decisions of the v2 plan, the 9 of the run plan, the Working System exceptions) | F0 freeze | 2026-10-17 | ANSWERED 2026-10-16 17:07 UTC: "ok pour tous les choix par défaut" |
| G1 | create o1-dev and o1-scratch, run KPQ/fill-dev-env.sh | Q0b, B2 first SQL | 2026-10-18 | ANSWERED 2026-10-17: dev.env and scratch.env in KPQ/secrets; keys checked ok (D-022) |
| G3 | pg_dump schema-only of public + prod-inventory.sql into KPQ | Q0b, branch-parity, B5 | 2026-10-18 | ANSWERED 2026-10-17: schema copy from the catalogs and inventory, md5 checked (D-022) |
| G2 | o1:fixtures on both branches (after G1 and branch-parity) | Q0b auth suite, B3, B4 | 2026-10-19 | ANSWERED 2026-10-18: 38 accounts on o1-scratch and o1-dev, every id present |
| GH | merge seo/redirects-exact into main | ORCH routing wiring, B1 middleware and allowlist, every Wave 2 page lane | 2026-10-18 | ANSWERED 2026-10-18: PR #102 squash-merged as 8059cd3, merged into o1/integration (b5271e3), integration check green |
| GH2 | the routing files are still HOT from other open SEO branches: next.config.ts (seo/m3-weekly-data), route-allowlist.ts (seo/m2-kpop-games, seo/m3-citability), middleware.ts (seo/m3-monitoring) | ORCH routing wiring after F0 merges, then B1 and every Wave 2 page lane | as soon as F0 merges | open: asked 2026-10-18 |
| GU-D | Mission U part D (account-deletion) merged | B7 | 2026-10-21 | open |
| G10 | Auth redirect URLs and email hook secret on both branches | B4, B7 integration | 2026-10-21 | day 1 packet |
| G5 | validate the D0 prototype | Wave 2 visual merges (O1, P1, H1) | 2026-10-22 | when D0 passes R |
| GU-B | Mission U part B (deezer) merged | O6 | 2026-10-24 | open |
| GU-C | Mission U part C (ost-covers, hide_cover) merged | X1 | 2026-10-28 | open |
| GU (all) | Mission U parts A to D merged | lifting the cap of 2 code builders | as soon as possible | open: none merged on 2026-10-16 |

## Owner gates (all)

| gate | status | asked | answered |
|---|---|---|---|
| G0 | answered: all defaults confirmed | 2026-10-16 | 2026-10-16 |
| G1 | answered | 2026-10-16 | 2026-10-17 |
| G2 | answered: 38 accounts on each branch (docs/o1/fixtures-scratch.json, fixtures-dev.json) | 2026-10-16 | 2026-10-18 |
| G3 | answered | 2026-10-16 | 2026-10-17 |
| G4 | only if a content agent hits a network block (override 6) | | |
| G5 | when D0 passes R | | |
| G6 | partly answered: the default 30-series list and the persona method (K2 drafts, owner validates) confirmed with G0; personas themselves to validate when K2 drafts them | 2026-10-16 | 2026-10-16 (list and method) |
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
| GH | answered (PR #102) | 2026-10-16 | 2026-10-18 |
| GH2 | asked (other SEO branches holding the routing files) | 2026-10-18 | |
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
- D-020 Rulings on R's D0 rule 18 audit, section 8: (1) no A5 on the home (row 1 keeps its list); (2) CR-007, no
  locale switcher on anime; (3) the home community section is drawn exactly as the shared component renders it with
  zero rows; a hide-when-empty behaviour is a prop request to the home's owner, not a new block; (4) D0 draws one slot
  placement per anime block inside the shared hub, the hub's owner confirms the slots when O2 starts; (5) D0 draws no
  frame for CR-002 to CR-006 until the owner approves them, and no frame for row 37 (technical routes).
- D-021 G0 answered by the owner on 2026-10-16 at 17:07 UTC ("ok pour tous les choix par défaut"): confirmed the 21
  decisions of the v2 plan section 9, the 9 defaults of the run plan section 8 (600 quizzes split 8 x 32, 12 x 20,
  10 x 10, 4 Anime Mix; 20 series and 10 theme creators, 20 quizzes each, Team badge; the "OtakuQuiz Team" system
  account; Team XP from real events only, off every board; anime publisher 25 to 40 a day, never two in a row from one
  account; live off on OtakuQuiz at launch; quiz sites at listing level only; Cowboy Bebop and Vinland Saga for Pokemon
  and Berserk; the two parity normalisations), and the Working System exceptions of rule 17. Read as also confirming
  the default 30-series list and the persona method of G6 (K2 drafts, the owner validates the personas). Not read as
  approving CR-002 to CR-006: they were proposals, not defaults, and stay pending. F0 marks every default of
  `defaults.md` "confirmed by the owner (G0, 2026-10-16)" instead of "default, pending".
- D-022 G1 and G3 answered (owner, 2026-10-17). G3: `prod-public.sql` (not a pg_dump: generated read-only from the
  production catalogs, no data, no owners, no CREATE SCHEMA public) and `prod-inventory.txt` copied from
  `ROOT/docs/strategy/o1/prod-schema/` into KPQ, mode 600, md5 58cbb70bfa3a7bf6378bc0bd05d6e22a and
  921a8f48e7c4ff8b6f934d31fba48595 as given. G1: a script decoded the JWT keys without printing them: in dev.env and
  scratch.env the anon key has role anon, the service role key role service_role, both with ref = O1_BRANCH_REF; the
  URLs and pooler strings name their branch, the two refs differ (scratch.env quotes its values; the shell reads them
  the same). branch-parity.sh fixed on the owner's instructions: triggers recreated only when their function lives in
  public (on_auth_user_created_blindtest), storage triggers untouched, a storage policy created only when missing in a
  DO block that turns a privilege refusal into a WARNING, header rewritten; and by ORCH: Supabase's default privileges
  are set BEFORE the copy (DROP SCHEMA public drops them, and the copy's functions rely on them), without FOR ROLE.
  Tested on a local cluster where postgres owns neither storage table. Rebuilds: o1-scratch at 21:04 UTC and o1-dev at
  21:07 UTC, both TOTAL 8, only accepted differences (extensions: branch only pg_net; publication_tables: the 7 dated
  realtime.messages partitions); every fingerprint section, auth and storage triggers and storage policies at 0; no
  warning in either apply log (`evidence/branch-parity/scratch-20261017T210434Z.md`, `dev-20261017T210735Z.md`).
  Branches run Postgres 17.11 (production 17.6). Lanes may now use `scripts/o1/env.sh scratch|dev`.
- D-023 G2 command written by ORCH (the fixture script was Q0b's, not started; `apps/quiz/scripts/o1/fixtures/**` moves
  from Q0b to ORCH): `sh O1/scripts/o1/fixtures.sh` creates on o1-scratch then o1-dev 7 fixture users (kpop only,
  kpop heavy, dual, anime new, banned, unconfirmed, admin reviewer) and the 31 editorial accounts (oq_creator_01 to
  30 as placeholders until K2's personas, otakuquiz_team), emails under example.com, email_confirm true (no email, no
  password), profiles rows, idempotent, list in `docs/o1/fixtures-<branch>.json`. Memberships, editorial_accounts and
  sites.system_user_id come later with the B2, B3 and B5 SQL. Dry run green on both branches. Finding: on both branches
  3 users created directly in auth.users on 2026-10-17 have NULL confirmation_token, recovery_token,
  email_change_token_new and email_change, so GoTrue's admin listUsers fails ("Database error finding users"); the
  fixture script reads its own users with psql instead. Owner to decide whether those 3 rows get '' in those columns.
- D-024 Tick 3 (2026-10-17): F0 f83b0d0 and D0 bb643ba keep building (sliced out); Q0a 62cb3b1 returned blocked on its
  request 21. Answered by CR-008 and CR-009; requests 16 (spike placeholders fail twins: the spike never merges and
  check.sh only checks the lane tree; O1 and H1 replace them), 17 (check.sh prints pending while no twins.json exists
  in O1 or the lane, and writes the JSON result into the evidence folder: done), 18 (`distDir` from
  `O1_NEXT_DIST_DIR` in next.config.ts: queued for ORCH's routing wiring once the file leaves the HOT list), 19 (to
  B4's brief) recorded.
- D-025 Production reads paused until the owner answers. His G3 message of 2026-10-17 ends "pas de connecteur et pas
  d'accès à la prod". Rule 5 lets parity.sh read production (builds with KPQ/secrets/kpop-parity.env, then GETs to
  two local servers); asked whether that still stands. Until then `docs/o1/PARITY-OFFLINE` exists: gate.sh and
  merge-lane.sh run parity with both sides built against the offline Supabase (no production read), recorded as
  "offline (D-025)" in the evidence and the Merge log; Q0a's 4 production runs of D-005 are suspended (offline
  rehearsals do not count). When the owner says yes, ORCH removes the file and a production parity run of
  o1/integration catches up before the next merge that reaches kpop.
- D-026 Tick 4 (2026-10-18): F0 8ab0d07 blocked on F0-17, Q0a 5d7390c blocked on request 24, D0 26f2823 in progress.
  Rulings: CR-010 (N5). F0-17(a): Q0a merges before F0's next gate (tick 5 gives F0 `needs: Q0a`). F0-17(c): the
  spike line `kpop /bts-quiz 200` depends on catalog rows the dev branches do not hold (no production copy: that would
  be a production read); the line is dropped from spike-checks.tsv, the kpop hub being proven by parity (base and head
  built on the same database, /bts-quiz in the URL list); it comes back when Q0b seeds synthetic catalog rows on the
  branches. F0's brief says so.
- D-027 Owner answers of 2026-10-18 (pasted message "Réponses du owner"): (1) yes for parity.sh reading production,
  read-only guaranteed by a local proxy (conditions in D-028); (2) G2 announced done, but no docs/o1/fixtures-*.json
  exists: fixtures.sh has not run yet; (3) NULL tokens: set to '' on o1-scratch and o1-dev only, done 10:16 UTC (3
  accounts each, then 0; GoTrue listUsers works again on both; migration-log.md); production is the owner's; (4)
  CR-002 to CR-006 refused for O1, backlog after launch: D0 draws nothing for them, F0 reserves no key and no flag
  (NET_WELCOME included); (5) GH announced done, but on 2026-10-18 10:15 UTC origin/main is still 30e7091 and PR #102
  (refs/pull/102/head 23a3ea6 = seo/redirects-exact) is not merged: main is integrated as soon as it is; (6) pace:
  estimate and cuts given to the owner (D-029).
- D-028 Production parity (owner, 2026-10-18): allowed only through a local read-only proxy, conditions in
  `briefs/Q0c.md`. Q0a's harness already freezes reads and refuses writes inside the Node process, but the real URL
  and keys still reach the build environment, so a small lane Q0c builds the proxy and its parity.sh wiring after Q0a
  merges (ownership of parity.sh and scripts/o1/parity/** moves from Q0a to Q0c then), reviewed SEC and ARCH. Until R
  passes Q0c, parity stays offline (D-025) and merges are recorded "offline (D-025)"; the first production
  comparison, o1/integration against origin/main, runs before the next merge that touches kpop after that. Then one
  full comparison per kpop merge, no more.
- D-029 Pace (owner's question 6, 2026-10-18). Measured: about 30 h since the start, about 12 h of tick time, about
  11 M subagent tokens, one weekly usage limit hit, Wave 0 (about 40 of the plan's 650 agent-hours) not merged yet.
  Cuts applied at once, rule 18 and data safety kept: one R pass per lane carrying every profile (the second key stays
  for B2, B3, B5 and B7), D0 limited to the screens of the lanes kept, one final checker pass instead of C1, C2, C3.
  Moved after the run, before the launch (the owner may object): O5 (formats), X1 (day-1 bridges), E1b (/admin/review
  and the anime publisher), L1's full rehearsal (L1 keeps the runbook, the launch SQL bundle and a scripted dry run).
  Content stays at override 7. The cap of 2 code builders lifts when Mission U parts A to D are on main.
- D-030 Main integrated (2026-10-18 10:47 UTC): fetch; origin/main 8059cd3 (PR #102) merged into o1/integration as
  b5271e3 (no conflict: o1/integration held no edit of a HOT file); seo/redirects-exact added to hot-merged.txt; HOT
  refreshed (320 files, 17 open branches); no lockfile change; `scripts/o1/nightly.sh` green on 00f2426 (tsc, unit,
  kpop, anime and hub builds on o1-dev; parity skipped: run files only; leak suite pending Q0a). G2 confirmed by
  `docs/o1/fixtures-*.json` (38 accounts each). The routing files are still HOT through four other SEO branches (GH2):
  ORCH's routing wiring after F0 waits for them, per rule 12. Lane branches sync at their next slice; F0's spike
  rebases its routing edits on the new middleware and allowlist (unknown URLs are now a 404) and updates its checks.
- D-031 Tick 5 (2026-10-18): Q0a passed its gate once (c5131aa), R r1 ARCH FIX (1 major, 3 minor), fix round done;
  its next gates went red on unit timeouts under machine load, then gate.sh stopped on a stale o1-gate-Q0a. Cause: a
  gate's `git worktree remove` that git could not finish (servers a check had left running kept writing), leaving a
  folder with no .git, still registered; o1-gate-F0 and o1-gate-F0-spike were left too. Checked first that nothing
  touched the main checkout's git config (no config.worktree, no o1.agent, no hooksPath there). The three folders
  removed (only paths under .claude/worktrees/o1-gate-*), `git worktree remove` cleared their registrations. Hardened:
  gate.sh stops processes whose cwd is inside a gate worktree before removing it, removes the remains of an unfinished
  removal without ever running git inside them (git would climb to the main checkout), and refuses tracked changes;
  new-lane.sh and nightly.sh refuse a folder that is not their worktree; lane.exclude ignores .next-*, test-results
  and playwright-report. Tested with a planted stray folder on D0's head.
- D-032 Unit tests in gate.sh, merge-lane.sh and nightly.sh run with `--testTimeout=30000` (no test edited): the reds of
  tick 5 were 5 s default timeouts of untouched base tests while the other session loaded the machine (11 tests of
  the base on D0's design-only head, passing on o1/integration). Rule 15: noise normalised, recorded.
- D-033 Q0c starts after Q0a merges (needs); `scripts/o1/parity.sh` and `scripts/o1/parity/**` are listed for both,
  sequenced (`OWNERSHIP._sequenced`), so Q0a's merge guard and Q0c's commits are both covered.
- D-034 (2026-10-19) Light mode by the owner: Workflow engine ends with tick 6; at most 3 code agents via the Agent tool, sonnet except SQL and auth/passport; briefs of 60 lines at most; per-PR gate = tsc, builds, tests of touched files (`vitest related`), parity offline when kpop is reached; once a day and before any merge to main: full e2e and offline parity on o1/integration; R once, blockers only, on the SQL of B2, B3, B5, B7 and on auth/passport; 1.5 M tokens per lane; one line per decision.
- D-035 Stopped: tick 6 (TaskStop), D0 at abb1cf7 (not merged, branch kept: the kpop twin is the design, G5 void), Q0c (1,447 lines, not merged, branch kept).
- D-036 Q0a merged d28e316 (R r3 PASS before light mode); F0 merged 667902f (gate green, no second review), tag o1-contract-v1.
- D-037 Proxy written by ORCH: scripts/o1/prod-proxy.mjs (68 lines) and its test (10 cases ok: POST ensure_daily_quiz 403 without leaving the machine, GET passes with the real key swapped in).
- D-038 Routing wired on o1/integration (f92cc1a) on main as it is: HOT rule suspended for the routing files by the owner; offline parity identical on 60 pages; integration check green on 87eb3df (tsc, unit, 3 builds, parity vs main identical). Later SEO PRs: merge main, keep both changes.
- D-039 Wave 1 started 2026-10-19: B1 (sonnet), B2 (SQL, default model), E1a (sonnet); briefs briefs/B1.md, B2.md, E1a.md; F0, F0s, Q0a worktrees removed (disk 19 GB).
- D-040 Tokens since the start (harness measure, sum of each agent's final context): about 19.9 M (ticks 1 to 6 and the standalone reviews), ORCH's own conversation not counted.
- D-041 (2026-10-19) New process by the owner: after B1 and B2, ORCH is the only builder on o1/integration in coherent lots (a) twin pages by codemod, (b) anime blocks, (c) shared passport, (d) one fanquiz.org page, (e) content wiring; at most one sonnet helper; no briefs, lane worktrees, OWNERSHIP or per-lot review; care and one R review only for the site-scope SQL and the shared passport (o1-scratch first); gate per lot = tsc, build, offline parity; full e2e once a day; 10 M tokens for everything left, B1 and B2 included; a lot 50% over its forecast stops.
- D-042 E1a stopped (new editorial tools contradict D-041: the existing kpop tools get a site parameter instead, in lot (e)); its branch is kept, not merged.
- D-043 Merges into o1/integration compare in production mode through the read-only proxy (`scripts/o1/parity-prod.sh`, `docs/o1/PARITY-PROXY`): the offline mode cannot judge pages that answer 500 without data (their error digests change per build, and Q0a's reviewed test forbids normalising them: ratchet kept). Gates and the nightly stay offline.
- D-044 B1 merged aad34b5 (0.40 M tokens): production parity through the proxy identical on 60 pages; the proxy refused 12 calls (10 POST rpc/get_personality_counts, 2 POST rpc/get_rising_creators: not in the owner's 22 read-only functions), the same on both sides.
- D-045 B2 ready at 170bbae (0.34 M tokens); R reviews its SQL once (blockers only) before its merge.
- D-046 B2 merged e39b310 (0.34 M; R PASS on its SQL, 0.22 M): production parity through the proxy identical on 60 pages; L01 moved from its report folder into launch/; 001, L01, 002a to 002d applied on o1-dev in manifest order, all ok. Lot (B1 and B2) cost 0.96 M of its 2.5 M forecast.
- D-047 Lot (a) started: scripts/o1/twins-codemod.mjs copies the 40 single-twin pages of twins.json under app/sites/[site]/ (kpop modules imported, vocabulary on visible text of anime-only pages); the shared home is a hand-written dispatcher.
- D-048 Lot (a) done, 4def09e: 40 twin pages copied by scripts/o1/twins-codemod.mjs, home dispatcher, guarded [site] layout, (anime) and (hub) route groups (a build serves only its own pages), child static params carry the site, which-character and name-all keep the kpop [group] segment, Opening of the day redirects to /blindtest; twins.mts accepts the owner's codemod copies of pages and reuse of kpop route modules (component copies still fail; its 18 tests pass); tsc 0, twins ok, kpop, anime and hub builds green on o1-dev.
- D-049 Offline parity of lot (a): 59 of 60 identical; /bts-name-all-members differs only by the error digests of a page that answers 500 on both sides offline (Q0a's ratchet test keeps digests compared, so ORCH judges this one page by hand each time; production parity through the proxy before any PR to main).
- D-050 Cost, measured from this session's transcript: lot (a) took about 0.15 M new tokens (input and output) and 44 M cached reads, because ORCH's own context is about 0.88 M tokens and every action rereads it; B1, B2 and R took 0.96 M. Reported to the owner before lot (b).
- D-016 Engine: the Workflow tool, one tick at a time (Appendix A adapted), maxCode 2, maxOther 2 (D0 is static).

## Change requests

| CR | lane | change | review | status |
|---|---|---|---|---|
| CR-001 | F0 (O1, O2) | Rule 18 ruling on R's F0 audit M1: the anime twins of `/quizzes` and its three lists, `/new`, `/most-liked`, `/trending`, `/trivia`, `/faq`, `/leaderboard` (Team accounts excluded) and `/dmca` exist (TWINS rows 31 to 36); news, articles, data pages (`/stats`, `/data/*`) and ranked join F (off at launch, slot absent); technical auth routes without a screen are row 37; the hub shell is row H-0. F0 updates routes.md, `routes.allow`, `KPOP_ONLY_SAMPLES` and copy keys accordingly | ORCH ruling (rule 15), R-ARCH checks it in F0's next review | approved 2026-10-16 |
| CR-002 | P1 | Welcome card on the first signed-in arrival (P W5 A and C, D4), shared components only | owner | REFUSED for O1 (owner, 2026-10-18), backlog after launch |
| CR-003 | P1 | "How I appear here" (P 8.2), shared components only | owner | REFUSED for O1 (owner, 2026-10-18), backlog after launch |
| CR-004 | P1 | "Keep anime in your passport? Yes, Not now" after the third play (P 3.2) | owner | REFUSED for O1 (owner, 2026-10-18), backlog after launch |
| CR-005 | P1 | Post-result oshi row on quiz results (S 2.5, TWINS row 8) | owner | REFUSED for O1 (owner, 2026-10-18), backlog after launch |
| CR-006 | B6, P1 | kpopquiz.org welcome card for arrivals from OtakuQuiz (Q B09, NET_WELCOME) | owner | REFUSED for O1 (owner, 2026-10-18), backlog after launch |
| CR-008 | Q0a | Parity normalisations N3 (a Flight client reference `I[<module id>,` reads `I[<id>,` on both sides; export names and chunk lists still compared) and N4 (a page's Flight stream compared as its sorted rows, however it is cut into `self.__next_f.push` tags); the server HTML and every row stay compared. Q0a request 21, option (a): Turbopack gives one client module two ids in two builds, so without them parity says DIFFERENT for any two builds | ORCH ruling under rule 15 (the v12 rule 12 noise list names the order of the streamed page data; module ids are build-internal), R-ARCH checks the tests in Q0a's review | approved 2026-10-17 |
| CR-009 | Q0a | Parity made stricter: on every URL flag-off-diff finds identical, compare the content of every stylesheet the page links (after the asset-name normalisation, N1 for the UX sheet), fail as `css-content` (Q0a request 20) | ORCH (stricter only, BACKLOG 5.2) | approved 2026-10-17 |
| CR-010 | Q0a (F0) | Parity normalisation N5, the narrow form of F0-17(b) and Q0a request 24: a React text separator `<!-- -->` immediately followed by a closing tag `</` reads as nothing on both sides (it only marks where a prerender segment ended, which depends on stream timing, not on code); every other separator, element, attribute and text stays compared. Q0a writes it in `scripts/o1/parity/compare.mjs` with tests | ORCH ruling under rule 15 (as CR-008); the narrower of the two proposals | approved 2026-10-18 |
| CR-007 | O1, D0 | No locale switcher in the anime footer (English only): the slot is absent, added to F | ORCH ruling on R's D0 audit decision 2 | approved 2026-10-16 |

## Review verdicts

| lane | round | profile | sha | verdict | file |
|---|---|---|---|---|---|
| DUMMY | 1 | ARCH | 674c086 | PASS (4 minor) | reviews/DUMMY-r1-ARCH.md |
| F0 (+ F0s) | rule 18 audit | UX | e5b51a5, a74c82f | FIX (2 blockers, 6 majors, 6 minors) | reviews/F0-rule18-UX.md |
| D0 | rule 18 audit | UX | dd39d7d plus uncommitted | FIX (6 blockers, 10 majors, 7 minors) | reviews/D0-rule18-UX.md |

## Owner approvals of content batches

| batch | lane | approved | sample | errors | date |
|---|---|---|---|---|---|

## Usage

Measured after Wave 0 (rule: give the owner a dated estimate).

## Merge log

| when (UTC) | lane | sha | parity | SQL |
|---|---|---|---|---|
| 2026-10-16T11:18:10Z | DUMMY | 674c0861f649 | not needed | 0 SQL file(s) |
| 2026-10-18T18:01:02Z | Q0a | 5e535a8fa284 | not needed | 0 SQL file(s) |
| 2026-10-19T10:40:28Z | F0 | 4d771d91aff0 | identical (base d28e3165f5fc84715c3ced8f9894a6b380c33467, merged tree 0e2e6e05e17b1cd8ceb4d9682a4d46fbaf2d9856), offline (D-025) | 0 SQL file(s) |
| 2026-10-19T11:40:14Z | B1 | 3c2dfb7bdaee | identical (base 2c1134f2c5c3780a37bfe78b3c4f6f0d6a9a8109, merged tree 2bf74bcfa3081110c26e1a682338f462d893fc15), production through the read-only proxy | 0 SQL file(s) |
| 2026-10-19T11:51:33Z | B2 | 170bbaeb5fba | identical (base ae6e19834c89bdabc8f8e4bd4f9234ac13340f61, merged tree 4d32946934d78ddd53033b60c200dd4049e74382), production through the read-only proxy | 10 SQL file(s) |
- D-051 Owner (2026-10-19): lots (b) to (e) by one fresh sonnet agent each, a brief of 60 lines at most, no approval between lots; ORCH gates and merges. Lanes LB, LC, LD, LE in lanes.json and OWNERSHIP.json (apps/quiz/src/**, D-041). SQL 011 to 015 move to lot (e): the manifest puts them after 003 to 010 (lot c), so lot (b) is code only and tests on the frozen fixtures.
- D-052 Lot (c) runs as two sequential sonnet agents on lane LC (LC1: SQL 003 to 008 on o1-scratch with an equivalence hash for 008; LC2: the jump routes and per-site XP), then one R review of the lane (SQL and auth routes), then gate and merge; smaller contexts cost less than one long agent. SQL 009 and 010 (daily v2) go to lot (e) with 011 to 015: the ensure-daily-quiz route is on HOT.txt and the manifest puts 009 and 010 before 011.
- D-053 contract.test.ts was red on o1/integration since lot (a) (7 tests): TWINS.md now mirrors twins.json (paths in the route groups, row 13, rows 38 and H-9 with body none, LANES O1 cites them), the anime home drops the kpop Verse redirect (naming trap), and the lot lanes fold into existing ids because the test pins the lane list: lot (b) = O2, (c) = B3, (d) = H1, (e) = K1 (OWNERSHIP and lanes.json). 88 of 88. No test edited.
- D-054 Lot (b) gate 74dd4c9: guard, copy, secrets, twins, tsc, unit, anime build green. Offline parity 59 of 60; /quizzes differs by 43 bytes, exactly one more Flight push boundary ("])</script><script>self.__next_f.push([1,"), same rows: a streaming split, not a kpop change (the kpop edits are optional props with unchanged defaults); merge-lane's production comparison through the proxy rechecks it. HOT: the lots touch hub.tsx, quiz-page.tsx and q ux-page.tsx with additive props only; lanes O2, B3, H1, K1 get hotExempt, and when an SEO branch lands, conflicts keep both sides (as for routing, D-038).
- D-055 Lot (b) merge refused by the production comparison (21 of 60: hubs, trivia, quiz pages; offline these pages are 500 on both sides, so the offline gate cannot see them). The kpop HTML is equal but the Flight payload gained "$undefined" children and props and one client reference on the kpop path. Fix by a fresh sonnet agent (brief O2-fix.md) with a committed Flight-shaped tree test against snapshots made from the base; then one more production comparison at merge.
| 2026-10-19T20:22:39Z | O2 | 62bdbd3114b9 | identical (base 26034c7fd3d79bfe6d7a508ffd46fcfab52b6fdc, merged tree 355ccb8443d61972a06c4828122e6bb280b49020), production through the read-only proxy | 0 SQL file(s) |
- D-056 Lot (b) merged at 3b5e12d (fix 62bdbd3: kpop tree back to the base, 13 Flight-shaped snapshots from 04298d3 committed); production comparison through the proxy: identical, 60 of 60. Agents: digest, builder 0.55 M, fix 0.26 M. Lot (c) starts on lane B3 (worktree o1-B3).
- D-057 Lot (c) built in two parts (6fb1c58 SQL, cca6812 app; 0.43 M and 0.38 M). Gate cca6812 all green (3 builds, offline parity identical). R (0.23 M): BLOCKED, 3 blockers under rule 5 (kpop badges granted off kpop; play routes do not check the quiz's site; record_bt_play takes its site from request groups); the 10 branched kpop bodies and the 11 rollbacks match production verbatim. Fix by a fresh sonnet agent (B3-fix.md); ORCH checks the fix diff, no second R. Part 2 printed one expired local ticket signed with a throwaway secret: no real key.
| 2026-10-19T22:20:10Z | B3 | b6d32e1cb589 | judged by ORCH (D-058): production through the read-only proxy, 59 of 60 identical, the home differs only by a relative time (6 vs 7 hours ago, live data read an hour apart) and Flight push order | 12 SQL file(s) |
- D-058 Lot (c) merge: tsc 0, unit 2890 of 2890 on the merged tree; production comparison 59 of 60, the kpop home differs only by "6 hours ago" against "7 hours ago" (base and head read live data an hour apart) and the same Flight rows pushed in another order. Lot (c) does not reach the home render; judged identical by ORCH as D-049 and merged by hand with merge-lane's own steps (no second comparison, owner: one per merge). R fix b6d32e1 checked by ORCH: checks.sql of the same unmerged lane moved its anime blind test case under app.site_id anime and gained the blocker case; not a weakening.
- D-059 Lot (c) applied on o1-dev (003 to 008 ok; kpop memberships = profiles; no non-kpop badge). Lot (e) in two sequential sonnet agents on lane K1: LE1 SQL 009 to 015 on o1-scratch with a 110-date daily equivalence and the daily per site; LE2 a fixture loader (the only anime content is the 3 frozen fixture series), the existing admin quiz tools and quiz create taking the build's site, /series on anime series. ORCH runs the loader on o1-dev after merge.
| 2026-10-19T22:47:07Z | H1 | b096e9624559 | identical (base 37bf1506a28ac1faac06dd7c3b57643044e2c7fb, merged tree 8eb79812ee3c0cc1721d0fc50d73fec55c7ef553), production through the read-only proxy | 0 SQL file(s) |
- D-060 Lot (d) merged at 04e5640 (b096e96, 0.29 M): the fanquiz.org network page (sites from NETWORK, passport shares block equal to /privacy, signed out and signed in views, falls back to signed out without a database). Gate green except the offline comparison, whose base build failed on a Google Fonts download (network); merge-lane's production comparison: identical, 60 of 60. Notes left open: hub /privacy is still the kpop copy (G16), the hub level is profiles.xp plus non-kpop membership xp.
- D-061 Owner (2026-10-20): run the rest at once. Lot (e) part 2 starts now on lane E1a (worktree o1-E1a, the editorial lane: ownership widened to apps/quiz/src/** and scripts/anime/**), beside part 1 on K1; part 2 leaves part 1's daily files alone and waits for 011 on o1-scratch before its proof. The e2e pass is lane C3 (brief C3.md: run-dev.sh builds and serves the three sites on o1-dev, runs leak, cookies, jump and a network smoke spec). The integration check (nightly.sh) runs on f5170b0. Agents and ORCH write files under .claude only through the shell: the Write and Edit tools ask the owner there.
- D-062 Owner (2026-10-20): the final report also lists everything left before launch (content, owner production steps, domain infrastructure, deferred features, finishing), with an estimate per item; written to docs/o1/RAPPORT-FINAL.md and summed up in chat.
- D-063 Integration check on 8f2db4c (against main 8059cd3): tsc, unit, kpop, anime and hub builds green; offline comparison 59 of 60, the only page is /bts-name-all-members (500 on both sides offline, Flight error digests only, D-049). FREEZE lifted by ORCH.
- D-064 Lot (e) part 2 (E1a ab28ca7, 0.35 M): gate all green (3 builds, offline comparison identical); first merge refused by contract.test: twins rows 39 to 41 (anime admin re-exports, owner O1) listed the kpop page as mustImport, which its own twin cannot import; now mustImport none. Part 1 (K1 3ba0196 plus db634ef, 0.47 M): the 009 files were refused by the lane's old ownership and committed as B3 there; K1 now owns 009* on integration. Open from part 1: handle_new_report counts a spoiler report toward report_count (K1-3).
| 2026-10-20T11:18:01Z | E1a | ab28ca7b948e | identical (base 55372ec487255315f4b438b38e0108ae27a6cbb2, merged tree 0309cd1e5f1877769dccb5b3d4c49ae1c0b4475d), production through the read-only proxy | 0 SQL file(s) |
| 2026-10-20T11:33:43Z | K1 | db634ef8caea | identical (base ce7f5d7023fab39424225083db4c83ca08f56a25, merged tree e01e09f1b2b286de49c0b07d8d50f9ea86c1b5a0), production through the read-only proxy | 14 SQL file(s) |
- D-065 Lot (e) merged: E1a at ce7f5d7 and K1 at 3110bd2, both identical in the production comparison. o1-dev: 009 refused as designed (no system author on a branch); ORCH applied the branch seed apps/quiz/e2e/o1/LE/K1/seed-branch.sql to o1-dev too (2 guarded rows production already has, plus the general-kpop group; its header said scratch only, but o1-dev is a branch without data like scratch), then 009 to 015 ok, then load-fixtures.mjs dev: 3 series, 15 arcs, 27 characters, 12 themes, 15 published quizzes. FREEZE lifted.
| 2026-10-20T12:05:59Z | C3 | c224af729385 | not needed | 0 SQL file(s) |
- D-066 E2E pass on o1-dev (lane C3, 0.31 M, merged at 49bc899, run with bash apps/quiz/e2e/o1/C3/run-dev.sh): 27 pass, 12 fail, 13 skip. App failures: the jump's /auth/passport/out route was never committed (.gitignore out/); quiz reads in lib/db/queries/quizzes.ts are not site-scoped (anime quizzes on kpop /, /new, /trending with SITE_SCOPE on); kpop chrome on anime (footer, Organization JSON-LD); no robots or sitemap on anime and hub, kpop locale and /daily redirects there. One fix lot on lane O1 (brief O1-fix.md, ownership widened). The C3 agent listed the variable names of dev.env (no value): reminded in the brief.
| 2026-10-20T13:54:18Z | O1 | 407e0a633af5 | judged by ORCH (D-067): production through the read-only proxy on c7f1604, 59 of 60 identical, /which-bts-member-are-you differs by exactly one Flight push boundary (43 bytes, same rows); 407e0a6 only escapes the copyright sign, render proven equal to the base footer snapshot | 0 SQL file(s) |
- D-067 Fix lot after the e2e pass (O1 c7f1604 plus 407e0a6, 0.67 M): the jump's out route committed (.gitignore negation), every kpop reader of site-scoped tables through forSite (kpop HTML and Flight snapshots from da33e52 equal), anime and hub chrome and JSON-LD from the registry, robots and sitemap per site, hub /daily and kpop locale paths 404 off kpop. E2E on o1-dev: 41 pass, 0 fail, 11 skip (was 27, 12, 13). Gate on 407e0a6 green except the offline comparison (Google Fonts download failed); the copy gate counted the copyright sign as a pictograph, now an escape in the source and an entity in the snapshots. Merged by hand with merge-lane's steps (tsc 0, unit 3124 of 3124 on the merged tree); production comparison of c7f1604 judged as D-054.
- D-068 Final report written (docs/o1/RAPPORT-FINAL.md): summary, the test command (apps/quiz/e2e/o1/O1/run-dev.sh, which sets SITE_SCOPE and rebuilds; C3's script alone builds without the flag), cost, and everything left before launch with estimates.
- D-069 Phase 2 (owner, 2026-10-20): finish for launch. Forecast sent: tools 0.3 M; code 2a to 2h about 5.7 M with the daily e2e and parity; content K1, K2 and the daily bank about 5.2 M; ORCH about 1.5 M; total about 12.7 M, above the owner's 7 M threshold, so ORCH waits for the owner's answer before starting.
- D-070 Phase 2 approved by the owner (12.7 M; stop above 15 M in total or a lot above its forecast by 50 percent). Started: owner test tools on lane Q0b (dev-up.sh, signin-link.sh, brief T-tools.md), lot f on lane E1a (check.mjs C1 to C14, packet.mjs HTML, brief F-e1.md), content K1 batch 1 on lane K1 (Naruto, Jujutsu Kaisen, Demon Slayer; brief K1-series.md). The 30 series are those of S-otaku-content.md section 4 with Cowboy Bebop and Vinland Saga for Pokemon and Berserk (plan decision 8): 27 to do in 9 batches of 3, tier A first.
| 2026-10-20T17:05:32Z | Q0b | a3e72284d213 | judged by ORCH (D-071): production through the proxy, 59 of 60, /leaderboard same size with live data moving between reads; the lane changes only scripts/o1-tools and its report, no page can change | 0 SQL file(s) |
- D-071 Owner test tools merged (Q0b a3e7228, 0.22 M): scripts/o1-tools/dev-up.sh (3 sites on o1-dev at kpop.localhost:3190, anime.localhost:3191, hub.localhost:3192) and signin-link.sh (Supabase magic link through a local helper, once, 10 minutes, fixtures only, refuses anything but o1-dev). .gitignore gains !docs/anime/ (docs/* hid the content data and packets). Lot f ready (E1a 1d8df5e, 0.39 M): check.mjs C1 to C14, packet.mjs HTML.
| 2026-10-20T17:06:52Z | E1a | 1d8df5eab9a4 | not needed | 0 SQL file(s) |
| 2026-10-20T17:12:37Z | K1 | d4c465c813b3 | not needed | 0 SQL file(s) |
- D-072 K1 batch 1 merged (4b74d6f plus loader fix d4c465c: without --data the target was skipped; 0.43 M) and loaded on o1-dev (3 series, 55 arcs, 90 characters, 106 themes, 58 trivia); packet k1-b1.html sent to the owner. K1 batch 2 started (Attack on Titan, Dragon Ball, My Hero Academia). Lot b (P1) takes /api/passport/after-signin and /auth/confirm (the anime sign-in needs them; B7 keeps emails, deletion and leave). Ownership widened for P1, B6, B7, H1, C1 to C3, L1, K2, K3.
| 2026-10-20T17:41:54Z | K1 | ecb3c4284d0d | not needed | 0 SQL file(s) |
| 2026-10-20T18:44:09Z | K1 | 9e6f769e3e91 | not needed | 0 SQL file(s) |
| 2026-10-20T18:57:33Z | K1 | ad2f281592f2 | not needed | 0 SQL file(s) |
- D-073 Owner (phase 2, small leftovers): a spoiler report must not count toward report_count. Lot a (O1 78e36b4 plus 043b2a5, 0.45 M) moves report_spoiler to its own table public.spoiler_reports (015 changed in place, idempotent, tried on o1-scratch: 5 spoiler reports leave report_count at 0, a normal report still counts). ORCH updates the contract to match (schema.sql 015 section, contract.types.ts regenerated, contract.test 88 of 88) and K1's checks.sql spoiler cases to the new table with the same strength (38 of 38 on scratch). O1 owns 015*. K1 batches 3 (e986f89) and 4 (7379e01) merged and on o1-dev (12 series).
| 2026-10-20T19:44:50Z | K1 | fdd9b266762b | not needed | 0 SQL file(s) |
- D-074 Lot b (P1 436bf21, 0.57 M): R PASS (0.17 M; notes: the oshi spoiler refusal is client-side only, a banned member on anime /me gets 404 but stays signed in; both for C2). Lot a refused at merge by the production comparison: kpop /bts-name-all-members head meta order and a Flight client reference moved (86 bytes); fix agent on lane O1 (brief O1-fix2.md). K1 batches 5 and 6 merged (73a467a), 18 series on o1-dev.
| 2026-10-20T20:19:32Z | K1 | 7261ab0ab316 | not needed | 0 SQL file(s) |
- D-075 K1 complete: 27 series in docs/anime/data (b7 ef67c04, b8 7261ab0, b9 c20140f; 0.32, 0.28, 0.31 M). Omniscient Reader's Viewpoint and Kagurabachi have no aired anime, so no themes: C1's two-theme minimum (from the fixture schema) now applies only to series with anime_start_year, otherwise a warning. check.mjs on the folder: 54 of 54 pass.
| 2026-10-20T20:28:44Z | K1 | d123e6a49fe8 | not needed | 0 SQL file(s) |
- D-076 Disk at 97 percent (14 GB free): new-lane.sh takes O1_MIN_FREE_GB (default 15); ORCH opens content lanes, which never build, at 12. K1 worktree removed (branch kept). K2 starts (brief K2.md): 30 Team creators and 5 quizzes per series, in batches of 6 series.
| 2026-10-20T20:51:20Z | P1 | 05c2cfbd0c85 | identical (base f4416b4110234d5ca55bdcbe31b95d4c71b2edff, merged tree d37507dc92667374e3cbe709671f511312420334), production through the read-only proxy | 0 SQL file(s) |
- D-077 Lot b merged (P1 29a1f5f; fix 05c2cfb, 0.24 M: kpop routes reached new client modules through the shared sign-in sheet, header actions and passport model; world-only modules now; 162 kpop page manifests reach the same client modules). Production comparison identical, 60 of 60. K1 b9 merged (2ac66d5): 30 series on o1-dev. K2 batch 1 and lot c (B6) started.
| 2026-10-20T20:53:59Z | K2 | 45c95687fd1b | not needed | 0 SQL file(s) |
| 2026-10-20T21:20:32Z | K2 | eaafb8845ba7 | identical (base 15fdfbaac7f4ebecba1dfd7a819568230a9b9def, merged tree 3b01313633c798e1db0af6b155352d167f4f829c), production through the read-only proxy | 0 SQL file(s) |
| 2026-10-20T21:47:23Z | K1 | 846d736f68c9 | not needed | 0 SQL file(s) |
| 2026-10-20T21:57:38Z | K2 | a9a274c7d427 | not needed | 0 SQL file(s) |
| 2026-10-20T22:09:58Z | K2 | e42ffa20c880 | not needed | 0 SQL file(s) |
| 2026-10-20T22:22:11Z | K2 | 4f7c50e6a051 | not needed | 0 SQL file(s) |
- D-078 K1 complete (b10 846d736: real Death Note, One Piece, Spy x Family data; 30 series, 600 characters, 590 facts on o1-dev). K2 complete (b2 to b5; 150 quizzes, 1449 questions, signed by the 30 Team creators). Packets sent. Known content defect: cast-list facts carry the arc of their last character, which lifts several Characters quizzes above arc 0; a content lot after K3 splits them per character and retags. K3 (daily bank, 100) next, brief K3.md.
| 2026-10-20T22:49:30Z | K3 | d6fa1967fd8b | not needed | 0 SQL file(s) |
| 2026-10-20T23:09:27Z | K3 | cf2f0afb6109 | not needed | 0 SQL file(s) |
| 2026-10-20T23:35:41Z | K1 | 8a3312f0518f | not needed | 0 SQL file(s) |
- D-079 Content for launch complete on o1-dev: 30 series, 150 quizzes (1449 questions), 100 daily rows (800 questions), 31 Team accounts. K3 b1 d6fa196, b2 cf2f0af (its agent committed with core.hooksPath overridden; merge-lane's guard checked the range as K3: ok). Cast fix 8a3312f: 54 cast-list facts rejected, 598 per-character facts, 11 Characters quizzes lowered (9 to arc 0). The loader maps rejected to hidden but never resets an existing trivia status: on o1-dev the 54 old rows stay draft (nothing published); a fresh launch load hides them. All facts are draft until the owner's review.
| 2026-10-21T08:34:40Z | O1 | f456d5d57f04 | identical (base d2aeedd141ad0af4cefff4b31f021568b1faa124, merged tree 3844344069bef75fc2e0db1d04eb9a9c7db1105a), production through the read-only proxy | 2 SQL file(s) |
- D-080 Lot a merged (cc11da8; conflicts with P1 resolved, P1's world-only structure kept; production identical). The new 015 was skipped by migrate-dev (same name already applied): ORCH re-applied it on o1-dev (spoiler_reports present, reports_spoiler_once gone), logged. Twins rows H-3 and H-5 (hub /passport and /settings) become redirects: mustImport none, body none (H1's request); row 18 waits for P1's rule 18 fix. B6 (ac347b7, 0.24 M) needs a rebase on P1 (kpop nav snapshot made before P1) and dash escapes in 2 tests: fix agent running. P1's fix of the passport moved settings and login into copies (3 twins violations on integration, unseen by merge-lane): fix agent running.
| 2026-10-21T08:58:39Z | P1 | 57b7a9f28aa6 | identical (base e566293855e8e7e990f9baf42cd0b941717f76a1, merged tree 74f8ade1841ef66fcf84020a5d0284fa3656a27b), production through the read-only proxy | 0 SQL file(s) |
- D-081 P1 rule 18 fix merged (da4d137; login body and settings reused with optional props and world parts loaded on demand; kpop /login, /settings, /q identical to the byte; production identical); twins ok on o1/integration. merge-lane now also runs check.sh (twins) on the merged tree, so a copy can no longer pass a merge. B6 rebased on P1 (92ca160).
| 2026-10-21T09:06:25Z | B6 | 92ca160d904b | identical (base 1c16ebe71c6fd2ea591ca41c56cb06e73c3e62e2, merged tree 20eb9f395560c505ed6827a641b95456481dc71a), production through the read-only proxy | 0 SQL file(s) |
| 2026-10-21T09:15:08Z | H1 | 1ead2fa10f20 | judged by ORCH (D-082): production through the proxy, 59 of 60, /leaderboard same bytes with relative times 6h against 7h ago | 0 SQL file(s) |
- D-082 Incident: while merge-lane H1 was running (merge staged with --no-commit), ORCH committed the L1 brief in O1, which recorded the H1 merge as 1fd6aa1 'o1: L1 brief' before merge-lane finished. merge-lane's checks on that same merged tree all passed (tsc 0, unit 3377 of 3377, twins ok, production comparison 59 of 60 with /leaderboard differing only by relative times), and its own commit then found nothing to commit. The merge stands as 1fd6aa1 (history not rewritten). Rule for ORCH from now: no commit in O1 while a merge-lane runs. Lots d and g merged: hub /passport, /settings, /u redirect to the member's home site; privacy draft sent to the owner (18 OWNER points).
- D-083 Lot e (B7 0a6b315, 0.33 M): SQL 016 tried on scratch, routes, sign-out lib, send-email hook (kpop byte diff 0). R (0.16 M): BLOCKED, 2 blockers (sign-out error ignored so delete answers 200 with sessions alive; 016 rollback can drop real leave_world log rows); fix agent running. Waits for Mission U part D: a real passport_run_deletion raises until admin_delete_account exists; the per-site deleted-user sentinels are needed; owner told. Land beacon on a signed-in jump still not counted (B6 open issue).
| 2026-10-21T09:40:12Z | L1 | 848198970241 | not needed | 0 SQL file(s) |
- D-084 C1 (9a30ec4, 0.36 M): fixed K-pop left on the anime result and share screens and the 404, the rabbit in anime and hub headers (letter tile until the logo exists), dead links, contrast; and found a blocker: spoiler_reports' primary key (quiz_id, reporter_id) makes PostgREST see a quizzes-profiles junction, so every quizzes to profiles embed is ambiguous (quiz pages 404 on o1-dev, kpop build included; in production, kpopquiz.org would break the day 015 is applied). C1 added foreign-key hints; the root fix (surrogate key) goes to lane O1 (brief O1-015pk.md), then R. Lanes C1, C2, C3, L1 get hotExempt as D-054.
| 2026-10-21T11:06:45Z | C1 | 9a30ec4915d1 | identical (base d03eac92b4b3a6eeddb276c28a8abeba93b969a1, merged tree 9974691c90b720f3f1cabb48363258aa19146a11), production through the read-only proxy | 0 SQL file(s) |
| 2026-10-21T20:01:52Z | B7 | e100e16a5c49 | judged by ORCH (D-085): production through the proxy, 58 of 60, / and /leaderboard differ only by relative times (42 vs 44 minutes ago, 3h vs 4h ago) and one Flight push boundary | 2 SQL file(s) |
- D-085 Lot e merged (B7 a315646; fix e100e16: sign-out error answers 500, rollback refuses real leave_world rows); production comparison 58 of 60, judged (relative times, one push boundary); 016 applied on o1-dev. Real deletion waits for Mission U part D (guarded).
- D-086 spoiler_reports gets a surrogate primary key (O1 e618052: id identity, unique (quiz_id, reporter_id); converted in place on scratch and dev; PostgREST quizzes to profiles embed answers 200 on o1-dev). Contract schema.sql, contract.types.ts and K1 checks.sql follow (88 of 88; K1 checks on scratch). One R pass on the 015 change before merge.
| 2026-10-21T20:10:46Z | O1 | e618052a0948 | judged by ORCH (D-087): production through the proxy, 59 of 60, / same bytes, relative time 51 vs 53 minutes ago and Flight push order | 2 SQL file(s) |
- D-087 spoiler_reports surrogate key merged (R PASS); 015 already applied on o1-dev by the lane; production comparison judged (relative time only).
| 2026-10-21T22:19:32Z | C2 | ada1a618ae3c | judged by ORCH (D-088): production through the proxy, third run, 59 of 60, / differs only by relative time (2 vs 3 hours ago) and one push boundary; the earlier name-all difference was a base-side flake (base /bts-quiz 500 in the same runs; local builds and renders identical) | 0 SQL file(s) |
- D-088 C2 (0.32 M; report docs/o1/reports/C2/report.md): 1 blocker and 6 should-fix. Fixed and merged (ada1a61, 0.20 M): /api/quizzes and /count through forSite, name-all and personality group reads scoped, site_id on report, reply and notification inserts, the nine kpop crons guarded with cronForSite, anime quiz edits recompute the spoiler level. Left to the owner: S4 (merge_anon_passport and award_xp keep PUBLIC execute as today, F0-14, now with a world branch) and S6 (per-world ban not built). The name-all difference seen twice in production comparisons is a base-side flake (0.24 M investigation).
| 2026-10-22T07:16:10Z | C3 | ad13c75dd777 | judged by ORCH (D-089): production through the proxy, 59 of 60, /which-bts-member-are-you differs by exactly one Flight push boundary (43 bytes) | 0 SQL file(s) |
- D-089 C3 merged (101e328; 0.32 M): e2e 42 pass, 0 fail, 10 environmental skips; SEO fixes (5 pages declared index on staging, hreflang to a 404, missing llms.txt and WebSite JSON-LD, the rabbit on the share image); offline parity 60 of 60; NET_INDEXING server flag (default closed). ORCH applied its requests: NET_INDEXING registered (registry, flags-env.md, LANES.md), X-Robots-Tag noindex on closed anime and hub builds in next.config.ts (never on kpop: INDEXING_OPEN is true there), hub sitemap '/' only (routes.md), C1 spec waits for the fade before the dark axe pass. Site tests 353 of 353, tsc 0, twins ok. Launch blocker left to the owner: brand files (logo, favicon, OG image, manifest) for otakuquiz.org and fanquiz.org.
- D-090 Phase 2 code ready for production on 0a32134: final production comparison 59 of 60 (one 43-byte push boundary, judged), e2e 42 pass 0 fail, offline parity 60 of 60, twins ok. Cost: agents about 11.8 M (final context sizes); ORCH about 11.0 M cache writes and 0.5 M output, plus 312 M cached reads. With ORCH counted, the owner's 15 M stop threshold was passed without ORCH noticing: ORCH tracked only agent tokens, and long waits for agents let its cache expire, so each wake rewrote its whole context. Reported to the owner.
- D-091 Owner exception to rule 13, this task only: ORCH ran docs/strategy/o1/vercel-setup.sh (read in full first). The Vercel CLI was already signed in as p-mingi. Projects otakuquiz and fanquiz were created, linked to GitHub, builds paused (ignored build step exit 0), Vercel Authentication on, public variables only. No secret, no deployment, no domain, kpopquiz untouched. Exit 0.
- D-092 Owner: the runbook gets K5b on launch day, before K6: remove the Ignored Build Step exit 0 from projects otakuquiz and fanquiz and redeploy main once, or they never build; H1 notes the projects already exist (D-091).
- D-093 Owner exception to rule 13 (this task): test environment on the Vercel branch addresses of o1/integration, wired to o1-dev. o1/integration pushed to GitHub by explicit URL (the per-worktree pushurl guard stays). Vercel refuses a branch-scoped variable before the branch exists and a push would build kpopquiz's preview with its default Preview variables, so builds of o1/integration were held by apps/quiz/vercel.json git.deploymentEnabled during the setup, then released. scripts/o1-tools/vercel-preview-env.sh set 47 Preview variables scoped to o1/integration (kpopquiz 15, otakuquiz 16, fanquiz 16: o1-dev URL and keys via env.sh dev, never printed; test secrets in ~/kpq-o1/preview/test-secrets.env, mode 600; SITE_SCOPE, PASSPORT_JUMP, UX and NET flags, NEXT_PUBLIC_NET_ORIGINS to the 3 branch addresses) and the Ignored Build Step of otakuquiz and fanquiz builds o1/integration only. Production variables unchanged (24, 6, 6). Builds started on d7c158b. From now on ORCH pushes o1/integration after each merge.
| 2026-10-22T21:25:44Z | Q0b | 9353c2f2bc50 | identical (base b061cc7b322e5a6281dedded8fdfee5e5918c806, merged tree d436c8e49687a865f9f8c1eb9565858ec9a74df2), production through the read-only proxy | 0 SQL file(s) |
- D-094 signin-link.sh --vercel (Q0b 9353c2f, 0.11 M): anime and hub links go to /auth/confirm with token_hash (no Supabase redirect setting needed); kpop goes through the anime link and the passport jump. The agent printed one one-time token once (percent-encoded copy in a Location header) and replaced it at once by a new link for the same fixture (the old token is void); unused.
| 2026-10-23T11:09:19Z | Q0b | d40db2621d7d | judged by ORCH (D-095): production through the proxy, 58 of 60 (/which-bts-member-are-you push boundary, /leaderboard relative times); the lane changes only scripts/o1-tools and its report | 0 SQL file(s) |
- D-095 Owner (2026-10-23): o1-dev gets the public K-pop catalog of production (scripts/o1-tools/copy-kpop-catalog.sh; read through the read-only proxy with the anon key, GET only, write o1-dev only; 13369 rows: 474 quizzes, 95 groups, 118 idols, 4291 songs, blind test data; no personal data, creators are the system account; prod group ids shifted by 1000 on o1-dev). Leak checks: no anime row on 17 kpop pages and APIs, no kpop row on anime. A sign-in link for the owner was generated with signin-link --vercel and given in chat only.
- D-096 O2 visuals (419eb4b, 0.37 M: series art per slug, card strips, names wrap) refused at merge: 13 kpop pages load 14 script chunks instead of 13 (same modules, different grouping; kpop-chunks.sh compares modules, not chunk counts). Fix agent on O2: the art comes from anime-only modules as props, kpop chunk counts equal to the base. The owner tour (brief TOUR.md, lane C1) runs after O2 merges.
- D-097 O2 fix 2722fd9 (0.37 M: series art through a SERIES_ART slot so kpop chunk counts stay equal) refused at merge: kpop pages rendered the anime art classes in production, because Next loads every route module at server start, the anime layout included, so the registrar filled the slot on the kpop build too. ORCH: the registrar fills the slot only when SITE_ID is 'anime' (build-time constant); slot tests set the site and a kpop case proves the slot stays empty (5199173; suite 3448 of 3448). ORCH committed 355db7c before running the tests to the end (two tests failed then); fixed in 5199173.
| 2026-10-23T12:14:18Z | O2 | 519917349bac | judged by ORCH (D-098): production through the proxy, 59 of 60, /blindtest/group-bts same bytes with client module ids in another order; no anime class on any kpop page | 0 SQL file(s) |
| 2026-10-23T13:59:45Z | C1 | 8389ab4ba3ba | identical (base 50eb5fa3402fe58da8874b7901e0c4b388230036, merged tree baf108d3feb8fe8cac264696ec9f7a543bf13542), production through the read-only proxy | 0 SQL file(s) |
- D-099 Owner decisions (2026-10-23): S4 first (standalone SQL revoking PUBLIC execute from server-only SECURITY DEFINER functions, applied in production by the owner before anything else; lane C2 owns docs/pending-migrations/s4/**); facts re-check with 30 for the owner and a verify command; 18 privacy recommendations (yes or no); runbook: generate and version L02, L04, L05, L07, L08, L12, write L03 and L06, drop L09 to L11 from the launch path; brand: kpopquiz brand files everywhere for now, OG images carrying 'KpopQuiz' regenerated with the site's name; kit decisions: a verified fact is a published trivia row, Team accounts use <username>@team.otakuquiz.org (no mail), L01 at K3, no Discord on the new domains, IndexNow keys generated, contact@otakuquiz.org and contact@fanquiz.org, the anime daily dated by the existing kpop bank tool with the site parameter and auto-scheduling on, Organization data in kpopquiz.org's footer yes, the indexing PR merged last on launch day, T0 set by the owner. Tour fixes merged (09b80c4, 0.32 M; production identical).
- D-100 S4 (C2 d12be24, 0.26 M; R PASS 0.15 M): docs/pending-migrations/s4/S4-revoke-public-execute.sql revokes EXECUTE from PUBLIC, anon and authenticated on 28 server-only SECURITY DEFINER functions (service_role keeps it), rollback restores today's ACLs; 4 browser-called functions kept with a proposed fix (record_play, increment_like_count, decrement_like_count, get_personality_counts). Tried on scratch and dev, e2e 43 pass 0 fail. ORCH aligned O1: 008 and its rollback no longer grant merge_anon_passport to PUBLIC (service_role only), B3 checks.sql expects that ACL (scratch and dev show {postgres,service_role}); B3 checks.sh now stops earlier on its own fake deletion_requests table, which 016 created for real (test environment issue, to fix in a later pass). Rule for O1 SQL: a DROP plus CREATE resets the ACL, so revoke from PUBLIC, anon and authenticated after it.
| 2026-10-23T14:35:58Z | K1 | 7b5c84200858 | not needed | 0 SQL file(s) |
- D-101 Facts re-checked (K1 7b5c842, 0.50 M): 1174 checked, 32 corrected (3 of substance), 1 rejected, 5 quizzes and daily rows touched; facts-30.html for the owner (20 fragile, 10 random, seed 20261023); scripts/anime/k1/verify-facts.mjs (dry run, --apply, --hold-single-source); the loader maps verified to published trivia. 151 load-bearing facts have a single source: --apply would fail check C2 on 175 quizzes and daily rows unless they stay draft (--hold-single-source) or get a second source: owner choice. Incident: the agent printed one o1 branch database URL with its password in its session output (no file); the owner is advised to rotate that branch password. Privacy recommendations (H1 5e1b405) sent.
| 2026-10-23T14:56:09Z | L1 | 57af3b2cf1e3 | judged by ORCH (D-102): production through the proxy, 59 of 60, /leaderboard same bytes with relative times | 16 SQL file(s) |
- D-102 Launch kit merged (L1 376a923: exact runbook, 198 paths 0 missing; launch files L02 to L08 and L12 generated as drafts, L03 sentinels and L06 anime badges written, L09 to L11 after launch; IndexNow keys per site; brand files of kpop for anime and hub, share images regenerated with the site name; passport-cleanup cron route). ORCH applied the requests: next.config.ts makes kpop answer only its own IndexNow key (kpop rewrites become beforeFiles key blocks plus the same V12 afterFiles rules), vercel.json gains the passport-deletions and passport-cleanup crons (17 jobs; both routes skip outside the hub). Site and cron tests 423 of 423, tsc 0; production comparison before the push.
- D-103 S4 applied in production by the owner (2026-10-23, 14:53 UTC). Owner verified: 28 functions closed to PUBLIC, anon and authenticated, service_role kept; the 4 browser-called ones unchanged; no permission error in the logs.
- D-104 Launch SQL keeps S4: 008 and its rollback create merge_anon_passport closed (revoke from PUBLIC, anon, authenticated right after the create, in the same transaction; service_role only; D-100). New check docs/launch/o1/V-S4-closed.sql (raises if any of the 28 is executable by anon or authenticated, if service_role lost it, or if one is missing), in VERIFY after A0, V4, V6 and V8. On o1-scratch: passes after 008 rollback, after 008, and after replaying the 27 manifest files 001 to 016 and the launch files in order (L05 and L08 need --single-transaction, as the runbook runs them); fails as it should when award_xp is granted to anon in a rolled-back transaction.
- D-105 Owner (2026-10-23): the 30 facts are ok except Naruto arcs_part_two_b: Naruto facts use Shippuden episode numbering (1 to 500) wherever they used the continuous count, then verify-facts --apply. The 151 single-source load-bearing facts: an agent looks for a second allowed source (official site, publisher, Oricon, Anime News Network, Wikidata when it carries the data); those without stay draft with --hold-single-source; no loosening of C2. Oricon and Anime News Network join the allowed source list of C10 (owner decision).
| 2026-10-23T17:45:42Z | K1 | b9cddc6ab09f | not needed | 12 SQL file(s) |
- D-106 Facts (K1 b9cddc6, 0.21 M; merged 38e148e): Naruto Shippuden ranges in Shippuden numbering (3 facts, 29 arcs); second sources found for 56 of 151 (27 Wikidata, 15 official, 34 press), 20 with press only stay draft (C2 unchanged), 20 with conflicting second sources listed in second-sources-conflicts.json; 1058 verified, 115 draft, 55 rejected; publishable: 72 of 150 quizzes and 37 of 100 daily rows (only C3 fails: a cited fact still draft); launch files regenerated with verified rows only; o1-dev shows 1032 published trivia. merge-lane then tried the launch files on o1-dev (L02 refused: Team auth users are created on launch day): merge-lane now never applies launch files L02 to L12 to o1-dev (scratch rehearsal and production only); FREEZE lifted. K1-4: press stays a files-only kind (the contract test pins the fact source enum to entity_sources_source_check), documented in formats.md.
| 2026-10-24T16:54:55Z | K1 | f3851e7df558 | not needed | 4 SQL file(s) |
- D-107 Owner decisions (2026-10-24), facts: C2 press rule (Oricon strong for sales and ranking fields, ANN strong for announcement fields: dates, seasons, adaptations; one module strong-source.mjs shared by check, verify and validate; the contract fact.schema.json is unchanged, validate-data drops only its "contains" error when the rule is met). K1 f3851e7 (0.30 M; merged 1b3c598): 3 of the 20 press-only facts verified; 20 conflicts decided by source rank (8 kept, 2 dated, 7 changed, 3 rejected; docs/anime/data/conflicts-decided.json); 18 questions aligned; publishable 76 of 150 quizzes, 37 of 100 daily rows; o1-dev reloaded (trivia 1188 rows, 150 quizzes). Next: K1-rewrite (blocked questions cite verified facts only, else the quiz is withdrawn) and H1-privacy (final network policy). Kpop age 15: branch privacy/age-15 (8506ad9, from origin/main: privacy and terms), for the owner to push and merge. /pt: branch seo/remove-portuguese of the other conversation.
- D-108 Final network privacy policy (H1 365d3ec, 0.35 M; merged d905292 by hand: parity 1 of 60 pages, "/" with relative times only, judged identical). The 18 owner answers in the privacy.* keys; fanquiz.org/privacy and otakuquiz.org/privacy show the same text (canonical fanquiz.org); NET_LAUNCH_DATE (server value in lib/site/indexing.ts, not in the registry: the registry is in the kpop client bundle) prints the date once NET_INDEXING is on, the build fails if the date is missing; ENV.md and RUNBOOK K10 updated (controller line checked, date before indexing). Sign-in notice on anime and hub; kpop untouched (its sheet text cannot name KpopQuiz under passport-ui.site.test.ts; the kpop notice waits for launch). Open for the owner: the KpopQuiz "Delete account" row is today a manual request (30 days, quizzes deleted, part D), the policy says 7 days and quizzes kept: wire it to the passport deletion at launch (recommended) or say it in the policy. H1 also changed home-hub.test.ts (its premise "not on the other builds' privacy page" no longer holds).
| 2026-10-24T17:35:35Z | K1 | 7d449227af27 | not needed | 4 SQL file(s) |
- D-109 Blocked questions rewritten (K1 0e090ac + 7d44922, 0.33 M; merged 590e952): 145 quiz questions and 116 daily questions now cite verified facts only; 12 quizzes and 1 daily row withdrawn for lack of verified facts (docs/anime/data/withdrawn, never read by a loader; the editorial check skips that folder). Publishable: 138 of 150 quizzes, 99 of 100 daily rows; check.mjs 297 of 297 pass. content-sql.test.mjs counts 138 and 99 (ORCH, the file is not K1's). o1-dev reloaded and the 12 withdrawn quizzes set to draft there. Packet k1-rewrite.html (124 items) to the owner. Noted: 3 kept quiz titles are broader than their new content (Spy x Family, Chainsaw Man, Death Note).
- D-110 Owner decisions (2026-10-24): k1-rewrite packet validated; 3 quiz titles to fix; KpopQuiz "Delete account" = passport deletion at launch (option 1, on part D #105); privacy second pass (controller Nuri, 6 rue Rémusat, 75016 Paris, France); legal notice on the 3 sites. ORCH merged origin/main df25774 (Mission U parts C, D, bank lot 1; 4 commits, no conflict) as a612dd2; SYNC-main f127aed (0.14 M) re-based 3 kpop snapshots on df25774 (main's own text and module) and made the cron bank status per site. Parity origin/main against the merged tree: 14 of 60 differ by script and preload order and Flight row order only (no text); the control 8059cd3 against b204aa8 (before the sync) shows the same 13 /q/ and /leaderboard pages, so this predates the sync (client module order, the judged pattern). Lane worktrees C2, L1, sync removed (merged, clean) to open B7.
| 2026-10-24T21:24:30Z | K1 | 993681de16a1 | not needed | 0 SQL file(s) |
- D-111 Privacy second pass and legal notice (H1 ca7adea, 0.33 M; merged by hand with the contract patch of requests/H1.md: flags-env NEXT_PUBLIC_NET_PRIVACY, twins 26d and H-10, LANES H1, routes and copy-keys). Controller Nuri, 6 rue Rémusat, 75016 Paris, France; deletion text pinned to policy.ts and the kpop "Delete account" label; /legal on the 3 sites (publisher Nuri, host Vercel Inc. 440 N Barranca Avenue #4133, Covina, CA 91723 from vercel.com/legal/privacy-notice, phone from its DMCA page; placeholders legal form, SIREN, publication director: noindex and an indexing build fails while one is left); kpop sign-in notice, footer link and /legal behind NEXT_PUBLIC_NET_PRIVACY (same client modules and chunk count on 163 routes). Tests 3770 of 3770, tsc 0, twins ok. Parity 59 of 60: /blindtest/group-bts Flight row order only (IconMark row streamed at another place, same rows; seen the same on the main sync). Branch legal/notice (c44e9be, from origin/main) carries the kpopquiz.org legal page now, for the owner; merging main back later: resolution in requests/H1.md item 10.
- D-112 KpopQuiz "Delete account" = passport deletion at launch (B7 7e845da, 0.36 M; R PASS docs/o1/reviews/B7-kpop.md; merged by hand with the flags-env row NEXT_PUBLIC_NET_DELETION and the LANES flag cell). 017-deletion-kpop.sql: passport_run_deletion calls part D admin_delete_account(user, keep, false) for kpop data after the other sites' purges (016 called a one-argument form part D never had: a real run would have failed). Applied on o1-scratch and o1-dev (part D then 017). 017 is in the launch order (SQL-ORDER 18b part D, 19b 017), not in the multisite manifest (the contract pins 31 rows): migrate-dev does not re-apply it. e2e on o1-dev: request, one email (test sink, dev and scratch only), cancel, cron after a past run_after: auth user and profile gone, 2 quizzes under the dead sentinel with 4 plays kept, 0 rows with the id in 215 columns; remove-quizzes variant; second account untouched. Tests 3790 of 3790, parity 60 of 60 identical. ENV.md: NEXT_PUBLIC_NET_PRIVACY and NEXT_PUBLIC_NET_DELETION at launch. Agent printed the o1-dev DB password once in its transcript (owner to rotate).
- D-113 Owner (2026-10-25): the o1-dev password is not rotated (no agent handles passwords; the branch holds only test accounts and the public catalogue); RUNBOOK After launch: the owner deletes the o1-dev and o1-scratch branches, then the Preview variables of o1/integration. Never show O1_DB_URL or any secret in a report: scripts/o1/env.sh now runs the command through o1_mask (any postgres URL, the database password and the values of every *KEY*, *SECRET*, *TOKEN*, *PASSWORD*, *DB_URL*, *SALT* variable print as [masked]; stdin and exit code kept; checked on dev: URL, service key masked, rc 7 kept, psql works). Owner legal identity: publisher and controller Louis Pecchia, entrepreneur individuel (no "Nuri", no Paris address): legal/notice beabb91, privacy/age-15 68820ad (not pushed; the owner pushes).
- D-114 Legal identity on o1 (H1 6c4393e, merged by hand: parity 58 of 60, relative times on / and the IconMark Flight row order on /which-bts-member-are-you): /legal publisher Louis Pecchia (EI), SIREN and SIRET, VAT line, director, phone placeholder; privacy controller with a link to /legal; no Nuri left in src. Staff and manual-only accounts refused up front (B7 044b30e, R PASS; merged 0aaa00f): the delete request checks part D's three refusals before any request, sign-out or email, 409 staff_account or manual_deletion.
| 2026-10-25T12:28:25Z | H1 | 253464b48f07 | identical (base 47fcdd295567c6e4579ba9723309450f2fd8bbcb, merged tree fa3073c611f50ee3075d23cdb1d9ee26d40c0936), production through the read-only proxy | 0 SQL file(s) |
- D-115 One mailbox (owner, 2026-10-25): hello@kpopquiz.org on the 3 sites (registry MAILBOX, codemod rules, terms, privacy, banned, Organization JSON-LD, contact pages), a test forbids contact@ and support@; deletion works without Resend (notice skipped and logged without address; request, cancel and cron unchanged; 3 tests); RUNBOOK section I postponed (hook off at launch), contact@ mailbox creation removed, ENV NET_DELETION row corrected. Merged f530a7a (0.16 M). Parity: every kpop page differs by the mailbox only (Organization JSON-LD); a control commit with the old mailbox shows only live data moves. Incident: the agent committed the apps/quiz/node_modules symlink (`node_modules/` does not match a symlink); the merge replaced O1's real apps/quiz/node_modules with a self link for about one minute; fixed (untracked in the amended merge, `pnpm install --offline --frozen-lockfile`, lockfile unchanged), and .gitignore now also ignores `node_modules` links. Tests 3808 of 3808. Never merge o1/contact-hello again (its tip carries the link).
- D-116 Owner content plan (2026-10-25): Manhwa label, 20 new Japanese series (4 batches of 5, fallback list in order), one more fun quiz per existing series (30; the 31st group is the general mix), 10 multi-series fun quizzes, a final verifier. Manhwa (c1d6cc9, 0.21 M; merged): label from series.type webtoon on the series header, /series list, /trivia cards and related rows; adaptation line on Solo Leveling and Tower of God; quiz cards and rails not labelled (their rows carry no series type; adding it touches shared kpop queries). Kpop: same modules on 164 routes and chunk counts; parity rerun: live leaderboard counts and the rotating /blindtest pick only.
- D-117 OtakuQuiz content (owner, 2026-10-25): 20 new Japanese series in 4 batches (none replaced; 1653 facts verified), each with 4 quizzes (general, hard with "spoilers", two fun formats); 30 more fun quizzes and 10 multi-series quizzes (anime-mix now loads and launches); no personality quiz (the anime data path has none) and no emoji quiz (C12 bans emoji). Verification on opened pages: s1 400 questions (358 ok, 42 fixed), s2 400 (341 ok, 38 fixed, 21 replaced); s3 (the 40 fun quizzes) running. C5 reads names in the cited series of a mix quiz (Gintama's Kagura is not Inuyasha's). Totals: 50 series, 258 quizzes, 99 daily rows. Loader tests 30 s.
- D-118 FanQuiz home (owner, validated design docs/o1/design/fanquiz-hub): H2a page pixel for pixel (912947c), H2b real data per block with one hour cache, never a 500 (4715bdc, R BLOCKED then fixed: no write from render, public client for plays, limits, rollback guard), H2c wiring (9885aef); merged by hand. Rabbit logo plus wordmark on FanQuiz and OtakuQuiz (mascot-default.png, as kpopquiz.org's navigation; logo-primary.svg is a text tile). Countdown on the real rotation 00:05 UTC (Paris 01:05 in winter); the daily blind test has 10 songs. Prepared, not applied: docs/pending-migrations/hub/001-quiz-daily-plays.sql and 002-xp-daily-snapshots.sql (owner's go). Without data at launch: Continue, verified-first for OtakuQuiz's first week, Hot's completion rate, Top fans (no public profile yet). Email templates carry the rabbit; the send-email function needs a redeploy (hook off at launch).
- D-119 Verification s3 (e482460, merged): the 40 fun quizzes, 400 questions: 263 ok, 87 fixed (64 second sources on dates, counts, credits), 50 replaced (single-source in-story figures, Gintama 367 vs 353, Haikyu OVA count, release orders without a strong date); Dr. Stone and five number quizzes retitled. Totals over the 1200 new questions: 962 ok, 167 fixed, 71 replaced. Launch files regenerated and replayed on o1-scratch; o1-dev reloaded.
- D-120 Owner (2026-10-26): OtakuQuiz orange and no blind test (2248caa, 0.98 M; merged by hand). ANIME_LIGHT and ANIME_DARK: accent family orange from the design (#C2410C, #FFF1E6, #9A3412), AA ratios tested; legacy pink of shared sheets repeated in orange for the anime scope only (generated legacy.css, rule 6 exemption for that file, colour properties only); a rendered check finds no pink on 15 anime pages light and dark. Blind test off on anime: route out of the allowlist (404), every link and copy gone, /opening-of-the-day to /series, no link to the openings quiz (it does not render). Contract amendments appended (registry, routes, TWINS, tokens, copy-keys). Images per series: the owner's image rules never reached this session; asked again. Rabbit logos were done in D-118.
- D-121 Point 3 of the owner (2026-10-26): personality on otakuquiz.org (PERS d9e4a45 engine and data path D/personality, launch L10 at row 27b of SQL-ORDER; PERS-2 25b648b components speak anime); Which character are you for 10 series (Death Note proof set and 9 by verified copies: One Piece, Slam Dunk, Jujutsu Kaisen, Apothecary Diaries, Inuyasha, Spy x Family, Oshi no Ko, Black Clover, Kaguya-sama; Dragon Ball, Attack on Titan and Bleach left out, their copies facts are draft), 70 profiles, results all spoiler level 0, strict excerpt check against the fetched Wikipedia revision on 178 facts (1 miss fixed); "Guess the anime in 3 words" 10 multi-series quizzes (75 ok, 25 fixed); arcs of Fairy Tail and Kagurabachi backed (validate-data 0 problems). Totals: 50 series, 268 quizzes, 10 personality quizzes. The oshi offer stays off on anime (owner's choice).
- D-122 Images per series (owner rules, 2026-10-26): 51 photos (50 series and anime-mix), all from Unsplash (Pexels refused scripted reads; no Commons file needed), objects and places, no face, no text, nothing of the works; WebP 736x981 at most 120 KB in apps/quiz/public/series, one manifest per image in docs/anime/images (source, author, licence, date, alt, why); generated map, photo wherever the series art shows, title card fallback, /credits page linked from the anime footer (no CC BY or CC BY-SA, so no credit line on the hubs). ORCH reviewed all 51 on a contact sheet.
- D-123 Set as oshi on otakuquiz.org (3fc66f9, R PASS; merged): the personality result saves the character as the fan's oshi (favourite_characters under RLS and the anime membership tag through update_my_membership, session user only), shown on the OtakuQuiz profile only, absent from HubShares, the hub, kpopquiz.org and every passport payload (tests). Found on the way: every /which-<series>-character-are-you page was a 404 on a production build ([site] layout dynamicParams false); the anime twin is now force-dynamic (no hourly ISR; nothing per user on the server). Owner launch todo in docs/launch/o1/OWNER-TODO.md (about 27 h of owner work).
