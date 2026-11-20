# LAUNCH-PREP opening audit (lane SECAUDIT, 2026-11-17)

Read only. Nothing in the code was changed for this part. Paths are under `apps/quiz/` unless they start with `docs/`. Prod counts
were read by ORCH on 2026-11-17. No date of birth, no picture of a person and no film image appears here.

Verdicts: **ready**, **not ready**, **owner action**.

## 1. Author credit and licence of every Commons photo

Verdict: **ready for the cards, owner action for what the Kpopdle tiles show**.

- Card page, `src/app/sites/[site]/(hub)/kpopcards/c/[num]/page.tsx:51` renders `src/components/cards/credit-block.tsx:8-31`: photo number,
  author (link), licence (link to the licence page), source page (link), what was changed, "shared under CC BY-SA" line, "Report a photo".
  It sits under the card, never behind a flip (`card-detail.tsx:172` repeats the one-line credit on the back). A card with no photo says its
  art is drawn (`credit-block.tsx:10-12`). Only https links are ever linked (`src/lib/cards/ui-credit.ts:15-17`).
- Full list: `/kpopcards/credits` (`.../kpopcards/credits/page.tsx`) and the Cards section of the hub `/credits`
  (`src/app/sites/[site]/credits/page.tsx:50-55`, `src/components/cards/credits-section.tsx`), one row per photo with the cards that carry it.
  The lobby footer links it (`src/components/cards/lobby-view.tsx:430`); the idol view says "credited on the card" (`idol-view.tsx:53`).
- Kpopdle (hub `/kpopdle`): a tile photo is either a verified `entity_images_public` row or a live Cards photo with a named author and a free
  licence (CC BY, CC BY-SA, CC0, public domain), `src/lib/dle/idol-pictures.ts:1-12`. Owner rule CR-021 (2026-11-02): no credit is printed on a
  tile, the credit is listed on `/credits` (`src/lib/entity-images/display.ts:19-22`, `src/components/hub/credits/hub-credits.tsx:25`); the
  footer link shows only when a credited photo stands on a tile (`src/components/hub/dle/dle-game-page.tsx:70-71`, `lib/credits/site-credits.ts`).
- Missing or to decide:
  - `/credits` lists only CC BY and CC BY-SA (CR-021). CC0 and public domain need no credit: fine. Confirm the owner accepts a credit
    reachable by one footer link for a small tile (CC BY asks for "reasonable" attribution; the page is the usual answer, but it is a
    decision, not a given).
  - `/credits` of the hub is deliberately not in the hub sitemap (`src/lib/dle/seo.ts:153`). It is indexable once listed
    (`credits/page.tsx:79`). Fine, say so if asked.
  - With NET_CARDS off, the Cards section of `/credits` is empty (`credits/page.tsx:51-52`); Kpopdle's credited cards photos still appear
    through `idolSet.credits` (`credits/page.tsx:41-43`). Good.

## 2. Hub legal pages (privacy, terms, cookies)

Verdict: **privacy: not ready if Cards ads or push open; legal notice: ready; terms: not ready (missing); cookies: ready as a section**.

- Legal notice `/legal`: `src/app/sites/[site]/legal/page.tsx` reuses `src/app/(site)/legal/page.tsx` (`networkLegalMetadata`, line 70:
  indexable only when no `[BRACKETED]` fact is left). The only placeholder key is `legal.phone` (`src/lib/site/hub/network-page.ts:174`) and it is
  filled (`src/copy/hub/h1.ts:303`), so the gate `legalLaunchGate` (`src/lib/site/hub/legal.ts:35-41`) passes. **ready**.
