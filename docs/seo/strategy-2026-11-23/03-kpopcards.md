# KpopCards SEO strategy (agent 3, 2026-11-23, main f570abc)

**Verdict.** Index `/kpopcards`, `/kpopcards/odds` and `/kpopcards/help`, and `/kpopcards/credits` after a dedupe. Everything else stays noindex. The landing must not be indexed until its copy is in server HTML: today Googlebot sees a game shell with the H1 "Your packs".

## 1. SERP and market

Method: WebSearch tool (US), 2026-11-23. These are not live Google SERP captures, so order is approximate and no volumes were available **[unverified]**. kpopquiz.org GSC (`docs/refonte/gsc/Requetes.csv`, 724 queries) has **0** queries with photocard, card, binder, collect, gacha or pack. `Performance-Pages.csv` is a test fixture.

| Query | Who shows up | Intent | Note |
|---|---|---|---|
| kpop photocard game | Roblox ([1](https://www.roblox.com/games/96221947086454/My-KPOP-Photo-Card-Collection), [2](https://www.roblox.com/games/17874520696/K-Cards-KPOP-Photocard-Simulator)), [PCollect](https://apps.apple.com/us/app/pcollect-k-pop-photocards/id6448884412) tracker, [tin.cards](https://www.tin.cards/), [Etsy](https://www.etsy.com/listing/4394915998/k-pop-photocards-dice-game-photocard) | play | no free web game with public odds and credits |
| kpop card game online | [IDOLS CLASH](https://idolsclash.com/) (tabletop), [K-Collect](https://kcollect.uk/), [kpop-gacha.com](https://kpop-gacha.com/), [kpopmatch](https://kpopmatch.com/) | play | same gap |
| kpop photocard collecting game online free | [K-Collect tracker](https://kcollect.net/), [Bias Room](https://biasroom.com/kpop-photocard-collector), kpop-gacha.com, [Sporcle](https://www.sporcle.com/games/charityspam/my-kpop-photocard-collection) | mixed | trackers crowd the results |
| kpop gacha game | kpop-gacha.com, [kgacha.lol](https://kgacha.lol/) (Discord), [Play Store app](https://play.google.com/store/apps/details?id=com.GamePalette.IdolGachaEN&hl=en), [Game Rant](https://gamerant.com/best-idol-management-games/) | play | an H2 on the landing, not a URL |
| virtual photocard binder, kpop card collection app | [Bibliocards](https://bibliocards.com/virtual-photocard-binder/), [Bias Room](https://biasroom.com/digital-photocard-binder), [Pocamarket](https://play.google.com/store/apps/details?id=com.pocamarket.global) | track or trade real cards | **mismatch** |
| kpop photocard binder, photocard template printable | [Amazon](https://www.amazon.com/kpop-photocard-binder/s?k=kpop+photocard+binder), [Etsy](https://www.etsy.com/market/photocard_templates_printable) | buy or print | **mismatch** |
| jeu photocard kpop, jeu de cartes kpop | [makers](https://moshi.cam/kpop-photocard-maker), French shops, **[Sarang](https://sarang.club/)** | make, buy, play | French waits for rule 10 |

Competitors:
- **Sarang** is close to a French twin: free, no ads, credited Commons photos, a booster every 10 minutes, a market. Title "Sarang", H1 "Boosters", odds that disagree with each other.
- **kgacha** publishes its rates but no photo credits. **kpop-gacha.com** has a gem shop, no percentages, no photo source.
- SuperStar games ([SMTOWN](https://play.google.com/store/apps/details?id=kr.co.dalcomsoft.superstar.a&hl=en_US)) did not appear **[unverified]**.
- **Brand collision:** [kpopcards.net](https://kpopcards.net/) (Dutch tracker). Keep "Bunnyverse" with the brand. Trademark status **[unverified]**.

**Takeaway.** People who want to play land on Roblox and on gacha sites that disclose little. Binder, template and app queries are about buying, printing or tracking real cards. Our edge is trust: public odds, credited photos, adults only, nothing for sale.

## 2. Current state (code facts)

- **Robots and titles**
  - `robotsFor(false)` everywhere: noindex, nofollow while closed, **noindex, follow** once `NET_INDEXING=1` (`lib/site/indexing.ts:43-45`). The comment at `c/[num]/page.tsx:36` ("nofollow on every build") is wrong.
  - Template `%s | Bunnyverse` (`registry.ts:345`). Titles: "KpopCards" (`kpopcards/page.tsx:12`), "Odds", "Help".
  - No canonical or OG on any Cards page (`app/sites/[site]/layout.tsx:56`). No Cards URL in the hub sitemap (`lib/site/root-files.ts:152-171`).
- **Overclaim.** "Six editions of every idol" (`page.tsx:13`, `cardsFacts` in `cards-banner.tsx`); the FAQ says "up to 6" (`cards-faq.tsx:41,63`).
- **Landing is client-only.** `LobbyView`, H1 "Your packs" (`lobby-view.tsx:186`), status starts `'loading'` (`cards-provider.tsx:66`). Its data comes from `/api/cards/*`, which robots.txt disallows (`app/robots.ts:25`). Google sees no sentence saying what KpopCards is.
- **Odds** is a server table from the real catalog (`drop-rates.tsx:20-70`). **Help** is server HTML: 3 steps and 11 questions in `<details>`, no FAQPage (`cards-faq.tsx`).
- **Credits are duplicated.** `/kpopcards/credits` renders the same `CardsCreditsSection` that hub `/credits` embeds. The hub page is indexable and canonical to itself (`app/sites/[site]/credits/page.tsx:24,50-55,78,85-90`).
- **Card, idol and binder pages.** `c/[num]`: 1,263 client-rendered URLs (`REFILL.md:9`), each linked from credits (`credits-section.tsx:43`). `idol/[name]`: ownership-gated; a guest sees name, group, debut year, silhouettes (`idol-view.tsx:33-37`). `collection/[group]`: **age-locked minors shown as name + "Card coming"** (`binder-view.tsx:46-54`). `/collection` sends a loading fallback (`collection/page.tsx:20`).
- **Bridges from kpopquiz.org are not crawlable.** Every link goes through `/auth/passport/out` (`lib/cards-bridge/links.ts:11-14`), which robots.txt disallows, and several are nofollow (`cards-group.tsx:20`, `cards-idol.tsx:40`): **0 crawlable links**. Guests there see card backs only (`cards-group-grid.tsx:3`).
- **Hub links.** The nav item comes with `NEXT_PUBLIC_NET_CARDS` (`nav.ts:62`); the home banner and the Kpopdle link need `NET_CARDS_BRIDGES`. `/kpop-games` has no KpopCards entry (rule 8.3).
- **Photos.** 187 are pending only for Commons' personality-rights warning; optional step 116c approves them (`LOT6-HARVEST.md:26`, `LAUNCH-RUNBOOK.md:85`).
- **Precedents.** `WebApplication`+`VideoGame` JSON-LD with no rating (`lib/dle/seo.ts:120-135`); `atLeast` (`lib/stats/site-stats.ts:90`). `docs/strategy/` is not in this clone.

## 3. Indexability per route

| Route | Decision | Reason |
|---|---|---|
| `/kpopcards` | **Index after P0** | owns "kpop photocard game", a playable unique asset |
| `/kpopcards/odds` | **Index at launch** | trust page (rule 12), real data competitors hide |
| `/kpopcards/help` | **Index at launch** | full rules for brand questions; the landing summarises and links here |
| `/kpopcards/credits` | **noindex, follow now; index after the P1 dedupe, no sitemap** | duplicates `/credits#cards` today (rule 1) |
| `/collection` | Never | per-user; loading fallback (rule 3.6) |
| `/collection/{group}` | Never by default | only the entity changes (rule 1.4), exposes minors' lock state, "{group} photocards" is buying intent. Revisit only with an all-adult lineup, unique text and 300+ impressions in 90 days (rule 1.3) |
| `/c/{num}` | Never | 1,263 near-duplicates ([Google scaled content, doorways](https://developers.google.com/search/docs/essentials/spam-policies)); personality rights |
| `/idol/{name}` | Never | ownership-gated template; competes with kpopquiz.org idol pages |
| `/open/*`, `/missions`, `/ranking`, `/u/*`, `/report` | Never | actions, per-user boards, profiles (rule 9.2; players may be minors), a form |
| `/cards/**`, `kpopcards.bunnyverse.org` | Redirect | already 308 (`kc-paths.ts:37-45`, `routing.ts:270-273`) |

For the indexable pages: canonical to self (parameter variants to the clean URL); in the sitemap only when `cardsOn() && indexingOpenFor('hub')`; lastmod is the copy date, or for odds the catalog date when the odds really changed (rule 9.6); IndexNow enqueue at launch.

## 4. Proposed TARGETS-bunnyverse rows

| Cluster | Queries | URL | Intent | Lang | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| kpop photocard game | kpop photocard game, kpop card game online, free kpop photocard game, kpop photocard collecting game, kpop photocard simulator | /kpopcards | play a free K-pop photocard game in the browser | en | [P] SERP gap (agent3 2026-11-23); kpopquiz.org GSC 0 of 724 | impressions, clicks at 90 days | built, noindex until P0 |
| kpopcards odds | kpopcards odds, kpopcards drop rates | /kpopcards/odds | odds and guarantees | en | rule 12 | none (trust) | built |
| how kpopcards works | kpopcards help, how to play kpopcards | /kpopcards/help | the rules | en | brand | brand impressions | built |
| kpopcards photo credits | kpopcards credits | /kpopcards/credits | credits | en | rule 12 | none | noindex until dedupe |

Left alone: "kpop games" (kpopquiz.org `/kpop-games`), "{group} games" (group hubs), and binder, template or printable queries.

## 5. Metadata and answer blocks

Lengths include " | Bunnyverse". Every `{x}` is filled by code, never typed.

**/kpopcards**
- Title (49): `KpopCards: Free K-pop Photocard Game`
- H1: `KpopCards: free K-pop photocard game`. "Your packs" becomes an H2.
- Meta (146): "KpopCards is a free K-pop photocard game: open a free pack every {PERIOD} minutes, fill a binder for each group and check the odds. No money, no market."
- Answer block (59 words, server HTML, for every visitor): "KpopCards is a free K-pop photocard game on Bunnyverse. A free pack of {PACK_SIZE} cards lands every {PERIOD} minutes. Open it, fill a binder for each group, and finish sets for more packs. Packs are never sold and cards have no money value. {atLeast(inPacks)} cards are in the packs as of {Month Year}, each from a credited free-licence photo."
- Question H2s:
  - "How do you play KpopCards?": the 3 steps.
  - "Is KpopCards free?"
  - "Is it a gacha game?": "It uses random packs, but nothing is for sale. Packs come from a timer, missions and optional ads, and the odds are public."
  - "Where do the photos come from?"
- One line: "Unofficial fan game, not affiliated with the artists or their agencies."

**/kpopcards/odds**
- Title (53): `KpopCards Odds: Drop Rates of Every Pack`
- H1: `KpopCards odds and drop rates`
- Meta (152): "KpopCards odds for every pack: the chance of each edition for cards 1 to 4 and card 5, the Gold guarantee and the duplicate rule. The same for everyone."
- Answer block from `oddsView` and `KC.GOLD_BY_PACK`.
- "Updated" date shown only when the odds change.

**/kpopcards/help**
- Title (54): `How KpopCards Works: Packs, Shards, Rules`
- H1: keep `How KpopCards works`
- Meta (136): "How KpopCards works: free packs on a timer, up to six editions per idol, shards and crafting, missions, and where every card photo comes from."

**Numbers.** Add a new `cardsStats(cat)` (cards in packs, idols, groups) and pass every count through `atLeast`. The value must be the same on every page and in the JSON-LD. 1,050 is the pre-publish expectation (`REFILL.md:13`) **[unverified live]**.

## 6. Structured data, images, credits

- **JSON-LD:** `["WebApplication","VideoGame"]` on the landing (Kpopdle pattern, `isAccessibleForFree`), with no `aggregateRating` because there are no real reviews. Google needs a rating for the rich result, so expect semantics only ([Google](https://developers.google.com/search/docs/appearance/structured-data/software-app)). BreadcrumbList on odds and help. Never FAQPage, Dataset or HowTo.
- **Images:** the OG image and hero use the card back or the mascot, never a person. A sample card face carries its credit next to it and alt text "{Idol}, {Edition} card". Do not chase Google Images for idol faces ([license metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata) is not worth the exposure).

## 7. Links

- **Hub:** the nav item, the home banner plus a "What is Bunnyverse?" mention (needs `NET_CARDS_BRIDGES` on the hub), the Kpopdle result line, and cross-links between odds, help and credits. That is 3+ contextual inbound links (rule 8.1).
- **kpopquiz.org (rule 16):** a KpopCards entry on `/kpop-games` with one plain, followed `https://bunnyverse.org/kpopcards` link, anchor "KpopCards, a free K-pop photocard game on Bunnyverse". Guests get a plain href on the home banner; signed-in users keep the passport jump. Per-card and per-idol bridges stay nofollow. No footer links.
- **Off-page, no link schemes:** owner-labelled posts on r/kpop_Verse (not opened **[unverified]**); photocard Discords only with moderator consent; credited pack-opening clips; at most 15 personal pitches a day; optionally one itch.io listing. No directories, no Wikipedia or Commons self-links, no Team accounts posing as fans.

## 8. Risks

1. **Personality rights.** Commons warns that they are "separate from the copyright status" and "solely your responsibility" ([template](https://meta.wikimedia.org/wiki/Template:Personality_rights)), and our pages carry ads. **Skip 116c**; keep those photos off indexable pages and OG images.
2. **Thin pages.** Card, idol and binder pages fit Google's spam patterns: never indexed, never in the sitemap.
3. **Cannibalization.** No "K-pop games" as a primary phrase on the hub; idol pages stay noindex.
4. **Minors.** Binders name age-locked minors and profiles may be minors': both noindex, and no player name on any indexed page.
5. **Gacha and odds.** Korea has required odds disclosure since 22 March 2024 ([Kim & Chang](https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=29487)), but items "obtained entirely for free are exempt" ([indiegame.com](https://indiegame.com/en/archives/13394)). Google Play requires disclosure for apps ([Game Developer](https://www.gamedeveloper.com/business/games-on-the-google-play-store-now-required-to-disclose-loot-box-odds)). Keep the odds page complete anyway, and keep "gacha", "loot box" and gambling words out of titles and H1s. Any purchase or app-store release reopens this.
6. **Hidden copy.** Googlebot cannot read `/api/cards`, so client-only copy is invisible to it.

## 9. Actions

**P0, before indexing the three pages** (if any of this slips, keep them noindex): (1) the landing's server copy and disclaimer from section 5; (2) titles, descriptions, canonicals, a non-person OG image and `robotsFor(true)` on the three; (3) fix "six editions" in `page.tsx:13` and `cardsFacts`; (4) `cardsStats` plus `atLeast`; (5) sitemap rows and IndexNow; (6) JSON-LD; (7) TARGETS rows in the same PR; (8) owner decision: skip 116c; (9) fix the comment at `c/[num]:36`.

**P1, month 1:** the `/kpop-games` entry and plain links for guests; the credits dedupe (`/credits` keeps a Cards summary that links to `/kpopcards/credits`, which then becomes indexable); hub bridges on; GSC and Bing (submit the sitemap, inspect the rendered landing, check weekly that no `/c/` URL is indexed); the owner's launch post.

**P2, later:** a dated log of odds changes; group guides only past the content and demand floor; French under rule 10; optionally `Disallow: /kpopcards/open/`.

## 10. KPIs

- **Index coverage:** the 3 pages indexed within 14 days; **0** card, idol, binder or profile URLs indexed.
- **Search:** cluster impressions, clicks and position (baseline 0; set targets at day 90). Plus "kpopcards" brand impressions and Copilot citations.
- **Referrals and funnel:** clicks from `/kpop-games` and the banner; organic landing to demo pack to sign-in.
- **Trust:** 100% of photo reports resolved within 48 hours.
