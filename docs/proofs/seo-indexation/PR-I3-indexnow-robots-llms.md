# PR-I3 - Bing/IndexNow + robots/llms sanity (proof)

Branch `feat/seo-indexnow-sanity` off main `d944d50`. Zero DB/DDL. Verify-and-patch-gaps.

## Verified already-correct (no change needed)
**robots** (`src/app/robots.ts`): `*` allows `/` (so every hub `/{slug}-quiz` is crawlable) and
`/api/og/`, disallows only `/api/ /auth/ /admin/ /settings/ /onboarding/`. Eight AI bots explicitly
allowed (GPTBot, ChatGPT-User, Google-Extended, anthropic-ai, ClaudeBot, PerplexityBot, Bytespider,
cohere-ai). Sitemap declared. Bing (Bingbot) is covered by `*`. No gap.

**llms.txt** (`src/app/llms.txt/route.ts`): current, force-static, lists real entry points
(/quizzes, /{group}-quiz, /{group}-trivia, /blindtest, /data/pulse, /stats, /articles). Grep for
`/games /tier-list /coer /rankings /battle` = 0 dead routes. No gap.

**IndexNow**: `src/lib/indexnow.ts` (pingIndexNow + sitemapUrls), `src/app/api/indexnow/route.ts`
(on-deploy resubmit), per-quiz publish ping from `src/app/api/quiz/create/route.ts`, and the
`indexnow.yml` workflow (resubmit on push to main, gated on the INDEXNOW_TOKEN secret = a [HUMAIN]
setup step). Key file live on prod:
```
GET https://kpopquiz.org/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt -> HTTP 200, body = the key
```
All correct.

## What ships: the IndexNow key drift guard (a unit test)
The one silent-failure mode across all of the above: the IndexNow key is used in `lib/indexnow.ts`
AND must be served verbatim at `public/<KEY>.txt`. If the key is rotated in the lib but not the file
(or the file is deleted), `api.indexnow.org` returns 403 and EVERY submission - per-publish and the
on-deploy resubmit - is silently dropped. Bing is the #1 referrer, so the failure is invisible.

`src/lib/indexnow.test.ts` (3 tests) locks it: the public key file exists, its body equals the
exported `INDEXNOW_KEY`, and the key is 32-char hex. `lib/indexnow.ts` now exports `INDEXNOW_KEY`
(the key is public by design - it is served at a URL - so exporting it is not a secret leak). This
runs on EVERY PR via the existing unit job (fast, no server), unlike the nightly crawl gates.

## Gates
`tsc --noEmit` exit 0 - unit **121/121** (118 + 3 new) - `next build` (see CI) - 0 em/en dash.
DO NOT MERGE - owner merges.
