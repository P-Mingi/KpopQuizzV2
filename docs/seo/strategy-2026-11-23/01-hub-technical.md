# Bunnyverse hub: technical and on-page SEO audit (state once open)

Basis: main f570abc, read-only. The hub as served with `NET_INDEXING=1`, `PRIVATE_LAUNCH=0`, `NET_CARDS=1`, and no `NET_CARDS_BRIDGES` (runbook step B). Paths are under `apps/quiz/src/` unless they start with `docs/` or `.github/`. `docs/strategy/2026-10-SEO-PLAN.md` and `2026-10-MULTI-NICHE.md` are not in the repo, so they were not reviewed.

Bottom line: the core is technically sound and agrees with itself. That core is the home, /daily, the four game pages, the legal pages, robots.txt and the sitemap index; their robots values, canonicals, hreflang, 404s and sitemap all match. No code bug blocks the flip. The P0s are:
- a product decision: KpopCards has no indexable URL;
- one false sentence on /daily;
- one conflict with rule 16.

## 1. Findings

| Sev | Route | Issue | Evidence | Fix |
|---|---|---|---|---|
| P0 | /kpopcards/** | Opening the site opens nothing of KpopCards. All 13 pages use `robotsFor(false)` (noindex, follow once open). They have no canonical, no TARGETS row, no sitemap row and no server intro. The lobby H1 is "Your packs"; its title is "KpopCards \| Bunnyverse" (22 chars). | `(hub)/kpopcards/page.tsx:11-15`, `help/page.tsx:12-16`, `odds/page.tsx:9-13`; `docs/o1/LAUNCH-RUNBOOK.md:51` | Owner decision. If yes, open /kpopcards and /kpopcards/help (optionally /odds and /credits) with:<br>- a self canonical;<br>- the title "KpopCards: Free K-pop Photocard Game" (49 chars);<br>- a 40 to 60 word server answer block;<br>- a TARGETS row and sitemap rows.<br>Keep card, idol, collection, user, open, ranking and missions pages noindex. |
| P0 | /daily | The answer text says "Kpopdle: guess today's K-pop idol, then the group, the song and the hidden members." Only the idol mode is built. | `lib/dle/copy.ts:76` (FR :123); `lib/site/registry.ts:285-288` | Name built games only. |
| P0 | kpopquiz.org footer | `NEXT_PUBLIC_NET_FOOTER=1` is planned on kpopquiz. It would put a followed "Meet the Bunnyverse network" link in the footer of every kpopquiz.org page. Rule 16 says: never in site-wide footers. | `components/layout/ux-v1/ux-footer.tsx:33,140`; `components/network/net-footer-line.tsx:8-15`; `copy/kpop/b6.ts:4-5`; `docs/launch/o1/ENV.md:44` | Keep it off (the contextual bridges suffice), or amend the rule in writing. Check the current Vercel value. |
| P1 | /fr/* | `DleLanguage` auto-redirects by browser language when the setting is `auto`, the default. Googlebot (en-US) rendering /fr/kpopdle is sent to /kpopdle, so the French pages look like redirects. This breaks rule 10.5. | `components/hub/dle/dle-tools.tsx:52-60`; `lib/dle/local.ts:172-175` | Redirect only on a saved choice; show a banner otherwise. This must be fixed before French is indexed. |
| P1 | /fr/* | The server HTML has `lang="en"`; an inline script sets French. There is no Content-Language. | `app/layout.tsx:198,210`; `dle-chrome.tsx:38-40` | Set the language on the server. |
| P1 | games, /daily | A failed database read returns null. The page then says noindex, that answer is cached for 60 s (ISR), and the game drops out of the sitemap. | `lib/dle/read.ts:66-73`; `lib/dle/page-meta.ts:19-24`; `lib/site/root-files.ts:136-140` | Throw on a read error, so ISR keeps the last good page. Use noindex only when the game is really off. |
| P1 | / | The answer block never mentions KpopCards and has no dated number (rule 3.1). The description does not name Kpopdle, Otakudle or KpopCards. | `components/hub/home/home-seo.tsx:41-47`; `copy/hub/h1.ts:18,152-162` | Add a KpopCards sentence and one dated number from the loaders. |
| P1 | /llms.txt | Says "It holds no quiz of its own" and lists only /, /anime and /privacy. | `lib/site/root-files.ts:214-228` | List the daily games, /anime, and KpopCards if it becomes indexable. |
| P1 | IndexNow | Nothing submits bunnyverse.org. The workflow targets kpopquiz.org only. The hub's /sitemap.xml is an index, so a snapshot of it holds no `<url>` and the route answers "baseline only". | `.github/workflows/indexnow.yml:34,52,55`; `app/api/indexnow/route.ts:23-25`; `docs/launch/o1/RUNBOOK.md:603` | Add a hub job that snapshots the flattened `/sitemap-hub.xml` and `/anime/sitemap.xml`. The key file is OK. |
| P1 | entity | The Organization logo is KpopQuiz's old pink star: `public/brand/hub/logo-512.png` has the same md5 as `public/logo-512.png`. The favicon is the old kpopquiz icon. No `@id` link between WebSite and Organization, no `sameAs`. | `lib/site/registry.ts:330-332,352`; `lib/site/jsonld.ts:31-58` | Ship the rabbit logo and favicon before the first crawl. Add `@id` and `publisher`. |
| P1 | trust | The hub has no /about and no /editorial-policy (rule 12). The home and game footers link only Privacy and Legal. | `home-footer.tsx:20-31`; `dle-chrome.tsx:67-88` | Add /about and link /terms, /contact and /dmca. |
| P1 | CI | The indexability, orphans and sitemap-hygiene gates build the kpop site only. | `.github/workflows/seo-gates.yml:96-134` | Add a hub job. |
| P1 | TARGETS | Rows still say "closed until the dailyGuess flag", but the flag is true. There is no KpopCards row and no legal rows. | `docs/seo/TARGETS-bunnyverse.md:18-32`; `registry.ts:279` | Update on launch day. |
| P2 | games, /daily | The answer block sits in a closed `<details>` at the bottom of the page. It is in the HTML, but rule 3.1 says the page should open with it. | `dle-game-page.tsx:185-196`; `burrow-board.tsx:257-266` | Show 1 to 2 sentences under the H1. |
| P2 | /kpopdle | The H1 does not contain "Kpopdle", the cluster's main query. | `lib/dle/copy.ts:268` | Use "Kpopdle: guess the K-pop idol of the day". |
| P2 | hreflang | English pages declare `fr` alternates that are noindex. French review is one global boolean, not per page (rule 10.3). /fr/credits leaves out the KpopCards credits, and can be a 404 while /credits still declares it. | `lib/dle/seo.ts:16,90-93`; `credits/page.tsx:73-79`; `fr/credits/page.tsx:16-29` | Emit the `fr` alternates only once French is reviewed; use the same sections on both pages. |
| P2 | soft pages | /directory answers 200, noindex, as an orphan that links to `/{slug}-quiz` 404s. /kpopcards/u/{unknown} answers 200. | `(hub)/directory/page.tsx:22-35`; `u/[nickname]/page.tsx:13-18` | Make both `notFound()`. |
| P2 | JSON-LD, OG | The /daily breadcrumb has one item. The home ItemList is named "Hot right now" while the heading says "Popular this week". The legal and KpopCards pages have no og:image (the layout resets it). | `burrow-page.tsx:43`; `copy/hub/h1.ts:112-113`; `app/sites/[site]/layout.tsx:52-59` | Align them. |
| P2 | performance | One render-blocking stylesheet: about 440 KB raw for the hub, plus 156 KB on KpopCards. The banner srcset has only 400w and 1920w, so phones load 1920w as the LCP image. The home reads cookies, so `revalidate=3600` is probably defeated. | `lib/ux-v1/a0/stylesheet.ts:93-95`; `dle-game-page.tsx:119`; `home-hub.tsx:53` | Add 800w and 1200w, check PageSpeed Insights, and move the session read to the client. |
| P2 | links | The switcher links `bunnyverse.org/anime/`, a 308. The KpopCards tab on the home and game bars needs BRIDGES, so at step B only the phone tab bar links it. The home footer links OtakuQuiz on every page: same host, but undocumented against rule 16. | `lib/site-switch/model.ts:34`; `home-nav.tsx:58`; `dle-chrome.tsx:56`; `home-footer.tsx:24` | Drop the slash, gate the tab on NET_CARDS, and document the same-host exception. |

Verified OK:
- Titles are 60 characters or fewer with the suffix.
- Descriptions are 140 to 160 characters (KpopCards lobby: 115).
- One H1 per page; no em or en dashes.
- robots.txt allows `*` (Bingbot), Googlebot, Mediapartners-Google, OAI-SearchBot and PerplexityBot. It allows `/api/og/` and the stylesheet, blocks `/api/` and `/auth/`, and has one Sitemap line (`app/robots.ts:12-87`).
- ads.txt is a 404 until a publisher id is set.
- No FAQPage and no Flashcard markup.

## 2. Metadata of indexable pages

| Route | Title, chars with suffix | H1 | Desc. |
|---|---|---|---|
| / | "K-pop and Anime Daily Games and Quizzes \| Bunnyverse", 52 (`copy/hub/h1.ts:17`) | "Quizzes and daily games for K-pop and anime fans" | 145 |
| /daily | "Daily games: K-pop and anime puzzles", 49 (`lib/dle/seo.ts:21`) | "Daily games" | 140 |
| /kpopdle | "Kpopdle: Guess the K-pop Idol of the Day", 53 (`seo.ts:30`) | "Guess the K-pop idol of the day" | 153 |
| /otakudle | "Otakudle: Guess the Anime Character Daily", 54 (`seo.ts:38`) | "Guess the anime character of the day" | 160 |
| /otakudle/one-piece | "Otakudle One Piece: Guess the Character Daily", 58 (`seo.ts:46`) | "Guess the One Piece character of the day" | 157 |
| /otakudle/dragon-ball | "Otakudle Dragon Ball: Guess the Character Daily", 60 (`seo.ts:54`) | "Guess the Dragon Ball character of the day" | 158 |

Structured data by page:
- Home: WebSite, Organization (from the layout) and an ItemList.
- Game pages: WebApplication+VideoGame, BreadcrumbList and the pool ItemList (`dle-game-page.tsx:105-113`).
- /daily: an ItemList and a BreadcrumbList.

## 3. Indexability map (open)

| Route | robots | Canonical | Sitemap | Missing content |
|---|---|---|---|---|
| / | index | https://bunnyverse.org/ | yes | n/a |
| /daily (served by `(hub)/burrow`) | index if a game answers | self | yes if live, lastmod = day | 200 noindex |
| /kpopdle, /otakudle, /otakudle/one-piece, /otakudle/dragon-ball | index if the read succeeds | self, plus hreflang en/fr/x-default | yes if live | 200 noindex |
| /kpopdle?r=… (rewritten to /dle-share) | index | the clean URL | no | a bad `r` stays on the page |
| /burrow, /dle-share/*, /kpopdle/group, /kpopdle/song, /fr | n/a | | no | 404 |
| /fr/daily, /fr/kpopdle, /fr/otakudle (+2) | noindex, follow | self | after `DLE_FR_REVIEWED=true` (`seo.ts:16`, a code change) | as English |
| /credits | index | self | no (by design) | 404 when empty |
| /fr/credits | noindex | self | no | 404 when empty |
| /privacy, /legal, /terms, /contact, /dmca | index | self | yes, lastmod = launch date | n/a |
| /kpopcards and its 7 static pages | noindex, follow | none | no | n/a |
| /kpopcards/c, /idol, /collection/{g}, /open | noindex | none | no | 404 |
| /kpopcards/u/{nick} | noindex | none | no | 200 (soft 404) |
| /cards/**; kpopcards.bunnyverse.org | 308 to /kpopcards | | | |
| /passport, /u/{name}, /settings, /login | noindex or redirect | | no | |
| /directory | noindex, nofollow | self | no | 200, orphan |

No sitemap URL is noindex: `liveDleGames` mirrors the page robots values.

## 4. Launch-day checklist

1. **Before the redeploy**
   - Fix `lib/dle/copy.ts:76`.
   - Decide on KpopCards indexing and on NET_FOOTER.
2. **Redeploy**
   - Order: otakuquiz, then fandomverse. Set `NET_LAUNCH_DATE` before `NET_INDEXING`, and set `PRIVATE_LAUNCH=0`.
   - Submit nothing while the gate is on: `sitemap-hub.xml` is not in the gate's `OPEN_INTERNAL` list (`lib/private-launch/config.ts:52`).
3. **Live checks** (signed out)
   - No `x-robots-tag` on /, /daily or /kpopdle; the *.vercel.app hosts still say noindex.
   - In the page source:
     - the six indexable game and hub pages say `index, follow`, with an absolute canonical and hreflang;
     - /fr, /kpopcards and /login say noindex;
     - the H1 and the answer text are present;
     - the JSON-LD passes the Rich Results Test.
   - `/sitemap.xml` lists `/sitemap-hub.xml` and `/anime/sitemap.xml`. `/sitemap-hub.xml` has 11 URLs.
   - The key file `/339dab142e51883ae3a2c7e4737254e4.txt` returns 200, text/plain, and holds the key.
   - www redirects to the apex with a 308.
   - `x-vercel-cache` shows HIT or STALE on the game pages.
4. **Google Search Console** (Domain property `bunnyverse.org`)
   - Submit `https://bunnyverse.org/sitemap.xml`.
   - Run URL Inspection with "Test live URL" on 7 URLs: /, /daily, /kpopdle, /otakudle, /otakudle/one-piece, /otakudle/dragon-ball and /anime. Expect: indexing allowed, the declared canonical equal to the URL, the H1 rendered.
   - Request indexing for those 7.
5. **Bing Webmaster**
   - Import the site from Search Console and submit the same sitemap.
   - Submit the same 7 URLs by hand until the hub IndexNow job exists.
6. **Days 2 to 7**
   - "Excluded by noindex" should list only /fr and /kpopcards URLs.
   - `?r=` URLs should show "Alternate page with proper canonical".
   - kpopquiz.org should gain no new noindex or robots exclusions after step C.
   - Then fix the P1s.
