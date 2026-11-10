# TARGETS: one URL per query cluster, bunnyverse.org

The source of truth for which URL owns which search intent on bunnyverse.org, the hub of the network (rulebook
`.claude/skills/kpopquiz-seo/SKILL.md`, sections 1 and 16: each site of the registry has its own TARGETS file). Before creating or
retitling a page of the hub, find its cluster here. If a URL owns it, improve that URL; never create a second page for the same intent,
on this site or on a sister site. Every PR that adds or retitles a hub page updates its row.

Created 2026-10-29 with the home v3 (daily games, step 3), from `docs/strategy/o1/dle/RAPPORT-JEUX-DU-JOUR-v2.md` section 11.2 (the URL
plan of the daily games) and the home as it is built. The whole hub is closed to search engines until the owner sets `NET_INDEXING=1`
(RUNBOOK K10): a live row is a page that exists, not yet a page that is indexed. The evidence column: [V] measured, [E] estimated, [P] a
named gap in the plan; blank when none was recorded yet.

| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| bunnyverse | bunnyverse, bunnyverse.org | / | find the hub and its sites | en | brand, new domain (2026-10-29) | brand impressions and clicks | live (closed until NET_INDEXING) |
| k-pop and anime games | k-pop and anime games, kpop and anime quizzes, daily kpop games | / | play K-pop and anime quizzes and daily games in one place | en | [P] RAPPORT-JEUX-DU-JOUR-v2 11.2 | impressions, clicks | live (closed until NET_INDEXING) |
| photo credits | bunnyverse photo credits | /credits | the author, licence and source page of every photo the site shows (trust page, rule 12) | en | RAPPORT-JEUX-DU-JOUR-v2 7.1; the credit page of the thumbnails of the daily games | none (a trust page, not a traffic page) | live with daily games step 2: noindex while it lists nothing, then NET_INDEXING like every hub page; not in the sitemap, like OtakuQuiz's /credits; linked from the hub footer (its Credits link shows where the route exists) |
| daily kpop and anime games | daily kpop game, daily anime game, kpop wordle, anime wordle | /daily | play the daily games, Kpopdle and Otakudle; page named "Daily games" (H1 and title "Daily games: K-pop and anime puzzles", owner 2026-11-10, was "Dle games") | en | [P] RAPPORT-JEUX-DU-JOUR-v2 11.1 and 11.2 | brand impressions, day 2 return | built, closed until the dailyGuess flag (step 4) |
| kpopdle | kpopdle, guess the kpop idol daily, kpop idol wordle | /kpopdle | guess the K-pop idol of the day from clues | en | [P] 11.1: the game's own name is the main query of the niche; "kpopdle" is also used by three small games | brand impressions "kpopdle" | built, closed until the dailyGuess flag (step 4) |
| guess the kpop group | guess the kpop group, kpop group wordle | /kpopdle/group | guess the K-pop group of the day | en | [P] 11.2 | impressions | planned (step 6) |
| kpop song wordle | kpop song wordle | /kpopdle/song | guess the song of the day from clues | en | [P] 11.2 | impressions | planned (step 6); never "guess the kpop song", owned by kpopquiz.org/guess-the-kpop-song |
| otakudle | otakudle, guess the anime character daily, anime character wordle | /otakudle | guess the anime character of the day from clues | en | [P] 11.1 and 11.2; takes the intent of the dropped OtakuQuiz page /anime/guess-the-anime-character | brand impressions "otakudle" | built, closed until the dailyGuess flag; opens with the launch (CR-017) |
| {series} character guessing game | one piece character guessing game, guess the one piece character | /otakudle/{series} | guess the character of one series | en | [P] 11.2 and 11.4 | impressions per series | planned (step 7) for the series other than One Piece and Dragon Ball; indexable only with 40 reviewed characters (11.4) |
| otakudle one piece | otakudle one piece, one piece character guessing game, guess the one piece character | /otakudle/one-piece | guess the One Piece character of the day from clues | en | [P] 11.2 and 11.4; owner 2026-11-03 | impressions "otakudle one piece" | built, closed until the dailyGuess flag; indexable only once its game is on, which needs min_pool 40 (024, CR-024) |
| otakudle dragon ball | otakudle dragon ball, dragon ball character guessing game, guess the dragon ball character | /otakudle/dragon-ball | guess the Dragon Ball character of the day from clues | en | [P] 11.2 and 11.4; owner 2026-11-03 | impressions "otakudle dragon ball" | built, closed until the dailyGuess flag; indexable only once its game is on, which needs min_pool 30 (024, CR-024) |
| jeux du jour k-pop et anime | jeux du jour kpop, jeu kpop quotidien, quiz k-pop et anime | /fr | the French home | fr | [P] 11.1 (French long tail without serious competitors), owner reviews the French (rule 10) | impressions | planned (with step 4) |
| kpopdle (fr) | kpopdle, devine l'idol k-pop du jour | /fr/kpopdle | the French Kpopdle | fr | [P] 11.14 | impressions | built, closed until the dailyGuess flag; noindex until the owner reviewed the French (step 4) |
| jeux du jour (fr) | jeux kpop du jour, jeu kpop quotidien, jeu anime du jour | /fr/daily | les jeux du jour en français, page nommée "Jeux du jour" (propriétaire, 2026-11-10, avant "Jeux dle") | fr | [P] 11.1 (French long tail) | impressions | built, closed until the dailyGuess flag; noindex until the owner reviewed the French (step 4) |
| crédits photos (fr) | crédits photos bunnyverse | /fr/credits | trust page in French | fr | RAPPORT-JEUX-DU-JOUR-v2 section 2 | none (trust page) | built, closed until the dailyGuess flag; noindex while it lists nothing |
| otakudle (fr) | otakudle, devine le perso d'anime du jour | /fr/otakudle | the French Otakudle | fr | [P] 11.14 | impressions | built, closed until the dailyGuess flag; noindex until the owner reviewed the French (CR-017) |
| otakudle one piece (fr) | otakudle one piece, devine le personnage one piece du jour | /fr/otakudle/one-piece | the French Otakudle One Piece | fr | [P] 11.14 | impressions | built, closed until the dailyGuess flag; noindex until the owner reviewed the French (CR-024) |
| otakudle dragon ball (fr) | otakudle dragon ball, devine le personnage dragon ball du jour | /fr/otakudle/dragon-ball | the French Otakudle Dragon Ball | fr | [P] 11.14 | impressions | built, closed until the dailyGuess flag; noindex until the owner reviewed the French (CR-024) |

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
