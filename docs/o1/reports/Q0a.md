# Lane Q0a: the parity and leak harness

Brief: `O1/docs/o1/briefs/Q0a.md`. Worktree `ROOT/.claude/worktrees/o1-Q0a`, branch `o1/Q0a`, ports 3106 3107 3108.

## Progress

Slices: 2 of about 5 done (2026-10-16).

| # | Slice | State |
|---|---|---|
| 1 | URL list, GET write proof, G0 normalisations, frozen data source and write guard, parity.sh v2 | done |
| 2 | Leak suite (`apps/quiz/e2e/o1/leak/`, `playwright.o1.config.ts`), `check-network-links.mts` | done |
| 3 | `gate-checks.sh` (per-site check:* gates, leak suite, lane specs) | next |
| 4 | `dev-multi.sh` and the cookie isolation test | |
| 5 | Proof runs: parity determinism and planted change (budget below), leak suite on the gate's site builds, report | |

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
`O1_LEAK_REQUIRE` names the site (D9).

Requests: `docs/o1/requests/Q0a.md` items 1 to 10 (new in slice 2: 6 allowlist JSON in F0's contract, 7
`data-site` on every anime and hub page, 8 O3's spoiler cases file, 9 lane specs named `*.o1.ts`, 10 fixture slugs).

SQL files: none (the lane writes no SQL).

Owner actions: none yet. (Optional, for fidelity: the owner confirms that `KPQ/secrets/kpop-parity.env` carries the
production values of VERSE_PUBLIC, COMMUNITY_FEATURES_ENABLED and SONGS_IS_CURATED; see Open points.)

Builds and parity runs (budget D-005: at most 4 in total, never 00:00 to 01:00 UTC): 0 used.

Production reads made by this lane: none.

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