- Privacy `/privacy`: `src/app/sites/[site]/privacy/page.tsx`, text keys in `src/copy/hub/h1.ts:198-241`, rendered by
  `src/components/hub/hub-privacy.tsx`. Cookies and local storage are a section of it (`privacy.cookies.*`, h1.ts:228-241: sign-in cookie,
  passport cookie, `nq_anon`, OAuth cookie, theme, caps, spoiler). There is no separate `/cookies` page, and none is needed while nothing
  needs consent. Not ready for two reasons:
  1. h1.ts:227 says "We show no advertising on the sites" and h1.ts:229 "no advertising cookies". `NET_CARDS_ADS` (rewarded ad, AdSense script,
     consent banner: `src/lib/cards/ads.ts`, `src/lib/cards/flags.ts:65-72`) makes both false. Keep `NET_CARDS_ADS` off, or rewrite the two
     sentences and add a consent flow before it opens. **owner action**.
  2. The policy never mentions Cards: packs and wallets tied to the account, friend codes and nicknames, push subscriptions
     (`/api/cards/push`, table `cards_push_subs`, `NET_CARDS_PUSH`), the demo claim's device and IP fields (`cards_demo_claims`), the report form.
     The "What the site keeps" list (`privacy.keeps.*`, `network-page.ts:91-97`) needs a Cards line before NET_CARDS opens. **not ready**.
- Terms: the hub has **no `/terms`**. The hub route map is `/`, `/privacy`, `/legal`, `/passport`, `/u/{username}`, `/settings/**`, `/login`,
  `/directory`, `/credits` (+ games, + Cards) (`src/lib/site/registry.ts:307-315`). `/terms` exists for OtakuQuiz only
  (`src/app/sites/[site]/(anime)/terms/page.tsx`, last updated March 27, 2026, written for OtakuQuiz) and for kpopquiz.org
  (`src/app/(site)/terms/page.tsx`). A hub with accounts, a public profile `/u/...` and a Cards economy ships without terms. Needs a text (owner
  decision on content) and a route entry. **not ready, owner action**.
- Also absent on the hub: `/contact`, `/dmca` (OtakuQuiz has both under `(anime)`). The legal notice carries the mailbox
  (`src/lib/site/hub/legal.ts:15-17`); the card report form is `/kpopcards/report`. **owner decision**.
- Build gates: with `NET_INDEXING` on, the build fails without a valid `NET_LAUNCH_DATE` (`src/lib/site/indexing.ts:83-91`, called from
  `privacy/page.tsx:12`). **owner action**: set it on the project before switching NET_INDEXING.

## 3. robots, sitemap, noindex of the hub and of OtakuQuiz once they open

Verdict: **ready by design, with owner actions on the order of the flags and two checks**. Rulebook read: `.claude/skills/kpopquiz-seo/SKILL.md`
section 9 (indexing controls) and section 11.

- Closed state (default): `NET_INDEXING` unset means every page answers `noindex, nofollow` (`src/lib/site/indexing.ts:35,43-45`), a
  preview build is always closed (`indexing.ts:32,35`), and `next.config.ts:47,234,304` adds `X-Robots-Tag: noindex, nofollow` to answers
  that are not HTML. robots.txt stays crawlable on purpose (a noindex needs a crawl): `src/app/robots.ts:12-76` (`allow /`, disallow
  `/api/`, `/auth/`, `/admin/`, `/settings/`, `/onboarding/`; OG images and the stylesheet stay allowed, OAI-SearchBot, PerplexityBot,
  Googlebot and Bingbot via `*` stay allowed, SKILL.md 9.7). The hub serves the one robots.txt of bunnyverse.org with the OtakuQuiz rules
  under `/anime/...` (`src/app/sites/[site]/robots.txt/route.ts:20-25`, `src/lib/site/root-files.ts:86-97`). Sitemap line is the site's own
  (`robots.ts:74`).
- Open state: `NET_INDEXING=1` on **each** Vercel project (hub and OtakuQuiz). Each page then speaks for itself: the ones written to be
  indexed say index (`robotsFor(true)`), the others keep their own noindex (login, settings, search, thin series hub, Cards pages:
  `kpopcards/c/[num]/page.tsx:37` and `kpopcards/page.tsx:14` use `robotsFor(false)`, so cards are never indexed on any build, SKILL.md 9.2).
