# Review Q0a round 2, profile ARCH

| field | value |
|---|---|
| lane | Q0a (parity and leak harness) |
| round | 2 (the diff `c5131aa..7e0451b` plus the answers to r1 M1, m1, m2, m3) |
| profile | ARCH |
| reviewer | R (fresh instance) |
| reviewed sha | 7e0451bec5b218a61806a11d8fc369edfe857b20 (7e0451b) |
| tree | c4103414dcb42be45d961ed278254bcb77e8c22f |
| branch / worktree | o1/Q0a, `.claude/worktrees/o1-Q0a` |
| gate base | eb36e4c67385b2efd7111913a0ffe65434d88099 (the checkpoint merge 5d049ac is in; o1/integration has moved on to 284b52a since, 6 commits, see Notes) |
| evidence folder | `docs/o1/evidence/Q0a/7e0451bec5b218a61806a11d8fc369edfe857b20/` |
| date | 2026-10-18 (review 12:40 to 13:05 UTC) |
| verdict | FIX (1 major, 3 minor) |

## Reviewability gate

- HEAD of the worktree is 7e0451bec5b218a61806a11d8fc369edfe857b20, the sha I was given. `git status --porcelain`
  printed nothing at the start and nothing after all my runs (tsc, vitest three times, node --test, both self-tests,
  the stand-in runs, which all wrote to the scratchpad only).
