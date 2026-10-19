# Review Q0a round 3, profile ARCH

| field | value |
|---|---|
| lane | Q0a (parity and leak harness) |
| round | 3 (the diff `7e0451b..5e535a8` plus the answers to r2 M1, m1, m2, m3 and note N1) |
| profile | ARCH |
| reviewer | R (fresh instance) |
| reviewed sha | 5e535a8fa284be232bfce42e44ddde729918d208 (5e535a8) |
| tree | 635d0994351db4e46735fd68de1cd02b94406517 |
| branch / worktree | o1/Q0a, `.claude/worktrees/o1-Q0a` |
| gate base | 284b52a23b0ca68193c4a4371956509e4ac44c95 (tip of o1/integration, equal to the merge base: `HEAD..o1/integration` is empty) |
| evidence folder | `docs/o1/evidence/Q0a/5e535a8fa284be232bfce42e44ddde729918d208/` (on disk, not committed yet) |
| date | 2026-10-18 (review 17:39 to 18:05 UTC) |
| verdict | PASS (2 minor) |

## Reviewability gate

- HEAD of the worktree is 5e535a8fa284be232bfce42e44ddde729918d208, the sha I was given. `git status --porcelain`
  printed nothing at the start and nothing after all my runs (tsc, vitest, node --test, both self-tests, twins.mts;
  every other run used copies in the scratchpad).
- What changed since 7e0451b: the checkpoint merge f93238f of o1/integration 284b52a (main's PR #102, ORCH's hardened
  gate.sh and docs), one code commit 0ed07a9 and the report commit 5e535a8. The lane's own files since the merge: 7
  (`gate-plan.mjs`, `gate-plan.test.mjs`, `gate-argv.test.mjs` new, `gate-checks.sh`, `leak/gate-selftest.sh`, the
  report, the requests file).

## Checks (items of REVIEWER.md that apply)

