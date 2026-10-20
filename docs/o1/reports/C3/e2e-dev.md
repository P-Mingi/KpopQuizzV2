# E2E pass on o1-dev, lane C3

- date: 2026-10-20T12:03:26.946Z
- commit: df6a24ea5f87; o1/integration at 9ee1435786b7
- command: `bash apps/quiz/e2e/o1/C3/run-dev.sh`
- servers: kpop.localhost, anime.localhost, hub.localhost on ports 3115,3116,3117 (next start, builds against o1-dev, PASSPORT_JUMP on with run-only secrets)
- B3/jump: not run with the service role, as the lane rule forbids it on o1-dev (the C3 passport spec covers the jump with a fixture account)
- total: 27 pass, 12 fail, 13 skip

## Per spec file

| spec | pass | fail | skip |
| --- | ---: | ---: | ---: |
| e2e/o1/B3/jump.o1.ts | 0 | 0 | 2 |
| e2e/o1/C3/network.o1.ts | 14 | 4 | 1 |
| e2e/o1/dev-multi/cookies.o1.ts | 1 | 0 | 1 |
| e2e/o1/leak/canonical-og.o1.ts | 1 | 2 | 0 |
| e2e/o1/leak/content-leak.o1.ts | 0 | 2 | 8 |
| e2e/o1/leak/link-leak.o1.ts | 5 | 1 | 0 |
| e2e/o1/leak/no-netme.o1.ts | 3 | 0 | 0 |
| e2e/o1/leak/route-leak.o1.ts | 2 | 2 | 0 |
| e2e/o1/leak/spoiler-jsonld.o1.ts | 0 | 0 | 1 |
| e2e/o1/leak/string-leak.o1.ts | 1 | 1 | 0 |

## Per test

### e2e/o1/B3/jump.o1.ts

- SKIP the passport jump kpop -> anime (o1-scratch) > a signed-in kpop fan lands signed in on anime and gets its anime stamp [lanes]: needs SUPABASE_SERVICE_ROLE_KEY
- SKIP the passport jump kpop -> anime (o1-scratch) > signed out on kpop: the same link lands signed out on anime, nothing written [lanes]: needs SUPABASE_SERVICE_ROLE_KEY

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
- FAIL passport > /auth/passport/out on kpop redirects to the anime origin [lanes]: Error: /auth/passport/out on kpop answers a redirect; Expected: < 400; Received: 404
- FAIL passport > a fixture account signed in on kpop follows /auth/passport/out and lands signed in on anime [lanes]: Error: /auth/passport/out on kpop answers a redirect; Expected: < 400; Received: 404
- FAIL passport > signed out on kpop: the same link lands signed out on anime [lanes]: Error: /auth/passport/out on kpop answers a redirect; Expected: < 400; Received: 404
- PASS kpopquiz (kpop) > / answers 200 with no anime word in the HTML [lanes]
- SKIP kpopquiz (kpop) > one quiz page answers 200 with no anime word in the HTML [lanes]: no kpop quiz on o1-dev (content not loaded: its quizzes are the anime fixtures)
- FAIL kpopquiz (kpop) > no quiz of the anime site on kpop: not listed on / or the lists, /q/<anime slug> answers 404 [lanes]: Error: anime quizzes listed on kpop; 32 entries, first: "/ links /q/fx-death-note-basics-rules-and-creators" "/ links /q/fx-one-piece-basics-creator-and-crew"

### e2e/o1/dev-multi/cookies.o1.ts

- SKIP the dev fallback name of the __Host- transaction cookie (B4 helper, cookies.md section 2) [dev-multi]: B4's helper src/lib/passport/tx-cookie.ts does not exist yet (Q0a request 19; O1_TX_COOKIE_MODULE overrides the path)
- PASS dev-multi: three hosts, three sessions > each host keeps its own session cookies; a real request carries only its host's [dev-multi]

### e2e/o1/leak/canonical-og.o1.ts

- PASS canonical and OG: every kpop page names kpop only [leak]
- FAIL canonical and OG: every anime page names anime only [leak]: Error: identity violations on anime; 137 entries, first: "/ jsonld-cross-world https://kpopquiz.org" "/ jsonld-cross-world https://kpopquiz.org"
- FAIL canonical and OG: every hub page names hub only [leak]: Error: identity violations on hub; 4 entries, first: "/directory og-site-name KpopQuiz (want FanQuiz)" "/directory og-url-foreign https://kpopquiz.org/groups"