- What changed since c5131aa: one code commit, 66234d7 (gate-plan.mjs, gate-plan.test.mjs, twins.mts, gate-checks.sh,
  leak/gate-selftest.sh, leak/planted-server.mjs), three report and request commits (ee4f7c2, bb190c2, 7e0451b) and
  the checkpoint merge of o1/integration 5d049ac (ORCH's docs and evidence only).

## Checks (items of REVIEWER.md that apply)

1. Scope: PASS.
   - Evidence `guard.log`: `Q0a ok (102 range eb36e4c..7e0451b)`, 5 merge commits covered by the net diff. `hot.log`:
     clean (320 hot files). My own guard run on the same range: same output, exit 0.
   - The range `c5131aa..7e0451b` alone lists 66 paths Q0a does not own: all of them come from the merge 5d049ac
     (LEDGER, briefs, lanes.json, OWNERSHIP, evidence folders, my r1 file). The lane's own commits are clean:
     `c5131aa..ee4f7c2` `Q0a ok (8 ...)` and `5d049ac..7e0451b` `Q0a ok (2 ...)`.
2. Contract: PASS. No contract file in the lane's diff; the plan reads lanes.json and twins.json as before; nothing
   frozen changed. twins.mts: 0 changed lines outside comments (m1 of r1 answered in the header only).
3. Evidence: PASS.
   - `summary.json`: madeBy `scripts/o1/gate.sh`, sha 7e0451b, tree c4103414 (equal to `git rev-parse HEAD^{tree}`),
     base eb36e4c, green true, every step rc 0: guard, hot, copy, secrets, tsc (109 s), unit (38 s, 124 files, 2269
     tests, run with D-032's `--testTimeout=30000`), build-kpop, build-anime, build-hub; parity `skipped`; twins and
     site-checks `pending` (twins.mts and gate-checks.sh are not in O1 yet).
   - `changed.txt` (101 paths) equals my `git diff --name-only eb36e4c 7e0451b`.
   - The committed copy of this folder (284b52a) is the earlier attempt that stopped in prep (changed.txt and an empty
     steps.tsv); the full run of 12:26 to 12:39 UTC is on disk and not committed yet. ORCH commits it.
   - My tsc (`./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false`): exit 0, 62 s.
   - My vitest: with the gate's command (`vitest run --testTimeout=30000`) twice, 124 files, 2269 tests, exit 0 both
     times; with the default command once (load 13.7, swap 16.2 GB of 17.4 used), 1 base test timed out at 5034 ms
     (`src/lib/quiz/scoring.test.ts`, a source scan), exit 1. No file vitest collects is in the lane's diff; this is
     request 25's paging, and D-032 is what the gate runs.
   - Harness tests (outside vitest): `node --test --test-timeout=60000 scripts/o1/parity/*.test.mjs
     apps/quiz/scripts/o1/q0a/*.test.mjs apps/quiz/scripts/o1/*.test.mjs`: 102 of 102 pass; `gate-plan.test.mjs` alone
     13 of 13.
4. kpopquiz.org unchanged: PASS. `changed.txt` has 0 paths outside gate.sh's neutral regex (my grep with the exact
   regex), so parity was correctly not needed (`parity.log`), and parity is offline anyway (D-025).
5. Leaks (the lane's surfaces are the leak suite and the gate plan):
   - `scripts/o1/leak/selftest.sh --ports 3106,3107,3108` (mine, 320 s): 20 suite scenarios and 5 command line
     scenarios as expected, `VERDICT: every leak test fails on its planted leak and passes on the clean pages`. The
     suite, its helpers, its config and check-network-links are unchanged since c5131aa (`git diff` empty).
   - `scripts/o1/leak/gate-selftest.sh --ports 3106,3107,3108` (mine, 209 s): 9 of 9 scenarios as expected, failing
     and pending sets exact, one log per check, `VERDICT: gate-checks.sh fails exactly on the planted failures`.
   - With the major below: `leak-content` and `lane-specs` cannot pass on any run.
6. SQL: N/A.
7. Security: PASS. `secrets.log` clean. The diff handles no env value; gate-selftest now runs with an empty KPQ of
   its own output (`O1_KPQ="$out/kpq"`), so no kept build or env file of the machine can reach a scenario (good).
   The m3 deferral: minor m2 below.
8. Content: N/A. 9. UX: N/A (no screen). 10. SEO: N/A (no page).
11. Copy: `copy.log` empty. My check of the 497 added lines of the lane (apps, scripts, report, requests) with perl
    for U+2013, U+2014 and emoji: 0.
12. The report tells the truth: mostly; claims verified in attack 3. One count is off (minor m3) and two texts are
    out of date against the ledger (minors m1 and m2).

### The answers to round 1

| r1 finding | Answer | My check | Result |
|---|---|---|---|
| M1 | `<site>-leak` and `<site>-network-links` lines for every site of the lane with no server (pending for kpop when parity ran, else fail); `leak` and `network-links` carry `sites`; gate-checks.sh fails them when a planned server did not start (D57 to D59) | attack 1 (every fact combination), the gate self-test re-run, the hub-server-down logs | fixed: no fact combination leaves a site of the lane unread and unnamed |
| m1 | twins.mts header names both limits | diff: comments only | fixed |
| m2 | Progress and done-test row say "green on stand-ins; real builds at the first gate after the merge" | report lines 23 to 25 and the done-test row 4 | fixed |
| m3 | deferred (D60): parity.sh is in the harness hash; changing it now would leave runs 9 and 10 proving another harness | parity harness unchanged since c5131aa, hash recomputed cb12ed53 | the reason holds; the carrier does not (minor m2) |

## Attack attempts

1. Fail-open search of the new plan (`scratchpad/attack-plan-r2.mjs`, importing the lane's `gate-plan.mjs` read only).
   Every combination of lane sites (7 subsets), parity none or ran, kept yes or no, a build per site (8), a given
   server per site (8), the given kpop source, anime and hub wired true, false or unknown, required or not, and the
   database: 258,048 plans. Invariants: every site of the lane is read by a running `leak` or has its own pending or
   failed `<site>-leak`; the same for `network-links`, unless it is an unwired anime or hub build (then its
   metadata-dupes line fails when the wiring is required and skips otherwise); `pending` only for kpop with parity
   ran; no running check with an empty `sites`; no running check naming a site with no server; no line for a site
   outside the lane. Head: none broken. Control, the same script on c5131aa's `gate-plan.mjs`: the leak invariant
   broken for each site in 147,456 combinations, the network-links one in 18,432 to 36,864, and `network-links` run on
   no site in 28,512, so the attack sees the r1 defect and the fix removes it. One label outside the round's diff
   showed up (Notes, N1).
2. A planted server that never starts, and a kpop absent with parity ran (gate self-test re-run, then its logs).
   `hub-server-down`: `leak.log` opens `sites read: kpop anime; planned but not started: hub`, Playwright reports
   `12 passed`, then `FAILED: not read, the server did not start: hub`, rc 1. Without D59 that line would be green
   with the hub tests skipped: the fix bites exactly where the suite alone passes. `no-kpop-server-parity-ran`:
   `leak` and `network-links` read `anime hub`, `kpop-leak` and `kpop-network-links` are pending, each naming request
   2 and the tests it stands for. I also ran `sites_line` and `down_note` under macOS `/bin/bash` 3.2 with `set -u`
   (the script's shell): empty, one down and all down arrays expand as intended, no unbound error.
3. Claims of the report against the diff and the files: harness hash recomputed on this head (parity.sh,
   flag-off-diff.mjs, non-test `parity/*.mjs`): cb12ed53; `git diff c5131aa HEAD` of the parity harness: empty;
   twins.mts: 0 changed lines outside comments; gate-plan tests 11 at c5131aa, 13 now (two new, as claimed) but only
   one existing test extended, not two (minor m3); the `O1_KPQ` note of my r1 is in request 2; request 26 matches
   D-031. "Every leak test fails on its planted leak": confirmed again (item 5).
4. A path the builder did not test: a lane that lists a spec. Stand-in worktree in the scratchpad (a commit, the
   head's `playwright.o1.config.ts`, O1's node_modules linked, `.next-hub` that cannot start, one spec
   `e2e/o1/Q0a/hub-home.o1.ts` that skips when `O1_HUB_URL` is unset), lanes.json with `specs`, kpop and anime given
   by the planted server, the lane's gate-checks.sh. Result: `network-links` and `leak` fail on the dead hub (as
   designed), and `lane-specs` fails with `Error: Project(s) "e2e/o1/Q0a/hub-home.o1.ts" not found. Available
   projects: "leak", "dev-multi", "lanes"`. Confirmed with `--list` (no test run), Playwright 1.63.0: `--project lanes
   <file>` fails the same way; `<file> --project lanes` and `--project=lanes <file>` list the test. The same parse
   hits `do_leak leak-content leak/content-leak.o1.ts` (`Project(s) "leak/content-leak.o1.ts" not found`); `--project
   leak --grep-invert ...` of phase A is fine (19 tests in 6 files). Major M1. With the order fixed, the stand-in
   spec skips on the missing hub URL and Playwright exits 0: `lane-specs` would then be green for a dead server,
   masked today because `leak` fails in the same gate (folded into M1's fix).
5. Request 2 as now worded, under D-025 (`scratchpad/attack-keep-offline.mjs`): facts of a gate where parity ran
   offline with `--keep` and gate-checks.sh found kept.json in the stand-in KPQ. The plan runs `kpop-indexability`
   (env parity), the three other kpop SEO checks, `kpop-refused-writes`, and skips `leak-content` with the reason "the
   kept parity build (production data ...)". kept.json (parity.sh line 312) records no mode, so an offline kept build
   is graded as production: the four SEO checks fail by construction (the plan's own `kpopGate` text says so).
   Fail-closed, but it would turn every kpop gate red for a harness reason. Minor m1.

## Findings

### Major

- M1. `scripts/o1/gate-checks.sh:189` (`do_leak`, the line rewritten in 66234d7) and `:213` (`do_specs`, from
  5fb174e). Both call `playwright test -c playwright.o1.config.ts --project <name> <files...>`. Playwright 1.63's
  `--project` takes several names, so every file filter after it is read as a project name and the run stops with
  `Project(s) "<file>" not found`. So `leak-content` (phase B: the kept parity build plus a dev kpop gate build,
  requests 2 and 11) and `lane-specs` (any lane whose lanes.json entry lists `specs`) fail on every run, whatever the
  code under test. Proof: attack 4 (the stand-in gate run and the four `--list` runs). Neither path is reachable
  today (no lane lists specs; requests 2 and 11 not applied), which is why the self-tests never met it
  (`lane-spec-missing` fails before Playwright starts, and gate-selftest never reaches phase B). But both are
  deliverable 2 of the brief, the report lists them done (slice 3, the Gate checks table, D21, D26), and the first
  Wave 1 lane that lists a spec would go red on a harness defect after Q0a has merged. Fix: put the file filters
  before `--project`, or write `--project=<name>`; give `do_specs` the `sites_line` and `down_note` of D59 so its line
  never stands for a server that did not start (the stand-in spec skips and exits 0 once the parse is fixed); add a
  gate-selftest scenario with a present lane spec on a stand-in worktree (expected `lane-specs` 0, and failing with a
  dead server), and a check of the exact `leak-content` argument vector (a `--list` run of it in a test, or a phase B
  scenario).

### Minor

- m1. `docs/o1/requests/Q0a.md`, item 2, the note added in ee4f7c2 ("call gate-checks.sh with the same `O1_KPQ` ...,
  the stand-in KPQ while `docs/o1/PARITY-OFFLINE` exists"). Applied as written during D-025, `--keep` keeps an offline
  build in the stand-in KPQ, kept.json carries no mode, and `gate-plan.mjs` (lines 94, 120, 159 to 162) grades it as
  production: four kpop SEO lines fail by construction and leak-content's reason says "production data" (attack 5).
  Fix: say in request 2 that `--keep` waits for the end of D-025 (Q0c's first production run), or let parity.sh write
  the mode in kept.json and the plan keep the kpop SEO lines pending (and the kpop leak half running) on an offline
  kept build. The second also gives F0's next gates the kpop half of the leak suite offline, which today stays
  pending.
- m2. `docs/o1/reports/Q0a.md` Open points (the m3 item) and D60. "It goes in with the next parity harness change":
  since D-028 and D-033 that change is Q0c's (ownership of parity.sh and `scripts/o1/parity/**` moves to Q0c), and
  Q0c's brief does not carry it: its proxy refuses non-reads to the Supabase origin only, while m3 is about a non-GET
  to any other origin during the parity builds and servers. Fix: a request to ORCH to add strict mode for the parity
  builds and servers (`O1_FREEZE_STRICT=1` in `run_env`, with its `--run-env-internal` test) to Q0c's brief, and name
  Q0c in the Open point.
- m3. `docs/o1/reports/Q0a.md:62` ("Unit tests (two new, two extended)"). The diff of `gate-plan.test.mjs` has two
  hunks: one extends the "parity ran without --keep" test, the other only adds the two new tests. One extended.

## Notes for ORCH (not findings against the builder)

- N1 (outside the round's diff, `gate-plan.mjs:121`, unchanged since r1; attack 1, 9,216 combinations): when parity
  ran, no kept build exists and gate.sh built a kpop gate build (request 11 applied without request 2), the four kpop
  SEO lines are `skip` with the reason "the diff cannot reach the kpop build (gate.sh ran no parity)", which is false
  there; they should be `pending` with `kpopNoKeep`. Not a failure either way; fix it with request 11 (or in M1's
  slice, since the file is open).
- Do not add `specs` to any lane's lanes.json entry, and do not apply requests 2 and 11 together, before M1 is fixed.
- summary.json shows `site-checks` as one rc. Once gate-checks.sh is in O1, pending lines such as `kpop-leak` are
  visible only in `site-checks.log` (its last line counts them) and `checks/checks.tsv`; copying the pending names
  into summary.json would keep them in front of every reader.
- F0's next gate after Q0a merges: parity runs offline without `--keep`, so `kpop-leak` and `kpop-network-links` are
  pending, honestly recorded now; the kpop half of the leak suite does not run on F0, the lane most able to leak into
  kpopquiz.org, until m1's second option or the end of D-025. Parity's 60 URLs still judge kpop. ORCH's call.
- The fix slice starts with the merge of o1/integration (284b52a): it brings main's PR #102 (`lib/route-allowlist.ts`,
  the middleware, unknown URLs as a real 404, `next.config.ts`) and the hardened gate.sh. The route leak fallback
  reads `lib/route-allowlist.ts` and urls.txt holds one unknown path, so the harness tests and both self-tests are
  worth re-running on the merged tree.
- Unit: D-032 works on this machine as it stands (two green runs of the gate's command while the default command lost
  one base test to the 5 s timeout).

## Verdict

FIX. The answer to r1 M1 is right and complete: across every combination of gate facts no site of the lane is left
unread and unnamed, a planned server that does not start now fails the checks that were to read it, and the self-test
compares the pending set exactly; m1 and m2 are fixed, and m3's deferral is reasoned. tsc, the unit tests (gate
command), the 102 harness tests and both self-tests are green. One major remains, small to fix and found on a path no
test reaches: `leak-content` and `lane-specs` pass their file filters after `--project`, so Playwright 1.63 reads them
as project names and both checks can never pass (M1). Round 3 reviews only the diff since 7e0451b plus the answers
to M1 and m1 to m3.