- Hub sitemap (`src/app/sites/[site]/sitemap.xml/route.ts`, `sitemap-hub.xml/route.ts`, `src/lib/site/root-files.ts:150-170`): closed lists
  only `/`; open lists `/`, the Terrier pages that answer, `/privacy`, `/legal`. `/credits` stays out (deliberate, `src/lib/dle/seo.ts:153`).
  French Terrier pages stay noindex and out until reviewed (SKILL.md 10.3, `seo.ts:14`).
- OtakuQuiz sitemap (`root-files.ts:176-190`): home, `/series`, series hubs with enough quizzes, which-character pages, published quizzes.
  Checks:
  1. **The hub decides for OtakuQuiz.** The hub's index lists `/anime/sitemap.xml` when the hub's own `NET_INDEXING` is on
     (`root-files.ts:119-124`, it cannot read the other project). `sitemapEntriesFor` for anime has no closed-state guard
     (`root-files.ts:176`): if the hub is on and the OtakuQuiz project is still off, the index points at a sitemap full of noindex pages.
     **owner action**: switch both projects together, hub last.
  2. OtakuQuiz pages that are always noindex or out of the sitemap: login, search, create, settings, admin, me, notifications (allowlist
     in SKILL.md 9.2). Not re-tested here.
- Canonical and hreflang of the hub's own pages use `dleAlternates` (`credits/page.tsx:78`). The IndexNow outbox rules (SKILL.md 11) apply
  to new pages, none added here.
- Missing: nothing in code. The checks `check:routes` and `check:sitemap-hygiene` named in SKILL.md should be run on the opening build
  (not run here: read only).

## 4. Locked pockets (name and "Carte a venir", never a date)

Verdict: **not ready on wording, ready on the rule**.

- Rule held: the pocket carries the name and the words only (`src/components/cards/binder-view.tsx:46-58`), "no date, no link, no number,
  no star" (comment at line 46, `src/lib/cards/ui-model.ts:181-199`). The type says the month "is never sent to a browser" and `locked` is a
  boolean only (`src/lib/cards/types.ts:143-145`). The opening month lives in `cards_age_locks()` and is read by the admin only
  (`src/lib/cards/admin-photos.ts:177-192,310-320`; a search of `src` finds no public reader of `opens_month`). No photo is used for a locked
  subject (`src/lib/cards/ui-detail.ts:76-81`: a locked card page has no card and no credit, only "No free photo can make this edition yet.").
  A locked pocket is never a search result, a "missing", an "owned" or a "favourite" (`ui-model.ts:281`).
- Wording: the pocket prints the French words **"Carte à venir"** (`binder-view.tsx:50,54`) on an English-language page (bunnyverse.org
  Cards has no French tree: `(hub)/fr` holds only credits, daily, kpopdle, otakudle). Either ship "Card coming" (English equivalent, no date) or
  accept French on purpose. **owner decision**; it is a one-line copy change.
- The name of a locked person is still printed. That is the design of lot 6 (name only, no picture); confirm it is what the owner wants
  for under-18 subjects, since it makes the lock visible.

## 5. The Team badge

Verdict: **ready on kpopquiz.org, not ready on OtakuQuiz**.

- Component `src/components/ux-v1/team.tsx:9-12` (pill "Team"), byline `src/lib/seo/team-byline.ts` ("the KpopQuiz Team").
- kpopquiz.org: the quiz page passes the flag (`src/app/(site)/q/[slug]/page.tsx:178,208,277,426,463,473`), the player shows it
  (`src/components/quiz/quiz-player.tsx:99,754`), the person card too (`src/components/profile/person-card.tsx:44,137-140`).
- OtakuQuiz: the quiz twin `src/app/sites/[site]/(anime)/q/[slug]/page.tsx` has **no Team handling** (no `isTeamQuiz`, no `creatorIsTeam`):
  line 240 prints "by ${quiz.creator_username}" in the description and lines 365-376 pass the plain creator, so a Team quiz on OtakuQuiz shows
  the handle with a level, not the badge. Only `(anime)/search/page.tsx:180` draws the tag. L31 (`team-handles`) already renamed the 9 handles
  so they no longer read like fans, which lowers the harm. Also the byline text is "KpopQuiz Team", wrong brand on OtakuQuiz and the hub. Needs a
  twin of the kpop logic with a brand-neutral or per-site byline. **not ready** (code), unless OtakuQuiz opens with no Team quiz in it.
