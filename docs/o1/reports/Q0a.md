# Lane Q0a: the parity and leak harness

Brief: `O1/docs/o1/briefs/Q0a.md`. Worktree `ROOT/.claude/worktrees/o1-Q0a`, branch `o1/Q0a`, ports 3106 3107 3108.

## Progress

Slices: 8 (tick 4: slice 7 from 22:12 UTC on 2026-10-17, slice 8 from 23:55 UTC). Slice 7 started with the
checkpoint merge of o1/integration (CR-008, CR-009, D-024, D-025, `docs/o1/PARITY-OFFLINE`); slice 8's checkpoint
merge found nothing new (o1/integration d77a26f already merged). Status: blocked on request 24 (a normalisation, G0,
ORCH's ruling): every other item of the done test is green offline.

| # | Slice | State |
|---|---|---|
| 1 | URL list, GET write proof, G0 normalisations, frozen data source and write guard, parity.sh v2 | done |
| 2 | Leak suite (`apps/quiz/e2e/o1/leak/`, `playwright.o1.config.ts`), `check-network-links.mts` | done |
| 3 | `gate-checks.sh` (per-site check:* gates, leak suite, lane specs), parity.sh kept-build entries | done |
| 4 | `twins.mts` (rule 18, deliverable 5) with its self-test and base baseline; dev-multi feasibility probe | done |
| 5 | twins.mts on F0's real contract; `dev-multi.sh` (mirrors) and the cookie isolation test, with its plant proof | done |
| 6 | Offline parity rehearsal: two builds never compared equal (request 21) | done |
| 7 | N3, N4 (CR-008), css-content (CR-009), one build and serving path, offline proof runs | done |
| 8 | Request 23 fixed at its source (D52), harness version in the cache key (D53), offline proof runs 5 to 8 | done; determinism waits for request 24 |

Done in slice 8 (tick 4; section "Parity proof offline (slice 8)" below):
- Request 23 fixed at its source, no new rule (D52): the boundary that raced was Next's own metadata boundary of a
  page rendered at request time. parity.sh now records both sides (base, then head) with `replay.mjs` and one header,
  `RECORD_UA`, which Next 16 matches as an HTML-limited crawler, so that metadata renders blocking in the head; the
  two records answer as side A and side B. The four request-time pages of the list (/quizzes, /blindtest/group-bts,
  and the offline 404 and 500 pages) now carry no Suspense boundary at all; the 30 prerendered pages read the same
  bytes as before (109 of the 120 page files of run 5 equal run 2's, read with the old header; the others are the 4
  request-time pages on both sides, the home page's build date, and /pt's row order).
- parity.sh's cache key carries the harness version (D53; `harness` in parity.json).
- Offline proof runs 5 to 8 with the final harness (36ff658c), stand-in KPQ, no production read, evidence in
  `apps/quiz/e2e/o1/parity/offline-2026-10-18/run5-*` to `run8-*`:
  run 5 (quiet pair, `--keep`): identical, 60 of 60, result.txt byte-identical to slice 7's runs 1 and 2 (sha256
  632bc946...); run 6 (`--recheck` of that pair): 58 of 60, determinism.txt NOT deterministic: /fr/blind-test-kpop
  and /es/adivina-la-cancion-kpop by one React text separator `<!-- -->` each, swapped between the two pages by
  run 6's base build (request 24); run 7 (the string plant alone, 4c0992c): exactly /about DIFFERENT, by its string
  in the HTML node and in its Flight row, 59 identical; run 8 (the CSS plant alone, 90550f1): exactly the 32 pages
  that link stylesheets DIFFERENT, every one by css-content only (rule 720 of the first chunk sheet, `--txt1:#1a1714`
  against `#1a1715`), 28 identical. The request-time pages were identical in all four runs.
- Request 23 updated (fixed at its source, withdrawn unless a new case appears); request 24 new (N6 text-separators).

Left: request 24. Once ORCH rules (a), N6 goes into compare.mjs with tests, and one `--keep` run plus one `--recheck`
of the quiet pair close the determinism item (about 40 minutes, offline). If ORCH rules (b), the item stays as it is
and the report says which builds swap.

Tested how (slice 8):
- `node --test` of the harness tests (`scripts/o1/parity/*.test.mjs`, `apps/quiz/scripts/o1/q0a/*.test.mjs`,
  `apps/quiz/scripts/o1/*.test.mjs`): 96 of 96 pass (new: the record header is the one header of every read; the
  installed Next gives it blocking metadata and the html bot type, and streams for the three earlier headers;
  next.config.ts sets neither htmlLimitedBots nor PPR).
- `next dev` offline on 3106, the same pages read with flag-off-diff's header and with `RECORD_UA`:
  /bts-name-all-members 1 Suspense boundary and 0, /about 2 and 0, the title in the head both ways.
- The four parity runs above (table "Builds and parity runs", rows 7 to 10), and the cross-run checks: the request-time
  and prerendered pages of run 5's records, run 5's page files against run 2's, and the separator count of every
  page in the 14 builds of slices 7 and 8 (only the two pages of request 24 vary).
- `bash -n scripts/o1/parity.sh`. `tsc --noEmit` in apps/quiz: exit 0. `vitest run` in apps/quiz: first run 4 files
  with 5 tests timed out at 5 s (source scans, under load average 20 to 30 while other lanes built); those four files
  alone passed (67 tests), and the full suite run again passed: 124 files, 2269 tests. No test edited.
- No production read. Builds: only inside parity.sh under the build lock (offline, D-025: not counted in D-005).

Done in slice 7 (tick 4; section "Parity proof offline (slice 7)" below):
- `scripts/o1/parity/compare.mjs` (rules `q0a-g0-v2`): N3 flight-ids and N4 flight-rows exactly as CR-008 (D47), and
  the stylesheet content check of CR-009 on every page judged identical (D48). 13 new tests in `compare.test.mjs`.
- The cause of request 21, found in the rehearsal's build log: Next takes ROOT's `pnpm-workspace.yaml` as the
  workspace root, so module ids, chunk names and error digests carry the worktree's folder name. parity.sh now
  builds both sides at one path, `o1-parity-build` (D46), and serves them there too, the base first and recorded by
  the new `scripts/o1/parity/replay.mjs`, then the head live while the record answers as side A (D50; test
  `replay.test.mjs`). No normalisation added for this.
