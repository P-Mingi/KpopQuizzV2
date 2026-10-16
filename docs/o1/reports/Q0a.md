# Lane Q0a: the parity and leak harness

Brief: `O1/docs/o1/briefs/Q0a.md`. Worktree `ROOT/.claude/worktrees/o1-Q0a`, branch `o1/Q0a`, ports 3106 3107 3108.

## Progress

Slices: 4 of about 6 done (2026-10-16). Slice 4 started with the checkpoint merge of o1/integration (1aaf144).

| # | Slice | State |
|---|---|---|
| 1 | URL list, GET write proof, G0 normalisations, frozen data source and write guard, parity.sh v2 | done |
| 2 | Leak suite (`apps/quiz/e2e/o1/leak/`, `playwright.o1.config.ts`), `check-network-links.mts` | done |
| 3 | `gate-checks.sh` (per-site check:* gates, leak suite, lane specs), parity.sh kept-build entries | done |
| 4 | `twins.mts` (rule 18, deliverable 5) with its self-test and base baseline; dev-multi feasibility probe | done |
| 5 | `dev-multi.sh` and the cookie isolation test (needs request 18 for three dev servers at once) | next |
| 6 | Proof runs: parity determinism and planted change (budget below), gate-checks on real builds, report | |

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

Requests: `docs/o1/requests/Q0a.md` items 1 to 18 (slice 3: item 2 made final, gate.sh passes `--keep`; new 11 the
dev kpop build next to parity once G1 is open, 12 the check-site-scope interface for B2, 13 the per-site sitemap
route path, 14 the variables lane specs get; slice 4: 15 what twins.mts reads in twins.json, 16 the spike
placeholders fail the twins check, 17 check.sh merge order and evidence, 18 a dev output folder per site).

SQL files: none (the lane writes no SQL).

Owner actions: none yet. (Optional, for fidelity: the owner confirms that `KPQ/secrets/kpop-parity.env` carries the
production values of VERSE_PUBLIC, COMMUNITY_FEATURES_ENABLED and SONGS_IS_CURATED; see Open points.)

Builds and parity runs (budget D-005: at most 4 in total, never 00:00 to 01:00 UTC): 0 used. (Slice 4's two dev
probes were `next dev` with `scripts/o1/env.sh offline`, not builds.)

Production reads made by this lane: none.

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
`site`, `route`, `file` string or array, `twin` string, array or null, `mustImport` specifiers or paths, `allowed`,
`notes`; request 15), the tree under `--root`, and its baseline next to itself (O1's copy at the gate).

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
twins' shared components (29 `missing-import` against the draft rows 1, 27, 28, H-0, H-1, H-8); `[...rest]/page.tsx`
(notFound, no JSX) passes as a technical row.

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

Data drift (the cause of every false DIFFERENT in the v11 and v12 runs: play counts moving between two builds made
minutes apart, a build that timed out on Supabase): the base build records every read, the head build and both
servers replay it, so base and head render one database state. ISO timestamps are masked in the read key, so a
"last 7 days" filter computed a few minutes later reads the same rows. Determinism of the output: `result.txt` lists
per URL the verdict, the status pair and the normalisations used, plus the differing nodes of a DIFFERENT page, and
nothing that moves between runs (no time, no byte count). `--recheck` proves it on a sha pair.

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

## Open points

- The freeze store holds response bodies of the parity reads (anonymous and service role) in
  `KPQ/cache/parity/<key>/freeze/` outside the repository; it is deleted at the end of a run unless `--keep`. R to
  confirm that keeping it for a recheck is acceptable.
- `kpop-parity.env` is never read by an agent: whether it carries production's VERSE_PUBLIC,
  COMMUNITY_FEATURES_ENABLED and SONGS_IS_CURATED is unknown. Parity compares base and head under the same values, so
  a missing value lowers fidelity to production, not the validity of the comparison.
- flag-off-diff normalises hashed CSS file names but does not compare their content: a change in `globals.css` or a
  CSS module would pass parity. The brief allows no other normalisation, but a content check of the hashed
  stylesheets would be stricter, not looser. To propose to R and ORCH (a CR) in slice 5.
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
- twins.mts finds copies by consecutive normalized lines: a reformat that rewraps lines (prettier at another
  nesting depth) or an edit inside every 8 meaningful lines evades it. R's review (REVIEWER point 9) covers what the
  check cannot.
- Under the current load (load average 90 to 108) the default 5 s vitest timeout fails 12 tests of 5 files that pass
  with a longer timeout. The gate's `unit` step runs `vitest run` as is (RATCHET LAW: no test edited); if gates go red
  on these timeouts, ORCH can serialize gates against heavy builds or ask the owner.