- Hub: no quiz or feed surface, `/u/{username}` is the only place a Team account can show; not checked for the pill.

## 6. What PRIVATE_LAUNCH=0 and NET_CARDS open exactly

### PRIVATE_LAUNCH=0 (`src/lib/private-launch/config.ts`, `next.config.ts:55-63,151-153,305-306`)

- Scope: hub and OtakuQuiz builds only; kpopquiz.org is never gated (`config.ts` `readPrivateLaunch`). Unset or empty means closed on a Vercel
  production build, so an explicit `0`, `false`, `off` or `no` is the only way to open (`config.ts:84-101`). Any typo stays closed.
- Opens: every page of the site, through the removal of the gate's last `beforeFiles` rewrites (they sent every path except `login`,
  `robots.txt`, `sitemap.xml` to the Coming soon page: `config.ts:46-58`) and the removal of `noindex, nofollow` that the gate added to answers
  to browsers without the cookie (`next.config.ts:305-306`). That is every route the site has: hub `/`, `/passport`, `/u/...`, `/directory`,
  `/credits`, `/privacy`, `/legal`, the daily pages, `/kpopdle`, `/otakudle*`, `/fr/*` (the games only if their own flag is on) and, if NET_CARDS is
  on, the Cards pages; OtakuQuiz pages (quizzes, series hubs, trivia, community, leaderboard, search, create, sign-in dependent pages).
- Opens for the Cards API: `lib/cards/api.ts:55-72` and `lib/cards/private.ts` stop answering 404 to guests and to accounts that were not
  allowed (`privateLaunchBars`): `/api/cards/*` and the account-bound Cards reads are then reachable by anyone, subject to NET_CARDS.
- Does not open, by construction: `/api/**`, `/auth/**` and crons were never gated (`config.ts:46-58`); nothing about them changes. It does not
  set the indexing: `NET_INDEXING` is a separate switch (section 3), so with PRIVATE_LAUNCH=0 and NET_INDEXING off the site is public but noindex.
- Missing before flipping: sections 1 (Kpopdle credit decision), 2 (hub terms, Cards in the privacy text), 4 (pocket wording), 5 (OtakuQuiz Team
  badge) and 7 (character images, below) are all reachable by the public the minute the gate drops.

### NET_CARDS (hub only; `src/lib/cards/flags.ts:1-12,53-56`, `src/lib/cards/ui-flag.ts:6-8`)

- Pages (the route map, `src/lib/site/registry.ts:290-315`): `/kpopcards`, `/kpopcards/open/{theme}`, `/kpopcards/open/focus/{group}`,
  `/kpopcards/collection`, `/kpopcards/collection/{group}`, `/kpopcards/c/{num}`, `/kpopcards/idol/{name}`, `/kpopcards/missions`,
  `/kpopcards/ranking`, `/kpopcards/u/{nickname}`, `/kpopcards/odds`, `/kpopcards/help`, `/kpopcards/credits`, `/kpopcards/report`, and the
  old `/cards`, `/cards/**` which only redirect (`src/lib/cards/kc-paths.ts`). All noindex (`robotsFor(false)`).
- Content added to an existing page: the Cards section of the hub `/credits` (`src/app/sites/[site]/credits/page.tsx:50-55,90`).
- API: `src/app/api/cards/catalog`, `state`, `demo`, `demo/claim`, `ad/ticket`, `push`, `report`, plus `src/app/api/cards-bridge/me`.
  `ad/ticket` and `push` also need their own flags below.
- Navigation: the hub's Cards entry in the nav needs `NEXT_PUBLIC_NET_CARDS` (build-time, public twin: `src/lib/ux-v1/a0/nav.ts:47-62,104`).
  Set both or the pages exist with no link (or a link with no page).