- parity.sh's cleanup kills the whole server tree (D49): `next start` forks `next-server`, which outlived runs on
  4011 and 4012 (mine of slice 6, and the gate's F0 parity run today: request 22).
- result.txt holds verdicts only; the normalisations a page needed go to result.json (D51): /blindtest/group-bts
  streams its rows in another order on some requests and not on others.
- Offline proof runs with a stand-in KPQ (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9`, the values gate.sh's
  `parity_kpq` writes), no production read; evidence in `apps/quiz/e2e/o1/parity/offline-2026-10-18/`:
  run 0 (one build path, two serving folders): 59 of 60, the 60th by error digests only (this led to D50);
  run 1 (quiet pair, `--keep`): identical, 60 of 60; run 2 (`--recheck` of that pair: both rebuilt, data state
  replayed): identical, 60 of 60, same verdict on every page, but parity.sh's byte check of result.txt failed on one
  label (D51); re-rendered with the verdict-only render, the two runs' rows give byte-identical result.txt
  (sha256 632bc946...). Run 3 (both plants): 32 DIFFERENT, /about by its string (the HTML node and its Flight
  row) and the 31 other pages that link stylesheets by css-content only (rule 720 of the first chunk sheet,
  `--txt1:#1a1714` against `#1a1715`); 28 identical. Run 4 (the CSS plant alone): 33 DIFFERENT, the 32 pages that
  link stylesheets by css-content (/about among them, now by its CSS only), and /bts-name-all-members by Suspense
  streaming timing, not by the plant (request 23).
- Requests 20 and 21 marked answered (CR-009, CR-008). New: 22 (orphaned parity servers until this merges) and 23
  (a CR for Suspense boundaries streamed on one side only).

Left after slice 7 (done in slice 8): the determinism proof with the final render, and request 23.

Tested how (slice 7):
- `node --test` of the harness tests (`scripts/o1/parity/*.test.mjs`, `apps/quiz/scripts/o1/q0a/*.test.mjs`,
  `apps/quiz/scripts/o1/*.test.mjs`): 95 of 95 pass (16 new: N3, N4 and the text-row cut, every row and the
  server HTML still compared, digests never normalised, a stream it cannot cut, css-content on identical pages only,
  sheet pairing, a long rule shown near its difference, unreadable and external sheets, the verdict-only
  render, record and replay).
- compare.mjs's new rules on the 60 stored page pairs of the slice 6 rehearsal (two folders, client ids differing on
  every 200 page): 58 IDENTICAL (31 by N3, 1 by N3 and N4), /about DIFFERENT (the plant, in the HTML node and in its
  Flight row, shown from near the first differing character), /bts-name-all-members DIFFERENT (error digests,
  never normalised).
- `bash -n scripts/o1/parity.sh`. `tsc --noEmit` in apps/quiz (with the slice's files): exit 0. `vitest run` not run this
  slice: no file it collects changed (apps/quiz `src/**`), and the machine ran the gate's builds and mine (load 30 to
  60); slice 6: 124 files, 2269 tests pass.
- No production read. Builds: only inside parity.sh under the build lock (offline, D-025: not counted in D-005).

Done in slice 6 (tick 3, 2026-10-17; section "Parity rehearsal" below):
- Slice 5's work, left uncommitted when tick 2 stopped on the usage limit, re-proved and committed (b5e8c55):
  harness tests 72 of 72, twins.mts on F0's current contract (unchanged since 79e3a8b) `twins: ok`, the dev-multi
  self-test as expected, tsc and vitest green.
- The offline parity rehearsal (D43): parity.sh, unchanged, run once with its KPQ pointed at a stand-in whose
  `kpop-parity.env` names the offline Supabase, base b5e8c55 against the same tree with one visible line changed on
  /about. No production read. It worked end to end (two builds under the lock, frozen-state hook, two servers,
  flag-off-diff, compare.mjs, result.txt, evidence copy, worktrees removed) and found two defects that would have
  failed every real run:
  1. Two builds never compare equal at the bytes level: on every page that answered 200, Turbopack gives the same
     client modules other ids in the inline page data, and one dynamic page streams its Flight rows in another
     order. 34 of 60 DIFFERENT, of which 31 for client module ids only. A fix is a new normalisation, which G0 makes
     the owner's: request 21 (CR, options, recommendation, measured effect: 58 of 60 equal and the plant caught).
  2. Each build refuses one write (`rpc ensure_daily_debate`, from the prerender of a page outside the list), and
     a refused write failed the run. Fixed in the harness (D44): `scripts/o1/parity/refusals.mjs` judges the
     refusals; a write refused while the list is fetched, or one the head build adds, still fails the run.
- Evidence kept in `apps/quiz/e2e/o1/parity/rehearsal-2026-10-17/` (result.txt, refused.txt, parity.json, and
  classes.txt: the cause of each page's verdict).
- Request 20 (CR proposal: compare stylesheet contents, parity stricter; the open point of slice 1) and request 21.
  The CSS gap is written in parity.sh's header until request 20 is decided.
- Not done, and why (D45): the real parity runs of the done test (determinism, planted change). Each would read
  production and fail on defect 1; the owner's message that opened tick 3 also says "pas d'accès à la prod". They
  wait for the decision on request 21 and ORCH's go. gate-checks.sh on real site builds stays with Q0a's own gate
  (request 1).

Tested how (slice 6):
- `node --test` of the harness tests (`scripts/o1/parity/*.test.mjs`, `apps/quiz/scripts/o1/q0a/*.test.mjs`,
  `apps/quiz/scripts/o1/*.test.mjs`): 79 of 79 pass (7 new: refusals.mjs on the rehearsal's own two lines, a write
  the head adds, another reason on the same path, a base-only write, every phase outside the builds, order and
  counts, the command's exits 0, 1, 2).
- The rehearsal itself (21:03 to 21:07 UTC, 197 s of builds and comparison, load average about 10): table in
  "Parity rehearsal". The proposed N3 and N4, applied by a throwaway script to the 60 stored page pairs (not in the
  harness: they wait for the owner), leave /about (the plant) and one offline 500 page.
- `bash -n scripts/o1/parity.sh`. `tsc --noEmit` in apps/quiz: no error. `vitest run`: 124 files, 2269 tests pass
  (default timeout; the machine was quiet).
- One parity run (offline, two builds) of the D-005 budget; no production read.

Done in slice 5 (sections "Twins check" and "dev-multi" below):
- twins.mts first (rule 18): F0's `docs/o1/contracts/twins.json` now exists (`o1/F0` 79e3a8b, 56 rows). Read as written:
  `file: null` rows (30 and 30b, the shared OG routes; 37, the auth routes) are declarations, a missing `file` key is
  still a contract error (D38). Protected set widened (D40): every file of `components/**` (rule 18: "the components
  of each area"; F0's mustImport names only the top module of a row, so what it renders was unprotected), every
  kpop twin file (a `local` twin body copied into an anime page is a fork), and the app modules those reach; test
  files are never protected; of two protected files the one the contract names is reported as the original. The
  draft fixture `q0a/twins-fixtures/twins.draft.json` is removed (F0's contract replaces it). Four new self-test
  cases (18 in all).
- `scripts/o1/dev-multi.sh [offline|scratch|dev] [--sites] [--ports] [--interval] [--test] [--clean]`: three `next dev`
  at once from one worktree, each from an APFS-cloned mirror of apps/quiz under the worktree's ignored `.next/`,
  kept in sync (D39). Request 18 is no longer blocking.
- `apps/quiz/e2e/o1/dev-multi/cookies.o1.ts` (project `dev-multi`, timeout 15 min for that project only): one person,
  three hosts; each host gets the session-shaped cookies of its site (Supabase session, `nq_anon`, the dev `pp_tx`,
  a script cookie); the jar of each host holds only its own; a real request to each server carries its own once and
  nothing of the two others; no Set-Cookie of the servers has a Domain attribute (D41). The `__Host-` fallback
  conformance table (12 rows of cookies.md section 2) runs when B4's helper exists (request 19).
- `scripts/o1/leak/dev-multi-selftest.sh` and the `cookie-domain` plant of `planted-server.mjs`: the cookie test
  passes on three separate stand-in hosts and fails on a planted shared cookie.
- Requests: 16 rewritten against F0's contract, 18 no longer blocking, 19 new (B4's helper name and signature).

Tested how (slice 5):
- `node --test apps/quiz/scripts/o1/twins.test.mjs`: 18 of 18 pass (new: F0-shape null-file rows and an unlisted
  page for a null-file route; a copy of a `local` twin body with the brand words swapped fails, the same route
  written with the shared kit passes; a copy of a component no mustImport names fails in a page and in
  `components/anime/` (there reported as "shares a block with"); two tests sharing a mock setup pass).
- twins.mts on the base with F0's contract (copied read only from `o1-F0`): `twins: ok`, exit 0, 56 rows, 53 files not
  built yet, 524 protected files against 1455, 38 base pairs within their recorded size (the all-against-all baseline
  of slice 4 holds for the wider set, as designed). About 18 s of CPU.
- twins.mts on the spike tree (`o1-F0s` ab42803, read only) with F0's contract: exit 1, 4 `missing-import` (layout:
  rows 28 and H-0; page: row 1; not-found: row 27); no copy; request 16.
- dev-multi on the real tree, offline, ports 3106 3107 3108: three servers up, warm-up `/robots.txt` 200 on each,
  the cookie test passed (1 passed, the B4 table skipped with its reason). A file added to `apps/quiz/src` reached the
  three mirrors in 11 s and its deletion in 6 s (load average 50 to 117). First run: the browser did not start
  within the 3 minute test budget under load 117 (raised for the dev-multi project only), and the first sync loop
  copied all three mirrors on every pass (fixed: one find per pass, clones keep their times).
- `bash scripts/o1/leak/dev-multi-selftest.sh`: none passes, cookie-domain fails (caught by the Domain check:
  Chromium did not apply `Domain=localhost`, so the wire check saw no shared value; it would have, as it now rejects
  a second value under a name).
- `tsc --noEmit` in apps/quiz (includes the new spec): no error (21 minutes of wall time under load).
- No build, no parity run, no production read.

Done in slice 4 (section "Twins check" below for the design):
- `apps/quiz/scripts/o1/twins.mts --root <worktree> --twins <twins.json> [--json <out>]`, the rule 18 check run by
  `scripts/o1/check.sh` (O1's merged copy) on every gate: (a) `unlisted-page`, a screen file under `app/sites/` that
  no row lists; (b) `missing-import`, a listed page that does not reach a module of its row's `mustImport` (directly,
  through a module of its own folder, or as a dependency of another mustImport module of the row), plus
  `mustimport-unresolved` and `exempt-renders` (a technical row whose file has JSX); (c) `copy`, a block of 8
  meaningful lines of a protected file (every `components/ux-v1/**` file and every mustImport module) found in any
  other code file of `apps/quiz/src` or `packages/*/src`. Exit 0, 1, or 2 (usage or unreadable contract).
- `apps/quiz/scripts/o1/q0a/twins-baseline.json`: the 123 copy pairs of the base (kpop's own lineages), measured
  all against all, so the check passes on the base whatever F0's mustImport lists name.
- `apps/quiz/scripts/o1/q0a/twins-fixtures/twins.draft.json`: 45 rows in twins.json's shape, made from ORCH's
  `TWINS-draft.md` and F0's route map, every mustImport module checked to exist (a contract artifact until F0's
  `contracts/twins.json` exists; check.sh never reads it).
- `apps/quiz/scripts/o1/twins.test.mjs`: 14 tests, fixture trees written to a temporary folder at test time.
- Requests 15 to 18 (`docs/o1/requests/Q0a.md`).

Tested how (slice 4):
- `node --test apps/quiz/scripts/o1/twins.test.mjs`: 14 of 14 pass. Each scenario gives exactly its expected
  violations: clean tree (ordinary imports, short JSX patterns, an own-folder module, a technical row, a private
  `_folder`) exit 0; planted unlisted page exit 1 `unlisted-page`; page missing its hub import exit 1 two
  `missing-import` (the hub and what it renders); partial copy of `components/ux-v1/panel.tsx` (Panel and UxBox,
  locals renamed, comments dropped, reindented) exit 1 `copy`; the threshold edge (7 meaningful lines of panel.tsx
  pass, the same block with its 8th line fails); a fork in `components/anime/` fails too; a type-only, an unused and
  a side-effect import do not count, a dynamic import and an `export ... from` do; a wrapper module outside the page
  folder does not count; `exempt-renders`; `mustimport-unresolved`; the baseline (a base pair passes within its
  size, fails when it grows, is ignored at another shingle size); exit 2 cases; identical output twice; the spawned
  command's process exits 0, 1, 2.
- The real base (this worktree, draft fixture, default baseline): `twins: ok`, exit 0, 117 protected files against
  1455 files, 6 ux-v1 lineage pairs within their recorded size, about 20 s (load average near 100).
- Dry run on F0's spike files (`git archive a74c82f` of `app/sites/` into a scratch copy of the tree): 29
  `missing-import` on the layout, home and 404 placeholders, the catch-all passes as a technical row (request 16).
- Harness tests (`node --test` of the three harness folders): 68 of 68 pass (54 before, 14 new).
- `tsc --noEmit` in apps/quiz: no error; twins.mts alone under strict, noUncheckedIndexedAccess and
  exactOptionalPropertyTypes: no error (apps/quiz's tsconfig does not include `.mts` files).
- `vitest run`: with the default 5 s test timeout, 12 tests of 5 files timed out (load average 91 to 108 from other
  lanes' builds; they scan source files or render, none is in a file this slice touched); `vitest run
  --testTimeout=60000`: 124 files, 2269 tests pass, the slice 3 counts. No test edited.
- dev-multi probe (below, D37): `next dev` from a per-site folder of links answers 404 on every path, with Turbopack
  and with webpack. No build, no parity run, no production read.

Done in slice 3 (section "Gate checks" below for the design):
- `scripts/o1/gate-checks.sh <lane> <worktree> <evidence dir> <sites>`: serves the gate's site builds (three
  `next start` at once from per-site link folders), or the kept parity head build for kpop, runs every check, one log
  per check in `<evidence dir>/checks/` plus `checks.tsv` and `plan.json`, exit 1 on any failure. The header holds
  the per-check build choice.
- `apps/quiz/scripts/o1/q0a/gate-plan.mjs`: the decision table as a pure function (`plan(facts)`) plus the fact
  reader; gate-checks.sh executes its JSON.
- `scripts/o1/parity.sh`: `--keep` names the kept build in `KPQ/cache/parity/kept.json` (base, head, worktree,
  frozen state); the next run removes the three; a cached result is used with `--keep` only while the kept build
  is the one of that pair. New entries `--serve-kept <head> <port> [--offline]` and `--check-kept <head>
  [--offline] -- <cmd>` (cron window refused, head must be the kept one, the serve holds the parity lock).
- `scripts/o1/parity/freeze-hook.mjs`: strict mode (`O1_FREEZE_STRICT=1`: any non-read to any non-local origin
  refused and logged) and offline replay (`O1_FREEZE_OFFLINE=1`: nothing outside the frozen state reaches the
  target, a local 503 instead).
- `scripts/o1/leak/gate-selftest.sh`: gate-checks.sh on the planted stand-ins, seven scenarios.
- `apps/quiz/e2e/o1/helpers/leak.ts`: the folder in `O1_LEAK_CASES` (the lane's own folder in the head) replaces the
  harness copy of the same lane. `check-network-links.mts`: header comment on the kpop sitemap paths (D23).

Tested how (slice 3):
- `node --test --test-timeout=60000 scripts/o1/parity/*.test.mjs apps/quiz/scripts/o1/q0a/*.test.mjs
  apps/quiz/scripts/o1/*.test.mjs`: 54 of 54 pass (16 new: 11 plan cases incl. today's base, kept build, phase B,
  parity without --keep, wiring and sitemap ratchet, lane specs, given servers, facts from temp folders; strict and
  offline hook modes in child processes; parity.sh `--check-kept` environment and both entries' refusals).
- `bash scripts/o1/leak/gate-selftest.sh`: every scenario as expected (table below): exit 0 and no failing check on
  clean stand-ins, exit 1 and exactly the planted check failing otherwise, one non-empty log per check every time.
  The four kpop check:* scripts ran unchanged from the harness through their `*_BASE_URL` (scenario
  kpop-production-source: each failed on the stand-in's 2-URL sitemap, as it must).
- `bash scripts/o1/leak/selftest.sh` again after the `leakCases` change: the same 25 rows as slice 2, all ok.
- `tsc --noEmit` in apps/quiz: no error. `vitest run`: 124 files, 2269 tests pass.
- Not yet run: gate-checks.sh serving real `.next-<site>` builds and the kept parity build (no build in this slice).
  Q0a's own gate proves the first (request 1); slice 5 the second.
- No build, no parity run, no production read.

Done in slice 2 (section "Leak suite" below for the design):
- `apps/quiz/scripts/o1/leak-lib.mjs`: the pure core (HTML layers, link, identity, string, NetMe and forbidden-string
  checks, anonymous `httpGet`, sitemap reader), shared by the Playwright suite and the command-line gate.
- `apps/quiz/scripts/o1/leak-contract.ts`: the contract values the suite judges by, from F0's registry and routing
  module when they exist in the harness checkout, else the same frozen values (BACKLOG 5.1, `lib/route-allowlist.ts`).
- `apps/quiz/scripts/o1/check-network-links.mts`: the Q-bridges D0 gate (anonymous crawl of the 60-URL set or the
  route map, plus up to 200 sitemap paths; allowlist, `via`, rel, caps, cross-site head links, the other world's
  domain in the HTML).
- `apps/quiz/e2e/o1/leak/`: `link-allowlist.json`, `string-markers.json`, and seven specs: route leak (plus site
  identity), string leak (P2 and mirror), link leak (server HTML and hydrated DOM), canonical and OG (with robots
  and sitemap), content leak (written, skipped with its reason), JSON-LD spoiler hook (cases from
  `e2e/o1/<LANE>/leak-cases.json`), no `/api/n/me` in 20 pages per site.
- `apps/quiz/playwright.o1.config.ts`: projects `leak`, `dev-multi`, `lanes`; collects `*.o1.ts` only.
- `apps/quiz/e2e/o1/helpers/leak.ts`: targets from `O1_LEAK_<SITE>_URL`, wiring detection, page sets, case loader.
- `scripts/o1/leak/planted-server.mjs` and `scripts/o1/leak/selftest.sh`: the planted-leak proof (below).

Tested how (slice 2):
- `node --test --test-timeout=60000 scripts/o1/parity/*.test.mjs apps/quiz/scripts/o1/q0a/*.test.mjs
  apps/quiz/scripts/o1/*.test.mjs`: 38 of 38 pass (17 new: attribute parsing, page data layer, link
  classification, allowlist caps per target, `via`, rel and query rules, domain text in page data and JSON-LD,
  identity rules, root files, markers with dropped allowlisted anchors, NetMe, forbidden layers, `httpGet` with no
  cookie, Host kept for `*.localhost`, no redirect follow, sitemap index).
- `bash scripts/o1/leak/selftest.sh`: 20 suite scenarios and 5 command-line scenarios, every one as expected
  (table below), run twice with identical rows; run a third time with F0's four `lib/site` modules copied in
  untracked (contract source "F0 registry and routing"): identical rows. The copies were removed; nothing of F0's
  was committed.
- Base, real kpop: `scripts/o1/env.sh offline` + `next dev` on 3106 (UX_V1, UX_V12, BT_TRACKING on), the leak
  project with only `O1_LEAK_KPOP_URL`: the 5 kpop tests pass (canonical and OG, link leak server HTML and hydrated,
  NetMe, string mirror; 31 pages answered 200, the data pages answer 500 offline), the 24 others skip with their
  reason (no anime or hub server, no dev branch, no O3 case).
- Planted on real kpop: one line added, uncommitted, to `app/(site)/terms/page.tsx` ("Also try <a
  href=https://otakuquiz.org/series>OtakuQuiz</a> for anime"): the link leak (server HTML: link-not-allowed,
  domain-in-html) and the string mirror (marker anime-brand) fail; the file was restored (`git diff` empty).
- `tsc --noEmit` in apps/quiz: no error. `vitest run`: 124 files, 2269 tests pass.
- No build, no parity run, no production read.

Done in slice 1:
- `apps/quiz/e2e/o1/parity/urls.txt`: 60 URLs (home and lists 4, group hubs 7, trivia 3, `/q/` 12 real slugs, blind
  test 5, Portuguese 5, fr es id landings 3, search landings and per-group games 8, trust pages 6, leaderboard,
  articles, `/daily` redirect, an unknown path (middleware 301), sitemap.xml, robots.txt, llms.txt). Slugs and hubs
  come from `docs/release/snapshots/*.json` (all answered 200 on kpopquiz.org, 2026-10-01 to 10-05).
- GET write proof, static: `apps/quiz/scripts/o1/q0a/get-write-audit.mjs` (section below).
- GET write proof, runtime, and the frozen data source: `scripts/o1/parity/freeze-hook.mjs` and
  `scripts/o1/parity/rpc-verdict.mjs` (section below).
- The two G0 normalisations: `scripts/o1/parity/compare.mjs`, applied after flag-off-diff's own (section below).
- `scripts/o1/parity.sh` v2: harness files read from its own checkout, production flags confirmed in the header,
  frozen data source preloaded into both builds and both servers, refused writes fail the run, deterministic
  `result.txt`, `--recheck` (rebuild both, replay the stored data state, fail unless `result.txt` is byte-identical),
  `--keep` keeps the data state for the gate's per-site checks. Interface unchanged for gate.sh and merge-lane.sh.

Tested how (slice 1):
- `node --test --test-timeout=60000 scripts/o1/parity/*.test.mjs apps/quiz/scripts/o1/q0a/*.test.mjs`: 21 of 21
  pass (normalisation rules incl. refusals, judge cases incl. a planted string, status and redirect differences,
  deterministic render, the hook in child processes against a stand-in Supabase server: frozen replay across
  processes, writes refused and logged without bodies, inert without its variables; audit sites, SQL verdicts,
  route resolution).
- `node apps/quiz/scripts/o1/q0a/get-write-audit.mjs`: "all 60 URLs: no unreviewed write reachable from the server
  render" (exit 0).
- The hook inside `next dev` (offline env, port 3106, `NODE_OPTIONS=--import .../freeze-hook.mjs`, target
  127.0.0.1:9): GET `/quizzes` answered 200 and the hook logged 16 Supabase reads of the server render
  (`errors.log`, connection refused as expected offline). So the wrapper sits in Next's fetch chain.
- `bash -n scripts/o1/parity.sh`; `tsc --noEmit` in apps/quiz: no error (the lane's files are .mjs, .sh, .txt, .md).
  No build, no parity run, no production read yet.

Deviations: none from the brief. The route leak, string leak, link leak, canonical and NetMe tests of anime and hub
skip on today's base (the builds are not wired as sites yet), with the reason printed, and fail instead when
`O1_LEAK_REQUIRE` names the site (D9). Three of the four existing check:* scripts are kpop-only by construction and
are skipped on anime and hub with the reason (D16).

Requests: `docs/o1/requests/Q0a.md` items 1 to 19 (slice 3: item 2 made final, gate.sh passes `--keep`; new 11 the
dev kpop build next to parity once G1 is open, 12 the check-site-scope interface for B2, 13 the per-site sitemap
route path, 14 the variables lane specs get; slice 4: 15 what twins.mts reads in twins.json, 16 the spike
placeholders fail the twins check, 17 check.sh merge order and evidence, 18 a dev output folder per site; slice 5: 16
measured against F0's contract, 18 no longer blocking, 19 B4's `__Host-` fallback helper for the conformance table;
slice 6: 20 a CR to compare stylesheet contents, 21 the CR on the Flight client ids and row order; slice 7: 20 and 21
answered and done, 22 the orphaned parity servers until Q0a merges, 23 a CR for Suspense boundaries streamed on one
side only; slice 8: 23 fixed at its source and withdrawn, 24 a CR for React's text separators, N6).

SQL files: none (the lane writes no SQL).

Owner actions: none yet. (Optional, for fidelity: the owner confirms that `KPQ/secrets/kpop-parity.env` carries the
production values of VERSE_PUBLIC, COMMUNITY_FEATURES_ENABLED and SONGS_IS_CURATED; see Open points.)

Builds and parity runs (budget D-005: at most 4 production runs, never 00:00 to 01:00 UTC; suspended by D-025, and
offline runs do not count). Every run below was offline: `O1_KPQ=<scratchpad stand-in>`, Supabase 127.0.0.1:9.
| # | When (UTC) | What | Result |
|---|---|---|---|
| 1 | 2026-10-17 21:03:41 to 21:07:09 | slice 6 rehearsal, `parity.sh b5e8c55 648e77c` (two folders) | exit 1: 34 of 60 DIFFERENT, 2 refused writes (section "Parity rehearsal") |
| 2 | 2026-10-17 22:29:45 to 22:33:58 | run 0: `parity.sh 53f48f9 0056679 --keep` (one build path, two serving folders) | exit 1: 59 of 60, /bts-name-all-members by error digests only |
| 3 | 2026-10-17 22:38:55 to 22:57:14 | run 1: `parity.sh 53f48f9 0056679 --keep` (one build and serving path) | exit 0: identical, 60 of 60 |
| 4 | 2026-10-17 22:57:31 to 23:29:32 | run 2: `parity.sh 53f48f9 0056679 --recheck` (waited 13 min for the gate's F0 parity run) | identical, 60 of 60; exit 1 on the byte check of result.txt, one label (D51) |
| 5 | 2026-10-17 23:36:41 to 23:44:46 | run 3: `parity.sh 53f48f9 803c535` (both plants; after the gate's spike parity) | exit 1: 32 of 60 DIFFERENT, all by a plant |
| 6 | 2026-10-17 23:44:46 to 23:52:40 | run 4: `parity.sh 53f48f9 90550f1` (CSS plant alone) | exit 1: 33 of 60 DIFFERENT, 32 css-content, 1 Suspense timing |
| 7 | 2026-10-18 01:00:39 to 01:20:09 | run 5: `parity.sh 53f48f9 0056679 --keep` (harness 36ff658c, both sides recorded) | exit 0: identical, 60 of 60 |
| 8 | 2026-10-18 01:20:09 to 01:28:42 | run 6: `parity.sh 53f48f9 0056679 --recheck` | exit 1: 58 of 60, not deterministic: 2 pages by a text separator (request 24) |
| 9 | 2026-10-18 01:28:42 to 01:35:02 | run 7: `parity.sh 53f48f9 4c0992c` (string plant alone) | exit 1: /about only, by its string |
| 10 | 2026-10-18 01:35:02 to 01:43:33 | run 8: `parity.sh 53f48f9 90550f1` (CSS plant alone) | exit 1: the 32 pages that link stylesheets, css-content only |
(Slice 4's two dev probes and slice 5's dev-multi runs were `next dev` with `scripts/o1/env.sh offline`, not builds.)

Production reads made by this lane: none (every run's Supabase was 127.0.0.1:9; flag-off-diff, compare.mjs and
replay.mjs fetch only the local servers).

## Gate checks

`scripts/o1/gate-checks.sh <lane> <worktree> <evidence dir> <sites>`, called by gate.sh step 9 (`site-checks`).
Order: the plan (`checks/plan.json`), the checks that need no server, phase A (servers up, every server check),
phase B when needed (the kpop gate build takes the kept parity build's port), servers down, `checks.tsv` (name,
rc, seconds; rc `skipped` and `pending` are not failures, each log says why), exit 1 on any failure.

| Check | Server and data | Run from |
|---|---|---|
| harness-unit | none: node --test of the harness tests of the head | head |
| site-scope | none: B2's lint when `apps/quiz/scripts/o1/check-site-scope.mts` exists, else skipped | head |
| kpop-indexability | kept parity head build (frozen production state, strict guard); the script's own catalogue read through `parity.sh --check-kept` | harness |
| kpop-metadata-dupes, kpop-orphans, kpop-sitemap-hygiene | kept parity head build; script offline | harness |
| the four kpop ones, no parity | skipped: kpop unchanged, and an offline or dev build fails them by construction | |
| the four kpop ones, parity without --keep | pending (request 2) | |
| anime-metadata-dupes, hub-metadata-dupes | the gate build of a wired site with a sitemap.xml route; skipped unwired or without the route; failed when the wiring is required (base or head next.config.ts has rewritesFor) or the base had the route | harness |
| anime and hub indexability, orphans, sitemap-hygiene | skipped: kpopquiz.org and the kpop catalogue are hardcoded | |
| network-links | every served site (an unwired anime or hub left out), parity list plus 200 sitemap paths | harness |
| leak | every served site, build folders for the wiring, O1_LEAK_REQUIRE, the lane's leak cases from the head; content leak left out on the kept parity build | harness |
| kpop-refused-writes | the kept build's freeze logs, phase `gate-*`: reads frozen and live, any refused write fails | |
| leak-content | phase B, the dev kpop gate build (request 11); skipped without it | harness |
| lane-specs | lanes.json `specs` (`*.o1.ts`), project `lanes` of the head's config; gate builds only, never the kept parity build | head |

Serving: gate builds from per-site folders in a temporary directory, each a link to every entry of the worktree's
`apps/quiz` except `.next*`, plus `.next` linked to `.next-<site>`; `next start` on 127.0.0.1, ports 4021 4022 4023
(waits up to 10 minutes for a busy port), env.sh of the gate's database, the gate's build flags (`NEXT_PUBLIC_SITE_ID`,
UX_V1, UX_V12), `SITE_SCOPE=1` on a dev branch once B2's module exists. The kept parity build is served by
`parity.sh --serve-kept` (production flags, frozen state, strict guard, parity lock held while it serves, up to 30
minutes of waiting for the lock). Suites reach the servers on `<site>.localhost:<port>`, the SEO scripts on
127.0.0.1.

Self-test (`scripts/o1/leak/gate-selftest.sh`, stand-ins given as `O1_GATE_URL_<SITE>`, this checkout as the
worktree):

| Scenario | Plant or setting | Failing checks (exactly) | Exit |
|---|---|---|---|
| clean | none | none (17 checks: harness-unit, network-links and leak ok, 14 skipped with their reasons) | 0 |
| link-kpop | a link to otakuquiz.org on kpop /quizzes | network-links, leak | 1 |
| string-anime | "Top K-pop groups" on anime /series | leak | 1 |
| netme-hub | `/api/n/me` in the hub page data | leak | 1 |
| kpop-production-source | `O1_GATE_KPOP_SOURCE=parity` on the stand-in | the four kpop check:* scripts | 1 |
| lane-spec-missing | lanes.json lists a spec the head lacks | lane-specs | 1 |
| no-hub-server | no hub server and no hub build | hub-metadata-dupes | 1 |

## Twins check

`apps/quiz/scripts/o1/twins.mts` (header of the file for every rule). What it reads: `twins.json` (`pages[]`: `id`,
`site`, `route`, `file` string, array or null, `twin` string, array or null, `mustImport` specifiers or paths; F0's
`renders`, `allowed`, `owner`, `body` and `notes` are for D0 and R, checked by F0's contract.test.ts; request 15), the
tree under `--root`, and its baseline next to itself (O1's copy at the gate).

Protected files (check c), slice 5: every code file of `components/**` except tests (rank 1), plus, ranked 0 (the
files the contract names), every `components/ux-v1/**` file, every mustImport module and every kpop twin file; plus
(rank 1) the modules of `app/` outside `app/sites` that a rank 0 file reaches (the twin's own page modules such as
`[slug]/group-quiz-page.tsx`). A pair of two protected files is reported on the less protected one ("copies"), or on
the later path when both have the same rank ("shares a block with": the tree alone cannot tell the original). On the
base with F0's contract: 524 protected files against 1455, 38 base pairs within their recorded size, exit 0.

Screen files (a): `page`, `layout`, `template`, `not-found`, `error`, `global-error`, `loading`, `default`,
`forbidden`, `unauthorized`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon` under `app/sites/`, outside
`_folders`. A listed file that does not exist yet is "not built yet", not a failure (today every row).

Copies (c), normalisation per source line with the TypeScript parser's tokens: comments and whitespace gone,
imports, `export ... from` and directives dropped, every use of a name the file declares replaced by `_` (member
names, JSX attributes and keys stay), quotes unified. A meaningful line keeps an identifier the file does not
declare, a literal or JSX text; `return (`, `) : null}`, `{children}`, `</div>` and `_,` are not meaningful.

Threshold, measured on the base (draft fixture, 117 protected files against 1455; pairs that would fail without a
baseline):

| Shingle (meaningful lines) | Pairs | What matched |
|---|---|---|
| 6 | 12 | generic patterns an honest page can write (two schema.org FAQPage JSON-LD literals, a quiz props interface, a choice button) next to the real lineages |
| 7 | 8 | still the quiz props interface (`run-context.tsx` and `quiz-page.tsx`, 7 lines), next to the real lineages |
| 8 | 6 | only real copies: group-quiz-page and the hub (29), use-ranked-run and the blind test run (32), the bell and the nav polling effect (9), blindtest-game and use-run (9), settings and the appearance setting (8, renamed locals), story-image and story (8) |

8 is the brief's "about 8 meaningful lines" and the smallest size whose base matches are all real copies. Limit: a
fork that edits a line inside every 8 meaningful lines evades it (R's review covers that). Time: about 20 s on the
real tree under load (parsing 1455 files is most of it).

Baseline: all code files of the base outside `app/sites/` against each other at shingle 8 (123 pairs: pt pages and
their English twins, admin routes, v0 ancestors of ux-v1), so it holds whatever F0's mustImport lists name. Keyed by
the unordered pair, with the larger of the two sides' matched lines. A new pair, or a recorded pair that grows,
fails. Only Q0a re-measures it (`--write-baseline`), from a base, never for a lane.

Spike dry run (request 16): F0's placeholders `layout.tsx`, `page.tsx` and `not-found.tsx` render none of their
twins' shared components: 4 `missing-import` against F0's contract (rows 28 and H-0, 1, 27; 29 against the draft rows,
which also listed what each module renders); `[...rest]/page.tsx` (notFound, no JSX) passes as the technical row 27b.

## dev-multi

`scripts/o1/dev-multi.sh [offline|scratch|dev] [--worktree <wt>] [--sites kpop,anime,hub] [--ports p1,p2,p3]
[--interval <s>] [--test] [--clean]` (header of the file). Each site runs `next dev -p <port> -H 127.0.0.1` with
`NEXT_PUBLIC_SITE_ID` and `SITE_ID` set, UX_V1 and UX_V12 on, through O1's `env.sh`; ports from `ports.tsv` (the lane
of the branch). Hosts: `kpop.localhost`, `anime.localhost`, `hub.localhost` (Next's dev origin check allows
`*.localhost` by default). `--test` warms up `/robots.txt` on each server, then runs the Playwright project
`dev-multi` with `O1_KPOP_URL`, `O1_ANIME_URL`, `O1_HUB_URL` and stops everything.

Mirrors (D39): `<wt>/.next/multi-<site>/` holds APFS clones (`cp -c -R -p`) of `apps/quiz/src`, `public` and the
top-level files, and a link to the worktree's node_modules. Same depth as apps/quiz, so `tsconfig.json` paths
(`../../packages/shared/src`) and `process.cwd()/../..` (the knowledge-report dataset route) resolve as in apps/quiz,
and the folder is ignored by git (`.next/`). The sync loop: every 2 s one `find -newer` over the watched paths; when
anything changed, `rsync -a --delete` into each mirror. Measured under load 50 to 117: an added file in all three
mirrors after 11 s, a deletion after 6 s. Edits go to apps/quiz, never to a mirror.

Cookie isolation (`apps/quiz/e2e/o1/dev-multi/cookies.o1.ts`): see D41. Proofs: real servers (slice 5, offline,
3106 to 3108): passed. Stand-ins (`scripts/o1/leak/dev-multi-selftest.sh`):

| Scenario | Plant | Result |
|---|---|---|
| none | three separate hosts | the session test passes, the B4 table skips |
| cookie-domain | anime's `/robots.txt` sets `sb-127-auth-token` with `Domain=localhost` | the session test fails (Set-Cookie with a Domain attribute) |

## GET write proof

Static half (`get-write-audit.mjs`): for each URL, the route file (app router resolution with route groups, the two
V12 pretty-URL rewrites of next.config.ts, the group hub suffix rule, the middleware 301 for an unknown path), the
layouts above it and `src/middleware.ts`, then the transitive import closure. In every server module ('use client'
modules only write from browser effects, 'use server' modules only on a POST) it lists table writes, storage
uploads, RPCs and non-GET fetches. RPCs are judged by `rpc-verdict.mjs`: read-only only when every definition in
`supabase/migrations` and `docs/pending-migrations` is STABLE or IMMUTABLE, or has no write statement and calls no
writing function (recursively). Each remaining reachable write site needs a reviewed reason, else exit 1.

Result on 2026-10-16 (base `ffdc9aa`): read-only RPCs reached: get_rising_creators, get_today_stats,
get_fandom_war_map, get_fandom_war_map_v12, get_personality_counts, name_all_round_stats, bt_fans_today. Write sites
reachable through a module but not run on an anonymous GET (reason in the tool's REVIEWED table):
- `lib/passport.ts` (profiles update, passport_group_snapshots upsert and delete, increment_passport_counter):
  snapshotIfStale is called by `/me` only; bumpPassportCounter and updatePassportIdentity have no caller.
- `lib/db/queries/plays.ts` record_play: recordPlay has no caller (`/q/` imports getQuizExtraStats only).
- `lib/db/queries/debate.ts` ensure_daily_debate: reached through CommunityContent, which `/leaderboard` renders only
  with UX_V1 off (production renders LeaderboardV11).
- `lib/duel/server.ts` (duel_cast_song_vote, duel_song_rankings upsert and delete, duel_vote_guard delete): the vote
  API and the nightly cron only; the hubs call getFansPicked (reads).
- `lib/name-all/server.ts` name_all_member_results insert: saveRound, the result API only.
- `lib/live/supabase-store.ts` room RPCs and `lib/live/server.ts` Realtime broadcast POST: the /api/live routes only;
  the pages reach isLiveOpen, whose probe is a GET select.
Dropped from the list because their GET writes: `/community` (ensure_daily_debate in the render), `/s/<code>` (the
click tracker). Not in the list by rule 5: `/me`, `/profile`, `/settings` and every signed-in page.

Runtime half (`freeze-hook.mjs`, preloaded into every Node process of both parity builds and both servers): any
non-GET to a table, any RPC whose verdict is not `reads`, any non-GET on auth, storage, realtime, functions or
graphql is answered 403 locally, never sent, and logged; parity.sh fails the run when the log is not empty and
copies the list into the evidence (`parity-refused.txt`). Bodies and header values are never logged.

## Parity normalisations (G0) and determinism

flag-off-diff (unchanged) normalises build ids, hashed asset names and CSS-module hashes. `compare.mjs` re-judges
only the pages it found DIFFERENT, with exactly two more rules:
- N1 css-version: the `?v=` of `/api/ux-v1/a0/styles` is replaced on both sides only when the two served
  stylesheets (fetched once per run) are equal after every white literal (`#fff`, `#ffffff`, any case) reads
  `var(--ux-on-accent)` and a declaration of `--ux-on-accent` with that white value is dropped.
- N2 analytics-ref: the Flight client reference `I[<id>,[<chunks>],"Analytics"]` (or `"NetAnalytics"`) in the
  inline page data reads `I[<analytics>]` on both sides.
A status difference or a redirect target difference (3xx re-read with one GET per side) is never normalised.
Since slice 7 (CR-008 and CR-009, rules `q0a-g0-v2`):
- N3 flight-ids: a client reference row `<row>:I[<module id>,` reads `<row>:I[<id>,`; row id, chunk list and export
  name stay compared.
- N4 flight-rows: the push tags leave the document; the stream they carry is cut into rows and compared as a sorted
  multiset; the rest of the document byte for byte (D47).
- css-content: every page judged identical is read again from both sides for its stylesheet links, and every
  stylesheet's content is compared in link order after the asset-name rule (and N1 for the UX sheet) (D48).
- Both sides are built at one path (D46), so most of what N3 and N2 cover no longer arises.

Data drift (the cause of every false DIFFERENT in the v11 and v12 runs: play counts moving between two builds made
minutes apart, a build that timed out on Supabase): the base build records every read, the head build and both
servers replay it, so base and head render one database state. ISO timestamps are masked in the read key, so a
"last 7 days" filter computed a few minutes later reads the same rows. Determinism of the output: `result.txt` lists
per URL the verdict, the status pair and the normalisations used, plus the differing nodes of a DIFFERENT page, and
nothing that moves between runs (no time, no byte count). `--recheck` proves it on a sha pair.

## Parity rehearsal (offline, 2026-10-17)

Why: parity.sh v2 had never run end to end, and a real run is scarce (D-005 budget, a production read each). How:
parity.sh unchanged, `O1_KPQ` pointed at a stand-in folder in the scratchpad whose `secrets/kpop-parity.env` holds
the offline values of `scripts/o1/env.sh offline` (Supabase 127.0.0.1:9), so its cache, kept build and env file are
the stand-in's and the real `KPQ/cache/parity` is untouched (it did not exist). Base b5e8c55 (this branch); head
648e77c, a commit object on no branch (`git commit-tree`): the same tree with "Made by fans, for fans" changed to
"Made by fans, for every fan" on /about. Both builds under the build lock with the production flags and the freeze
hook, served on 4011 and 4012, the 60 URLs, worktrees `o1-parity-base` and `o1-parity-head` removed at the end.
Evidence: `apps/quiz/e2e/o1/parity/rehearsal-2026-10-17/`.

| Pages | Cause of the verdict (classes.txt) |
|---|---|
| 26 IDENTICAL | 500 pages offline (group hubs, `/q/`, two trivia hubs: no data), the redirects, sitemap.xml, robots.txt, llms.txt |
| 31 DIFFERENT | only the module ids of Flight client references in the inline page data (`I[<id>,[chunks],"Name"]`), every page that answered 200 |
| 1 DIFFERENT | /blindtest/group-bts: the same Flight rows, cut into other `self.__next_f.push` tags in another order |
| 1 DIFFERENT | /bts-name-all-members (a 500 offline): its error digests |
| 1 DIFFERENT | /about: the plant, in the HTML and in the page data (found) |

Refused writes: one `POST /rest/v1/rpc/ensure_daily_debate` in each build (`build-base`, `build-head`), none while
the list was fetched. `getDailyDebate` (lib/db/queries/debate.ts) calls it inside CommunityContent, from the
prerender of a page outside the list (the GET write audit already keeps /community out). A production build writes
it every deploy today; the hook refused it, as it must, and v2 then failed the run (fixed, D44).

So the pipeline works (two builds, frozen-state hook, servers, flag-off-diff, compare.mjs, result.txt, evidence,
cleanup) and catches a one-line visible change, but at the bytes level two builds never compare equal: Turbopack
(Next 16.2.1) gave the same client modules other ids although no client code changed. G0's N2 (the Analytics
reference) is that symptom on one reference. Request 21 asks the owner for N3 (client reference ids) and N4 (Flight
rows compared as a sorted set, whatever the cut); a throwaway script applying both to the 60 stored pairs leaves
exactly /about and the offline 500 page. Not yet known: whether the ids move with the build folder or on every
build (request 21 option c).

## Parity proof offline (slice 7)

Stand-in KPQ in the scratchpad with gate.sh's offline `kpop-parity.env` (Supabase 127.0.0.1:9); parity.sh of this
worktree; base 53f48f9 (slice 7's first commit). Heads are commit objects on no branch (`git commit-tree`, the
worktree untouched): 0056679 quiet (a comment in `components/layout/theme-init.tsx`, a line of
`docs/o1/PARITY-OFFLINE`), 803c535 both plants (/about "Made by fans, for fans" to "for every fan", and
`--txt1: #1A1714` to `#1A1715` in `styles/globals.css`), 90550f1 the CSS plant alone, 4c0992c the string alone.

| Run | Pair | Build / serve | Verdict |
|---|---|---|---|
| 0 | quiet, `--keep` | one path / two folders | 59 of 60; /bts-name-all-members (500 offline) by its two `E{"digest"}` rows only, stacks identical in both logs |
| 1 | quiet, `--keep` | one path / one path (recorded base) | identical, 60 of 60; flag-off-diff byte-identical on 59 pages, /blindtest/group-bts by N4 |
| 2 | quiet, `--recheck` | the same, data state replayed | identical, 60 of 60, every verdict as run 1; byte check failed on run 1's label of /blindtest/group-bts (D51) |
| 3 | both plants | one path / one path | 32 DIFFERENT: /about (HTML node and Flight row with the string), 31 by css-content only; 28 identical |
| 4 | CSS plant alone | one path / one path | 33 DIFFERENT: 32 css-content (every page that links stylesheets, /about by its CSS only), /bts-name-all-members by a Suspense boundary streamed on one side only (request 23) |

Every run: 2 refused writes, `rpc ensure_daily_debate` from each build's prerender, listed (base and head alike);
none while the list was read. 32 pages had their stylesheets compared (3 each: two chunk sheets and the UX sheet);
the 500, redirect and text pages link none.

## Parity proof offline (slice 8)

The same stand-in KPQ (Supabase 127.0.0.1:9), base and heads as slice 7; the harness of 039a8de (version 36ff658c):
both sides served at `o1-parity-build` one after the other and each recorded by `replay.mjs` with `RECORD_UA` (D52),
flag-off-diff and compare.mjs reading the two records.

| Run | Pair | Verdict |
|---|---|---|
| 5 | quiet, `--keep` | identical, 60 of 60; result.txt byte-identical to slice 7's runs 1 and 2 (sha256 632bc946...) |
| 6 | quiet, `--recheck` (data state replayed, both rebuilt) | 58 of 60: /fr/blind-test-kpop and /es/adivina-la-cancion-kpop by one `<!-- -->` each (request 24); determinism.txt NOT deterministic |
| 7 | string plant alone (4c0992c) | /about only: `Made by fans, for fans` against `for every fan`, in the HTML node and in its Flight row |
| 8 | CSS plant alone (90550f1) | the 32 pages that link stylesheets, each by css-content only (rule 720 of the first chunk sheet); 28 identical |

Every run: 2 refused writes, `rpc ensure_daily_debate` from each build's prerender (base and head alike), none while
the list was read; parity.json counts 0 live and 0 frozen reads (offline).
What the records show (run 5): 30 HTML pages are prerendered (they keep the streamed-metadata wrapper from the build
cache, with 2, 3 or 5 boundaries, all resolved: Next generates them with `allReady`), and 4 are rendered at request
time (/quizzes and /blindtest/group-bts, 200; /which-bts-member-are-you, 404 offline; /bts-name-all-members, 500
offline), each now with no boundary at all; 21 pages answer a plain-text 500 offline. Run 5's page files against
run 2's (same base, old header): 109 of 120 byte-identical after flag-off-diff's normalisation; the 11 others are the
4 request-time pages on both sides (the metadata now in the head), the home page on both sides (its date is baked at
build time: 2026-10-17 in run 2, 2026-10-18 in run 5) and /pt on one side (Flight row order, N4).
The text separators of request 24, over the 14 builds of slices 7 and 8: every page has the same count in every build
except /fr/blind-test-kpop (5 in 13 builds, 4 in run 6's base build) and /es/adivina-la-cancion-kpop (4 in 13, 5 in
that build); none occurs in the page data.

## Leak suite

Run: `cd apps/quiz && O1_LEAK_KPOP_URL=... O1_LEAK_ANIME_URL=... O1_LEAK_HUB_URL=... ./node_modules/.bin/playwright test
-c playwright.o1.config.ts --project leak` (variables in `e2e/o1/helpers/leak.ts`). The suite never starts a server
and reads the servers it is given anonymously: GET only, no cookie, no redirect followed; the hydrated link check
opens pages in a fresh browser context where only GETs to the server under test go out (any other request is
answered locally), so the browser itself reads no database.

What each test reads and rejects:
- Route leak (anime, hub): every path of `routeLeakPaths`: F0's `KPOP_ONLY_SAMPLES` and `KPOP_DATA_SAMPLES` (until
  F0 merges: one sample per prefix of `lib/route-allowlist.ts` that the site's route map does not know, and BACKLOG's
  data samples), plus each parity path the site's route map does not know (55 paths on anime and 84 on the hub with
  F0's lists; 53 and 90 with the fallback). Anything but 404 fails, a 3xx included. Site identity: the home answers
  200 with `data-site="<site>"`.
- String leak: the text layer (visible text, title, alt, aria-label, placeholder, text metas, JSON-LD, the copy in the
  page data with module rows and `/_next/` paths removed), minus the allowlisted cross-site anchors. Anime markers:
  K-pop as a word (`K-pop`, `Kpop`, `K pop`), `KpopQuiz`, `bias`. kpop marker: `OtakuQuiz`. Group and series names
  are not anonymous markers (artist credits may name a K-pop group on an anime page, a fan quiz on kpop may name a
  series): they are the content leak's fixture strings.
- Link leak: `checkLinks` on the server HTML of the page set, then on the hydrated DOM of its first 5 pages.
- Canonical and OG: canonical, og:url and hreflang on the own domain; og:site_name = the brand; og:image and
  twitter:image on the own domain or `*.supabase.co`; no JSON-LD url of the other world (FanQuiz parent excepted);
  robots.txt Sitemap and sitemap.xml locs on the own domain.
- NetMe: the first 20 paths of the page set, every answer judged (error pages too), at least one 200.
- Content leak: kpop lists, sitemap and llms.txt carry no anime fixture name, kpop search returns no result link
  naming one, and the mirror on anime; a positive control first (the fixtures are visible on otakuquiz.org
  `/series`). Skips until a dev branch, SITE_SCOPE and the anime server exist; the signed-in surfaces (bell, badge
  shelf, passport stats, activity, and P2's signed-in half) skip until a fixture session exists (Q0b, G1, G2).
- JSON-LD spoiler: each case of `e2e/o1/<LANE>/leak-cases.json` (key `spoilerJsonLd`): 200, JSON-LD present, no
  forbidden string in it.

Planted-leak proof (`scripts/o1/leak/selftest.sh`; stand-in servers on 3106 to 3108 render the contract's page
shapes; the failing set must equal the expected set exactly):

| Scenario | Plant | Tests that fail |
|---|---|---|
| clean | none | none (20 pass, 10 skip: content and signed-in cases) |
| clean-content | none, O1_ENV=dev and O1_SITE_SCOPE=1 in the test process | none (22 pass, 8 skip: signed-in) |
| unwired | anime without data-site | none: the 10 anime tests skip with the reason |
| unwired-required | the same, O1_LEAK_REQUIRE=anime | all 8 anime tests |
| route-anime | anime answers 200 on /guess-the-kpop-idol | route leak anime |
| route-hub | hub answers 301 on /quizzes | route leak hub |
| string-anime | "Top K-pop groups" on anime /series | string leak anime |
| string-anime-data | "Made by KpopQuiz" in the page data only | string leak anime |
| string-kpop | "try OtakuQuiz" on kpop /quizzes | string mirror kpop |
| link-kpop | a link to otakuquiz.org/series on kpop /quizzes | link leak kpop (server, hydrated) |
| link-via | `?via=a.foot` on the anime footer link | link leak anime (server, hydrated) |
| link-nofollow | a directory link without nofollow | link leak hub (server, hydrated) |
| link-hydrated | a cross-site link added by a script after load | link leak kpop (hydrated) |
| canonical | anime /series canonical on kpopquiz.org | canonical anime, link leak anime (server, hydrated) |
| og-site-name | hub og:site_name KpopQuiz | canonical hub |
| sitemap | a kpopquiz.org loc in the anime sitemap | canonical anime |
| netme | `/api/n/me` in the hub home page data | NetMe hub |
| spoiler | "L dies" in the JSON-LD of a case page | the spoiler case |
| content | an anime fixture quiz on kpop /quizzes (dev env set) | content leak |
| content-mirror | a BTS quiz link on anime /series (dev env set) | content leak mirror |
| cli (5 runs) | none, link-kpop, link-via, link-nofollow, canonical | exit 0 clean, exit 1 on each plant |

## Decisions

- D1 N1 as written ("equal after normalizing #fff to var(--ux-on-accent)") can never pass once B1 declares the token,
  because the declaration itself is a new line of the served CSS. The check therefore also drops a declaration of
  `--ux-on-accent` whose value is white, and only that. Any other CSS change keeps the hash difference. Tested both
  ways. R and the owner can tighten it; B1 gets the exact form (request 5).
- D2 N2 recognises the export names `Analytics` and `NetAnalytics` only (rule 10 names the network prefix `Net`);
  B6 gets the name (request 4). A Flight row of any other component is never touched (tested).
- D3 Production flags: UX_V1, UX_V12 and BT_TRACKING on (LAUNCH-REPORT step 2, PR #97). BT_TRACKING was missing
  from parity v1; it changes the server HTML only in the live phone (client) and the admin layout, but the parity
  builds now match production. Every O1 flag is unset explicitly.
- D4 Frozen data source by a fetch wrapper (`NODE_OPTIONS=--import`) rather than a local proxy: changing
  NEXT_PUBLIC_SUPABASE_URL would change every storage image URL in the HTML and break `next/image`
  (`remotePatterns` allows `*.supabase.co` only). The wrapper keeps the URL and touches only requests to it.
- D5 The parity harness (parity.sh, `scripts/o1/parity/`, the URL list) runs from the checkout of the script, never
  from the head under test, so a lane cannot weaken its own judge.
- D6 Unit tests of the harness use `node --test` (`*.test.mjs` next to the scripts): vitest only collects
  `src/**/*.test.ts` and `vitest.config.ts` is not Q0a's. gate-checks.sh will run them (slice 3).
- D7 The leak and dev-multi specs will be named `*.o1.ts` and collected only by `playwright.o1.config.ts`: the
  default config's `desktop` and `mobile` projects collect every `*.spec.ts` under `e2e/` (COLLISION-MAP 6.2), and
  CI must not run O1 specs against a kpop build.

- D8 Leak checks read the anonymous server HTML through one dependency-free core (`leak-lib.mjs`), not a browser
  DOM, so the command-line gate and the Playwright suite judge alike and the rules have unit tests. The browser is
  used where only a browser sees the thing: the hydrated link check (and dev-multi's cookies, slice 4).
- D9 Wiring detection: before F0's rewrites are wired, an "anime" build is the kpop build under another name, so its
  tests skip with the reason instead of failing on the base. The state comes from the build's routes-manifest
  (`/sites/<site>` rewrites) when `O1_LEAK_<SITE>_NEXT` is given, else from `data-site` on the home's `<html>`.
  `O1_LEAK_REQUIRE=<sites>` turns a skip into a failure; gate-checks.sh will set it as soon as the target's
  next.config.ts has the wiring, so a later regression cannot hide behind a skip (proved by "unwired-required").
- D10 String markers are brand, domain, genre and the K-pop pick word only (`string-markers.json`); names of groups
  and series are content-leak fixture strings. Allowed mentions are the allowlisted links themselves: their anchors
  (text and href, also in the page data) are dropped before the string and domain checks, which covers the B17
  About lines without a second exception list.
- D11 `maxPerPage` counts per entry and target site: the anime About line may link KpopQuiz and FanQuiz once each,
  next to the footer link; the network page one link per site.
- D12 The allowlist and the markers are data files in Q0a's folder until F0 ships the contract copy
  (`docs/o1/contracts/link-allowlist.json`, request 6), which the checker then reads first. The Team article entry
  has `page: null` (no page) until a CR names its path.
- D13 Other lanes add leak cases without editing the suite: `apps/quiz/e2e/o1/<LANE>/leak-cases.json` (O3's
  `spoilerJsonLd`, request 8). A lane can add cases, never remove the suite's own.
- D14 Content leak search pages are judged on their result links (a link to `/q/...`, `/x-quiz` or `/x-trivia` whose
  text names the fixture), since a search page echoes its query.
- D15 gate-checks.sh is a plan plus an executor: `gate-plan.mjs` decides (pure, unit tested), the shell runs. The
  judge (the plan, the leak suite, check-network-links, the four check:* scripts) runs from the harness checkout
  (O1 once merged), as parity does (D5); what belongs to the head (its harness tests, B2's lint, the lane's specs
  and leak cases) runs from the gate worktree.
- D16 Per-check build choice: the table in "Gate checks". The four existing check:* scripts are run unchanged
  (RATCHET LAW); three of them are kpop-only by construction (kpopquiz.org, the 600 URL floor, the priority hubs,
  the article registry), so on anime and hub they are skipped with that reason and the leak suite's canonical and
  sitemap checks cover the per-site domain part. check:metadata-dupes keeps the path of any loc and runs everywhere.
- D17 Three servers at once from one gate worktree: `next start` needs `.next` in its project folder, so each site
  gets a folder of links with `.next` pointing at `.next-<site>`. Nothing is written in the worktree outside the
  build folders (Next's own cache), so gate.sh's cleanup and `worktree remove` stay as they are.
- D18 The kept parity build is served by parity.sh itself (`--serve-kept`), so production is still read by one
  thing; the serve holds the parity lock, so no parity run removes the build under it, and refuses the cron window
  and a head that is not the kept one. check:indexability, which reads the catalogue itself, runs through
  `--check-kept` (same frozen state and guard). These reads count as a parity run (brief).
- D19 Strict guard for the gate's crawl: the parity list's GETs are audited, the 700 sitemap pages are not, so in
  the gate phases any non-read to any origin that is not this machine is refused too (a webhook, a ping, a mail
  API), and `kpop-refused-writes` fails on any refused request.
- D20 Offline replay (`--offline`, `O1_GATE_KEPT_OFFLINE=1`): the kept build answered from its frozen state only, a
  local 503 for the rest, for plumbing tests with zero production reads. The gate never sets it.
- D21 The content leak and lane specs never meet the kept parity build (a browser there would read the production
  Supabase directly; production has no anime row by Verrou 0). Phase B swaps in a dev kpop gate build (request 11).
- D22 Ratchets: the wiring is required on anime and hub when the base or the head next.config.ts calls
  rewritesFor; the sitemap.xml route of a site is required once the base has it. A lane cannot turn a failure into a
  skip by removing the thing checked.
- D23 In the gate, kpop sitemap paths are crawled too (check-network-links 200, the leak suite 20): every kpop server
  gate-checks starts is offline or under the strict guard. Outside the gate the defaults stay as in slice 2.
- D24 A lane's leak cases are read from the head (`O1_LEAK_CASES` = its folder) and replace the harness copy of the
  same lane: the head version is judged, once (no duplicate test titles).
- D25 gate.sh's macOS `/bin/bash` is 3.2: gate-checks.sh uses no associative array and no case modifier.
- D26 Lane specs run from the head with the head's `playwright.o1.config.ts` (project `lanes`); a head without it
  fails the check with "merge o1/integration first".
- D27 twins.mts reads code with the TypeScript compiler API (`typescript` 5.9.3, already a dependency of apps/quiz):
  real import declarations and tokens, so comments, strings and JSX are never confused. It runs under tsx (check.sh)
  and under Node 25's type stripping (the tests import it), so it uses erasable syntax only.
- D28 Route handlers (`route.ts`) and metadata routes (sitemap, robots, manifest) need no row: they render no screen.
  Image routes (`opengraph-image`, `icon`) do. A listed handler is checked like any row.
- D29 Import counting: a value binding used in the file, a dynamic `import()`, a `require()` or an `export ... from`.
  `import type`, type-only bindings, unused bindings and side-effect imports do not render a component, so they do
  not count.
- D30 "Directly or through a module of its own folder" (brief) plus one more path: a mustImport module that is a
  dependency of another mustImport module of the same row that the page reaches. The draft lists `hub.tsx` "with"
  what it renders; F0 may list them; a page that renders `hub.tsx` renders them. A wrapper outside the page folder
  still never counts, and the top module of a row must be reached by the page itself.
- D31 A row whose `twin` is null or empty is technical (draft row 37): its file must contain no JSX, so a visible page
  cannot hide there.
- D32 Copy normalisation replaces only names the file declares (the brief's "local variables"), and only where they
  are used as names: member names, JSX attributes and keys stay, which keeps lines specific (measured: with members
  normalised too, `className` became `_` wherever a component destructures `className`).
- D33 Shingle 8 meaningful lines (table in "Twins check").
- D34 Baseline measured all against all and keyed by the unordered pair (D33's table), Q0a-owned, read from the
  script's own folder: a lane can neither edit it (guard) nor substitute its own (check.sh runs O1's script).
- D35 The self-test writes its fixture trees to a temporary folder at test time: the partial copy of panel.tsx is
  made from the real file there and never committed, so the repository holds no copy for the check to find, and the
  fixture follows panel.tsx when its owner changes it (the test asserts the block still has 8 meaningful lines).
  Scenarios call `main()` in process (one TypeScript load); one test spawns the command for the process exit codes.
  With one process per scenario the file took 4 minutes under load average 90; in process, 29 s.
- D36 The draft-shaped `twins.draft.json` is a contract artifact (rule 17): it lets the check run on the real tree
  before F0's contract exists and documents the shape. F0's `contracts/twins.json` replaces it as the judge; the
  baseline does not depend on it (D34).
- D37 dev-multi needs one output folder per site. Next 16.2 takes a lock at `<distDir>/dev/lock` ("Another next dev
  server is already running in this directory"), `distDir` is set only in next.config.ts (HOT), and the programmatic
  server's `conf` does not reach the dev bundler (router-server reloads next.config.ts from the folder). A per-site
  project folder of links (the gate-checks D17 method) starts but serves no route: every path answers 404, with
  Turbopack (68 s first compile) and with webpack (4.3 min), anime and kpop hosts alike; the base has no SITE_ID
  logic, so the folder of links is the cause (Next resolves the linked `src` to its real path outside the project
  folder). Turbopack's inferred root is ROOT's workspace file, which is why every lane's `next dev` resolves O1's
  node_modules. Way forward: request 18.

- D38 twins.mts reads F0's contract as written: `file: null` declares a route with no file under app/sites (rows 30,
  30b, 37); it lists nothing, so a screen file for such a route is unlisted. A row with no `file` key at all stays a
  contract error (exit 2), so a typo cannot silently drop a row.
- D39 dev-multi runs each site from a mirror of apps/quiz instead of waiting for request 18: Next 16.2's dev lock and
  the HOT next.config.ts rule out a second dev server in apps/quiz, symlinked folders serve 404 (D37), and private
  Next variables (`__NEXT_PRIVATE_STANDALONE_CONFIG`) would drop the config's functions (rewrites, headers). The
  mirror is a real folder at apps/quiz's depth, cloned (no disk cost for unchanged files) and synced. Cost: a few
  seconds before an edit reaches the three sites. Once request 18 lands, dev-multi can switch to
  `O1_NEXT_DIST_DIR=.next/multi-<site>` in apps/quiz itself.
- D40 Protected set of check (c) widened to `components/**`, the kpop twin files and their app modules. Why: F0's
  mustImport names only the top module of each row (`ux-home`), so its parts (`home-header.tsx` and the rest of
  `renders`) were unprotected, and rule 18 names "the components of each area"; a `local` twin's body (about,
  privacy, terms) is page markup that rule 18 moves into a shared component, so copying it into an anime page is the
  fork the rule forbids. Free on the base (the baseline was measured all against all) and cheap (the files are parsed
  for the scan anyway). Tests are scanned but never protected: suites legitimately repeat mock setups.
- D41 Cookie isolation test: a probe path that the test itself answers (never sent to a server) sets each host's
  session-shaped cookies, so the test needs no sign-in, no database and no B4 code; the proof that matters is on the
  wire (the Cookie header of a real request to each server, from Playwright's `allHeaders()`) and in each host's
  jar. The Set-Cookie check (no Domain attribute) holds the servers to cookies.md ("no Domain") from today, so B4's
  `pp_tx` and any later cookie stay host-only. A real sign-in on three hosts needs fixture users (G2) and Q0b's auth
  suite; the leak suite's content cases already wait for them.
- D42 The `__Host-` fallback is B4's (brief); Q0a wrote the conformance table from cookies.md section 2 (12 rows,
  including the near-miss hosts `127.0.0.1`, `evil-localhost.com` and `localhost.evil.com` and `VERCEL_ENV=production`
  on http) and runs it when the module exists; request 19 asks B4 to confirm the path and signature.
- D43 The first parity run is an offline rehearsal, not a production one: the pipeline had never run end to end, a
  real run is a production read from a budget of 4, and a mechanical failure there would waste one. parity.sh gets
  no offline mode: `O1_KPQ` (already its KPQ override, used by its tests) points it at a stand-in env file with the
  offline values, so the production-reading script itself is unchanged and its real cache untouched. Counted in
  D-005 (once, or twice if ORCH counts each build).
- D44 Refused writes: v2 failed the run on any refusal, so every run failed on the build-time
  `rpc ensure_daily_debate` that the base makes too. Now `scripts/o1/parity/refusals.mjs` judges them: a refusal
  while the list is fetched (the GET write proof) fails, a head-build refusal the base build did not make (a write
  the lane adds to deploys) fails, a build refusal the base makes too is listed only; nothing is ever let through.
  On a recheck the freeze logs start empty, so its counts and refusals are its own. Not a weakened gate: v2 has
  never run as a gate (its first run is this rehearsal), and the GET write proof it serves is unchanged.
- D45 No real parity run in tick 3: each would fail on the client ids (request 21) and spend a production read, and
  the owner's message that opened the tick says "pas d'accès à la prod" (written for ORCH's G3 work; read here too,
  the stricter way). The done test's parity items wait for the owner's decision on request 21 and ORCH's go; Q0a
  returns blocked on that decision (rule 15: the G0 normalisations are the owner's).
- D46 One build path for both sides. The rehearsal's build log says why two builds never matched: the parity
  worktrees live under ROOT, so Next 16 takes ROOT's `pnpm-workspace.yaml` as the workspace root (its own warning,
  "multiple lockfiles") and every module path is `[project]/.claude/worktrees/o1-parity-<role>/...`. Client module
  ids (hashed from those paths), server chunk names and error digests (a hash of message and stack, whose frames
  name the chunks) then differ with no source change; the digests made /bts-name-all-members, a 500 offline,
  DIFFERENT in every offline run, so every kpop lane would have failed the offline gate of D-025 there, and no
  approved normalisation covers a digest. Fixing the cause instead: each side is checked out and built at
  `o1-parity-build`, then moved (`git worktree move`, through git.sh) to `o1-parity-base` or `o1-parity-head` (and
  served from the build path again, D50). Next's config (`turbopack.root`) is on the HOT list and git.sh keeps worktrees under
  `.claude/worktrees/o1-*`, so the path, not the root, is what can be made equal. A served build resolves its chunks
  from its own `.next` and reads files from its own cwd; `__dirname` and `import.meta.url` would point at the build
  path, and neither occurs in `apps/quiz/src` or `packages/*/src`. Stricter, not looser: nothing new is normalised,
  and noise that N3 hid now does not arise. N3 and N4 stay as approved.
- D47 N4 reads CR-008's "however it is cut into push tags" as: the tags leave the document entirely (where they sit
  between HTML chunks is part of the cut), the stream they carry is cut into rows (text rows on their UTF-8 byte
  length) and compared as a sorted multiset, and the rest of the document byte for byte. A stream that cannot be cut
  for certain (a push of another kind; a text row holding one of flag-off-diff's replaced names, whose length then
  no longer holds) is not re-cut: N3 then applies in place and the order still counts. The labels `flight-ids` and
  `flight-rows` name only what changed the verdict (ids: the row multisets differ without N3; rows: the document with
  N3 alone still differs). Error digests are never normalised (tested).
- D48 The CSS check of CR-009 runs on every page judged identical, not only those flag-off-diff found identical
  (stricter). flag-off-diff keeps no raw body, so compare.mjs reads each such page once more from A and B (local
  servers, GET) for its stylesheet links, and each stylesheet once per run and side (N1 shares the reads). Sheets
  are paired in link order; same-origin ones are fetched, an external one is compared by its href (no read outside
  the two servers). The asset-name rule in CSS form also covers the relative `../media/<name>.woff2` references
  Turbopack writes, plus CSS-module hashes; N1 for the UX sheet only. The first differing rule (split after each `}`)
  is reported. A page whose status changes between the two reads is DIFFERENT (the check could not run).
- D49 Two `next-server` processes of my slice 6 rehearsal were still listening on 4011 and 4012 (started 21:06:42
  UTC, the rehearsal's serve phase; cwd the deleted o1-parity-base and o1-parity-head): `next start` forks
  `next-server`, and parity.sh's cleanup killed only the subshell and its direct child. Every later parity run would
  have stopped on "port busy". I stopped those two (mine, by their start time and folders) and parity.sh's cleanup
  now walks the whole process tree (kill_tree, as gate-checks.sh and dev-multi.sh already do). At 23:19 UTC the
  gate's F0 parity run (O1's copy of parity.sh, which has the bug until this merges) had left the same pair
  (pids 95934 to 95937, cwd the deleted o1-parity-base and o1-parity-head, parent 1); my run 2, holding the parity
  lock, and the gate's spike parity, queued behind it, would both have stopped on "port busy", so I stopped them
  too (request 22). My next runs waited for the gate's spike parity before taking the lock; it left a third pair
  (12759, 12760, the same signs), stopped by my queue at 23:36 UTC before run 3.
- D50 One serving path too. The first run with one build path (run 0 below) left exactly one page DIFFERENT:
  /bts-name-all-members, a 500 offline, by its two error digests, with byte-identical stacks in both server logs.
  Next computes a digest as a hash of `err.message + err.stack` (`create-error-handler.js`), and Node writes the
  absolute path of each served chunk in the stack, so two servers in two folders give one error two digests. The
  approved rules have no digest normalisation, and asking for one (or cutting the stack in the servers, which is
  the same thing done at the source) would hide a real difference: the same message thrown from changed code. So the
  servers take one path as production does (every Vercel deploy is built and served at one path): the base build
  moves back to `o1-parity-build`, is served on port A and recorded (`scripts/o1/parity/replay.mjs`: every URL of
  the list and every same-origin stylesheet they link, status, Location, Content-Type and body, the only fields
  flag-off-diff and compare.mjs read), stops and leaves; the head takes the path and is served live on port B while
  the record answers as side A. What this costs: A is no longer fetched in the same second as B. Data cannot drift
  (the base server's reads go into the frozen state and the head replays them), and a server clock moves by the
  minute the swap takes, where prerendered pages already differ by the minutes of the head build. A request the
  record does not hold answers 404, so it can only make a page DIFFERENT. With `--keep`, the kept head build is the
  one at `o1-parity-build` (kept.json names it; gate-checks.sh reads kept.json).
- D51 result.txt holds the verdicts only (verdict, status pair, stylesheets compared, and what differs on a DIFFERENT
  page); the normalisations a page needed go to result.json. Runs 1 and 2 of the same pair gave the same verdict on
  all 60 pages, but /blindtest/group-bts streamed its Flight rows in another order on run 1's request and in the
  same order on run 2's, so run 1 listed `analytics-ref,flight-rows` for it and run 2 nothing, and the byte check of
  `--recheck` failed. What a page needed on one request is not a property of the sha pair; its verdict is. The
  `--recheck` byte check stays as it was (my own v2 check, never weakened): it now compares what must not move.
- D52 Request 23 fixed at its source, with no new rule. The boundary that raced is Next's own: "Next.Metadata", a
  Suspense boundary in a `<div hidden>` at the top of the body (`next/dist/lib/metadata/metadata.js`). Next 16 streams
  the metadata of a page rendered at request time to every user agent except an HTML-limited crawler; on the offline
  500 pages (rendered at request time) it resolved before the shell flush on one read and after it on the other.
  Prerendered pages never race: Next generates them with `allReady` (`generateStaticHTML`), whatever the timing.
  parity.sh now records both sides, the base and then the head, with replay.mjs and one header, `RECORD_UA`, which
  Next matches as an HTML-limited bot ("Slurp"): a request-time page then gets its metadata blocking in the head, as
  Bingbot, Applebot, DuckDuckBot and link previews get it; flag-off-diff and compare.mjs read the two records. Nothing
  in a response is rewritten (the head, every metadata tag, every node and every Flight row stay compared); what
  parity no longer compares is where Next puts a request-time page's metadata for a browser, a matter of timing.
  Prerendered pages are served from the build's cache whatever the header (Next's `app-page` template: with PPR off,
  the header changes only `serveStreamingMetadata` of a request-time render). Checked: `next dev` offline, the
  same page with flag-off-diff's header and with `RECORD_UA`: /bts-name-all-members 1 boundary and 0, /about 2 and 0,
  the title in the head both ways; and `replay.test.mjs` checks the header against the installed Next (`getBotType`
  says html, `shouldServeStreamingMetadata` says false, the three earlier headers say true) and that next.config.ts
  sets neither `htmlLimitedBots` nor PPR (either would change what the header selects). Why not N5 (request 23's
  option a): it is a normalisation (G0, a ruling), and on a 200 page it would not be enough: a boundary resolved
  before the flush has its title hoisted into the head, one resolved after carries it in the `S:n` segment.
  Recording the head as well also makes both sides read the same way (one tool, one header, one request at a time,
  the same order), and flag-off-diff compares two fixed records. Measured in slice 8 (section "Parity proof offline
  (slice 8)"): the 4 request-time pages of the list carry no boundary, were identical in runs 5 to 8, and the 30
  prerendered pages read the same bytes as with the old header.
- D53 parity.sh's cache key carries the harness version (sha256 of parity.sh, flag-off-diff.mjs and every module of
  `scripts/o1/parity/` that is not a test; `harness` in parity.json): a pair run under an older harness used to return
  that harness's cached verdict, and `--recheck` now needs a run of the same harness. Stricter only.

## Open points

- The freeze store holds response bodies of the parity reads (anonymous and service role) in
  `KPQ/cache/parity/<key>/freeze/` outside the repository; it is deleted at the end of a run unless `--keep`. R to
  confirm that keeping it for a recheck is acceptable.
- `kpop-parity.env` is never read by an agent: whether it carries production's VERSE_PUBLIC,
  COMMUNITY_FEATURES_ENABLED and SONGS_IS_CURATED is unknown. Parity compares base and head under the same values, so
  a missing value lowers fidelity to production, not the validity of the comparison.
- (Closed in slice 7) The CSS content gap: compare.mjs now compares every linked stylesheet (CR-009, D48).
- (Closed in slice 7) Error digests: with one build and one serving path (D46, D50) the same error has the same
  digest on both sides (/bts-name-all-members, a 500 offline, IDENTICAL in runs 1 and 2). A different error still
  has a different digest, and that stays a difference.
- The recorded sides (D50, D52) mean side A is read a minute or so before side B. Data is frozen; a server-rendered
  clock (a relative time, a countdown) could still move between the two reads. None seen offline; the first
  production run, once the owner allows it (D-025), will show whether any of the 60 pages does.
- React's text separators (request 24): a `<!-- -->` after a text that ends a render segment depends on the build
  (two pages swapped it in 1 of 14 builds). Until ORCH rules, a pair can fail on those pages; R reads the node diff.
- A parity run that crosses 00:00 UTC between its two builds compares the home page's build date (`"date"` in its
  page data, baked at build time): DIFFERENT for a reason that is not the head's. The cron window refuses a start
  from 00:00 to 01:00 only; a run started late on the previous day can still cross. Not changed in slice 8 (the
  proof runs used the committed harness); a guard (refuse to judge when the UTC date of the two builds differs) is
  a few lines if ORCH wants it.
- (Closed in slice 8) Streaming timing in the server HTML (request 23): the boundary that raced was Next's metadata
  boundary of a request-time page; both sides are now read with a header that gets blocking metadata (D52). An app
  Suspense boundary on a page rendered at request time could still settle on either side of the flush (none of the
  60 pages shows one offline: every other boundary is on a prerendered page); if one appears, the node diff in
  result.txt shows it (`<!--$-->` against `<!--$?-->`), and request 23's N5 is the rule to ask for.
- The JS chunks are still compared by name only (flag-off-diff's normalisation): a change that lives only in client
  code passes parity by design (behaviour is the lanes' e2e and R's UX runs).
- Relative times rendered on the server ("3 min ago") baked at two build times could still differ; none seen in the
  release snapshots. Slice 5 runs will tell.
- The content leak cases use the fixture names of BACKLOG 5.1 (Death Note, One Piece, Spy x Family; BTS, BLACKPINK,
  TWICE on the mirror). A K-pop list could one day show a title sharing a word with a series name; exact slugs from
  F0's fixtures (request 10) would remove that risk.
- P2's lint ("flags select(...bias...) from profiles in any code path a non-kpop build bundles") is not in Q0a's
  brief; it fits B2 (site scope) or check-site-scope. To confirm with ORCH.
- gate-checks.sh serving real builds (the link folders) and the kept parity build is proven only by a real gate run:
  Q0a's own gate (request 1: three offline site builds, parity skipped since the diff is neutral) and slice 5 (the
  kept build of a parity run, first with `O1_GATE_KEPT_OFFLINE=1`, then once for real within the budget).
- A per-site SEO gate for anime and hub (sitemap against noindex, title and self canonical; orphans; hygiene, keyed
  on the registry domain) does not exist: the existing scripts are kpop's and may not be edited. Q0a can write one
  in `apps/quiz/scripts/o1/` if ORCH wants it before launch (an O1 or H1 task otherwise).
- The kpop SEO checks on the kept build read production for every page outside the frozen state (about 700 sitemap
  pages, check:indexability's 25 quizzes and 25 groups): one parity-sized read per kpop gate, at the scripts' own
  concurrency (10, 8, 1).
- dev-multi's mirrors hold a copy of the lane's tree under `.next/`: harmless for git and tsc (tsc skips dot folders,
  vitest collects `src/**` of apps/quiz only), but a person must not edit a mirror (the next sync overwrites it).
  `--clean` removes them. The B4 conformance table and a signed-in three-site run wait for B4 and G2.
- twins.mts finds copies by consecutive normalized lines: a reformat that rewraps lines (prettier at another
  nesting depth) or an edit inside every 8 meaningful lines evades it. R's review (REVIEWER point 9) covers what the
  check cannot.
- Under the current load (load average 90 to 108) the default 5 s vitest timeout fails 12 tests of 5 files that pass
  with a longer timeout. The gate's `unit` step runs `vitest run` as is (RATCHET LAW: no test edited); if gates go red
  on these timeouts, ORCH can serialize gates against heavy builds or ask the owner.
