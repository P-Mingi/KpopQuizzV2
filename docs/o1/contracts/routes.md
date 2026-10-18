# Routes (o1-contract-v1)

Code: `apps/quiz/src/lib/site/routing.ts` (rewrites, predicate, middleware step, guards, samples) and the
`routes.allow` lists of `registry.ts`. Tests: `routing.test.ts` (rewrites resolved with Next's own matcher).
Proof on a real server: the spike on branch `o1/F0s` and its `docs/o1/contracts/spike-checks.tsv` (the gate builds
and serves the three sites and checks every line).

## 1. The design (RUN-O1-PROMPT section 9, override 1)

1. No kpop page file is edited to serve another site. Every anime and hub page lives under
   `apps/quiz/src/app/sites/[site]/...`, outside the `(site)` group, with its own layout.
2. `app/sites/[site]/layout.tsx`: `generateStaticParams` returns only the build's site (`siteStaticParams()`: `[]` on
   kpop), `dynamicParams = false`, and the guard `if (!isServedSite(site)) notFound()`. The layout also renders the
   shared chrome as `app/(site)/layout.tsx` does with UX v1 on (`UxShell`, the site JSON-LD from the registry), TWINS
   row 28. The spike's layout renders no chrome: it is a routing placeholder (TWINS.md 1 rule 4).
2b. Rule 18: every page under `app/sites/[site]/` is built from its kpop twin (`TWINS.md`), imports the shared
   components of its row and serves only the sites of its rows (on any other site it calls `notFound()`: the hub
   build compiles the anime pages too). No page there exists without a TWINS row.
3. On a non-kpop build only, `next.config.ts` returns `{ beforeFiles: rewritesFor(SITE_ID), afterFiles:
   afterFilesFor(SITE_ID), fallback: fallbackFor(SITE_ID) }` from `rewrites()` and `redirectsFor(SITE_ID)` (an empty
   list) from `redirects()`. The kpop build keeps both functions exactly as today.
4. The middleware asks `middlewareStep(SITE_ID, pathname)` first. `'kpop'` runs today's middleware unchanged.
   `'not-found'` (kpop only, item 6) answers before the kpop branch with that branch's own unknown-route answer: a
   page path is rewritten to `NOT_FOUND_REWRITE`, a file path goes on (`isFilePath`). `'pass'` returns
   `NextResponse.next()` at once (no Verse gate, no kpop legacy redirect, no kpop retired-feature 410, no kpop
   unknown-route answer). `'session'` falls through to today's protected branch: a path of `SESSION_PATTERNS`
   (`/login`, and `/onboarding`, `/settings`, `/admin` with what is below: today's `needsAuth()` without the Verse
   studio; routing.test.ts reads the list from middleware.ts) that the site's own route map also knows
   (`isSessionPathFor`). Anime refreshes the session on all four; the hub on `/login` and `/settings/**` only, so the
   hub's `/admin` and `/onboarding` are its 404s, never a 307 to `/login` (R F0 r1 M1). The matcher regex is
   unchanged.
   Redirects of the session branch (`lib/supabase/middleware.ts`, B4's) stay inside the site's route map: an
   anonymous request on a protected path goes to `/login?returnTo=<path>` (a route of anime and hub); a signed-in
   request on `/login` goes to `/` with a profile, and without one to `/onboarding` on kpop and anime and to `/` on
   the hub, which has no username screen (no route, no TWINS row: a profile starts on a site, P W5 case C, where
   `create_profile_for_site` runs; the network page links the sites). Today's branch sends that last case to
   `/onboarding` on every build: B4 makes the target site-aware (request F0-21), and apis.md 3.1 and 3.2 give the hub
   the same target. The protected branch is never reached on a path the site's map does not know.
   Since PR #102 (`seo/redirects-exact`, LEDGER D-030) the kpop branch answers a retired URL 410 (`legacyAnswer`) and
   rewrites an unknown page path to `NOT_FOUND_REWRITE` (`/page-not-found`, the kpop 404 with its chrome); the step
   runs before both, so an anime or hub path never gets the kpop 410 page ("no longer on KpopQuiz") or the kpop 404
   (popular K-pop groups): it gets its site's own 404 through `[...rest]` (spike-checks.tsv: `/games`,
   `/tier-list/new`, `/page-not-found` and an unknown path are 404 on anime and hub, 410 and 404 on kpop).
