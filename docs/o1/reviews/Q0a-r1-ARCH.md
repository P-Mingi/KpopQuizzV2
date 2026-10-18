# Review Q0a round 1, profile ARCH

| field | value |
|---|---|
| lane | Q0a (parity and leak harness) |
| round | 1 (first review of the lane: the whole diff `o1/integration...c5131aa`, 101 files) |
| profile | ARCH |
| reviewer | R (fresh instance) |
| reviewed sha | c5131aa813db1e92d5cf2aae4089a5ef98e56d49 (c5131aa) |
| tree | 9dc2ccaa30bfc90240ee1a5533d966cb6bd1daa5 |
| branch / worktree | o1/Q0a, `.claude/worktrees/o1-Q0a` (`git config o1.agent` = Q0a) |
| base | a62d67387e8be74eeadb80a80006fbeda53c76b4 (tip of o1/integration, equal to the merge base: 33 commits ahead, 0 behind, no drift) |
| evidence folder | `docs/o1/evidence/Q0a/c5131aa813db1e92d5cf2aae4089a5ef98e56d49/` |
| date | 2026-10-18 (review 03:44 to 04:05 UTC) |
| verdict | FIX (1 major, 3 minor) |

## Reviewability gate

- HEAD of the worktree is c5131aa813db1e92d5cf2aae4089a5ef98e56d49, the sha I was given. `git status --porcelain`
  printed nothing at the start and nothing after all my runs (tsc, vitest twice, node --test, three self-tests, the
  twins run on F0). No tracked symlink (`git ls-files -s | grep -c ^120000` = 0).
- The checkpoint merge of tick 5 is in: o1/integration (a62d673) is an ancestor, `HEAD..o1/integration` is empty.

## Checks (items of REVIEWER.md that apply)

