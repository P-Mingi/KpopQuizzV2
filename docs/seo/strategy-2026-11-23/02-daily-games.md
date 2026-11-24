# Daily games (dle) SEO for bunnyverse.org

Agent 2, 2026-11-23. Repo main f570abc, read-only.

How to read this:
- The SERP order comes from the WebSearch tool (US results, engine not stated). It is not a Google rank check.
- Competitor strength is judged from on-page signals only, since I had no backlink data.

Inputs:
- The plan is at `/mnt/attach/outputs/RAPPORT-JEUX-DU-JOUR-v2.md`. The repo path TARGETS-bunnyverse.md cites does not exist.
- `Performance-Pages.csv` is a 2-row test fixture. The real query data is `docs/refonte/gsc/Requetes.csv` (17 Jun to 16 Sep 2026).

Live today:
- `/kpopdle`, `/otakudle` and `/daily` say `index, follow`; `/fr/kpopdle` says `noindex, follow`.
- sitemap-hub.xml lists the 5 English dle URLs.
- `site:bunnyverse.org` returns nothing: not indexed yet (not checked in Google itself).

## 1. Competitors and SERP

| Query | Who ranks | Structure | Gap for us |
|---|---|---|---|
| kpopdle | [kpopdle.app](https://kpopdle.app/), [kpopdle.pandarr.games](https://kpopdle.pandarr.games/) (+ [itch.io](https://pandarr.itch.io/kpopdle)), [kpopit.net](https://www.kpopit.net/), [alldle](https://www.alldle.net/game/kpopdle), [kwavearcade](https://kwavearcade.com/games/kpopdle.html) (its "Kpopdle" entry points to kpopdle.app), [k-popdle.com](https://k-popdle.com/guess-the-group) | kpopdle.app: game on the home in 4 modes, no text H1, owns @kpopdle on X and TikTok. Pandarr: 14-day archive | Two exact-match domains: the bare name is out of reach for now |
| kpop wordle | [kpople.net](https://www.kpople.net/), kpopit, [dbkpop.com](https://dbkpop.com/quiz/k-pop-wordle/), [kpopple.vercel.app](https://kpopple.vercel.app/) | kpople and kpopit serve metadata only (client shells) | Our server text beats shells |
| guess the kpop idol, kpop idol guessing game, daily kpop game | [idoldle.com](https://idoldle.com/), [kpopidle.com](https://kpopidle.com/), kpople, [idolguessr.fun](https://www.idolguessr.fun/), [kguesser.com](https://kguesser.com/), [kpopless.com](https://kpopless.com/), Play apps | idoldle is the best page: our exact H1, 6 modes at paths (/classic/), a 6-question FAQ, a 62-group list, a calendar archive | kpopquiz.org is not in the top 10 |
| otakudle | [otakudle.com](https://otakudle.com/), [Play app "Otakudle"](https://play.google.com/store/apps/details?id=com.otakudle.app&hl=en), Otakle clones, **our GitHub PRs** ([#188](https://github.com/P-Mingi/KpopQuizzV2/pull/188), [#216](https://github.com/P-Mingi/KpopQuizzV2/pull/216)) | otakudle.com: 9 modes, /guides, /about, a sources page | Brand taken |
| anime wordle, guess the anime character daily | [animequiz.net/guess](https://www.animequiz.net/guess), [animewordle.org](https://animewordle.org/), [animewordle.com](https://animewordle.com/), [aniwordle.com](https://aniwordle.com/), [animedle.lat](https://www.animedle.lat/), [chardle.com](https://chardle.com/game/bleach), [mangadle.net](https://mangadle.net/) | One series per path (/game/bleach, /play/dragon-ball-z) | Supports /otakudle/{series} |
| one piece wordle | clones ([onepiecedle.fun](https://onepiecedle.fun/), [animedle.app](https://animedle.app/), [esportdle](https://esportdle.com/one-piece)); [phonenumble](https://phonenumble.com/onepiecedle-answer-today-all-solutions/) ("Answers Today #967 (Nov 23)", answers first) | The original is onepiecedle.net | Crowded |
| dragon ball wordle | [dragonballdle.app](https://www.dragonballdle.app/), [bingedle](https://bingedle.com/dragon-ball/), [dragonwhatz.com](https://dragonwhatz.com/) | one-game domains | Crowded |
| narutodle | [narutodle.net](https://narutodle.net/) (shell), .org, .app, [wordhint answers](https://www.wordhint.net/narutodle/answers/) | | |
| loldle | Answer pages fill the SERP: [strafe](https://www.strafe.com/articles/read/loldle-answers-today-league-of-legends/), [lolnow.gg](https://lolnow.gg/loldle/), [dotesports](https://dotesports.com/league-of-legends/guides/loldle-answers-today), [sportskeeda](https://www.sportskeeda.com/esports/league-legends-loldle-answers-today-tuesday-november-17-2026), [alucare.fr](https://alucare.fr/loldle-reponse-du-jour); the game itself at [loldle.net/classic](https://loldle.net/classic) | One path per mode | Pattern: "<game> answer today" |
| kpopdle answer today | **No K-pop result**, only Pokedle and LoLdle answer pages | | Spoiler sites have not reached K-pop yet |
| jeu kpop du jour, devine l'idol | [danbam.app/kpopdle](https://www.danbam.app/kpopdle) "Kpopdle : devine l'idole K-pop du jour" (a French K-pop site, almost our French title), idoldle, kpopidle | | A French namesake |
| devine le personnage d'anime du jour | [naru2day.com](https://naru2day.com/), [animedle.eu](https://animedle.eu/), [jeux-du-jour.fr](https://jeux-du-jour.fr/jeu/onepiecedle/) (a directory with a sheet per game, no K-pop game) | | Get listed |

What the genre shows:
- Game on the home of a one-game domain, modes as paths.
- Many shells with no server text.
- Some archives (idoldle, kpopidle, Pandarr), but no indexable per-day pages anywhere.
- "Answer today" traffic goes to spoiler and editorial sites, not to the game.
- Directories: [listdle](https://listdle.com/) (932 games), alldle (/submit), [dailydles](https://dailydles.com/categories/anime), kwavearcade, jeux-du-jour.fr.

## 2. Our current state (code)

| Topic | Fact | Cite |
|---|---|---|
| Rendering | Server-rendered, ISR every 60 s. Under the game: yesterday's answer, how to play with a columns and sources table, the answer block, the pool table. All in the HTML, each part in a `<details>` fold | `kpopdle/page.tsx:10`, `dle-game.tsx:426`, `dle-game-page.tsx:154-212` |
| Answer block | Real count and date (live: "216 idols on 23 November 2026"; 750 characters on /otakudle). Folded and after the game, so it does not open the page (rule 3.1) | `seo.ts:88-111`, `dle-game-page.tsx:185-196` |
| Spoilers | Today's answer is never in HTML or JSON-LD. Yesterday's appears after 03:00 UTC: plain for Kpopdle, folded for Otakudle | `read.ts:1-3`, `yesterday.ts:1-15` |
| Indexing | noindex unless the game answers and its pool is non-empty. NET_INDEXING is the master switch. French pages stay noindex (`DLE_FR_REVIEWED=false`) | `page-meta.ts:19-24`, `indexing.ts:35,43-45`, `seo.ts:40,120-122` |
| hreflang | `fr` and `x-default` always emitted, so English pages point to noindex French pages | `seo.ts:114-117` |
| Sitemap | Only answering games get a row. lastmod is 00:05 UTC each day, but yesterday's line arrives at 03:00 | `seo.ts:182-196`, `root-files.ts:136-161` |
| Share | `?r=` is rewritten to an internal page (blocked public path) whose canonical is the clean URL. Share text "Kpopdle #N" has no "Bunnyverse" | `routing.ts:145,170`, `dle-share/.../page.tsx:28-32`, `share.ts:25` |
| Archive | None: today, plus yesterday until 03:00. The 365-day bank replays from day 1 in blocks (each target once per block) | `day.ts:59-65`, `019-dle-core.sql:11-17` |
| Series gating | min_pool 40 (One Piece) and 30 (Dragon Ball). The plan's 11.4 says 40 for every series. Targets today: 73 and 48 (CR-023) | `024-dle-series-games.sql:131-132` |
| Numbers, metadata | Stats null under 100 plays. Titles 60 or fewer with the suffix, descriptions 140 to 160 | `019-dle-core.sql:948-953`, `registry.ts:345`, `seo.ts:44-85` |
| Schema | WebApplication with VideoGame, BreadcrumbList, and an ItemList of the whole pool (750 items without URLs on /otakudle) | `dle-game-page.tsx:105-113` |
| /daily | The copy describes group, song and hidden members games that are not built | `copy.ts:76,123` |
| llms.txt | Says the hub "holds no quiz of its own" and lists no dle page | `root-files.ts:216-223` |
| Marquee | Repeated 4 times before `<main>` | `dle-game-page.tsx:124-128` |
| kpopquiz.org | Bridges sit behind flags (absent from the live home). /kpop-games has no Kpopdle (rule 8.3). /guess-the-kpop-idol has no link to /kpopdle. The /daily title contains "Kpopdle" and the page has no TARGETS row | `kpopdle-home.ts:8`, `lib/games/registry.ts`, `daily-hub.ts:7` |
| Demand (GSC) | 0 queries containing kpopdle, wordle or otakudle. "guess the kpop idol by picture" 44 impressions (position 5.8), "daily kpop quiz" 6, "kpop daily quiz" 3. France: 1,259 impressions | `Requetes.csv`, `Pays.csv` |

## 3. Recommended architecture

- **Pages.** One canonical URL per game, as built; /daily is the hub. /kpopdle/group and /kpopdle/song only once each game is live. Never per-day, per-group (/kpopdle/twice) or "answer today" pages.
- **Page order in the server HTML:**
  - the H1, then a visible answer block;
  - the game;
  - "Yesterday's idol" with a link to the group's quiz;
  - "How to play Kpopdle?", the columns table, the pool table;
  - three question H2s, each answered first: "When does Kpopdle reset?", "Can I play past days?", "Who makes Kpopdle?". No FAQPage markup.
- **Archive.** The playable archive stays noindex. One indexable `/kpopdle/answers` only after both:
  - 300 impressions in 90 days on "kpopdle answer" (plan 11.5);
  - a bank that no longer replays the same order. Otherwise the archive becomes cycle 2's answer key, and the last day of each block can be deduced.
- **Series.** Indexable at 40 reviewed characters with the game on. Align Dragon Ball's floor to 40.
- **French.** Stays noindex until the owner's review. Then emit `fr` hreflang. Target "jeu kpop du jour" and "devine l'idol K-pop".

### Proposed TARGETS-bunnyverse rows

| Cluster | Queries | URL | Change | Evidence |
|---|---|---|---|---|
| kpopdle | + kpop idol guessing game, kpop wordle, daily kpop game | /kpopdle | take "kpop wordle" and "daily kpop game" from /daily | Game pages rank for them, not hubs [SERP]; GSC 0 [V] |
| otakudle | + anime wordle, anime character guessing game, daily anime game | /otakudle | take "anime wordle" from /daily | animewordle, animequiz.net [SERP] |
| daily kpop and anime games | kpop and anime daily games, bunnyverse daily games | /daily | narrow the row | [P] |
| otakudle one piece / dragon ball | + one piece wordle / dragon ball wordle (never in titles) | existing | add the queries | clone SERPs [SERP] |
| kpopdle answer | kpopdle answer, kpopdle yesterday | section of /kpopdle | new row, no URL; trigger 300 impressions in 90 days | no K-pop answer SERP [SERP] |
| daily kpop quiz (kpopquiz TARGETS.md) | daily kpop quiz, kpop daily quiz | kpopquiz.org/daily | new row; drop "Kpopdle" from its title | 6 + 3 impressions [V] |

## 4. Metadata, answer blocks, schema

| URL | Title with suffix (characters) | H1 | Meta (characters) |
|---|---|---|---|
| /kpopdle | keep (53) | keep | keep (153) |
| /otakudle | "Otakudle: Guess the Anime Character of the Day" (59): matches the H1 | keep | keep (160) |
| /otakudle/one-piece | "One Piece Character Guessing Game: Otakudle" (56) | keep | "Guess the One Piece character of the day from crew, Devil Fruit, Haki, bounty and debut arc. A free daily game by Otakudle, new at midnight UTC." (144) |
| /otakudle/dragon-ball | "Dragon Ball Character Guessing Game: Otakudle" (58) | keep | "Guess the Dragon Ball character of the day from race, planet, universe and saga. A free daily game by Otakudle, with a new character at midnight UTC." (149) |
| /daily | "Daily K-pop and Anime Games: Kpopdle, Otakudle" (59) | "Daily K-pop and anime games" (the nav keeps "Daily games", the owner's choice) | "Play the daily K-pop and anime games of Bunnyverse: Kpopdle, the idol of the day, and Otakudle, the anime character of the day. New at midnight UTC." (148) |
| /kpopdle/group (later) | "Kpopdle Group: Guess the K-pop Group of the Day" (60) | "Guess the K-pop group of the day" | at build time |

No "Wordle" and no competitor name in titles or H1s.

**Answer block drafts** (every value from `dle_pool` and `dle_day`):
- Kpopdle (50 words): "Kpopdle by Bunnyverse is a free daily K-pop idol guessing game. Everyone gets the same idol, and a new one starts at midnight UTC. Type any idol: each cell compares gender, group, agency, nationality, birth year, debut, generation and role with the answer. The game holds {pool} idols on {date}."
- Otakudle (57 words): "Otakudle by Bunnyverse is a free daily anime character guessing game. Everyone gets the same character, and a new one starts at midnight UTC. Each guess compares series, genres, year, studio, gender, species and role, taken at first appearance, so no cell reveals who lives or dies. The game holds {pool} characters from {series} series on {date}."

**Schema:**
- Keep WebApplication with VideoGame (no rating, no count) and BreadcrumbList.
- Add Organization `sameAs` to live accounts only.
- Consider dropping the 750-item ItemList.
- No FAQPage, no HowTo, never the answer.

## 5. Off-page plan

1. **kpopquiz.org (rule 16), contextual links only:**
   - the 3 NET_KPOPDLE flags;
   - "Kpopdle (on Bunnyverse)" on /kpop-games;
   - /guess-the-kpop-idol to /kpopdle with the anchor "Kpopdle";
   - OtakuQuiz series pages to /otakudle/{series}.
2. **Directories, 5 at most, by hand:** kwavearcade (ask for a separate "Kpopdle by Bunnyverse" entry), alldle, listdle, dailydles, and jeux-du-jour.fr once French is indexable.
3. **Listicles** (kwavearcade "KPOPLE alternatives", dailydles "6 free daily anime dles"): personal emails, 15 a day at most, one follow-up, nothing paid.
4. **Own communities, posts labelled Team:**
   - Discord: a daily "Kpopdle #N" post.
   - r/kpop_Verse: a daily thread with yesterday's answer in spoiler tags (Reddit not opened, so not verified).
   - Nowhere else as fans.
5. **Social:** @kpopdle on X and TikTok belongs to kpopdle.app. Write "Kpopdle by Bunnyverse" everywhere.

## 6. Risks

1. **Name collision.**
   - Kpopdle: kpopdle.app, Pandarr, k-popdle.com, danbam (French).
   - Otakudle: otakudle.com and a Play app.
   - Every shared "Kpopdle #N" creates searches that exact-match domains capture.
   - No trademark filing found (not verified: a USPTO, EUIPO and INPI search is needed).
   - Owner decision: keep the names with "by Bunnyverse", or rename now (cheapest today).
2. **Public repo.** GitHub PRs rank for "otakudle" and fill the "bunnyverse.org kpopdle" SERP. In the code I read, no answer leaks (the bank is drawn in SQL).
3. **Bank design.** The blocks plus the replay make answers predictable once third parties archive them.
4. **Spoiler sites** will take "answer today" queries if the games grow. Never publish today's answer.
5. **AI answers** will describe kpopdle.app. Use one sentence everywhere (`seo.ts:59`), fix llms.txt, add Organization markup.
6. **Doorway and thin pages:** per-group or per-day pages, series under the floor, the marquee.
7. **Cannibalization:** kpopquiz.org/daily, the stronger domain, says "Kpopdle" in its title.
8. **Facts:** CR-023 admits Fandom sources, which conflicts with rule 5.3. The sources column reads "Wikidata, Wikipedia" (`copy.ts:285-300`) and must stay truthful.

## 7. Actions

**P0, before opening:**
1. Owner decision on the names.
2. Fix the /daily copy.
3. Make the answer block visible.
4. Put the brand in the share text.
5. Add the dle pages to llms.txt.
6. Gate `fr` hreflang on the French review.
7. Create the Search Console and Bing properties, submit the sitemap, inspect the 5 URLs.
8. Update the TARGETS rows and fix the doc path.
9. kpopquiz.org: bridges, /kpop-games, the /guess-the-kpop-idol link, the /daily retitle.

**P1, month 1:**
- question H2s;
- new series and /daily titles;
- daily IndexNow enqueue (no dle call in lib/dle);
- sitemap lastmod at 03:00;
- directories and outreach;
- Discord and Reddit routine;
- French review, then indexing.

**P2, later:**
- redraw the bank each cycle, then the answers page at its trigger;
- noindex archive;
- marquee rendered once;
- ItemList trim;
- next series at 40;
- /kpopdle/group;
- repo visibility.

## 8. KPIs (90-day targets, real data with denominators)

- English dle URLs indexed: 5 of 5.
- Impressions and clicks for queries containing "kpopdle" or "otakudle", and position for the bare "kpopdle" (baseline: absent).
- Impressions for the non-brand clusters.
- Next-day return 25% or more; shared results 8% or more of finished plays (plan 11.13).
- Referral sessions from kpopquiz.org and the directories.
- Copilot citations for "kpop wordle" and "anime wordle".

Unverified: SERP order, competitor strength, trademarks, live hreflang and JSON-LD (the fetch tool cannot read `<head>`), r/kpop_Verse, the DAILY_HUB flag.