5. `'/sites/'` joins `KNOWN_ROUTES` so `check:routes` passes. `isKnownRoute` itself stays the kpop predicate: the
   build guard walks every page file of the repo on every build, so a site-aware `isKnownRoute` would fail the anime
   and hub builds on the kpop pages they compile. The site-aware question is `isKnownRouteFor(site, path, flags)`:
   for kpop it returns exactly `isKnownRouteWith(path, flags)` (tested for every route of the repo and every flag
   set); for anime and hub it answers from the route map below.
6. A direct `/sites/...` request is a 404 on all three builds. Anime and hub prefix it again
   (`/sites/anime/sites/...`), which only the catch-all page `[...rest]` matches, and it calls `notFound()`. On kpop
   the `/sites/` entry of `KNOWN_ROUTES` exists for the build guard only (item 5), so the middleware step
   `'not-found'` (item 4) gives every `/sites` path that today's allowlist refuses (`isKnownWithoutSitesEntry`: the
   real predicate on the same path under an unlisted first segment) the kpop branch's own unknown-route answer: a
   page path renders the kpop 404 page through `NOT_FOUND_REWRITE`, exactly as it does on o1/integration today, and
   a file path goes on to Next as today. A `/sites` path today's allowlist knows by its suffix
   (`/sites/anime/bts-quiz`) stays `'kpop'`, as today. kpop has no `/sites` params (`siteStaticParams()` is `[]`,
   `dynamicParams = false`, the guard refuses), so every such path stays a 404.
   Open (request F0-19, ORCH): on kpop, a `/sites` path that goes on to Next (a dotted last segment, or a `-quiz` or
   `-trivia` suffix) meets the `app/sites/[site]` tree, which exists in every build. Its status is 404 as today, but
   its body is the tree's 404 (the three root-file handlers answer an empty-body or plain 404: a route handler's
   `notFound()` is an empty 404 in next 16.2.1), not the 404 of a path no route matches. No kpop page links to
   `/sites`. The ruling asked: accept it, or freeze a per-site page extension (the pages under `app/sites` named
   `page.site.tsx`, `pageExtensions` extended on anime and hub builds only), which leaves no anime or hub route in the
   kpop build at all and drops both the `/sites/` entry and the `'not-found'` step.
7. API routes and `/auth/*` routes are shared files (no rewrite) and read `SITE`. A kpop-only API or cron answers
   404 (or a no-op for crons, `cronForSite`) on other builds: B1 for crons, each owning lane for its API.

ORCH applies 3, 4 and 5 once the routing files leave the HOT list (GH merged as PR #102, D-030; the GH2 branches
still hold them): 31 added lines and 1 removed line, comments included, in `next.config.ts`, `middleware.ts` and
`route-allowlist.ts`, exactly `git diff o1/F0 o1/F0s` on those three files (rebased on PR #102's files at tick 6, the
step and the afterFiles and fallback rules added after R F0 r1).
Lanes never edit those files; a new anime or hub route is a pattern in the registry (CR) and a page under
`app/sites/[site]/`.

### How Next applies the rewrites (measured, next 16.2.1)

beforeFiles rewrites are applied in sequence, every rule once, each one seeing the path the previous rules left; they
do not stop at the first match and do not check the filesystem in between (`before_files_rewrite` routes carry no
`check`). The first spike ordering (home rule before the catch-all) sent `/` to `/sites/anime/sites/anime`. Hence the
frozen order of `rewritesFor(site)`:

