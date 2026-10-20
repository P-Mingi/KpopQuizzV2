# Lot (e) part 2, lane E1a: content wiring of otakuquiz.org and the editorial tools per site

Evidence on o1-scratch, numbers only. Lane E1a (the brief LE2 names K1; part 1 runs on K1). No push, no production, no
other branch written.

## 1. Loader (scripts/anime/k1/load-fixtures.mjs scratch)

| run | groups | series | arcs | characters | themes | quizzes | published |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 3 | 15 | 27 | 12 | 15 | 15 |
| 2 | 3 | 3 | 15 | 27 | 12 | 15 | 15 |
| 3 | 3 | 3 | 15 | 27 | 12 | 15 | 15 |

- Rows after run 3 on scratch: anime quizzes 15, distinct slugs 15, kpop quizzes 0, kpop groups 1; levels from
  computeSpoilerLevel: 6 quizzes above arc 0, 9 at arc 0 with no scope.
- groups.quiz_count of the three series = 5 each after three runs (the insert trigger fired only on the first).
- anime sites row: system_user_id filled (otakuquiz_team), fallback_group_slug anime-mix, each only where empty.
- Targets: scratch and dev accepted; offline, prod, production, hub and no target answer exit 2 (tested).
- `--dry-run`: plan counts only (groups=3 series=3 arcs=15 characters=27 themes=12 quizzes=15 questions=52 accounts=7).

## 2. Anime build against scratch

Build: `S/env.sh scratch -- env NEXT_PUBLIC_SITE_ID=anime NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 pnpm -C apps/quiz build`
(the two flags are the ones flags-env.md requires on a non-kpop build; without UX_V1 the hub renders the old kpop group
page), then `next start -p 3187 -H 127.0.0.1`. Server stopped after the proof.
Script: apps/quiz/e2e/o1/E1a/content-proof.py. Result line:

`hubs_200=3 facts=3 arcs=15/15 characters=22/22 (spoiler level 0) hidden=5/5 (spoiler level above 0, absent from the HTML)
themes=12/12 gated_quizzes=6/6 tagged_leaks=0/9 free_quizzes_200=9/9 series_listed=3 /groups=404 /bts-quiz=404 /idols=404`

- /death-note-quiz, /one-piece-quiz, /spy-x-family-quiz: 200 with series title, every arc name, the characters of level 0
  and every opening and ending title; the 5 characters above level 0 are not in the HTML.
- 6 fixture quizzes above arc 0: 200, data-testid spoiler-gate and the interstitial present; 9 tagged questions: none of
  their text, fun fact, clues or distinctive options is in the HTML or the flight data (0 of 9).
- 9 fixture quizzes at arc 0: 200.
- /series: 200, lists the 3 series (Death Note, One Piece, Spy x Family) with 5 quizzes each, through forSite.
- /admin, /admin/quiz/search, /admin/quiz/{id}/edit, /admin/review: 307 to /login without a session (the pages are in the
  build: app-path-routes-manifest lists the 4 under sites/[site]/(anime)/admin); /api/admin/quizzes and
  /api/admin/search-quizzes: 403 without an admin session.
- Found on the way: the [slug] route had no build-time params (kpopStaticParams returned []), and the parent layout has
  dynamicParams off, so every series hub was a 404 on a real build. generateStaticParams of
  app/sites/[site]/(anime)/[slug]/page.tsx now lists {series}-quiz and {series}-trivia of the published series and
  anime-mix-quiz when that group exists (lib/anime/directory.ts getSeriesHubSlugs, read at build time).

## 3. Unit tests and checks

- New tests (6 files, 55 cases): fixture-load.test.ts (14), directory.test.ts (6), site-insert.test.ts (5),
  editorial store.site.test.ts (3), quiz create route.site.test.ts (7), admin site-scope.test.ts (20 incl. both modes).
- `pnpm -C apps/quiz exec tsc --noEmit`: 0 errors.
- `pnpm -C apps/quiz exec vitest run src/lib src/app/api`: 2678 passed, 1 failed of 147 files (see below).
- The one failure is contract.test.ts "reads every glob of F0 ..." : it requires a twins.json row for every page under
  app/sites, and the 3 new thin admin pages have none. `S/check.sh $PWD`: twins FAIL (3 unlisted-page, the same 3 files).
  Proof the rows are the only gap: the same checker with the 3 rows of docs/o1/reports/E1a/twins-rows.json added in a
  scratch copy of twins.json answers `twins: 61 rows ... ok`. C/** was not edited (ORCH adds the rows).

## 4. kpop path

- With SITE_SCOPE off the kpop build sends no site filter on any changed read (tests: 7 admin routes, the editorial
  store, the create route group lookups) and the same insert payloads (editorial store, create route rpc payload with the
  same 11 keys, award_xp with {p_user_id, p_amount, p_reason}).
- Quiz create on a non-kpop build: direct insert with site_id and the computed level (the rpc create_quiz_bypass names no
  site), XP through award_world_xp, a group of another site refused with 400.
