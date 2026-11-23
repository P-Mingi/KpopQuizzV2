# LAUNCH-RUNBOOK: opening OtakuQuiz, the Bunnyverse hub and Cards (lot LAUNCH-POLISH, 2026-11-20)

A checklist for the owner, click by click. Every fact comes from the repo at main 7a8dddd (paths under `apps/quiz/` unless they start with `docs/`).
No secret value is written here: a secret is "set by the owner in Vercel". When a value only the owner has is needed, the line says "owner: set it".
Other lanes of this lot are still changing three things this file names: the hub legal pages (LEGAL), OtakuQuiz (OTAKU) and the ad variables (ADS).
Filled from the merged branch o1/launch-polish (lanes LEGAL, OTAKU and ADS of lot LAUNCH-POLISH, 2026-11-20), checked by ORCH against the code.

Sources: `docs/o1/reports/L1/LAUNCH-PREP-AUDIT.md` section 6, `docs/launch/o1/ENV.md`, `docs/launch/o1/PRIVATE-LAUNCH.md`, `docs/launch/o1/VERIFY.md`,
`docs/o1/reports/CARDS/LAUNCH-PREP-ADS.md`, and the code that reads each variable.

## 0. The three Vercel projects

| Vercel project | Site id (`NEXT_PUBLIC_SITE_ID`) | Address | Notes |
|---|---|---|---|
| `kpopquiz` | unset (means `kpop`) | https://kpopquiz.org | never gated by PRIVATE_LAUNCH (`src/lib/private-launch/config.ts`, `readPrivateLaunch`), never closed by NET_INDEXING (`src/lib/site/indexing.ts:35`) |
| `fandomverse` | `hub` | https://bunnyverse.org | the hub; it alone carries the domain (`docs/launch/o1/ENV.md` section 1) |
| `otakuquiz` | `anime` | https://bunnyverse.org/anime | no domain of its own; reached through the Microfrontends group `fandomverse` (`registry.ts:185` `url`) |

All three build `apps/quiz` from the same repository. Every variable below goes in **Production** unless a line says otherwise. Never put a production secret in Preview.
How to set one: Vercel, the project, Settings, Environment Variables, Add, name, value, tick **Production** only, Save. To remove one: the row, the three dots, Remove.
How to redeploy: the project, Deployments, the top Production row, the three dots, Redeploy. Wait for "Ready" and read the build log for red lines.

## 1. Variables, what each opens, and which file reads it

Format words: **on** means exactly `1` (the code also accepts `true`: `flagOn`, `src/lib/site/registry.ts:496`). Anything else is off.

### 1.1 The gate and the indexing (hub and OtakuQuiz)

| Variable | Projects | Value | What it does | Read at |
|---|---|---|---|---|
| `PRIVATE_LAUNCH` | `fandomverse`, `otakuquiz` | `0` to open (`0`, `false`, `off`, `no` open; unset or empty stays closed on a production build; any typo stays closed) | opens every page of the site to the public and removes the `noindex, nofollow` the gate added | build, `next.config.ts:55-63,151-153,305-306`; rule in `src/lib/private-launch/config.ts` `gateOn` |
| `PRIVATE_LAUNCH_ALLOW`, `PRIVATE_LAUNCH_KEY` | both | secrets, set by the owner in Vercel; already set | only used while the gate is on; they may stay after opening | `config.ts` |
| `NET_LAUNCH_DATE` | `fandomverse`, `otakuquiz` | `YYYY-MM-DD`, a real calendar date (2026-02-30 is refused), no time and no timezone: it is printed as a date ("In force since 24 November 2026"). The same value on both projects. **owner: set it**, the launch day is the owner's call | the privacy policy prints "In force since <date>"; the legal gate and the hub sitemap read it | build, `src/lib/site/indexing.ts:83-91` `launchDateOrThrow`, `src/lib/site/root-files.ts:158`, `src/lib/site/hub/copy.ts:64`, `src/components/hub/hub-privacy.tsx:53` |
| `NET_INDEXING` | `fandomverse`, `otakuquiz` | `1` | unset: every page answers `noindex, nofollow`. On: each page speaks for itself; the hub sitemap index lists `/anime/sitemap.xml`; llms.txt names OtakuQuiz | build, `indexing.ts:35,38`, `root-files.ts:119-130,200`, `src/lib/site/hub/legal.ts:37` |