| # | source | destination | why |
|---|---|---|---|
| 1 | `/:path(<CATCH_ALL_PATTERN>)` | `/sites/<site>/:path` | every public path, prefixed once |
| 2 | `/` | `/sites/<site>` | the home (rule 1 needs one character) |
| 3 | `/robots.txt`, `/sitemap.xml`, `/llms.txt` | `/sites/<site>/robots.txt` etc. | per-site root files (dotted, skipped by rule 1) |
| 3b | each of `PER_SITE_BRAND_FILES` (`/favicon.ico`, `/apple-touch-icon.png`, `/site.webmanifest`, `/og-default.png`, the logos and every other root file of `public/` but the IndexNow keys) | `/brand/<site>/<same name>` (`brandPath`) | the site's own brand file, never kpop's (R F0 r1 M2) |
| 4 | `/sites/<site>/<pretty source>` | `/sites/<site>/<internal>` | pretty URLs, matched on the prefixed path |
| after files | `/:path(<AFTER_FILES_PATTERN>)` | `/sites/<site>/:path` | a path the rules above left and no public file or static route serves |
| fallback | `/:path((?:api\|auth)/.+)` | `/sites/<site>/:path` | an `/api/` or `/auth/` path that no handler serves |

After the beforeFiles rules Next checks the filesystem for an exact match (public files and static routes), then the
afterFiles rules, then the dynamic routes, then the fallback rules (`resolve-routes.js` of next 16.2.1). Without the
afterFiles rule, a dotted path that no public file serves went on to the kpop dynamic routes: measured on the spike in
dev before the fix, anime `/x.png`, `/wp-login.php` and `/api` rendered `app/(site)/not-found.tsx` (its popular K-pop
groups, in the kpop chrome) through `app/(site)/[slug]`, and `/q/x.png` ran the kpop quiz page (a database read, 500
offline). `AFTER_FILES_PATTERN` takes every path but `/_next`, `/_vercel`, the dev overlay, `/sites` (rewritten
already) and the `/api/` and `/auth/` handlers (dynamic routes come after afterFiles; a bare `/api` or `/auth` is
taken). No kpop route may have a dotted path that the filesystem check would serve on anime or hub; today the only
one, `/llms.txt`, is rewritten by rule 3 first (routing.test.ts walks the routes of the repo).

`CATCH_ALL_PATTERN` skips a first segment `_next`, `_vercel`, `api` or `auth`, the dev overlay (`__nextjs*`), and a
path whose last segment is a file name (dot plus 1 to 12 letters or digits), so shared public files are served as
they are; a path under `/sites` is always caught, file name or not. A trailing slash is removed by Next's own redirect before
the rewrites run.

### Per-site root files (F0 decision)

`/robots.txt`, `/sitemap.xml` and `/llms.txt` of anime and hub are route handlers at
`app/sites/[site]/robots.txt/route.ts` (and `sitemap.xml/`, `llms.txt/`), reached through rule 3. `app/robots.ts`,
`app/sitemap.ts` and `app/llms.txt/route.ts` stay kpop files, untouched. This replaces COLLISION-MAP row 13's early
return dispatch inside the kpop files (no kpop file edit at all). Staging: robots disallows everything (spike); O1
and H1 write the production rules, L1 flips them.

Public files (`public/`) in folders (fonts, avatars, badges) are shared by the three builds. The root files of
`public/` are not: every one of them but the IndexNow key files is a KpopQuiz brand file or K-pop art
(`PER_SITE_BRAND_FILES`; routing.test.ts proves the list is the root of `public/` minus the key files, so a root file
added later joins it). On anime and hub each of those root paths answers the site's own file of the same name in
`public/brand/<site>/` (rule 3b), or the site's 404 while that file does not exist (the afterFiles rule): never
kpop's bytes, and browsers and crawlers that fetch `/favicon.ico` or `/apple-touch-icon.png` with no link get the
site's own. The registry's `brand.logo`, `brand.favicon`, `brand.ogTemplate` and `seo.organization.logo` of anime and
hub are such paths (tested). O1 provides `public/brand/anime/` and H1 `public/brand/hub/` (no owner in
OWNERSHIP.json yet: request F0-19). Each site's IndexNow key file is `public/<key>.txt` (all builds serve all key
files: harmless, a key only proves control of the host that lists it). The web manifest of anime and hub is
`public/brand/<site>/site.webmanifest`, answered at `/site.webmanifest` and linked by the site's metadata.

