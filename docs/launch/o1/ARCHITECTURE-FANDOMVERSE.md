# FandomVerse: one domain, sub-folders (lane 1, 2026-10-28)

Why Vercel Microfrontends and not a multi-zones rewrite (feasibility checked against the docs and the package source first):
1. Vercel routes `/anime/**` to the `otakuquiz` project inside its own network, in the same request: no rewrite to a `*.vercel.app` URL, so the SSO wall of those URLs (all_except_custom_domains) is never in the way and needs no bypass secret.
2. The `otakuquiz` deployments stay reachable only through fandomverse.org/anime (their own URLs stay protected): nothing is served on two public URLs, and branch previews of both projects are paired by Vercel.
3. The anime build is a plain Next.js app with `basePath: '/anime'`; its pages, `/anime/_next` assets, route handlers, OG routes and public files all live under the one routed prefix `/anime/:path*`.
4. Blocker checked and avoided: the docs say `withMicrofrontends` does not support `basePath`; the reason is its automatic asset prefix (`/vc-ap-<hash>`), so the anime build skips that transform (`skipTransforms: ['assetPrefix', 'rewrites']`, an option of the package) and keeps Next's default asset prefix, which is the base path.
5. kpopquiz.org is not in the group and its build is untouched: the wiring runs only when the site of the build is `hub` or `anime`; the one new dependency is `@vercel/microfrontends` 2.4.1 (exact pin), for the build-time config check and the local proxy.

(The rest of this file is the reference: what each piece does, what the owner sets in Vercel, how to run it locally.)

## 1. The shape

| address | Vercel project | build (`NEXT_PUBLIC_SITE_ID`) | Next `basePath` | in the group |
|---|---|---|---|---|
| https://fandomverse.org/ and every path not below /anime | `fandomverse` (renamed from `fanquiz`) | `hub` | none | yes, default application |
| https://fandomverse.org/anime and everything below it | `otakuquiz` | `anime` | `/anime` | yes, child (routing `/anime/:path*`) |
| https://kpopquiz.org | `kpopquiz` | unset (kpop) | none | no |