Hard rule: with `NET_INDEXING=1` and no valid `NET_LAUNCH_DATE` the **build fails** with a message naming it (`launchDateOrThrow`). So the date is set and saved **before** NET_INDEXING, every time.
A Preview deployment stays noindex whatever NET_INDEXING says (`indexing.ts:32`); never set it on Preview.
`kpopquiz` ignores NET_INDEXING and NET_LAUNCH_DATE: leave them out.

### 1.2 Cards (hub, and kpopquiz.org for the bridges)

| Variable | Projects | Value | What it opens | Read at |
|---|---|---|---|---|
| `NET_CARDS` | `fandomverse` (and `kpopquiz`, only with the bridges, step 4) | `1` | the Cards pages `/kpopcards/**` and the `/api/cards/*` routes of the hub; the Cards block of `/credits`; on kpopquiz it is half of the bridge switch | `src/lib/cards/flags.ts:cardsOpen`, `src/lib/cards/ui-flag.ts:7`, `src/lib/site/registry.ts:307` (route map) |
| `NEXT_PUBLIC_NET_CARDS` | `fandomverse` | `1` | the Cards entry in the hub nav. Set it with NET_CARDS or the pages have no link | build (inlined), `src/lib/ux-v1/a0/nav.ts:62,104` |
| `NET_CARDS_BRIDGES` | `kpopquiz` and `fandomverse` (and `otakuquiz`, for the hub link only) | `1` | **the "hub is open" switch for kpopquiz.org**: home block, group block, "Binder" in the account menu, Collection of `/me`, the hub button in the nav; on the hub, the Kpopdle-win bonus pack and the Collection of `/passport`. Needs NET_CARDS on the same project (kpopquiz and hub). On OtakuQuiz it only draws the button to the hub, and only once PRIVATE_LAUNCH is off there | `src/lib/cards-bridge/flags.ts:10-36` |
| `NEXT_PUBLIC_NET_CARDS_BRIDGES` | `kpopquiz`, `fandomverse` | `1`, set together with NET_CARDS_BRIDGES | the "Binder" link of the account menu and the Kpopdle-win line (client code) | build (inlined), `src/components/layout/ux-v1/ux-client-shell.tsx:28`, `src/components/hub/dle/dle-game.tsx:41` |
| `NET_KPOPDLE_HOME`, `NET_KPOPDLE_QUIZEND`, `NET_KPOPDLE_GROUP` | `kpopquiz` only | `1` | the Kpopdle block on the home, the Kpopdle row at the end of a K-pop quiz, the Kpopdle card on group pages. They lead to the hub, so they open with the bridges (`docs/launch/o1/PRIVATE-LAUNCH.md`, "Ouvrir au public"; `ENV.md` 1.2). Check in Vercel that they are not already set | `src/lib/ux-v1/p1/kpopdle-home.ts:8`, `src/lib/passerelles/quiz-end.ts:19`, `src/lib/passerelles/group-line.ts:8` |
| `NET_CARDS_PUSH`, `NEXT_PUBLIC_NET_CARDS_PUSH` | `fandomverse` | **leave unset** (off) | push reminders. The cron `/api/cron/cards-push` (`vercel.json`, every 10 minutes) answers 404 and does nothing while it is off | `src/lib/cards/push-flags.ts`, `src/app/api/cron/cards-push/route.ts:2` |

Cards pages are `noindex` on every build (`robotsFor(false)`), so opening Cards never puts a card in a search engine.

### 1.3 Ads (hub, all OFF at opening)