- Not opened by NET_CARDS alone (each has its own flag, all default off): `NET_CARDS_BRIDGES` (kpopquiz.org home block, group block,
  Kpopdle-win bonus pack, account menu "Binder" link, passport and `/me` Collection section: `src/lib/cards-bridge/flags.ts`,
  `src/components/home/ux-v1/ux-home.tsx:57`, `components/group/ux-v1/hub.tsx:159`, `components/layout/ux-v1/ux-client-shell.tsx:25`,
  `components/hub/dle/dle-game.tsx:41`, `app/(site)/me/page.tsx:191-197`; needs NET_CARDS too and also reaches **kpopquiz.org**),
  `NET_CARDS_ADS` + `NEXT_PUBLIC_NET_CARDS_ADS` (AdSense, rewarded ad, consent banner: `src/lib/cards/ads.ts`), `NET_CARDS_PUSH` +
  `NEXT_PUBLIC_NET_CARDS_PUSH` (`/api/cards/push` and the job).
- Job: `vercel.json:106-109` runs `/api/cron/cards-push` every 10 minutes whatever the flags say, it answers 404 and does nothing while
  `NET_CARDS_PUSH` is off (`src/app/api/cron/cards-push/route.ts:2`) and outside 22:00 to 08:00 Paris otherwise. No other Cards job exists.
- Needs the database: files 099 to 115 are applied (memory note, 2026-11-15). The age-lock functions (`cards_age_locks`, harvest file) must be
  applied before the binder shows pockets (`harvest-sql.ts:111-139`).

## 7. Otaku character images still 'other' or 'cc0' from fandom.com

Verdict: **not ready, owner action** (the owner replaces them by hand).

Numbers (read by ORCH): **1,012** anime character images with licence `other` (none with fandom.com in `source_url` or `license_note`), and
**56** with licence `cc0`, **54** of them from fandom.com. The repo's own definition of "not free" is
`src/lib/entity-images/non-free.ts:1-30`: branch A = `other` with a note starting "Official artwork", created on the UTC day 2026-11-11 (the 1,012);
branch B = `cc0` with a source host fandom.com or wikia.nocookie.net (the 54). `NON_FREE_MAX_ROWS` is 1,100 (`non-free.ts:36`). An admin button
"Supprimer les images non libres" and an SQL text (`NON_FREE_SQL`, `non-free.ts:104-111`) select them; the owner chose to replace by hand.

Where the site shows them (this is the point that matters at opening):

- OtakuQuiz series hub: `src/app/sites/[site]/(anime)/[slug]/page.tsx:106` (`getOwnerCharacterPictures`).
- "Which character are you" result card: `src/lib/personality/character-page.ts:21,30`.
- Both read `entity_images` for `kind` series or character **without a `license_verified` filter**
  (`src/lib/anime/entity-images-read.ts:33,73-92`); the anon policy `entity_images_select_display` allows exactly those two kinds
  (`out/launch-prep/functions-views-policies-2026-11-17.json`, policies). So the 1,066 non-free rows (and every other row) are public the minute
  PRIVATE_LAUNCH drops; setting `license_verified = false` hides them from the games only.
- Not shown there: Otakudle and every game read `entity_images_public`, which requires `license_verified` and a 96 px thumb and an https
  source (`out/...` view definition; `src/lib/photos/public-read.ts:192`, `src/lib/dle/read.ts:114`). `/credits` lists only CC BY and CC BY-SA
  (`credits/page.tsx:60-63`), so none of the `other` or `cc0` rows is credited anywhere, by CR-021.
- Needs, in order: replace or delete the 1,066 rows (the button or the owner's hand work), then `src/lib/anime/entity-images-read.ts:33` should
  only show verified rows for characters so a future wrong row cannot go public; that change is not made here (code lane, not this audit).
  Until then **hold PRIVATE_LAUNCH on OtakuQuiz** or accept the exposure.