### Metadata of anime and hub pages (spike finding)

The root `app/layout.tsx` carries kpop metadata (description naming K-pop groups, keywords, authors, Open Graph,
Twitter, icons, manifest, the Pinterest tag that verifies kpopquiz.org) and the template `%s | KpopQuiz`. Until B1
makes the root layout read the registry, the `sites/[site]` layout resets every one of them (`null`, the Pinterest
tag to an empty list) and uses `title: { absolute, template }`, else the site's own 404 is titled
"OtakuQuiz | KpopQuiz". The `(site)/not-found.tsx` of kpop lists popular K-pop groups: anime and hub never reach it.
Every path of an anime or hub build that no page, public file or handler serves ends in `app/sites/[site]/[...rest]`
and the site's own `not-found.tsx` (through rule 1, the afterFiles rule or the fallback rule), with the site's
metadata, except the framework's own paths (`/_next/...`, `/_vercel/...`), whose 404 is the root one: the root
layout's metadata there is kpop's until B1 makes the root layout read the registry (B1's done test: no KpopQuiz
literal outside the registry). Measured on the spike in dev after R F0 r1: anime and hub `/x.png`, `/wp-login.php`,
`/q/x.png`, `/api`, `/api/does-not-exist`, `/auth/nope`, `/favicon.ico` and every other line of spike-checks.tsv
answer with the site's title and no K-pop string.

## 2. Pattern syntax (`routes.allow`)

| pattern | matches |
|---|---|
| `/` | the home page |
| `/series` | exactly that path |
| `/q/{slug}` | `{name}` is one segment of `[^/]+`; it may carry a literal prefix or suffix (`/{series}-quiz`, `/which-{series}-character-are-you`) |
| `/admin/**` | `**` only as the last segment: the path itself and anything below (`/admin`, `/admin/review/1`) |

The shared prefixes `/api/` and `/auth/` and the per-site root files are known on every site without a pattern.

## 3. Route map per site

### kpop (kpopquiz.org): every route of today, allowlist unchanged

New kpop routes in the run, all covered by today's prefixes (`/auth/`, `/api/`, `/admin`), so `route-allowlist.ts`
needs no kpop change: `/auth/passport/out`, `/auth/arrive`, `/auth/authorize`, `/auth/land`, `/api/passport/redeem`,
`/api/passport/revalidate`, `/api/n/me`, `/api/n/b`, `/admin/network`. kpop keeps `/auth/callback`; there is no
`/auth/confirm` on kpop. No other kpop route may be added inside the run (5.3).

### anime (otakuquiz.org)

