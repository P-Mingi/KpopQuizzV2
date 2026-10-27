# E2E pass on o1-dev after the fix lot, lane O1

- before (docs/o1/reports/C3/e2e-dev.md, commit df6a24ea5f87): 27 pass, 12 fail, 13 skip (the jump skipped without the service role)
- after (this file): 41 pass, 0 fail, 11 skip, the jump (B3/jump, 2 tests) passes end to end
- command: `bash apps/quiz/e2e/o1/O1/run-dev.sh --with-jump`, which sets SITE_SCOPE=1 and runs C3's `run-dev.sh` with `--rebuild`.
  C3's script starts the servers with SITE_SCOPE=1 but builds them without it, so the kpop pages prerendered at build (home, /new,
  /trending, /groups, /leaderboard) kept the anime fixtures in their HTML. On a Vercel project the flag is on for the build too.
  Run with `bash apps/quiz/e2e/o1/C3/run-dev.sh --with-jump` alone, two specs fail for that reason only
  (content-leak on kpop, C3 "no quiz of the anime site on kpop"); the same one-line change in C3's build line (`SITE_SCOPE=1` before
  `npm run build`) gives the same result, C3 owns that file.
- the 11 skips are none of them an app defect: 8 need a fixture sign-in on the dev branch (Q0b auth suite, owner gates G1 and G2),
  1 needs a kpop quiz on o1-dev (the dev branch holds the anime fixtures only), 1 needs B4's tx-cookie helper (not written yet),
  1 waits for O3's leak cases (spoiler JSON-LD)

Below, the report as the script wrote it.


- date: 2026-10-20T13:25:44.878Z
- commit: d658446f855e; o1/integration at da33e525834f
- command: `bash apps/quiz/e2e/o1/C3/run-dev.sh`
- servers: kpop.localhost, anime.localhost, hub.localhost on ports 3100,3101,3102 (next start, builds against o1-dev, PASSPORT_JUMP on with run-only secrets)
- B3/jump: ran with the service role (creates its own user on o1-dev)
- total: 41 pass, 0 fail, 11 skip

## Per spec file

| spec | pass | fail | skip |
| --- | ---: | ---: | ---: |
| e2e/o1/B3/jump.o1.ts | 2 | 0 | 0 |
| e2e/o1/C3/network.o1.ts | 18 | 0 | 1 |
| e2e/o1/dev-multi/cookies.o1.ts | 1 | 0 | 1 |
| e2e/o1/leak/canonical-og.o1.ts | 3 | 0 | 0 |
| e2e/o1/leak/content-leak.o1.ts | 2 | 0 | 8 |
| e2e/o1/leak/link-leak.o1.ts | 6 | 0 | 0 |
| e2e/o1/leak/no-netme.o1.ts | 3 | 0 | 0 |
| e2e/o1/leak/route-leak.o1.ts | 4 | 0 | 0 |
| e2e/o1/leak/spoiler-jsonld.o1.ts | 0 | 0 | 1 |
| e2e/o1/leak/string-leak.o1.ts | 2 | 0 | 0 |

## Per test

### e2e/o1/B3/jump.o1.ts

- PASS the passport jump kpop -> anime (o1-scratch) > a signed-in kpop fan lands signed in on anime and gets its anime stamp [lanes]
- PASS the passport jump kpop -> anime (o1-scratch) > signed out on kpop: the same link lands signed out on anime, nothing written [lanes]

### e2e/o1/C3/network.o1.ts

- PASS otakuquiz (anime) > / answers 200 in the anime theme [lanes]
- PASS otakuquiz (anime) > a kpop-only path answers 404 [lanes]
- PASS otakuquiz (anime) > /series lists the anime series [lanes]
- PASS otakuquiz (anime) > /death-note-quiz shows the facts, arcs, characters and openings blocks [lanes]
- PASS otakuquiz (anime) > the fixture files hold quizzes above arc 0 [lanes]
- PASS otakuquiz (anime) > /q/fx-death-note-basics-rules-and-creators: the interstitial shows, no tagged question in the HTML or JSON-LD [lanes]
- PASS otakuquiz (anime) > /q/fx-death-note-part-2-new-detectives: the interstitial shows, no tagged question in the HTML or JSON-LD [lanes]
- PASS otakuquiz (anime) > /q/fx-death-note-odd-one-out: the interstitial shows, no tagged question in the HTML or JSON-LD [lanes]
- PASS otakuquiz (anime) > /q/fx-one-piece-east-blue-villains: the interstitial shows, no tagged question in the HTML or JSON-LD [lanes]
- PASS otakuquiz (anime) > /q/fx-one-piece-odd-one-out: the interstitial shows, no tagged question in the HTML or JSON-LD [lanes]
- PASS otakuquiz (anime) > /q/fx-spy-x-family-season-2: the interstitial shows, no tagged question in the HTML or JSON-LD [lanes]
- PASS fanquiz (hub) > / answers 200 signed out with one card per network site, linking to the registry origins [lanes]
- PASS fanquiz (hub) > signed in (a fixture account) it shows the passport with the sites joined [lanes]: passport: @o1_dual shows: KpopQuiz, OtakuQuiz
- PASS passport > /auth/passport/out on kpop redirects to the anime origin [lanes]
- PASS passport > a fixture account signed in on kpop follows /auth/passport/out and lands signed in on anime [lanes]: jump: o1_dual: chain of 5 requests, anime membership active
- PASS passport > signed out on kpop: the same link lands signed out on anime [lanes]
- PASS kpopquiz (kpop) > / answers 200 with no anime word in the HTML [lanes]
- SKIP kpopquiz (kpop) > one quiz page answers 200 with no anime word in the HTML [lanes]: no kpop quiz on o1-dev (content not loaded: its quizzes are the anime fixtures)
- PASS kpopquiz (kpop) > no quiz of the anime site on kpop: not listed on / or the lists, /q/<anime slug> answers 404 [lanes]

