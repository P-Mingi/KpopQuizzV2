# C3: QA, SEO, offline parity and performance of the three sites

Branch o1/C3, code commit 29fcca6 (from o1/integration 1469bb0, C2 report). o1-dev, sites built from this worktree
(`bash apps/quiz/e2e/o1/O1/run-dev.sh --with-jump`, per-test list in `e2e-dev.md`). No production, push or connector.
Files C3 does not own (next.config.ts, contracts, the C1 spec) are not touched: ready patches in `docs/o1/requests/C3.md`.

## 1. QA

| run | pass | fail | skip |
|---|---:|---:|---:|
| e2e on the base (first run) | 41 | 1 | 10 |
| e2e on 29fcca6 (final, `e2e-dev.md`) | 42 | 0 | 10 |
| C1 spec (5 tests x 2 viewports) with the dark-mode patch of the request file | 6 | 0 | 4 |

- Failure 1 (app): leak spec `string-leak` found "Editorial account run by the KpopQuiz team" x12 on anime `/leaderboard`
  (the Team pill tooltip and the team note read a fixed kpop sentence). Fixed in `lib/ux-v1/a0/team.ts` (site name from the registry,
  the kpop text is byte for byte today's).
- Skips (all environment, none an app defect): 8 signed-in leak tests need a fixture sign-in on the dev branch (owner gates G1 and
  G2), 1 kpop quiz page test (no kpop quiz on o1-dev), 1 spoiler JSON-LD hook (no case yet, lane O3).
- C1 spec, unpatched: 1 failure, a test flake. The dark-mode axe pass sampled colours in the middle of the 250 ms background fade of
  `.ux-app` (a different contrast count at each run, x19, x18, a login page). Fix is in C1's spec (patch in the request file).
  The 4 skips are the signed-in tests (they need `dev-up.sh`'s sign-in helper); the pages they cover were not touched.
- One run (the third) failed 37 tests with ECONNREFUSED: the three servers were gone after the warm-up (infrastructure, not code;
  the identical rerun on the same builds is the green one above).

## 2. SEO

Checked on the local servers (closed, default) and on anime and hub builds with `NET_INDEXING=1` (open), kpop as reference.

| check | anime | hub |
|---|---|---|
| title, description (50 to 170 characters), one h1 on all 197 sitemap pages | ok | ok (home, privacy, login, directory) |
| canonical, absolute, registry origin, no query (`/series?x=1`, a quiz with `?utm=1` canonical to the clean URL; `/quizzes?page=2` self-canonical, kpop's pagination rule) | ok | ok |
| robots meta closed | every page noindex, nofollow (but see finding 1) | same |
| robots.txt | own `Sitemap:` line, kpop's rules (Disallow /api, /auth, /admin, /settings, /onboarding) | same |
| sitemap.xml | 197 URLs (home, /series, 30 series hubs of 3 or more quizzes, 165 quizzes), all on otakuquiz.org, **all 200** | `/` only (see 4) |
| JSON-LD | Organization, SiteNavigationElement, WebSite (+SearchAction), BreadcrumbList, Quiz, FAQPage, CollectionPage, ItemList; every block valid JSON, only otakuquiz.org and schema.org hosts | Organization, WebSite (new) |
| Open Graph, Twitter | title, description, url, image (+alt, size), card summary_large_image | same on the home |
| hreflang | none now (was pt-BR on four pages, to `/pt` which 404s) | none |
| kpop word or link in the HTML of 197 pages | none (one quiz question about a K-pop guest of a composer, data) | none |
| 404 status | `/bts-quiz`, `/q/missing`, `/pt`, `/groups`, `/profile` answer 404 | `/series`, `/nope` 404 |

### Findings and what was done

| # | severity | finding | status |
|---|---|---|---|
| 1 | launch blocker | The staging noindex was only the layout of `app/sites/[site]`: five pages said `index, follow` themselves and overrode it (hub home, anime privacy, terms, dmca, name-all), so they were indexable today. No `X-Robots-Tag` anywhere. | fixed: one flag, below. Header left (finding 3) |
| 2 | launch blocker | Brand files 404 on both sites: `/brand/anime/og-default.png` (og:image and twitter:image of home, series, quizzes), `logo-512.png` (JSON-LD Organization logo), favicon, manifest; no favicon link. Registry points there (registry.ts lines 139 to 143, 225 to 227). Owner assets (C1 left 1). | left: owner |
| 3 | should fix | `X-Robots-Tag: noindex, nofollow` for non-HTML answers (images, JSON) needs an entry in `next.config.ts` (owner ORCH). | left: patch and test text in `docs/o1/requests/C3.md` |
| 4 | should fix | Hub sitemap listed `/privacy`, which is a noindex draft (a noindex URL in a sitemap is a Search Console warning). | fixed (`root-files.ts`, test); `routes.md` line 209 in the request file. Add `/privacy` back the day `HUB_DRAFT_METADATA` loses its noindex |
| 5 | should fix | hreflang pt-BR on anime home, /quizzes, /faq, /leaderboard pointing at 404 pages. | fixed (four files) |
| 6 | should fix | Quiz share image (`/api/og/<slug>`) carried the KpopQuiz rabbit on anime. | fixed: letter tile of the wordmark off kpop (`app/api/og/[slug]/route.tsx`), kpop path unchanged |
| 7 | should fix | Titles started with a lowercase "anime" ("anime Quiz - 197 Free...", quizzes, trivia, home WebSite description). | fixed |
| 8 | should fix | Hub home had no WebSite JSON-LD, and every page of the hub printed an empty SiteNavigationElement. | fixed (`websiteJsonLdFor`, layout) |
| 9 | should fix | `/llms.txt` answered 404 on both sites although routes.md lists it. | fixed (`app/sites/[site]/llms.txt/route.ts`, `llmsText`, facts and routes only, no count) |
| 10 | should fix | Sign-in page of anime and hub had no robots rule of its own (it relied on the closed layout; open, it would be indexable, kpop's is noindex). | fixed (`login/page.tsx`) |
| 11 | note | `og:type` and `og:site_name` absent on anime home, /quizzes, series hubs (Next writes them only when the page sets them). Facebook defaults to website. | left: `home-anime.tsx`, `(anime)/quizzes/page.tsx`, `lib/anime/series-model.ts` |
| 12 | note | The IndexNow key file of kpop (`/4b2f9a7c....txt`) is served on anime and hub: by design (routing.ts INDEXNOW_KEY_FILE_RE, shared root files), the registry keys of both sites are null. | left |
| 13 | note | The closed pages answer two robots tags on a 404 (`noindex` from Next, plus the layout's). Harmless, kpop does the same. | left |
| 14 | note | Theme tokens and fonts are still kpop's placeholders (share image pink, Pretendard preloaded). C1 left them for the owner's palette. | left |

### The indexing flag

`NET_INDEXING`, a server flag read where a page is built (`apps/quiz/src/lib/site/indexing.ts`). Unset, `0`, `false` or anything else
(the default): every page of anime and hub answers `<meta name="robots" content="noindex, nofollow">`. `1` or `true`: each page
says what it was written to say (indexable pages `index, follow`; login, settings, search, /create, /community, profiles, /me and
thin series hubs keep their noindex). kpop is never closed by it. Verified on both states (anime: 33 routes listed, hub: 8).
To open indexing the owner does exactly this:
1. set `NET_INDEXING=1` on the otakuquiz.org and fanquiz.org Vercel projects (it is read at build: redeploy);
2. before that: the brand files exist (finding 2), the X-Robots-Tag entry is merged (finding 3);
3. fanquiz.org only: the privacy text is validated, then `HUB_DRAFT_METADATA` in `app/sites/[site]/privacy/page.tsx` becomes
   index and `/privacy` goes back into the hub sitemap (`lib/site/root-files.ts`);
4. submit each sitemap in Search Console. Registry values still null on purpose: `seo.indexNowKey`, `seo.organization.email`.
Flag registration in the contract (`flags-env.md` row, `LANES.md`, `O1_FLAGS`) is in the request file, not done here (not owned).

## 3. Offline parity (kpopquiz.org must not change)

- `scripts/o1/parity.sh 1469bb0ef405 29fcca6` with the gate's offline stand-in (no production read): `identical: true (60 pages)`.
- `apps/quiz/e2e/o1/P1/kpop-chunks.sh` on two kpop builds at one path with the same flags (base 1469bb0, head 29fcca6): 163 page
  manifests, 10 identical, 153 same graph (chunk file names differ by content hash), 0 different client modules:
  `RESULT: every kpop page reaches the same client modules as base`.
- `scripts/o1/check.sh`: twins ok. The kpop markup snapshots (flight trees) pass inside the full vitest run: 230 files, 3463 tests
  green, `tsc --noEmit` clean. No dash or emoji in the diff. No shared component got a prop: the three shared edits
  (team text, og route, layout of app/sites) keep today's value on kpop.

## 4. Performance (build output and local servers)

First Load JS, gzip kB, from the client reference manifests of the builds (Next 16 prints no First Load JS: layout and page chunks
summed, scripts `fl.js`, `cmp.js` of the scratchpad), anime and hub against the kpop twin:

| route | anime | hub | kpop twin | delta |
|---|---:|---:|---:|---:|
| `/` | 49.2 | 49.2 | 46.4 | +6% |
| series hub `/<series>-quiz` ([slug]) | 59.7 | none | 48.5 | **+23%** |
| `/q/[slug]` | 134.6 | none | 124.1 | +8% |
| `/login` | 99.7 | 99.7 | 96.9 | +3% |
| `/settings` | 122.8 | 122.8 | 109.1 | +13% |
| `/quizzes`, `/trending`, `/leaderboard`, `/blindtest`, `/community`, `/create`, `/faq`, `/privacy` and the other twins | same as kpop | same as kpop | | 0% |
| `/me`, `/u/[username]` | 46.0 | none | 59.4, 63.3 | -23%, -27% |
| `/series`, `/directory`, `/passport` (no twin) | 36.9 | 36.9, 35.3 | | |

Anime and hub ship one shared stylesheet of 409 KB (70 kB gzip), the same as kpop.

Outlier above 20 percent: series hub +23% (+11 kB gzip). It is the spoiler shield and the character tiles (client components
that kpop's group page does not have): the feature, not a regression. Note, not a fix.

Server time to first byte on the local servers (o1-dev through the network, cold request then average of 6, ms):
anime `/` 31 / 12, `/series` 8 / 10, series hub 11 / 11, `/quizzes` 75 / 45 (kpop 251 / 32), quiz page 10 / 7, `/login` 14 / 8
(kpop 304 / 10), hub `/privacy` 57 / 11, `/login` 19 / 9; kpop `/` 58 / 7, `/trending` 201 / 6, `/leaderboard` 61 / 6.
- **Outlier, note**: hub `/` 201 / **109 ms (max 301)** against kpop `/` 7 ms. The hub home reads the passport (`readHubPassport`,
  a Supabase call per request) so it is rendered at each request and cannot be kept by the CDN. Fine at launch traffic; if it
  grows, serve the signed-out page statically and fetch the passport band on the client (`app/sites/[site]/home-hub.tsx`).
- `/sitemap.xml` of anime 90 ms warm (dynamic, kept by the CDN for an hour, by design).

Largest images: no page of anime or hub carries an `<img>` (the pages draw with CSS and the OG routes); the OG images are 38 KB
(series hub) and 180 KB (quiz, 1200 x 630 PNG, generated, not hot). `public/brand/anime` is 248 KB of creator SVGs; the biggest
static asset is the 473 KB (gzip about 140 KB) shared JS chunk, the same on kpop. Nothing else above kpop's twin by 20 percent.

## What is left (file)

- Brand files (launch blocker): `public/brand/anime/`, `public/brand/hub/`; registry lines 139 to 143 and 225 to 227.
- Four patches for files C3 does not own: `docs/o1/requests/C3.md`.
- og:type and og:site_name on anime pages (note): `home-anime.tsx`, `(anime)/quizzes/page.tsx`, `lib/anime/series-model.ts`.
- The 8 signed-in leak tests and the C1 signed-in tests run only with fixture sign-in (gates G1 and G2, `dev-up.sh`).