- The three projects build `apps/quiz`. The group is read from `apps/quiz/microfrontends.json` in the deployment of the default
  application (`fandomverse`). kpopquiz.org is in no group: Vercel reads the file only for the projects of a group, and the kpop
  build never calls the package (`next.config.ts` exports today's object when the site is kpop).
- Vercel routes `/anime/**` of fandomverse.org to the production deployment of `otakuquiz` in the same request (no proxy hop).
  A branch URL of `fandomverse` pairs with the `otakuquiz` deployment of the same branch, else the group's fallback environment
  (Production by default). The anime `*.vercel.app` URLs keep their protection (all_except_custom_domains): they are never a
  public origin and nothing is served twice.
- Every address of the anime build is under /anime: its pages, its route handlers (`/anime/api/**`, `/anime/auth/**`), its OG
  image routes, its public files, `/anime/_next/static/**` (Next's asset prefix is the base path) and `/anime/_next/image`.
  The package's own asset prefix (`/vc-ap-<hash>`) is skipped on the anime build (`skipTransforms: ['assetPrefix', 'rewrites']`):
  the docs say the package does not support a basePath with it, and the base path already gives every asset a routed path.
- `public/` is one folder for the three builds, so a public file exists under both zones (`/x.png` on the hub and `/anime/x.png`
  on anime). Pages only reference their own zone's copy; no page is reachable on two public URLs.

## 2. One source for the base path

- The registry `url` of a site is its base URL: `https://fandomverse.org/anime` for OtakuQuiz (lane 2's values). Its path is the
  build's base path: `basePathOf(url)` in `lib/site/base-path.ts`; `next.config.ts` sets `basePath: basePathOf(SITE.url)` on the
  hub and anime builds only (empty on the hub, so no key). There is no second list.
- Server code (route handlers, middleware, server components and libraries): `withBasePath(path)` for an address the browser
  requests (a redirect built from `request.url`, a `Location`, a plain `<a href>`, an `<img src>`, a form action, an HTML string);
  `joinSiteUrl(siteUrl, path)` for an absolute URL (the home of a site in a sub-folder is `https://fandomverse.org/anime`, without
  the trailing slash that Next answers with a 308); `netBase(site, env)` for the base URL of another site on this deployment.
- A module that can reach a client bundle never imports `base-path.ts` (a new module in a shared client component would change
  kpopquiz.org's client graph, which P1's `kpop-chunks.sh` checks). It reads the constant Next inlines from `basePath` instead:
  `const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';` then `` `${BASE_PATH}/api/...` `` or
  `BASE_PATH ? BASE_PATH + path : path`. On kpop and the hub the constant is `''` and the minifier folds it away: the code is
  today's, byte for byte (section 8). `base-path-sinks.test.ts` refuses a bare root-relative address at a browser sink in any
  module an anime or hub page reaches.
- Never write the base path for next/link, `router.push`, `redirect()` of next/navigation or a relative metadata URL (the
  `metadataBase` of an anime page is `https://fandomverse.org/anime`, and Next joins its path): those add it themselves.
- `request.nextUrl.pathname` and `usePathname()` have no base path; `request.url` and `window.location` have it. A return path
  (`returnTo`, `next`) is a site path: strip the base path of a browser path before using it as one.
- Between the hub and /anime a link is a full page load: a plain `<a>` with an absolute URL (`homeUrl`, `editorialHref`,
  `netBase`). Never next/link from the hub to /anime: the hub app would treat the same-origin URL as its own and navigate on the
  client. The anime app sees every hub URL as outside its base path and loads it as a new page.
- `NEXT_PUBLIC_NET_ORIGINS` (dev and staging) keeps bare origins, as flags-env.md 4 says: the sub-folder comes from the registry
  (`netBase`). On one origin: `hub=http://localhost:3024,anime=http://localhost:3024`.
- Lane 3 (`o1/fv-l3`) added `lib/auth/site-base.ts` for the sign-in and passport routes. At merge, its `SITE_BASE_PATH[site]`
  should read `basePathOf(REGISTRY[site].url)`, `siteOrigin` should be `originOf(netOrigin(site, env))` and `siteBase` should be
  `netBase(site, env)` (all three in `lib/site/base-path.ts`), so the base path has one source.

## 3. SEO

- **home headers**: the home of each build carries the headers of its other pages: `/` on the hub and `/anime` on OtakuQuiz answer
  `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy: frame-ancestors 'self'`, and `X-Robots-Tag: noindex, nofollow` while
  `NET_INDEXING` is off (`curl -sI https://fandomverse.org/anime`).
- **noindex by host**: on the hub and anime builds `X-Robots-Tag: noindex, nofollow` is added only on `*.vercel.app` hosts of a
  production build, and on every host of a preview or development build, whatever `NET_INDEXING` says; fandomverse.org and any
  other domain of a production project answer what the page says. There is no "every host but fandomverse.org" rule.
- **robots.txt**: one file, https://fandomverse.org/robots.txt, answered by the hub: its rules, then the same rules of every site in
  its sub-folders under their base path (`Disallow: /anime/api/`, `Allow: /anime/api/og/`, ...), then one `Sitemap:` line, the
  index. The anime build answers /anime/robots.txt with a 404.
- **sitemaps**: https://fandomverse.org/sitemap.xml is a sitemap index: https://fandomverse.org/sitemap-hub.xml (the hub's own
  pages) and, only once the hub build has `NET_INDEXING=1`, https://fandomverse.org/anime/sitemap.xml (OtakuQuiz's urlset, unchanged
  but for the home without a trailing slash). The hub llms.txt gains its `/anime` line at the same moment. The hub cannot read the
  otakuquiz flag, so `NET_INDEXING=1` is set on `fandomverse` and `otakuquiz` together (RUNBOOK K10) and both are redeployed.
  The list of zones is read from the registry urls (`zoneChildrenOf`): a /kdrama site later joins by its url alone.
- **canonical, Open Graph, JSON-LD, breadcrumbs, llms.txt, IndexNow, emails**: built from the registry url, so they carry /anime
  (relative metadata URLs through `metadataBase`). /anime/llms.txt names fandomverse.org/anime and its paths.
- **noindex**: while a site is closed (`NET_INDEXING` unset) every page of the hub and /anime says noindex, meta and
  `X-Robots-Tag` (as before). With `NET_INDEXING=1` the only `X-Robots-Tag: noindex, nofollow` rule left in `next.config.ts`
  is the one for `*.vercel.app` hosts (the production aliases of both projects), and a Vercel preview or development build of
  hub or anime stays closed whatever `NET_INDEXING` says (meta and header). On fandomverse.org no header is added and each
  page speaks for itself. A production page cannot change its meta per host (it is built once): on its `*.vercel.app` alias
  the header says noindex, and the alias is behind Vercel protection anyway.
- **IndexNow**: OtakuQuiz keeps its own key. It pings with `host: fandomverse.org`, `keyLocation:
  https://fandomverse.org/anime/760f9a9459d4db0bd8a08f13a0f1ec6e.txt` and only URLs under /anime (a key file in a folder is valid
  for the URLs of that folder). The anime build serves that file at /anime/<key>.txt; the hub serves its own key at the root;
  each build answers 404 for the other keys (keyFileBlocksFor, unchanged).

## 4. Crons

`vercel.json` is shared by the three projects, so its cron paths have no base path, and the anime build serves nothing outside
/anime (Next also refuses an internal rewrite from outside the base path). On a build with a base path, each cron path of
`vercel.json` is an external rewrite (`basePath: false`) to the same route of the site's own URL,
`https://fandomverse.org/anime/api/cron/...`, which Vercel routes back to `otakuquiz`; the route checks `CRON_SECRET` as before.
Only cron routes are proxied (`/api/cron/<name>` and `/api/<area>/cron/<name>`, today `/api/ranked/cron/nightly`): every destination
is under /anime, so no otakuquiz cron can reach the hub, and the proxy is an external rewrite that forwards the request headers, so
`Authorization: Bearer <CRON_SECRET>` reaches the route (a unit test runs Next's own proxy). A cron path of another shape, or a
missing or invalid vercel.json, fails the hub or anime build with vercel.json named. The hub's crons reach their routes as they are. To verify on launch day, once the domain is attached (RUNBOOK K6b, mandatory):
the Logs and the cron logs of `otakuquiz` (Settings, Cron Jobs, View Logs) show 200 answers of `/anime/api/cron/...`, among them
`/anime/api/cron/ensure-daily-quiz`, and the `fandomverse` Logs show no call of the anime proxy.

## 5. What the owner or the integrator sets in Vercel (nothing else changes)

1. Rename the project `fanquiz` to `fandomverse` (in progress, integrator).
2. Create the group, the hub as default application (team scope as for the other projects):
   `vercel mf create-group --name=fandomverse --project=fandomverse --project=otakuquiz --default-app=fandomverse --project-default-route=otakuquiz=/anime --yes`
   (or the dashboard: team Settings, Microfrontends, Create Group, the same choices). Do not add `kpopquiz`.
3. Root Directory of both projects stays `apps/quiz`: `microfrontends.json` is found there, no `VC_MICROFRONTENDS_CONFIG_FILE_NAME`.
4. The domain `fandomverse.org` (and `www.fandomverse.org` as a redirect to it) on the project `fandomverse` only; `otakuquiz` gets no
   domain. Deployment protection stays as it is on both (`all_except_custom_domains`).
5. Deploy `otakuquiz` (main, with its basePath) first, then `fandomverse`: the routing of `/anime` starts with the first
   production deployment of `fandomverse` that carries `microfrontends.json`.
6. No new environment variable. `NEXT_PUBLIC_SITE_ID` stays `hub` on `fandomverse` and `anime` on `otakuquiz`; `NET_INDEXING` per
   project as before; `NEXT_PUBLIC_NET_ORIGINS` is ignored in production.
7. Supabase Auth: the redirect URLs of the anime build are under /anime (lane 3's AUTH-FANDOMVERSE.md has the exact lines).
8. Optional: the Vercel Web Analytics of /anime pages are counted in the `fandomverse` project (the analytics script and its
   beacon go to `/_vercel/insights`, at the root of the domain, served by the default application).

Checks once both are live (curl -sI shows the status and headers):
`https://fandomverse.org/anime` 200 from otakuquiz (header `x-vercel-mfe-app` with the cookie `VERCEL_MFE_DEBUG=1`);
`https://fandomverse.org/anime/` 308 to `/anime`; `https://fandomverse.org/anime/robots.txt` 404; `https://fandomverse.org/robots.txt`
lists `/anime/api/`; `https://fandomverse.org/sitemap.xml` is an index with `/anime/sitemap.xml` (once `NET_INDEXING=1`); with `NET_INDEXING=1`, no
`X-Robots-Tag` on `https://fandomverse.org/anime` and `X-Robots-Tag: noindex, nofollow` on `https://otakuquiz.vercel.app/anime`
(behind its protection, use a bypass you already have or skip); a page of /anime loads its `/anime/_next/static` files with 200.

## 6. Local development

- Both sites on one origin, as on fandomverse.org (the Vercel microfrontends proxy in front of two dev servers of
  `scripts/o1/dev-multi.sh`):
  `scripts/o1/fandomverse-dev.sh offline --ports <hub>,<anime> --proxy <port>` then open `http://localhost:<port>/` (hub) and
  `http://localhost:<port>/anime` (OtakuQuiz). It sets `NEXT_PUBLIC_NET_ORIGINS=hub=http://localhost:<port>,anime=http://localhost:<port>`
  unless you export one; `--print-config` shows the generated proxy config. The database comes from `scripts/o1/env.sh` as before.
- One site alone (dev-multi, an offline build): the anime build answers under `/anime` on its own origin
  (`http://anime.localhost:<p>/anime`); the hub at the root.
- An offline build per site, as before: `NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_SITE_ID=anime bash scripts/o1/env.sh offline -- pnpm -C apps/quiz build`.

## 7. Limits and open points

- Hub and anime share one host, so one cookie jar: one Supabase session for both (lane 3 built on that).
- The analytics of /anime pages count in the `fandomverse` project (section 5.8).
- The cron proxy needs fandomverse.org live and the cron request to reach the protected production deployment of `otakuquiz`
  (as it had to before). If the logs show it does not: the fallback is cron entries for `/anime/api/cron/...` in vercel.json,
  which touches kpopquiz.org's cron list (an owner decision).
- The `x-vercel-mfe` routing keeps the request host (the `*.vercel.app` noindex rule matches on it): check the headers of section 5
  and RUNBOOK K9b once open.

## 8. Client JS

Measured on offline builds (2026-10-28) from the client reference manifest of a route: the root main files and the entry JS files
of the route's segments, gzip level 9. Anime: base 8f2b9c3 against the head of o1/fv-l1 with lane 2's registry values.

| anime route | before (gzip) | after (gzip) | delta gzip | delta raw | client modules |
|---|---:|---:|---:|---:|---|
| /anime/q/[slug] | 195,084 | 195,542 | +458 | +348 | 33, the same |
| /anime (home) | 199,099 | 199,558 | +459 | +348 | 40, the same |
| /anime/[series]-quiz | 203,030 | 203,483 | +453 | +327 | 33, the same |
| /anime/quizzes | 193,121 | 193,594 | +473 | +328 | 26, the same |
| /anime/login | 246,181 | 246,643 | +462 | +309 | 25, the same |

On anime the growth is the `/anime` strings of the addresses (no new module, no new chunk group; Turbopack also split one
chunk in two, which costs part of the gzip delta).

On kpopquiz.org the client JS did change, by a few hundred bytes. The earlier claim of this section, that each changed
module compiles to the base's bytes on kpop, was wrong: the review of 2026-10-28 found extra bytes, and offline builds
confirm them. Measured on offline kpop builds with the production flags (`NEXT_PUBLIC_UX_V1=1`, `NEXT_PUBLIC_UX_V12=1`,
`NEXT_PUBLIC_BT_TRACKING=1`). Each figure is the gzip (level 9) total of the JS chunks a route's client reference manifest
names (entry files plus client module chunks):

| kpop route | main before FandomVerse (5113ee6) | FandomVerse merged (db12710) | siteForOrigin out of the registry |
|---|---:|---:|---:|
| /q/[slug] | 79,376 | 79,786 (+410) | 79,276 (-100) |
| / (home) | 95,158 | 95,580 (+422) | 95,058 (-100) |
| /[slug] (group hub) | 99,944 | 100,442 (+498) | 99,928 (-16) |
| /blindtest/[mode] | 87,764 | 88,198 (+434) | 87,680 (-84) |
| /quizzes | 98,920 | 99,318 (+398) | 98,802 (-118) |

Most of the FandomVerse growth was in `lib/site/registry.ts`, which is in every kpop client bundle: `siteForOrigin` and its two
URL helpers. They are only called by the beacon route on the server. They now live in `lib/site/origin-site.ts`, a
server-only module, and registry.ts no longer exports them (pinned by registry.test.ts); `isSiteId` now reads `SITE_IDS`
instead of a second hand-written list. Each kpop route now ends a little below its pre-FandomVerse size (measured at
43f07fd), because an older siteForOrigin already sat in the registry before FandomVerse.

Two smaller changes stay in kpop chunks, and nothing changes on screen:
- `lib/site/client-base-path.ts`, the shared `BASE_PATH` constant of the twins fix. It folds to `''` on kpop.
- `lib/share.ts`, which now builds its text with the site address (`siteAddress(SITE)`, still `kpopquiz.org`) and its
  level-up URL with the base path. On kpop the base path folds away; the address part does not.

The hub build was not measured against a base build; its chunks carry the same registry change.