| Variable | Project | Value | What it does | Read at |
|---|---|---|---|---|
| `NEXT_PUBLIC_ADSENSE_PUB_ID` | `fandomverse` | the AdSense publisher id exactly as the console shows it: `ca-pub-` followed by 16 digits (`CLIENT_RE`, `src/lib/site/adsense.ts:12`); a malformed value serves nothing. It replaces `NEXT_PUBLIC_CARDS_ADSENSE_CLIENT`, which no longer exists. **owner: set it** | independent of the ad flags: the `google-adsense-account` meta tag in the hub page head and `/ads.txt` (`google.com, pub-<16 digits>, DIRECT, f08c47fec0942fa0`, the `ca-` dropped), on the hub only; with the ad flags on it is also the ad client | build (inlined), `src/lib/site/adsense.ts` |
| `NET_CARDS_ADS` | `fandomverse` | `1` (only after Google approves the account) | server half of the rewarded ad: the ticket route and the claim route (`POST /api/cards/ad/claim`, a pack through `cards_ad_pack_grant` of SQL 121). Off: both answer 404. Needs NET_CARDS on. The old 25-shard route `POST /api/cards/ad/grant` is retired (404 whatever the flags) | `src/lib/cards/flags.ts:cardsAdsOn`, `src/lib/cards-bridge/flags.ts:25` |
| `NEXT_PUBLIC_NET_CARDS_ADS` | `fandomverse` | `1`, with NET_CARDS_ADS | public half: the ad tile and its screen ("Watch an ad, get 1 pack", with a link to `/kpopcards/odds`), the binder banner, Google's consent message | build (inlined), `src/lib/cards/flags.ts:cardsAdsPublicOn` |
| `NEXT_PUBLIC_CARDS_BANNER_SLOT`, `NEXT_PUBLIC_CARDS_ADS_TEST` | `fandomverse` | slot: 6 to 20 digits (`SLOT_RE`); test: `1` for test mode only | optional banner slot; test mode for the first try | `src/lib/cards/ads.ts` |
| `NEXT_PUBLIC_CARDS_AD_PROVIDER` | `fandomverse` | `adsense` (default) or `applixir` | `adsense`: the web claim path above; `applixir`: the signed server callback of LAUNCH-PREP (`NET_CARDS_AD_PACKS`), for a later provider; keep the default | build (inlined), `src/lib/cards/ads.ts` |
| `CARDS_AD_PACKS_PER_DAY` | `fandomverse` | a whole number 0 to 20, default 3; 0 turns the ad off | the one daily cap of the rewarded ad (packs per player, Paris day); past it the ticket route refuses, so no ad is shown for nothing; the FAQ, help and odds texts print it | runtime, `src/lib/cards/ads-server.ts` |
| `CARDS_AD_MIN_SECONDS` | `fandomverse` | a whole number 5 to 120, default 15 | the shortest time between the ticket and the claim | runtime, `src/lib/cards/ads-server.ts` |
| `CARDS_ADS_PER_DAY`, `CARDS_AD_SHARDS` | none | no longer exist (lot LAUNCH-POLISH): the shard ad is retired; the one daily cap of the ad is `CARDS_AD_PACKS_PER_DAY`. Remove them from Vercel if they are set | nothing reads them | none |
| `NET_CARDS_AD_PACKS`, `CARDS_AD_SSV_AD_UNIT`, `CARDS_AD_PACKS_PER_DAY` | `fandomverse` | later and separate: the pack ad needs its own ad unit and SQL 121 (`docs/o1/reports/CARDS/LAUNCH-PREP-ADS.md`); the browser button for it is not built in main | not part of the opening | `src/app/api/cards/ad/ssv/route.ts:18-20` |

Kept as they are, never set at opening: `NEXT_PUBLIC_SITE_URL` on the hub and on OtakuQuiz (never set), `NEXT_PUBLIC_NET_ORIGINS`, `SITE_ID`, any `DEV_LOGIN_*` (all listed in `docs/launch/o1/ENV.md` 1.6).

## 2. The order, and why

1. Prepare: SQL, content gates, the merged build (section 3).
2. **OtakuQuiz first** (step A): its own gate, its date, its indexing.
3. **The hub last** (step B): its date, its indexing, its gate, Cards. NET_INDEXING on the hub lists `/anime/sitemap.xml` at once (`root-files.ts:119-124`), so OtakuQuiz must already be open and indexable (the OtakuQuiz sitemap has no closed-state guard: `root-files.ts:176`).
4. **kpopquiz.org's bridges** (step C), only once the hub is public and checked: `NET_CARDS_BRIDGES` there is the "hub is open" switch, it puts links to a hub that must already answer.
5. **Ads** (step D), last, long after, and only after Google approves the account.
6. In every project: `NET_LAUNCH_DATE` is saved before `NET_INDEXING`.