1. Scope: PASS.
   - Evidence `guard.log`: `Q0a ok (102 range a62d673..c5131aa)`, 4 merge commits covered by the net diff. `hot.log`:
     clean (328 hot files).
   - My own guard run (`node O1/scripts/o1-owner-guard.mjs --agent Q0a --range a62d673..c5131aa --ownership
     O1/docs/o1/OWNERSHIP.json` from the worktree): same output, exit 0.
   - Every path of the diff is in Q0a's OWNERSHIP entry (scripts/o1/parity.sh, parity/**, gate-checks.sh,
     dev-multi.sh, leak/**, apps/quiz/scripts/o1/*.{mts,mjs,ts} and q0a/**, e2e/o1/{parity,leak,helpers,dev-multi}/**,
     playwright.o1.config.ts) or is the lane's report and requests file. `flag-off-diff.mjs` (not Q0a's) is untouched:
     it is wrapped by parity.sh and compare.mjs, never edited.
2. Contract: PASS.
   - CR-010 (N5) is implemented exactly as ruled, narrower if anything: `compare.mjs:231` removes only the exact
     `<!-- -->` when `</` and a letter follow it, outside script, style, textarea, title, xmp, iframe, noembed,
     noframes; applied last and only to a page N1 to N4 leave DIFFERENT (`compare.mjs:333-342`); named in result.json
     only when it decides the verdict. Every other separator, element, attribute and text stays compared (my attack 1
     below). Rules version `q0a-g0-v3`, written in parity.sh's header.
   - CR-008 (N3, N4) and CR-009 (stylesheet contents) are present with tests (the 31 tests of `compare.test.mjs`
     cover each rule and its plants). N1 and N2 of G0 as the brief says (both stylesheets fetched, `#fff` to
     `var(--ux-on-accent)` only). Nothing else is normalised.
   - The 60-URL list (`apps/quiz/e2e/o1/parity/urls.txt`): 60 lines, home, group hubs, 12 real `/q/` slugs, blind
     test, PT pages, fr, es and id landings, trust pages, sitemap.xml, robots.txt, llms.txt, one unknown path.
   - Production flags written in parity.sh's header from the repo (v12 launch report, PR #97): UX_V1, UX_V12 and
     BT_TRACKING, every O1 flag unset.
   - twins.mts reads F0's contract as written. My run of the lane's twins.mts on F0's head (8ab0d07, read only) with
     F0's `docs/o1/contracts/twins.json`: `56 rows ... 38 base pairs within their recorded size`, `twins: ok`, so the
     merge does not turn F0's next gate red on this step by itself.
   - No frozen item changed; no contract file in the diff.
3. Evidence: PASS.
   - `summary.json`: madeBy `scripts/o1/gate.sh`, sha c5131aa, tree 9dc2cca (equal to `git rev-parse HEAD^{tree}`),
     base a62d673, green true, every step rc 0 (tsc 59 s, unit 23 s: 124 files, 2269 tests), parity `skipped`,
     site-checks `pending` (gate-checks.sh is not in O1 yet), twins `pending` (twins.mts is not in O1 yet).
   - My tsc (`./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false` in apps/quiz): exit 0, 51 s.
   - My vitest (`./node_modules/.bin/vitest run`): first run under load average 20 to 40 and 15 GB of swap: 13 tests
     of 8 files failed by the 5 s timeout (base tests; the diff has no file under apps/quiz/src, vitest.config.ts,
     package.json, tsconfig.json or packages: `git diff --name-only` empty). Second run: 124 files, 2269 tests pass,
     exit 0. Agrees with the gate and with the lane's D56 and request 25 (paging, not Q0a).
   - The harness tests are outside the gate's unit step (vitest collects `src/**` only), so I ran them:
     `node --test scripts/o1/parity/*.test.mjs apps/quiz/scripts/o1/q0a/*.test.mjs apps/quiz/scripts/o1/*.test.mjs`:
     100 of 100 pass. After the merge, gate-checks.sh runs them on every gate (check `harness-unit`).
4. kpopquiz.org unchanged: PASS. `changed.txt` (101 paths) has no path outside the neutral regex of gate.sh (my grep:
   0 hits), so parity was correctly not needed; no file of apps/quiz/src or packages changed.
5. Leaks (the lane's own surfaces are the leak suite): PASS on stand-ins, with the major below.
   - `scripts/o1/leak/selftest.sh --ports 3106,3107,3108` (mine, 263 s): 20 suite scenarios and 5 command line
     scenarios, every one as expected, `VERDICT: every leak test fails on its planted leak and passes on the clean
     pages`.
   - `scripts/o1/leak/gate-selftest.sh` (mine, 182 s): 7 of 7 scenarios as expected, one log per check.
   - `scripts/o1/leak/dev-multi-selftest.sh` (mine, 23 s): `none pass`, `cookie-domain fail`, `ok`.
   - Ports 3106 to 3108 free again after each run; no server left.
6. SQL: N/A (no SQL file in the diff).
7. Security: PASS with one minor.
   - `secrets.log`: clean. No key, token or env value in the diff; parity.sh sources `kpop-parity.env` in a subshell
     and never prints it.
   - Write guard (`freeze-hook.mjs`): a non-GET to the Supabase target, an RPC whose definitions are not all read
     only (`rpc-verdict.mjs`, refusing `unknown` too), and any non-GET on auth, storage, realtime, functions, graphql
     are refused before leaving the machine; refused writes fail the run unless the base build made the same one.
     Offline evidence of runs 9 and 10: the only refusal is `ensure_daily_debate` in both builds (listed, not
     failing), `liveReads 0`.
   - GET write audit re-run (`node apps/quiz/scripts/o1/q0a/get-write-audit.mjs`): `all 60 URLs: no unreviewed write
     reachable from the server render`, exit 0.
   - Minor m3 below (strict mode not used while parity builds and serves).
   - Open point of the report (the freeze store under `KPQ/cache/parity/`): acceptable. `~/kpq-o1` is mode 700, so
     the 755 folders below it are not readable by another account; the store is removed with its run unless
     `--keep`.
8. Content: N/A.
9. UX: N/A (no screen). Rule 18 enters through twins.mts (attack 2).
10. SEO: N/A for this lane's diff (no page). The per-site SEO choice of gate-checks.sh is documented in its header
    and in `gate-plan.mjs`; the kpop half has the major below.
11. Copy: `copy.log` empty (added lines clean). My grep of the whole diff for U+2013 and U+2014: 0. No emoji.
12. The report tells the truth: mostly yes, verified claim by claim (attack 3). One overstatement (minor m2).

## Attack attempts

1. Planted bad inputs against N5 (`scratchpad/attack-n5.mjs`, importing the lane's `compare.mjs` read only, through
   `judge()` with flag-off-diff's DIFFERENT verdict). 12 cases, 12 as expected:
   a separator planted between two texts with N3 also needed: DIFFERENT; a removable separator plus a Flight row text
   change on a renumbered build: DIFFERENT; a separator before a closing tag plus a one letter text change next to it:
   DIFFERENT; a separator moved across an element boundary: DIFFERENT (conservative); a separator inside an SVG
   `<title>` (a comment there, kept by the raw text skip): DIFFERENT (conservative, never a hidden change); separator
   like text inside an ld+json script: DIFFERENT; an attribute change next to a removable separator: DIFFERENT; an
   upper case `TEXTAREA` holding the separator on one side: DIFFERENT; two separators in a row against none:
   DIFFERENT; a separator before `</noscript>`, before `</span>` in a hidden Suspense segment, and next to an
   unclosed `<style>`: IDENTICAL by `text-separators` only, and in each of those the visible text is equal.
   Then mutation testing of the rule (copies in the scratchpad, the lane's 31 tests run against each): any separator
   anywhere (2 tests fail), no raw text skip (1), any comment before a closing tag (1), N5 removed (4), `</` without
   the letter (1). Every mutant is killed; the four counts the report gives (D54) are the ones I measured. Result:
   N5 cannot hide a visible change; the planted separator between two texts still counts.
2. A path the builder did not test, twins.mts copy detection (`scratchpad/attack-twins.mjs`, temp fixture tree,
   lane's `main()`): the PinnedRow and UxRow functions of `components/ux-v1/panel.tsx`, renamed and stripped of
   comments, pasted into an anime page as written: 18 meaningful lines, exit 1, `copy` (control). The same block with
   its line breaks moved (every two lines joined, no token added or removed): 14 meaningful lines, exit 0, no
   violation. The report's Open points disclose this limit ("a reformat that rewraps lines"); the script header,
   which the gate's readers see, does not (minor m1).
3. Claims of the report checked against the diff and the files:
   - "harness cb12ed53" for runs 9 and 10: I recomputed parity.sh's harness hash on this head (parity.sh,
     flag-off-diff.mjs and the non-test `parity/*.mjs`): `cb12ed53`. The determinism proof was made by exactly the
     harness under review. Both `result.txt` hash to 9d8ee00c98376f56...; run 10 `determinism.txt`: "deterministic";
     both `identical: true`, `liveReads 0`. Run times 02:02 and 02:12 UTC, outside the cron window.
   - "runs 7 and 8 re-judged with q0a-g0-v3: the same rows": `diff` of the verdict lines of
     `run7-string-plant/result.txt` against `rejudged-n5/run7-result.txt`, and of run 8: identical. Run 6 re-judged:
     60 of 60 IDENTICAL.
   - "100 of 100 harness tests", "no file under apps/quiz/src", "production reads: none" (every committed
     `parity.json` has `liveReads 0`), "Each of four wrong rules fails at least one test": all confirmed.
   - "gate-checks.sh writes one log per check" on stand-ins: confirmed (gate-selftest). On real builds: not run
     anywhere (minor m2 and the ORCH note).
4. Fail-open probe of the gate plan (`scratchpad/attack-plan.mjs`, `plan()` of `gate-plan.mjs`): facts of a lane
   whose diff reaches kpop under today's gate.sh (parity ran without `--keep`, no kpop gate build; anime and hub
   built and wired). Output: servers `kpop: null`; the four kpop SEO checks `pending` with their reason (good); then
   `network-links run` and `leak run require=["anime","hub"]`, with no line at all for kpop. Every kpop test of the
   suite skips itself when its site is absent and not required (`string-leak.o1.ts:20` and the same line in
   canonical-og, link-leak, no-netme), and `require` never contains kpop (`gate-plan.mjs:133`). So checks.tsv records
   `leak 0` and `network-links 0` while the kpop half never ran: major M1.

## Findings

### Major

- M1. `apps/quiz/scripts/o1/q0a/gate-plan.mjs:84-87, 128-133` (and `scripts/o1/gate-checks.sh` `do_leak`,
  `do_links`). When a lane's sites include kpop and no kpop server exists (parity ran without `--keep` and gate.sh
  built no kpop: today every lane whose diff reaches kpop, because requests 2 and 11 are not applied), the kpop half
  of the leak suite (string leak mirror, canonical and OG on kpop, link leak on kpop, no `/api/n/me` on kpop) and
  check-network-links on kpop are skipped inside checks that are recorded `0`. Proof: attack 4 output above; the
  gate-selftest scenario `no-hub-server` shows the same mechanism (only `hub-metadata-dupes` fails; the hub tests of
  `leak` skip). For anime and hub a missing server still turns the gate red through `<site>-metadata-dupes`; for kpop
  the SEO lines are `pending`, so the gate stays green and the evidence says the leak and link checks passed. The
  lanes concerned are exactly the ones that can leak into kpopquiz.org (F0 next, then B1, B6). Parity on the 60 URLs
  covers part of it (any change there is DIFFERENT), but not the sitemap pages the suite adds, and the evidence must
  not say a check ran when it did not. Fix: when a site of the lane has no server, record its part of `leak` and
  `network-links` as `pending` with the reason (request 2 or 11), for example a `kpop-leak` line, instead of folding
  it into a green check; add the case to `gate-plan.test.mjs` and a gate-selftest scenario (kpop server absent with
  `parity ran`: leak not reported `0` for kpop).

### Minor

- m1. `apps/quiz/scripts/o1/twins.mts:47-54`. The header says a copied block of 8 meaningful lines fails "renamed
  locals and reformatted comments included" and names only one limit ("an edit inside every 8 meaningful lines").
  A copy whose line breaks are moved passes (attack 2: 14 meaningful lines of panel.tsx, exit 0). Write that limit
  in the header next to the other one (the report already states it), or compare shingles of normalized tokens
  across line breaks in a later version. UX and ARCH reviewers must keep reading imports and markup themselves.
- m2. `docs/o1/reports/Q0a.md:13-15`. "every item of the done test is green offline" while the gate-checks item is
  green on stand-ins only (the table row at line 38 says so, and Open points say the link folder serving and
  `--serve-kept` are "proven only by a real gate run"). No test or run has ever started `next start` from a folder of
  links on a real `.next-<site>` build, and D37 found that the same folder of links method serves 404 on every path
  under `next dev`. Say "green on stand-ins; real builds at the first gate after merge" in the Progress line.
- m3. `scripts/o1/parity.sh:91-101` (`run_env`). Strict mode (any non-GET to any non-local origin refused) is set
  only for `--serve-kept` and `--check-kept` (line 122). The parity builds and servers run with the production env
  and refuse only Supabase writes; `next build` prerenders every static page, not only the 60 audited URLs (the
  `ensure_daily_debate` refusal comes from a page outside the list). I found no current server-side non-GET to
  another origin reachable at build or on the list (the IndexNow route is force-dynamic and token guarded), so this
  is defence in depth: export `O1_FREEZE_STRICT=1` in `run_env` for the parity builds and servers too, unless a
  build is shown to need a non-GET.

## Notes for ORCH (not findings against the builder)

- gate-checks.sh has never served a real site build or a kept parity build: request 1 (run the lane's own
  gate-checks.sh in Q0a's gate) is not applied, so `site-checks` stays `pending` at c5131aa. With D-026 (Q0a merges
  first, F0's next gate waits on it), F0's gate will be the first real run. Either apply request 1 for one re-gate of
  Q0a's fix round, or agree beforehand that a gate-checks failure in F0's first gate is a harness defect for Q0a, not
  an F0 finding.
- When request 2 lands, gate.sh must pass to gate-checks.sh the same `O1_KPQ` it passes to parity.sh (the stand-in
  KPQ while `docs/o1/PARITY-OFFLINE` exists): gate-checks.sh reads `$KPQ/cache/parity/kept.json` and `parity.sh
  --serve-kept` sources `$KPQ/secrets/kpop-parity.env`. Today nothing is kept anywhere (`~/kpq-o1/cache/parity` does
  not exist), so no production read can happen through a stale kept build.
- The offline determinism proof (runs 9 and 10) ran with an unreachable Supabase: `frozenReads 0`, so the frozen
  data path (record in the base build, replay in the head) is proven by `freeze-hook.test.mjs` only. The first
  production parity run after the owner's answer to D-025 is the first end to end proof of it, and of the clock and
  relative time risks listed in the report's Open points.
- Unit step timeouts (request 25): reproduced once in my first vitest run under paging, green on the second. Base
  tests, nothing of Q0a.

## Verdict

FIX. N5 is correct, narrow and well tested (every mutant killed, 12 of 12 planted inputs judged right), the
determinism proof was made by the exact harness under review, and tsc, the unit tests, the 100 harness tests and the
three self-tests are green. One major remains, small to fix: the gate plan reports the kpop leak and link checks as
passed when no kpop server ran (M1). Round 2 reviews only the diff since c5131aa plus the answers to M1 and m1 to m3.