| public path | internal page (under `app/sites/[site]/`) | owner |
|---|---|---|
| `/` | `page.tsx` | O1 |
| `/series` | `series/page.tsx` | O2 |
| `/{series}-quiz`, `/anime-mix-quiz`, `/{series}-trivia` | `[slug]/page.tsx` (dispatch on the suffix, like kpop's `[slug]`; twin `app/(site)/[slug]/page.tsx`) | O2 |
| `/q/{slug}` | `q/[slug]/page.tsx` (twin `app/(site)/q/[slug]/`) | O3 |
| `/which-{series}-character-are-you` | `which-character/[series]/page.tsx` (rule 4; twin `app/(site)/personality/[group]/page.tsx`) | O5 |
| `/{series}-openings-quiz` | rule 4 to `blindtest/series-{series}` | O6 |
| `/blindtest`, `/blindtest/series-{series}` | `blindtest/page.tsx`, `blindtest/[mode]/page.tsx` (the twin folder name; twin `app/(site)/blindtest/[mode]/page.tsx`, group playlist branch) | O6 |
| `/name-all/{series}/{set}` | `name-all/[series]/[set]/page.tsx` (twin `app/(site)/name-all/[group]/page.tsx`; the `{set}` level selects a set by URL, no set picker: the twin has none, a picker is a CR) | O5 |
| this or that | no route: a bonus inside quiz results and hubs, as on kpop (`components/this-or-that/bonus.tsx`) | O5 |
| `/daily` | `daily/route.ts` (redirects to today's quiz, like kpop) | O1 |
| `/opening-of-the-day` | `opening-of-the-day/page.tsx` (twin `app/(site)/blindtest/[mode]/page.tsx`, mode `daily`) | O6 |
| `/quizzes`, `/quizzes/popular-today`, `/quizzes/popular-this-week`, `/quizzes/popular-this-month` | `quizzes/page.tsx` and one folder per list (CR-001, TWINS rows 31 to 31d) | O2 |
| `/new`, `/most-liked`, `/trending` | one folder each (CR-001, TWINS rows 32 to 32c) | O2 |
| `/trivia` | `trivia/page.tsx` (CR-001, TWINS row 33) | O2 |
| `/faq`, `/leaderboard`, `/dmca` | one folder each (CR-001, TWINS rows 34 to 36; Team accounts off the leaderboard) | O1 |
| `/create/**` | `create/...` | O4 |
| `/me`, `/u/{username}`, `/settings/**` | `me/`, `u/[username]/`, `settings/...` | P1 |
| `/login`, `/onboarding/**` | `login/`, `onboarding/` | P1 |
| `/notifications`, `/search` | `notifications/`, `search/` | O1 (B2 scope) |
| `/community/**` | `community/...` | O1 |
| `/about`, `/editorial-policy`, `/privacy`, `/terms`, `/contact` | one folder each | O1 |
| `/admin/**` (incl. `/admin/review`) | `admin/...` | E1b (review), O1 (shell) |
| `/auth/confirm`, `/auth/arrive`, `/auth/authorize`, `/auth/land`, `/auth/passport/out` | shared `app/(site)/auth/...` handlers reading `SITE` | B4, B7 |
| `/api/*` | shared `app/api/...` | each lane |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | `robots.txt/route.ts`, `sitemap.xml/route.ts`, `llms.txt/route.ts` | O1 |
| OG images | the twin routes `app/api/og/[slug]` and `app/api/og/group/[slug]`, reading the registry brand (typographic, no character art; no new OG route; TWINS rows 30 and 30b); the default OG image is `brand.ogTemplate` | O1 |
| anything else | `[...rest]/page.tsx` (notFound, the spike's routing code) and `not-found.tsx` | O1; the 404 follows the twin `app/(site)/not-found.tsx` (TWINS rows 27 and H-8); the spike's `not-found.tsx` is a routing placeholder |

The internal path of a pretty URL also answers when requested directly (`/blindtest/series-x` is public by
BACKLOG; `/which-character/x` mirrors kpop's `/personality/x`): its page sets the canonical to the pretty URL.

### hub (fanquiz.org)

| public path | internal page | owner |
|---|---|---|
| `/` | `page.tsx` (network page) | H1 |
| `/privacy` | `privacy/page.tsx` | H1 |
| `/passport` | `passport/page.tsx` | H1 |
| `/u/{username}` | `u/[username]/page.tsx` (always noindex) | H1 |
| `/settings/**` | `settings/...` (W4) | H1 |
| `/login` | `login/page.tsx` | H1 |
| `/directory` | `directory/page.tsx` (optional, noindex, nofollow) | H1 |
| `/auth/*`, `/api/*` | shared handlers | B4, B6, B7 |
| `/robots.txt`, `/sitemap.xml` (only `/` and `/privacy`), `/llms.txt` | route handlers as on anime | H1 |

Reserved for P2, 404 now: `/auth/start`, `/auth/continue` (no handler exists). Later, not in the run: `/join/{code}`,
`/search`, `/cup`.

## 4. URL scheme of otakuquiz.org (5.1, never extendable)

- Series hub: `/{series-slug}-quiz` on the `[slug]` route; series slug = `groups.slug` of the anime topic,
  `^[a-z0-9-]{1,60}$`, globally unique across sites.
- Reserved quiz slugs: `{series}-quiz`, `{series}-test`, `{series}-trivia`.
- Quizzes: `/q/{slug}`, with the existing global slug uniqueness.
- Anime Mix: slug `anime-mix` (`/anime-mix-quiz`).
- Query parameters `?arc`, `?q`, `?role`, `?progress` are never indexable (canonical to the clean URL).
- No character page and no arc page at launch.

## 5. Must 404 on anime and hub

Every kpop-only page family, one sample each: `KPOP_ONLY_SAMPLES` in routing.ts (the landings
`/guess-the-kpop-idol`, `/guess-the-kpop-song`, `/kpop-true-or-false`, `/easy-kpop-quizzes`, `/hard-kpop-quizzes`,
`/kpop-quiz-2026`, `/idols-in-kdramas`, `/pt`, `/fr/`, `/es/`, `/id/`; the Verse; live and join; embed; the data,
article, news and creator pages; the V12 pretty URLs; share links; the builder; the UX kit). Tested:
`isKnownRouteFor` is false for each on anime and hub.

CR-001 (rule 18): the kpop browse, help and board pages whose anime twin exists (`/quizzes` and its three lists,
`/new`, `/most-liked`, `/trending`, `/trivia`, `/faq`, `/leaderboard`, `/dmca`) are `TWIN_SAMPLES`: routes of anime,
404 on the hub. News, articles, data pages (`/stats`, `/data/*`) and ranked stay must-404 on anime (code F).

kpop paths shaped like an anime route (`KPOP_DATA_SAMPLES`: `/bts-quiz`, `/kpop-demon-hunters-quiz`,
`/general-kpop-quiz`, `/twice-trivia`, `/blindtest/ranked`) are anime route shapes: they 404 there because no anime
series or blind test mode has the slug (the `[slug]` page reads through the site scope; the `[mode]` page has no ranked
mode, code F), and they are unknown on the hub.

Q0a's route-leak suite requests both lists on the anime and hub builds and expects 404 for each.

## 6. Spike results (branch `o1/F0s`)

The gate builds the spike tip for the three sites, serves each build with `next start` and checks every line of
`spike-checks.tsv` (the evidence is the gate's `spike-routes.log`). On 2c3d39a (the gate of bf37460) its 39 lines
passed (kpop 8, anime 20, hub 11); the kpop unknown URL line waits as a comment (the gate's serving, request F0-18).
After R F0 r1 the file has 66 lines (kpop 10, anime 35, hub 21): the kpop `/sites` page paths, the anime and hub root
brand files (404 until their brand files exist, never kpop's 200), the hub's `/admin` and `/onboarding` (404, never
a 307), the dotted paths no public file serves and the unknown `/api/` and `/auth/` paths (the site's 404), and two
shared public files (200). Measured in dev offline before the gate (`next dev`, one build at a time): every line
answers as written, and no anime or hub body carries a K-pop string. No line depends on catalog data (D-026).
On 8b4be8f (the gate of 0570292) 63 of the 66 lines passed; kpop `/sites/anime`, `/sites/kpop` and `/sites/hub`
read 500. They take the kpop branch's not-found rewrite (section 1, M3), and under the gate's `next start -H
127.0.0.1` next 16.2.1 proxies every middleware rewrite as external (its URL normalisation turns `127.0.0.1` into
`localhost` on the middleware side only); `o1/integration` answers the same paths 500 there too, and both answer 404
with the kpop 404 page when served at `localhost` (measured in dev). The lines stay as the brief fixes them; the
gate's serving is request F0-22. Details in `docs/o1/reports/F0.md`.