### e2e/o1/leak/content-leak.o1.ts

- FAIL content leak: no anime fixture row on kpop lists, sitemap, search and llms.txt [leak]: Error: anime rows on kpopquiz.org; 28 entries, first: "/quizzes Death Note" "/quizzes One Piece"
- FAIL content leak mirror: no kpop row on anime lists, sitemap, search and llms.txt [leak]: Error: kpop rows on otakuquiz.org; 15 entries, first: "/ BTS" "/ BLACKPINK"
- SKIP content leak, signed in: no anime fixture row in the kpop bell (/notifications) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime bell (/notifications) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP content leak, signed in: no anime fixture row in the kpop badge shelf (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime badge shelf (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP content leak, signed in: no anime fixture row in the kpop passport stats (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime passport stats (/me) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP content leak, signed in: no anime fixture row in the kpop activity (/u/<fixture>) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)
- SKIP P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime activity (/u/<fixture>) [leak]: needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)

### e2e/o1/leak/link-leak.o1.ts

- PASS link leak: cross-site links on kpop are on the allowlist (server HTML) [leak]: pages: 32 pages; allowlist /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-C3/docs/o1/contracts/link-allowlist.json
- PASS link leak: cross-site links on kpop are on the allowlist (hydrated DOM) [leak]
- FAIL link leak: cross-site links on anime are on the allowlist (server HTML) [leak]: Error: cross-site link violations on anime; 22 entries, first: "/ domain-in-html kpopquiz.org x32: \":\"KpopQuiz\",\"alternateName\":\"kpopquiz.org\",\"url\":\"https://kpopquiz..." "/series domain-in-html kpopquiz.org x10: \":\"KpopQuiz\",\"alternateName\":\"kpopquiz.org\",\"url\":\"https://kpopquiz..."
- PASS link leak: cross-site links on anime are on the allowlist (hydrated DOM) [leak]
- PASS link leak: cross-site links on hub are on the allowlist (server HTML) [leak]: pages: 4 pages; allowlist /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-C3/docs/o1/contracts/link-allowlist.json
- PASS link leak: cross-site links on hub are on the allowlist (hydrated DOM) [leak]

### e2e/o1/leak/no-netme.o1.ts

- PASS no /api/n/me in the server HTML of 20 kpop pages [leak]: pages: 20 pages read: 5x 200, 15x 404
- PASS no /api/n/me in the server HTML of 20 anime pages [leak]: pages: 20 pages read: 17x 200, 2x 307, 1x 404
- PASS no /api/n/me in the server HTML of 20 hub pages [leak]: pages: 4 pages read: 4x 200

### e2e/o1/leak/route-leak.o1.ts

- FAIL route leak: every kpop route answers 404 on anime [leak]: Error: kpop routes reachable on anime; 3 entries, first: "/es/ answered 308 -> /es" "/fr/ answered 308 -> /fr"
- FAIL route leak: every kpop route answers 404 on hub [leak]: Error: kpop routes reachable on hub; 4 entries, first: "/daily answered 307 -> /quizzes" "/es/ answered 308 -> /es"
- PASS site identity: the anime server serves anime [leak]
- PASS site identity: the hub server serves hub [leak]

### e2e/o1/leak/spoiler-jsonld.o1.ts

- SKIP spoiler JSON-LD hook: cases are registered [leak]: no case yet: O3 adds apps/quiz/e2e/o1/O3/leak-cases.json (key spoilerJsonLd)

### e2e/o1/leak/string-leak.o1.ts

- FAIL string leak: no K-pop string on anime pages (P2) [leak]: Error: marker strings on anime; 45 entries, first: "/ marker-kpop-brand x41: s SEVENTEEN All groups © 2026 KpopQuiz. Group photos belong to their" "/ marker-kpop-genre x11: ty Leaderboard Create Sign in K-pop Quiz Are you a real fan? Prov"
- PASS string leak: no anime string on kpop pages (P2 mirror) [leak]: pages: 32 pages; contract F0 registry and routing (apps/quiz/src/lib/site)
