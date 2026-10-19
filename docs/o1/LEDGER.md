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
