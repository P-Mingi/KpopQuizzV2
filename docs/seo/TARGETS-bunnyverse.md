# TARGETS: one URL per query cluster, bunnyverse.org

The source of truth for which URL owns which search intent on bunnyverse.org, the hub of the network (rulebook
`.claude/skills/kpopquiz-seo/SKILL.md`, sections 1 and 16: each site of the registry has its own TARGETS file). Before creating or
retitling a page of the hub, find its cluster here. If a URL owns it, improve that URL; never create a second page for the same intent,
on this site or on a sister site. Every PR that adds or retitles a hub page updates its row.

Created 2026-10-29 with the home v3 (daily games, step 3), from the owner's plan RAPPORT-JEUX-DU-JOUR-v2.md (outside the repo) section 11.2 (the URL
plan of the daily games) and the home as it is built. The whole hub is closed to search engines until the owner sets `NET_INDEXING=1`
(RUNBOOK K10): a live row is a page that exists, not yet a page that is indexed. The evidence column: [V] measured, [E] estimated, [P] a
named gap in the plan; blank when none was recorded yet.

| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| bunnyverse | bunnyverse, bunnyverse.org | / | find the hub and its sites | en | brand, new domain (2026-10-29) | brand impressions and clicks | live (closed until NET_INDEXING) |
| about bunnyverse | about bunnyverse, bunnyverse team | /about | who runs Bunnyverse, how the content is made, the sources, the Team accounts and the contact (trust page, rule 12) | en | rule 12; SEO-LAUNCH-1 lane C | none (a trust page, not a traffic page) | live; indexable once NET_INDEXING opens the hub |
| k-pop and anime games | k-pop and anime games, kpop and anime quizzes, daily kpop games | / | play K-pop and anime quizzes and daily games in one place | en | [P] RAPPORT-JEUX-DU-JOUR-v2 11.2 | impressions, clicks | live (closed until NET_INDEXING) |
| photo credits | bunnyverse photo credits | /credits | the author, licence and source page of every photo the site shows (trust page, rule 12) | en | RAPPORT-JEUX-DU-JOUR-v2 7.1; the credit page of the thumbnails of the daily games | none (a trust page, not a traffic page) | live with daily games step 2: noindex while it lists nothing, then NET_INDEXING like every hub page; not in the sitemap, like OtakuQuiz's /credits; linked from the hub footer (its Credits link shows where the route exists) |
| daily kpop and anime games | kpop and anime daily games, bunnyverse daily games | /daily | the hub of the daily games: Kpopdle and Otakudle on one page; title "Daily K-pop and Anime Games: Kpopdle, Otakudle", H1 "Daily K-pop and anime games", the nav keeps "Daily games" (owner, 2026-11-23). "kpop wordle" and "daily kpop game" moved to /kpopdle, "anime wordle" to /otakudle | en | [P] RAPPORT-JEUX-DU-JOUR-v2 11.1 and 11.2; strategy-2026-11-23 agent 2 section 3 | brand impressions, day 2 return | live; indexable once NET_INDEXING opens the hub |
| kpopdle | kpopdle, kpop idol guessing game, guess the kpop idol of the day, kpop wordle, daily kpop game | /kpopdle | guess the K-pop idol of the day from clues; "A Wordle-style game" appears once in the text, never in a title, an H1 or a meta; at most two secondary phrases in the intro, the others only where they read naturally in the answers; "kpop idol quiz" belongs to kpopquiz.org (rule 1); questions "When does Kpopdle reset?", "Can I play past days?", "Who makes Kpopdle?" answered in the page, no FAQPage | en | [P] 11.1: the game's own name is the main query of the niche; "kpopdle" is also used by three small games; game pages rank for "kpop wordle" and "daily kpop game", not hubs [SERP]; GSC 0 queries on 2026-11-23 [V] | brand impressions "kpopdle" | live; indexable once NET_INDEXING opens the hub |
| kpopdle answer | kpopdle answer, kpopdle yesterday | none (a section of /kpopdle, no URL) | the answer of the day before | en | no K-pop "answer today" SERP yet [SERP] | trigger: 300 impressions in 90 days on these queries; then at most one /kpopdle/answers, and only after the bank stops replaying the same order (agent 2 section 3) | not built; today's answer never appears on any page |
| guess the kpop group | guess the kpop group, kpop group wordle | /kpopdle/group | guess the K-pop group of the day | en | [P] 11.2 | impressions | planned (step 6) |
| kpop song wordle | kpop song wordle | /kpopdle/song | guess the song of the day from clues | en | [P] 11.2 | impressions | planned (step 6); never "guess the kpop song", owned by kpopquiz.org/guess-the-kpop-song |
| otakudle | otakudle, anime character guessing game, daily anime game, guess the anime character, anime wordle | /otakudle | guess the anime character of the day from clues; title "Otakudle: Guess the Anime Character of the Day"; takes "anime wordle" from /daily | en | [P] 11.1 and 11.2; takes the intent of the dropped OtakuQuiz page /anime/guess-the-anime-character; animewordle and animequiz.net rank for "anime wordle" [SERP] | brand impressions "otakudle" | live; indexable once NET_INDEXING opens the hub |
| {series} character guessing game | one piece character guessing game, guess the one piece character | /otakudle/{series} | guess the character of one series | en | [P] 11.2 and 11.4 | impressions per series | planned (step 7) for the series other than One Piece and Dragon Ball; indexable only with 40 reviewed characters (11.4) |
| otakudle one piece | otakudle one piece, one piece character guessing game, guess the one piece character, one piece wordle (never in a title) | /otakudle/one-piece | guess the One Piece character of the day from clues; title "One Piece Character Guessing Game: Otakudle" | en | [P] 11.2 and 11.4; owner 2026-11-03; clone SERPs [SERP] | impressions "otakudle one piece" | live; indexable only once its game is on, which needs min_pool 40 (024, CR-024) |
| otakudle dragon ball | otakudle dragon ball, dragon ball character guessing game, guess the dragon ball character, dragon ball wordle (never in a title) | /otakudle/dragon-ball | guess the Dragon Ball character of the day from clues; title "Dragon Ball Character Guessing Game: Otakudle" | en | [P] 11.2 and 11.4; owner 2026-11-03; clone SERPs [SERP] | impressions "otakudle dragon ball" | live; indexable only once its game is on, which needs min_pool 30 (024, CR-024); agent 2 asks to align the floor to 40, an owner call |
| jeux du jour k-pop et anime | jeux du jour kpop, jeu kpop quotidien, quiz k-pop et anime | /fr | the French home | fr | [P] 11.1 (French long tail without serious competitors), owner reviews the French (rule 10) | impressions | no /fr home page exists: /fr is not built and not in the sitemap; the French pages start at /fr/daily |
| kpopdle (fr) | kpopdle, devine l'idol k-pop du jour | /fr/kpopdle | the French Kpopdle | fr | [P] 11.14 | impressions | indexable once NET_INDEXING opens; French reviewed by the owner 2026-11-23 |
| jeux du jour (fr) | jeux kpop du jour, jeu kpop quotidien, jeu anime du jour | /fr/daily | les jeux du jour en français, page nommée "Jeux du jour" (propriétaire, 2026-11-10, avant "Jeux dle") | fr | [P] 11.1 (French long tail) | impressions | indexable once NET_INDEXING opens; French reviewed by the owner 2026-11-23 |
| crédits photos (fr) | crédits photos bunnyverse | /fr/credits | trust page in French | fr | RAPPORT-JEUX-DU-JOUR-v2 section 2 | none (trust page) | built; noindex while it lists nothing, out of the sitemap by design; French reviewed by the owner 2026-11-23 |
| otakudle (fr) | otakudle, devine le perso d'anime du jour | /fr/otakudle | the French Otakudle | fr | [P] 11.14 | impressions | indexable once NET_INDEXING opens; French reviewed by the owner 2026-11-23 |
| otakudle one piece (fr) | otakudle one piece, devine le personnage one piece du jour | /fr/otakudle/one-piece | the French Otakudle One Piece | fr | [P] 11.14 | impressions | indexable once NET_INDEXING opens; French reviewed by the owner 2026-11-23 |
| otakudle dragon ball (fr) | otakudle dragon ball, devine le personnage dragon ball du jour | /fr/otakudle/dragon-ball | the French Otakudle Dragon Ball | fr | [P] 11.14 | impressions | indexable once NET_INDEXING opens; French reviewed by the owner 2026-11-23 |

