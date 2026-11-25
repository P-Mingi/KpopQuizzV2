# TARGETS: one URL per query cluster, OtakuQuiz (bunnyverse.org/anime)

The source of truth for which URL owns which search intent on OtakuQuiz, the anime quiz site of the network that lives in the `/anime`
sub-folder of bunnyverse.org (rulebook `.claude/skills/kpopquiz-seo/SKILL.md`, sections 1 and 16: each site of the registry has its own
TARGETS file; the hub's is `docs/seo/TARGETS-bunnyverse.md`, kpopquiz.org's is `docs/seo/TARGETS.md`). Before creating or retitling a page of
OtakuQuiz, find its cluster here. If a URL owns it, improve that URL; never create a second page for the same intent, on this site or on a sister
site. Every PR that adds or retitles an OtakuQuiz page updates its row.

Created 2026-11-23 (lot SEO-LAUNCH-1, lane D) from the routes of the anime build (`lib/site/registry.ts`, the `(anime)` pages, the sitemap of
`lib/site/root-files.ts`) and the boundary note of the hub's file. Paths below are relative to `/anime`. The brand suffix is " | OtakuQuiz"
(`seo.titleTemplate`), so a title is 60 characters or fewer with it. Evidence: [V] measured, [P] a named gap in the plan; blank when none was
recorded yet. No Search Console or Bing property exists for this site yet: the KPI column names the measure to start once it does.

| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| anime quiz | anime quiz, anime quizzes, free anime quizzes | / | play fan-made anime quizzes of every series | en | [P] the home title "Anime Quiz - Free Fan-Made Quizzes for Every Series" (`home-anime.tsx`) | impressions, clicks | live; in the sitemap |
| anime series list | anime series, anime quiz by series | /series | find a series that has quizzes, A to Z | en | [P] the series directory page | impressions | live; in the sitemap |
| {series} quiz | {series} quiz, {series} test | /{series}-quiz | the quizzes of one series, with the spoiler shield | en | [P] one hub per series; title built by `seriesHubMetadata` ("{Series} Quiz: N Fan-Made Tests Without Spoilers", fitted to 60) | impressions per series | live; indexable from 3 published quizzes (`minPublishedForIndexableHub`), noindex,follow under it; in the sitemap once indexable |
| {series} trivia | {series} trivia, {series} facts | /{series}-trivia | sourced facts about one series | en | [P] `seriesTriviaMetadata`; the page answers 404 under its minimum of facts | impressions per series | live where the series has enough facts |
| anime trivia | anime trivia, anime fun facts | /trivia | the list of series that have trivia | en | [P] title "Anime Trivia and Fun Facts" | impressions | live |
| which {series} character are you | which {series} character are you, {series} personality quiz | /which-{series}-character-are-you | a personality quiz that matches a character of one series | en | [P] `which-character` page (lane PERS, six active profiles per series); title fitted to 60 | impressions per series | live for each series that has a set; in the sitemap |
| name them all | name all {series} characters, {series} character quiz with a timer | /name-all/{series}/{set} | type every character of a set before the clock runs out | en | [P] `name-all` page; robots from `robotsFor(pretty)` | impressions | live where a set exists |
| {series} openings | {series} openings quiz | /{series}-openings-quiz | guess the opening of a series | en | registry route `/{series}-openings-quiz` | impressions | live |
| opening of the day | anime opening of the day | /opening-of-the-day | the opening of the day | en | registry feature `openingOfTheDay` | impressions | live |
| anime mix | anime mix quiz | /anime-mix-quiz | one quiz across all series | en | registry route `/anime-mix-quiz` | impressions | live |
| one quiz | the title of the quiz | /q/{slug} | play one published quiz | en | the sitemap lists every published quiz, newest first | impressions per quiz | live; in the sitemap |
| about OtakuQuiz | otakuquiz, about otakuquiz | /about | the trust page of the site (rule 12) | en | | none (a trust page) | live |
| editorial policy | otakuquiz editorial policy | /editorial-policy | how quizzes are made and checked (rule 12) | en | | none (a trust page) | live |

## Boundaries with the sister sites

- The daily anime game is not here. "guess the anime character", "anime character guessing game", "daily anime game" and "anime wordle"
  belong to `bunnyverse.org/otakudle` (hub TARGETS, row "otakudle"); the series games belong to `/otakudle/{series}`. OtakuQuiz never creates
  `/anime/guess-the-anime-character` or any page for these intents. It links to them only in context (rule 16).
- kpopquiz.org keeps every K-pop intent. OtakuQuiz and kpopquiz.org never link each other in a site-wide footer or from the nav (rule 16), and
  kpopquiz.org never links to `/anime`.
- The hub's footer lists OtakuQuiz on the same host; that same-host link is the one documented exception to the contextual-only rule.

## Notes

- `/daily` (a route handler that answers a redirect) and `/profile` (a redirect to `/me`) are not content pages and own no cluster.
- Account, create, search, admin, settings, notifications, community and leaderboard pages are noindex or sit behind a sign-in; they own no cluster.
- Numbers on these pages come from the site's stats helpers (`atLeast`, `lib/stats/site-stats.ts`), never typed.
