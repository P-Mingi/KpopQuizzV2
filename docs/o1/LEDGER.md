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
| G0 | confirm the defaults (21 decisions of the v2 plan, the 9 of the run plan, the Working System exceptions) | F0 freeze | 2026-10-17 | ANSWERED 2026-10-16 17:07 UTC: "ok pour tous les choix par défaut" |
| G1 | create o1-dev and o1-scratch, run KPQ/fill-dev-env.sh | Q0b, B2 first SQL | 2026-10-18 | ANSWERED 2026-10-17: dev.env and scratch.env in KPQ/secrets; keys checked ok (D-022) |
| G3 | pg_dump schema-only of public + prod-inventory.sql into KPQ | Q0b, branch-parity, B5 | 2026-10-18 | ANSWERED 2026-10-17: schema copy from the catalogs and inventory, md5 checked (D-022) |
| G2 | o1:fixtures on both branches (after G1 and branch-parity) | Q0b auth suite, B3, B4 | 2026-10-19 | asked again 2026-10-17 with the command `sh O1/scripts/o1/fixtures.sh` (D-023) |
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
| G0 | answered: all defaults confirmed | 2026-10-16 | 2026-10-16 |
| G1 | answered | 2026-10-16 | 2026-10-17 |
| G2 | asked, command ready (D-023) | 2026-10-16 | |
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
- D-016 Engine: the Workflow tool, one tick at a time (Appendix A adapted), maxCode 2, maxOther 2 (D0 is static).

## Change requests

| CR | lane | change | review | status |
|---|---|---|---|---|
| CR-001 | F0 (O1, O2) | Rule 18 ruling on R's F0 audit M1: the anime twins of `/quizzes` and its three lists, `/new`, `/most-liked`, `/trending`, `/trivia`, `/faq`, `/leaderboard` (Team accounts excluded) and `/dmca` exist (TWINS rows 31 to 36); news, articles, data pages (`/stats`, `/data/*`) and ranked join F (off at launch, slot absent); technical auth routes without a screen are row 37; the hub shell is row H-0. F0 updates routes.md, `routes.allow`, `KPOP_ONLY_SAMPLES` and copy keys accordingly | ORCH ruling (rule 15), R-ARCH checks it in F0's next review | approved 2026-10-16 |
| CR-002 | P1 | Welcome card on the first signed-in arrival (P W5 A and C, D4), shared components only | owner | proposed, owner to decide |
| CR-003 | P1 | "How I appear here" (P 8.2), shared components only | owner | proposed, owner to decide |
| CR-004 | P1 | "Keep anime in your passport? Yes, Not now" after the third play (P 3.2) | owner | proposed, owner to decide |
| CR-005 | P1 | Post-result oshi row on quiz results (S 2.5, TWINS row 8) | owner | proposed, owner to decide |
| CR-006 | B6, P1 | kpopquiz.org welcome card for arrivals from OtakuQuiz (Q B09, NET_WELCOME) | owner | proposed, owner to decide |
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