## Boundaries with the sister sites

- kpopquiz.org keeps every K-pop quiz intent of `docs/seo/TARGETS.md`, among them `/guess-the-kpop-idol` (the quiz with clues: distinct titles and
  a strong link between the two) and `/guess-the-kpop-song`. The hub links to KpopQuiz only in context (the site card, Hot right now, Today), never
  in its footer (rule 16).
- OtakuQuiz lives at bunnyverse.org/anime and keeps its own quiz intents (series hubs, trivia, which character are you). It does not create
  `/anime/guess-the-anime-character`: `/otakudle` holds that intent.
- The hub copies no quiz: every quiz row of the home links to the canonical page of the quiz on its own site.

## The home (/), as built on 2026-10-29

- Title (absolute): "K-pop and Anime Daily Games and Quizzes | Bunnyverse" (52 characters); H1: "Quizzes and daily games for K-pop and anime
  fans"; the description starts with the same phrase (rule 2.1).
- Answer block: the "What is Bunnyverse?" paragraph in the server HTML, 40 to 60 words, saying only what exists (the Burrow, Kpopdle and
  Otakudle appear once the hub's registry feature `dailyGuess` is on and their pages exist).
- Structured data: WebSite (no search action) and the ItemList of Hot right now (canonical URLs on their own sites); the Organization of the
  layout.
- Numbers: the count of quizzes of each site (rounded down by `atLeast`, the shared helper of lib/stats/site-stats.ts), plays from 100 plays,
  the songs and seconds of the blind test of the day: all from the data modules of lib/site/hub/data, never typed.

## KpopCards (bunnyverse.org/kpopcards), added 2026-11-23 (lot SEO-LAUNCH-1, lane B)

The four rows of agent 3 (section 4 of `Claude outputs/seo/BUNNYVERSE-SEO-STRATEGY.md`), same columns as the table above. The three indexable pages
are rendered on the server and enter the hub sitemap only when `NET_CARDS` and `NET_INDEXING` are both on (`cardsSitemapRows`,
`lib/kpopcards/seo.ts`). Every other KpopCards page stays noindex for good: `/kpopcards/c/{num}`, `/idol/{name}`, `/collection`,
`/collection/{group}`, `/open/*`, `/missions`, `/ranking`, `/u/*` and `/report` (rule 1.4 and 9.2: per-user, or only the entity changes).

| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| kpop photocard game | kpop photocard game, kpop card game online, free kpop photocard game, kpop photocard collecting game, kpop photocard simulator | /kpopcards | play a free K-pop photocard game in the browser | en | [P] SERP gap (agent3 2026-11-23); kpopquiz.org GSC 0 of 724 | impressions, clicks at 90 days | built: server HTML (H1, answer block, question H2s, JSON-LD), indexable once NET_CARDS and NET_INDEXING are on |
| kpopcards odds | kpopcards odds, kpopcards drop rates | /kpopcards/odds | odds and guarantees | en | rule 12 | none (trust) | built, indexable once NET_CARDS and NET_INDEXING are on; "Updated" only when a rate changes |
| how kpopcards works | kpopcards help, how to play kpopcards | /kpopcards/help | the rules | en | brand | brand impressions | built, indexable once NET_CARDS and NET_INDEXING are on |
| kpopcards photo credits | kpopcards credits | /kpopcards/credits | credits | en | rule 12 | none | noindex, follow (a duplicate of /credits, which is the indexable credits page) until the credits dedupe |