### e2e/o1/dev-multi/cookies.o1.ts

- SKIP the dev fallback name of the __Host- transaction cookie (B4 helper, cookies.md section 2) [dev-multi]: B4's helper src/lib/passport/tx-cookie.ts does not exist yet (Q0a request 19; O1_TX_COOKIE_MODULE overrides the path)
- PASS dev-multi: three hosts, three sessions > each host keeps its own session cookies; a real request carries only its host's [dev-multi]

### e2e/o1/leak/canonical-og.o1.ts

- PASS canonical and OG: every kpop page names kpop only [leak]
- PASS canonical and OG: every anime page names anime only [leak]
- PASS canonical and OG: every hub page names hub only [leak]

### e2e/o1/leak/content-leak.o1.ts

- PASS content leak: no anime fixture row on kpop lists, sitemap, search and llms.txt [leak]
- PASS content leak mirror: no kpop row on anime lists, sitemap, search and llms.txt [leak]
- SKIP content leak, signed in: no anime fixture row in the kpop bell (/notifications) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime bell (/notifications) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP content leak, signed in: no anime fixture row in the kpop badge shelf (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime badge shelf (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP content leak, signed in: no anime fixture row in the kpop passport stats (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime passport stats (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP content leak, signed in: no anime fixture row in the kpop activity (/u/<fixture>) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime activity (/u/<fixture>) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)

### e2e/o1/leak/link-leak.o1.ts

- PASS link leak: cross-site links on kpop are on the allowlist (server HTML) [leak]: pages: 32 pages; allowlist /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-O1/docs/o1/contracts/link-allowlist.json
- PASS link leak: cross-site links on kpop are on the allowlist (hydrated DOM) [leak]
- PASS link leak: cross-site links on anime are on the allowlist (server HTML) [leak]: pages: 40 pages; allowlist /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-O1/docs/o1/contracts/link-allowlist.json
- PASS link leak: cross-site links on anime are on the allowlist (hydrated DOM) [leak]
- PASS link leak: cross-site links on hub are on the allowlist (server HTML) [leak]: pages: 4 pages; allowlist /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-O1/docs/o1/contracts/link-allowlist.json
- PASS link leak: cross-site links on hub are on the allowlist (hydrated DOM) [leak]

### e2e/o1/leak/no-netme.o1.ts

- PASS no /api/n/me in the server HTML of 20 kpop pages [leak]: pages: 20 pages read: 5x 200, 15x 404
- PASS no /api/n/me in the server HTML of 20 anime pages [leak]: pages: 20 pages read: 17x 200, 2x 307, 1x 404
- PASS no /api/n/me in the server HTML of 20 hub pages [leak]: pages: 4 pages read: 4x 200

### e2e/o1/leak/route-leak.o1.ts

- PASS route leak: every kpop route answers 404 on anime [leak]: contract: F0 registry and routing (apps/quiz/src/lib/site); 49 paths
- PASS route leak: every kpop route answers 404 on hub [leak]: contract: F0 registry and routing (apps/quiz/src/lib/site); 83 paths
- PASS site identity: the anime server serves anime [leak]
- PASS site identity: the hub server serves hub [leak]

### e2e/o1/leak/spoiler-jsonld.o1.ts

- SKIP spoiler JSON-LD hook: cases are registered [leak]: no case yet: O3 adds apps/quiz/e2e/o1/O3/leak-cases.json (key spoilerJsonLd)

### e2e/o1/leak/string-leak.o1.ts

- PASS string leak: no K-pop string on anime pages (P2) [leak]: pages: 40 pages; contract F0 registry and routing (apps/quiz/src/lib/site)
- PASS string leak: no anime string on kpop pages (P2 mirror) [leak]: pages: 32 pages; contract F0 registry and routing (apps/quiz/src/lib/site)