1. Scope: PASS.
   - Evidence `guard.log`: `Q0a ok (103 range 284b52a..5e535a8)`, 6 merge commits covered by the net diff. My own
     guard run on the same range: same output, exit 0; on the lane's commits only (`f93238f..5e535a8`): `Q0a ok (7
     ...)`. `hot.log` clean (320 hot files); my grep of the 7 lane files against `HOT.txt`: 0 hits.
2. Contract: PASS. No contract file in the diff; the plan still reads lanes.json and twins.json as before; nothing
   frozen changed. twins.mts unchanged.
3. Evidence: PASS.
   - `summary.json`: madeBy `scripts/o1/gate.sh`, sha 5e535a8, tree 635d0994 (equal to `git rev-parse HEAD^{tree}`),
     base 284b52a, green true, every step rc 0: guard, hot, copy, secrets, twins, tsc (38 s), unit (15 s: 125 files,
     2321 tests, D-032's `--testTimeout=30000`), build-kpop, build-anime, build-hub; parity `skipped`, site-checks
     `pending` (gate-checks.sh is not in O1 yet). twins is rc 0 with the log "twins: pending (... arrives with Q0a)":
     check.sh's documented behaviour (Notes).
   - `changed.txt` (102 paths) equals my `git diff --name-only 284b52a 5e535a8`.
   - My tsc (`./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false`): exit 0, 36 s.
   - My vitest with the gate's command (`vitest run --testTimeout=30000`): 125 files, 2321 tests, exit 0 (15 s).
   - Harness tests (outside vitest): `node --test --test-timeout=60000 scripts/o1/parity/*.test.mjs
     apps/quiz/scripts/o1/q0a/*.test.mjs apps/quiz/scripts/o1/*.test.mjs`: 110 of 110 pass (102 at r2, plus 3 in
     gate-plan.test.mjs and 5 in the new gate-argv.test.mjs).
4. kpopquiz.org unchanged: PASS. `changed.txt` has 0 paths outside gate.sh's neutral regex (my grep with the exact
   regex of gate.sh line 34), so parity was correctly not needed (`parity.log`); parity is offline anyway (D-025).
   The parity harness is unchanged: hash recomputed on this head with parity.sh's own file list (parity.sh,
   flag-off-diff.mjs, non-test `parity/*.mjs`): cb12ed53, so runs 9 and 10 still prove the harness that merges.
5. Leaks (the lane's surfaces are the leak suite and the gate plan):
   - `scripts/o1/leak/selftest.sh --ports 3106,3107,3108` on the merged tree (mine, 240 s): 20 suite and 5 command
     line scenarios as expected, `VERDICT: every leak test fails on its planted leak and passes on the clean pages`.
     It matters this round: the route leak fallback reads `lib/route-allowlist.ts`, which PR #102 changed. The suite,
     its helpers, its config and check-network-links are unchanged since 7e0451b (`git diff` empty).
   - `scripts/o1/leak/gate-selftest.sh --ports 3106,3107,3108` (mine, 192 s): 12 of 12 scenarios as expected, failing
     and pending sets exact, the named log lines present, `VERDICT: gate-checks.sh fails exactly on the planted
     failures and writes one log per check`. The three new scenarios: `lane-spec-present` (`sites read: kpop anime
     hub`, `3 passed`, rc 0), `lane-spec-server-down` (`planned but not started: hub`, then `FAILED: not read`, rc 1),
     `lane-spec-no-kpop-parity-ran` (`sites read: anime hub`, `kpop-lane-specs` pending with request 2 named).
   - twins.mts of the lane (the judge of every gate once merged), read only: on this tree and on F0's head 8ab0d07
     with F0's `twins.json`: `38 base pairs within their recorded size`, `twins: ok`, exit 0 both, after PR #102.
   - Ports 3106 to 3108 free again after each run.
6. SQL: N/A.
7. Security: PASS. `secrets.log` clean. The diff handles no env value. No production server can reach a lane spec or
   the content leak in any plan (attack 1); my phase B stand-in ran with parity.sh stubbed, so the real one never ran.
8. Content: N/A. 9. UX: N/A (no screen). 10. SEO: N/A (no page).
11. Copy: `copy.log` empty. My perl check of the 514 added lines of the lane since the merge for U+2013, U+2014 and
    emoji: 0.
12. The report tells the truth: yes, claim by claim (attacks 4 to 6), with one count wrong (minor m2).

### The answers to round 2

| r2 finding | Answer | My check | Result |
|---|---|---|---|
| M1 | Every Playwright vector built once in the plan (`pwArgs`: files first, `--project=<name>` last); gate-checks.sh runs only that vector; gate-argv.test.mjs lists each with the installed Playwright, r2 vector as control; lane specs get `sites`, `sites read`, `down_note`, and `<site>-lane-specs` lines; leak-content reads its own line; three self-test scenarios | attacks 1, 3, 4, 5; both self-tests re-run | fixed: no vector puts a filter after `--project`, every listed vector lists the right files and project, lane specs never stand for a server that did not start or a site they were not given, phase B works end to end |
| m1 | Request 2 gets a "When" line: only after `docs/o1/PARITY-OFFLINE` is removed (D-025, D-028), and not with request 11 before this slice is in O1; option (b) moved to request 27 | requests file against LEDGER D-025, D-028, D-033 | fixed, and consistent with the ledger |
| m2 | Request 27 (a) asks ORCH to put strict mode for the parity builds and servers into Q0c's brief, with its test and Q0c's own determinism pair; D60 and the Open point name Q0c | Q0c's brief has no strict mode line yet (grep), so the request is the right carrier | fixed |
| m3 | "two new, one extended" | diff of r1's test hunks | fixed (but see m2 below for this round's count) |
| N1 | Kpop SEO lines pending (request 2's reason) when parity ran and the kpop server is a gate build, or a given gate server over a kept build | attack 1: "kpop SEO skip although parity ran" broken 0 times on head, 331,776 times on 7e0451b | fixed |

## Attack attempts

1. Fail-open search of the new plan (`scratchpad/r3/attack-plan-r3.mjs`, importing the lane's `gate-plan.mjs` read
   only). Every combination of lane sites (8 subsets, the empty one included), parity none or ran, kept or not, a
   build per site (8), a given server per site (8), the given kpop source, anime and hub wired true, false or
   unknown, required or not, specs none, one or missing, offline or dev: 663,552 plans. Invariants: unique check
   names; every running leak, leak-content and lane-specs line has a `pw` whose last token is `--project=<leak|lanes>`,
   no other `--project`, the config after `-c`; leak-content's files are exactly the content leak, leak has none and
   carries `--grep-invert` exactly when kpop is the kept parity build; lane-specs' files are the listed specs; every
   site a check reads has a server in its phase, and neither leak-content nor lane-specs ever reads a production
   server; leak-content runs only in phase B; a kpop SEO line is never skipped when parity ran; for lane specs, every
   site of the lane is either read by `lane-specs` or has its own `<site>-lane-specs` line, never both, pending only
   for kpop with parity ran, skipped only for a production server. Head: none broken (the only skip with no parity is
   the person's override `O1_GATE_KPOP_SOURCE=parity`, 9,216 plans, as D64 says). Control, the same script on
   7e0451b's plan: `pw` missing on 512,352 leak, 27,648 leak-content and 221,184 lane-specs lines, kpop unaccounted
   for by the lane specs in 55,296, the N1 skip in 331,776. The search sees the r2 defects and the fix removes them.
2. A path the builder did not test: lane spec names that are not plain regex text (`scratchpad/r3/attack-regex.mjs`:
   a stand-in apps/quiz with the head's config, the lane's own `laneSpecs()` reading a lanes.json, the plan's vector,
   `playwright test --list`). Playwright 1.63 builds each CLI file filter with `new RegExp(arg, 'gi')`, unanchored,
   and runs a file when any filter matches (`createFiltersFromArguments`, `lib/common/index.js:2088`). Results:
   `[a.o1.ts]` runs `X/a.o1.ts`; `[a+b.o1.ts]` alone: exit 1, no test found (loud); `[a.o1.ts, a+b.o1.ts]`: exit 0,
   only `X/a.o1.ts` ran; `[a.o1.ts, [site]-home.o1.ts, home(1).o1.ts]`: exit 0, only `X/a.o1.ts` ran; `[b.o1.ts]`
   also ran an unlisted `X/B.o1.ts.o1.ts`. `laneSpecs()` accepts all of these names (the file exists and ends in
   `.o1.ts`), and the plan line says it ran them. Minor m1.
3. A path no self-test reaches: phase B end to end (`scratchpad/r3/phaseb.sh`). A scratch copy of the head's harness
   (`git archive HEAD`) with `scripts/o1/parity.sh` replaced by a stub (`--serve-kept` starts the planted kpop pages)
   and the four kpop SEO scripts stubbed, so nothing real of parity runs and nothing leaves 127.0.0.1; a stand-in
   worktree with `.next-kpop/BUILD_ID` and a `next` stub that serves the planted kpop pages; a kept.json of its head
   in a stand-in KPQ; parity.json in the evidence folder; anime and hub given. The plan gives A.kpop the kept parity
   build and B.kpop the gate build, as designed. Up: `leak` (phase A, `--grep-invert content-leak\.o1\.ts`, 18
   passed, 1 skipped), then the kept server killed and the gate build started on the same port, then
   `leak-content` (`sites read: kpop anime hub`, the content leak file only, its 10 cases skipped with their
   reasons) and `lane-specs` (`sites read: kpop anime hub`, `3 passed`), exit 0. Down (the `next` stub exits at
   once): `server kpop: did not start`, `leak-content` and `lane-specs` both `sites read: anime hub; planned but not
   started: kpop` then `FAILED: not read`, exit 1. Phase B is right in both directions.
4. Claim check by mutation (`scratchpad/r3/mut`, a complete copy of the head's apps/quiz e2e, scripts and src, the
   lane's gate-argv.test.mjs run against mutants of `pwArgs`): unmutated 5 of 5; the r2 order planted 3 of 5, the
   two red being exactly the leak-content and lane-specs vectors (as D63 and the report say); `--grep-invert`
   dropped: killed (the kept-build test red). Keeping the `apps/quiz/` prefix on spec paths survives gate-argv
   (the unanchored regex still matches the absolute path) but is pinned by gate-plan.test.mjs: an equivalent mutant.
5. Claim check of the self-test's plant proof: HEAD's gate-selftest.sh on a git copy of 7e0451b
   (`scratchpad/r3/r2copy`, node_modules linked, the r2 gate-checks.sh confirmed by diff). Exit 1, VERDICT MISMATCH:
   the nine older scenarios ok, the three new ones FAIL, each lane-specs log holding `Error: Project(s)
   "e2e/o1/Q0a/home.o1.ts" not found`. `lane-spec-server-down` has the same failing set on r2 and is caught only by
   its log lines: the new log-line check earns its place.
6. Claims of the report against the diff and the files: harness cb12ed53 (recomputed); no file of the parity
   harness, leak suite, helpers, config, check-network-links, twins.mts, selftest.sh, planted-server.mjs or
   dev-multi.sh changed since 7e0451b (`git diff --stat` empty); 110 harness tests, 12 of 12 and 25 of 25
   (reproduced); requests 2 and 27 consistent with D-025, D-028 and D-033; D63 to D67 match the code. One count is
   off: three tests were added to gate-plan.test.mjs (13 at 7e0451b, 16 now, no line removed), the report says two
   in one place (minor m2).

## Findings

### Major

None.

### Minor

- m1. `apps/quiz/scripts/o1/q0a/gate-plan.mjs:214-217` (`files`, `pwArgs('lanes', { files })`) with `laneSpecs()` at
  `:254-264`. Each lane spec path goes to Playwright as a file filter, which Playwright 1.63 reads as an unanchored,
  case-insensitive regex, OR'd across filters. A listed spec whose name holds a regex character (`+ ( ) [ ] ? * ^ $
  | { }`, for example a route-shaped `sites-[site]-home.o1.ts`) is not run; when another listed spec matches, the
  run exits 0 and `lane-specs` is green for a spec it never ran (alone, it fails as "No tests found"). A `.` also
  lets a filter match an unlisted file. Proof: attack 2. Not reachable today (no lane lists specs; ORCH writes
  lanes.json) and no e2e spec of the repo uses such a name, but this repo's paths use `[slug]` and `(site)` widely,
  and the gate-argv test title claims "exactly the listed specs". Fix (any one): pass each spec as an escaped and
  end-anchored pattern (Playwright accepts the `/.../` form); or let `laneSpecs()` put a name outside
  `[A-Za-z0-9._/-]` in `missing`, so it fails the line loudly; or compare the files of `lane-specs.json` with the
  listed specs after the run and fail on any difference. Add the `a+b` case to gate-argv.test.mjs.
- m2. `docs/o1/reports/Q0a.md`, "Done in slice 15", second bullet: "`gate-plan.test.mjs` (two tests added, none
  changed)". Three tests were added (two for M1, one for N1); "Tested how" of the same slice says 3, which is right.

## Notes for ORCH (not findings against the builder)

- Until m1 is fixed, keep the names in lanes.json `specs` to letters, digits, `.`, `_`, `/` and `-`.
- gate-checks.sh has still never served a real `.next-<site>` build or a kept parity build: the gate records
  `site-checks` as pending until it is in O1. F0's first gate after Q0a merges is the first real run; the report
  agrees a gate-checks failure there is Q0a's harness defect, not F0's. Phase B is now proven on stand-ins (attack 3),
  but only by this review: the lane's self-test cannot reach it without a kept build.
- summary.json shows `twins` rc 0 while `twins.log` says "pending (twins.mts arrives with Q0a)" (check.sh exits 0 by
  design). Once Q0a merges, twins.mts runs on every gate; my run of it on this tree and on F0's head is `ok`.
- The lane specs, the kpop SEO lines and the kpop halves of the leak suite and of check-network-links stay pending on
  every gate whose diff reaches kpop until request 2 (after D-025) or request 27 (b); parity's 60 URLs still judge
  kpop meanwhile. Request 27 (a) needs a line in Q0c's brief before Q0c starts.
- The evidence folder of this sha is on disk and not committed yet; the folder of 7e0451b has uncommitted files too.

## Verdict

PASS. The answer to r2 M1 is right and complete: every Playwright vector is data in the plan with the file filters
first, a unit test lists each one with the installed Playwright and fails on the r2 order, lane specs read only the
servers they are given and name every site they did not read, and phase B works end to end in both directions. m1,
m2, m3 and N1 are answered as asked. tsc, the unit tests (gate command, 125 files, 2321 tests), the 110 harness
tests, the gate self-test (12 of 12) and the leak self-test on the merged tree (25 of 25) are green, and the evidence
matches the sha and tree. Two minor findings go to the report: spec names with regex characters can be dropped
silently (m1), and one test count (m2).