One change at a time, one redeploy per project per step, checks after each. If a check fails, stop and use the rollback line of that step.

## 3. Before step A (all must be true)

SQL (apply in the Supabase SQL Editor: one file at a time, each is one DO block, after a backup, never between 23:50 and 00:30 UTC; `docs/pending-migrations/`):

- [ ] Applied before the train: `L33-l1-security-audit.sql` (`multisite/launch/`), `cards/120-cap-7.sql`, `cards/121-ad-packs.sql` (121 refuses to run without 120), `cards/122-pulls-feed.sql`.
- [ ] Cards 099 to 115 were applied on 2026-11-15; 117 and 118 are applied (integrator, 2026-11-17); 116 is applied (the prod export of 2026-11-17 holds the lot 6 photos and the lot 7 columns). **Not confirmed: 116c** (optional, the approval of the photos pending for the personality rights warning alone). Owner: confirm or skip it.
- [ ] **Not confirmed in the repo: `L30`, `L31`, `L32`** (`multisite/launch/`). `PRIVATE-LAUNCH.md` step 3 asks for the three queries that prove the character references are gone (expected NULL, 0, 0); run them.
- [ ] The train (the one PR with all lanes) is merged and the three projects show the same commit, Ready.
- [ ] Run the GitHub workflow **Cards publish** (Actions, Cards publish, Run workflow; type the Supabase host the form asks for; the reviewer of environment `cards-publish` approves). It uses a service key kept in GitHub, not in this file.
- [ ] After that run, in this order: `cards/124-photoless-owned.sql`, then `cards/119-photocheck.sql`, then `cards/123-refill.sql` (124 first: the code that draws the "photo coming" frame is live after the train, and 124 keeps owned counts right when 119 takes photos away). Then run **Cards publish** again so the 139 new photos of 123 are cut. Expected, after 119 and 123 and the second publish: 1,050 cards in the packs (`docs/o1/reports/CARDS/REFILL.md`).
- [ ] The dle fills of 2026-11-22 (PR #250), any order, each after its base: `multisite/launch/L34-l1-kpopdle-fill.sql` (after L19, L20), `L35-l1-otakudle-fill.sql` (after L23), `L36-l1-series-fill.sql` (after L21).
- [ ] LAUNCH-POLISH-2 (2026-11-23), once its PR is merged: `cards/125-cap-5.sql` (the stack cap 7 to 5; needs 120 and 121, refuses without them; a stack of 6 or 7 is kept) and `multisite/launch/L37-l1-launch-polish-data.sql` (after L34, L35, L36: AKMU on Cemter of Inspiration, Heeseung out of the Kpopdle pool, the One Piece bounties Unknown and the compare rule for them).
- [ ] Still pending after all of the above: nothing in the Cards range 099 to 125 and L30 to L37, once the confirmations above are done. 121 serves the rewarded ad pack (the web claim) once the ad flags are on.

Content gates (`docs/launch/o1/PRIVATE-LAUNCH.md` step 4 and the audit, section 7):

- [ ] The "non free images" query returns 0 and the "orphan files" query returns 0 (both are in `PRIVATE-LAUNCH.md`, step 4). Otherwise do not open OtakuQuiz: those images show on series hubs and "which character" pages the minute the gate drops.
- [ ] The hub legal pages are in the build: `/terms`, `/contact`, `/dmca` (new, lot LAUNCH-POLISH), `/privacy` (with its KpopCards and Advertising sections), `/legal`.
- [ ] The privacy text matches what opens: the hub privacy policy has its KpopCards section (Cards opens with the hub) and its Advertising section (Google AdSense, the rewarded ad for 1 pack, consent through Google's message, personalised only with consent, no country marked child directed); it describes the ads as they run once the flags are on (step D).
- [ ] Owner decision still open in the audit: the credit-by-footer-link for Kpopdle tiles (section 1). Done in lot LAUNCH-POLISH: the locked pocket says "Card coming" (no date), and OtakuQuiz quiz pages show the Team badge with the byline "OtakuQuiz Team".

## 4. Step A: OtakuQuiz (project `otakuquiz`)

Set, then redeploy once:

- [ ] `NET_LAUNCH_DATE` = the launch date, `YYYY-MM-DD` (owner: set it). Save it first.
- [ ] `NET_INDEXING` = `1`, saved after the date.
- [ ] `PRIVATE_LAUNCH` = `0` (edit the existing row, or the shared variable if you use one; a project variable of the same name beats a shared one).
- [ ] Leave `NET_CARDS_BRIDGES` unset here for now (its only effect on OtakuQuiz is a button to a hub that is still closed).
- [ ] Redeploy `otakuquiz`. All three flags are read at build; none is runtime only.

Checks (in a private window, not signed in), section 9 gives the exact commands:

- [ ] `https://bunnyverse.org/anime` shows the real home, not Coming soon.
- [ ] The home has no `noindex` robots meta; `/anime/login`, `/anime/search` keep theirs.
- [ ] `https://bunnyverse.org/anime/sitemap.xml` answers 200 and lists quizzes, series, which-character pages.
- [ ] `https://bunnyverse.org/anime/terms`, `/anime/contact`, `/anime/dmca` answer 200.
- [ ] The hub at `https://bunnyverse.org` still shows Coming soon (the hub is not open yet).

Rollback: set `PRIVATE_LAUNCH` back to `1` (or remove it: unset closes a production build), remove `NET_INDEXING`, redeploy `otakuquiz`. Search engines that already fetched a page see noindex again on their next visit.

## 5. Step B: the hub (project `fandomverse`)

Set, then redeploy once:

- [ ] `NET_LAUNCH_DATE` = the same date as step A. Save it first.
- [ ] `NET_INDEXING` = `1`.
- [ ] `NET_CARDS` = `1` and `NEXT_PUBLIC_NET_CARDS` = `1` (the pair: pages and nav link). Skip both if the owner wants the hub open without Cards.
- [ ] `PRIVATE_LAUNCH` = `0`.
- [ ] Do **not** set `NET_CARDS_BRIDGES`, `NEXT_PUBLIC_NET_CARDS_BRIDGES`, `NET_CARDS_ADS`, `NEXT_PUBLIC_NET_CARDS_ADS`, `NET_CARDS_PUSH` yet.
- [ ] Redeploy `fandomverse`. The build prints the `[private-launch]` line only when the gate fails closed; no line means it opened.

Checks (private window, signed out):

- [ ] `https://bunnyverse.org` shows the real hub; `/kpopdle` and the daily pages answer; `/passport` sends a signed-out visitor to sign in.
- [ ] `/privacy` prints "In force since" with the date set, and it is indexable (no noindex meta).
- [ ] `/legal`, `/privacy`, and (after LEGAL merges) `/terms`, `/contact`, `/dmca` all answer 200 on the hub, with the mailbox visible.
- [ ] `/kpopcards` answers 200 and carries a `noindex` robots meta; `/kpopcards/credits` lists every photo with author, licence and source; the Cards section of `/credits` is filled.
- [ ] A locked pocket in a signed-in binder (`/kpopcards/collection`) shows a name and the words "Card coming" (or the French words if the owner kept them), no date, no number, no photo, no link. In the page source search for `opens_month`: it must not appear.
- [ ] `https://bunnyverse.org/sitemap.xml` lists `/anime/sitemap.xml`.
- [ ] Cards API: a signed-out `curl https://bunnyverse.org/api/cards/catalog` answers 401 or an empty public answer, never an error page (read the answer; `lib/cards/api.ts:55-72`).

Rollback: `PRIVATE_LAUNCH` to `1`, remove `NET_CARDS`, `NEXT_PUBLIC_NET_CARDS` and `NET_INDEXING`, redeploy `fandomverse`. To close only Cards: remove `NET_CARDS` and `NEXT_PUBLIC_NET_CARDS`, redeploy: a Cards URL answers as any unknown page.
To cut access immediately: set a new `PRIVATE_LAUNCH_KEY` (`openssl rand -hex 32`, same on both projects) and `PRIVATE_LAUNCH=1`, redeploy both (`PRIVATE-LAUNCH.md`, "Couper l'acces").

## 6. Step C: kpopquiz.org learns the hub is open (project `kpopquiz`, and the bridges of the hub)

Only when step B is checked and stable.

On `kpopquiz`:

- [ ] `NET_CARDS` = `1`
- [ ] `NET_CARDS_BRIDGES` = `1`
- [ ] `NEXT_PUBLIC_NET_CARDS_BRIDGES` = `1`
- [ ] `NET_KPOPDLE_HOME` = `1`, `NET_KPOPDLE_QUIZEND` = `1`, `NET_KPOPDLE_GROUP` = `1` (skip any already on; they all point at the hub)
- [ ] Redeploy `kpopquiz`. NET_KPOPDLE_* are read when pages render (build and ISR), the NEXT_PUBLIC one at build: one redeploy covers both.

On `fandomverse` (same moment, same redeploy as the hub's bridge side):

- [ ] `NET_CARDS_BRIDGES` = `1` and `NEXT_PUBLIC_NET_CARDS_BRIDGES` = `1`. Redeploy `fandomverse`.

On `otakuquiz`:

- [ ] `NET_CARDS_BRIDGES` = `1` (draws the button to the hub; it only shows once PRIVATE_LAUNCH is off there, already true). Redeploy `otakuquiz`.

Checks:

- [ ] `https://kpopquiz.org` home has the Cards block and the Kpopdle block; a group page has its Kpopdle card; the account menu has "Binder"; `/me` has a Collection section. A signed-out visitor sees the public parts only.
- [ ] kpopquiz.org robots and sitemap are unchanged (it was never closed). Run the two repo checks (section 9).
- [ ] The hub: a Kpopdle win offers its bonus pack; `/passport` has its Collection section.

Rollback (kpopquiz): remove `NET_CARDS_BRIDGES` (and `NEXT_PUBLIC_NET_CARDS_BRIDGES`, the three `NET_KPOPDLE_*`, `NET_CARDS`), redeploy `kpopquiz`; every bridge compiles to nothing and the site is as before. Same on `fandomverse` and `otakuquiz` for their own bridge rows.

## 7. Step D: ads (hub), last

At opening the ads stay off: NET_CARDS_ADS and NEXT_PUBLIC_NET_CARDS_ADS are not set, so no ad script is written, no consent message shows, no ad tile shows, and the ticket and claim routes answer 404. The privacy policy already describes Google AdSense, the rewarded ad, the consent message and the cookies (lot LAUNCH-POLISH). The owner's AdSense steps in full: `docs/o1/reports/CARDS/LAUNCH-POLISH-ADS.md`.

D1, may be done at opening (once the owner has the id):

- [ ] `NEXT_PUBLIC_ADSENSE_PUB_ID` = the publisher id, `ca-pub-` and 16 digits (owner: set it). Redeploy `fandomverse`. Effect: the AdSense verification meta tag and `/ads.txt` on the hub, nothing else.
- [ ] Check, once the hub is public (`/ads.txt` is gated like every page while PRIVATE_LAUNCH is on): `curl -s https://bunnyverse.org/ads.txt` answers 200 with exactly `google.com, pub-<the 16 digits>, DIRECT, f08c47fec0942fa0`; the home source holds `<meta name="google-adsense-account" content="ca-pub-<the 16 digits>">`; no `adsbygoogle.js` script in the page source while the flags are off; `curl -s https://bunnyverse.org/robots.txt` lets `Googlebot` and `Mediapartners-Google` through.
- [ ] In the AdSense console, ask Google to verify the site. Wait for the approval. Nothing below happens before it.

D2, only after Google approves the account:

- [ ] Owner: create the rewarded ad unit (or turn on H5 Games ads with the reward type) in the console.
- [ ] Owner: check in the console the three values flagged in `src/lib/cards/ads.ts` (`UNCONFIRMED_FOR_OWNER`: the under-age attribute, the test attribute, the consent script address).
- [ ] Owner: set up the consent message in Privacy and messaging (Google's certified CMP, TCF on), for the EEA, the UK and Switzerland. It is the only consent tool of the site.
- [ ] Optional: `CARDS_AD_PACKS_PER_DAY` (default 3) and `CARDS_AD_MIN_SECONDS` (default 15). Leave `NEXT_PUBLIC_CARDS_AD_PROVIDER` unset (adsense).
- [ ] Set `NET_CARDS_ADS` = `1` and `NEXT_PUBLIC_NET_CARDS_ADS` = `1`. Optional: `NEXT_PUBLIC_CARDS_ADS_TEST` = `1` for the first try only, then remove it. Redeploy `fandomverse` (the public one is inlined at build).
- [ ] Checks:
  - in the EEA, the UK, Switzerland, or with an unknown country, Google's consent message shows before any ad request, and a refusal gives no ad request (the ad tile stays hidden);
  - personalised ads only with consent to purposes 1, 3 and 4, otherwise non-personalised;
  - no country is marked child directed (owner, no general teen tagging); the site knows no player's age, so no request is marked under age today;
  - the ad tile opens a screen "Watch an ad, get 1 pack" with a link to the odds; nothing plays without the player's tap and yes; one yes covers one ad;
  - after the ad: 1 pack, only after Google's "viewed" event, at least `CARDS_AD_MIN_SECONDS` after the ticket, once per ticket, within `CARDS_AD_PACKS_PER_DAY`.

Known limit, accepted: AdSense gives no server callback on the web, so the server cannot prove the ad played; a player who skips it can still claim after the delay, within the daily cap. A provider with a signed callback (AppLixir, `NEXT_PUBLIC_CARDS_AD_PROVIDER=applixir` with the LAUNCH-PREP callback) closes it later.

Rollback: remove `NET_CARDS_ADS` and `NEXT_PUBLIC_NET_CARDS_ADS`, redeploy `fandomverse`: no script, no banner, no tile, the routes answer 404. `NEXT_PUBLIC_ADSENSE_PUB_ID` can stay (meta tag and ads.txt only); remove it too to take those down.

## 8. Which variables need a new build

- Every `NEXT_PUBLIC_*` row (NEXT_PUBLIC_NET_CARDS, NEXT_PUBLIC_NET_CARDS_BRIDGES, NEXT_PUBLIC_NET_CARDS_ADS, NEXT_PUBLIC_NET_CARDS_PUSH, NEXT_PUBLIC_ADSENSE_PUB_ID if it is public): inlined in the build, so a **Redeploy** of that project is required.
- `PRIVATE_LAUNCH`, `NET_INDEXING`, `NET_LAUNCH_DATE`: read at build (`next.config.ts`, metadata, sitemap, the privacy page). Redeploy.
- `NET_CARDS`, `NET_CARDS_BRIDGES`, `NET_CARDS_ADS`, `NET_KPOPDLE_*`, `CARDS_*` numbers: read on the server when a page or route runs, but several feed the route map and static pages (ISR). Treat them as build time as well and redeploy after every change; a change without a redeploy is not proven.
- Runtime only: `CRON_SECRET` and the other secrets of `ENV.md`. None changes in this runbook.

## 9. The checks, exact commands

From the repo, in `apps/quiz` (the scripts are in `apps/quiz/package.json`):

- Route guard: `npm run check:routes` (runs `scripts/check-route-allowlist.mts`; needs no server and no URL; it also runs inside `npm run build`, so a green build already passed it). Expected: exit 0, no route listed as unreachable.
- Sitemap hygiene: `SITEMAP_BASE_URL=https://kpopquiz.org npm run check:sitemap-hygiene` (the script is written for kpopquiz.org: it reads `<base>/sitemap.xml`, checks no killed route is advertised, every priority group hub is present, and the file is under 50,000 URLs; default base is `http://localhost:3021`). Run it after step C. It does not check bunnyverse.org: use the curl lines below for the hub and OtakuQuiz. In CI the same script runs with `pnpm run check:sitemap-hygiene` (`.github/workflows/seo-gates.yml`).
- Optional: `SITEMAP_BASE_URL=https://kpopquiz.org npm run check:indexability` if the owner wants the full crawl (`scripts/check-indexability.mts`).

By hand (a terminal, no key needed; a private window for the pages):

```
curl -s https://bunnyverse.org/robots.txt
curl -s https://bunnyverse.org/sitemap.xml
curl -s https://bunnyverse.org/anime/sitemap.xml | head -40
curl -sI https://bunnyverse.org | grep -i x-robots-tag
curl -s https://bunnyverse.org | grep -io '<meta name="robots"[^>]*>'
curl -s https://bunnyverse.org/anime | grep -io '<meta name="robots"[^>]*>'
for p in /privacy /legal /terms /contact /dmca /credits /kpopcards /kpopcards/credits; do curl -s -o /dev/null -w "$p %{http_code}\n" "https://bunnyverse.org$p"; done
for p in /anime/terms /anime/contact /anime/dmca; do curl -s -o /dev/null -w "$p %{http_code}\n" "https://bunnyverse.org$p"; done
```

Expected after step B:

- robots.txt: one file for bunnyverse.org, `Sitemap:` lines name only bunnyverse.org addresses, `/api/`, `/auth/`, `/settings/`, `/onboarding/` disallowed, the OtakuQuiz rules under `/anime/...` (`src/app/sites/[site]/robots.txt/route.ts`).
- `sitemap.xml` is an index that lists the hub pages and `/anime/sitemap.xml`; the hub pages list holds `/`, the Terrier pages that answer, `/privacy`, `/legal`; `/credits` is **not** in it on purpose (`src/lib/dle/seo.ts:153`).
- No `x-robots-tag: noindex` on bunnyverse.org. The hub home and `/anime` have no `noindex` meta. `/kpopcards` keeps its `noindex`.
- Legal pages: 200 on the hub for `/privacy`, `/legal`, `/terms`, `/contact`, `/dmca`; the Commons credits: `/kpopcards/credits` and `/credits` list authors and licences, and a card page `/kpopcards/c/<num>` shows its credit block under the card (`credit-block.tsx`).
- Locked pockets: the name and "Card coming" only, never a date.

Search Console (owner, after step B): submit `https://bunnyverse.org/sitemap.xml` for bunnyverse.org; it covers `/anime`. kpopquiz.org keeps its own.

## 10. Rollback in one table

| Step | Remove or set, then redeploy |
|---|---|
| A, OtakuQuiz | `otakuquiz`: `PRIVATE_LAUNCH=1`, remove `NET_INDEXING` (leave the date) |
| B, hub open | `fandomverse`: `PRIVATE_LAUNCH=1`, remove `NET_INDEXING`, `NET_CARDS`, `NEXT_PUBLIC_NET_CARDS` |
| B, Cards only | `fandomverse`: remove `NET_CARDS`, `NEXT_PUBLIC_NET_CARDS` |
| C, kpopquiz bridges | `kpopquiz`: remove `NET_CARDS_BRIDGES`, `NEXT_PUBLIC_NET_CARDS_BRIDGES`, `NET_CARDS`, `NET_KPOPDLE_HOME`, `NET_KPOPDLE_QUIZEND`, `NET_KPOPDLE_GROUP`; also `fandomverse` and `otakuquiz`: remove `NET_CARDS_BRIDGES` |
| D, ads | `fandomverse`: remove `NET_CARDS_ADS`, `NEXT_PUBLIC_NET_CARDS_ADS` (and `NEXT_PUBLIC_ADSENSE_PUB_ID` to drop the meta tag and ads.txt) |
| Emergency close | new `PRIVATE_LAUNCH_KEY`, `PRIVATE_LAUNCH=1` on both projects, redeploy both |

SQL files each have a `.rollback.sql` beside them in `docs/pending-migrations/`; no step above needs one. 124 and 119 take no data away from players (owned cards are never touched).

## 11. Questions for the owner

1. The launch date for `NET_LAUNCH_DATE` (`YYYY-MM-DD`), and the day of each step.
2. Does Cards open with the hub (step B) or later? The runbook assumes with it.
3. The AdSense publisher id, and the `ads.txt` line from the AdSense console.
4. The credit of the Kpopdle tiles: on `/credits` only, or also by a footer link (audit, section 1).
5. Confirm SQL 116c (optional), L30, L31 and L32 are applied.
6. Whether kpopquiz already holds any `NET_KPOPDLE_*` or `NET_CARDS*` variable (the table above assumes none).
