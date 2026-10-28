# TARGETS: one URL per query cluster

The source of truth for which URL owns which search intent on kpopquiz.org (rulebook
`.claude/skills/kpopquiz-seo/SKILL.md`, section 1). Before creating or retitling a page, find
its cluster here. If a URL owns it, improve that URL; never create a second page for the same
intent. Every PR that adds or retitles a page updates its row.

Created 2026-10-15 (SEO Mission 2, part A) from the cluster table of the rulebook (v1,
2026-10-14). The evidence column copies the SEO plan (docs/strategy/2026-10-SEO-PLAN.md,
section 3): [V] measured, [E] estimated. A blank evidence cell means none was recorded yet.

| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| kpop quiz | kpop quiz, quiz kpop | / | play K-pop quizzes | en | 5,127 Google impressions in September [V] | clicks, impressions | live |
| bts quiz | bts quiz, quiz bts, bts test | /bts-quiz | play BTS quizzes | en | 627,200 Bing impressions [V] | clicks, impressions, Google position | live |
| bts army test | bts army test, army ranks | /q/bts-army-level-test | test BTS knowledge level | en | 80 + 48 Copilot citations [V] | Copilot citations | planned |
| bts trivia | bts trivia, bts trivia questions | /bts-trivia | read BTS facts and questions | en | 580 Copilot citations, 37% share [V] | Copilot share | live |
| kpop games | kpop games, kpop games online | /kpop-games | find and play free K-pop games | en | 453 + 40 Copilot citations, 5% and 8% share [V] | Copilot share for "kpop games": 5.1% base [V], 12% at month 3, 20% at month 6 [E] | ready (branch seo/m2-kpop-games, not merged) |
| kpop generations | kpop generations, what gen is X | /articles/kpop-generations-explained | learn K-pop generations | en | about 1,000 Copilot citations [E] | Copilot share | live |
| kpop trivia | kpop trivia, kpop questions | /trivia | read K-pop facts and questions | en | 254 Copilot citations, 18% share [V] | Copilot share | live |
| kpop test | kpop test | /kpop-test | test K-pop knowledge | en | 131 Copilot citations, 23% share [V] | Copilot share | planned |
| blind test kpop | blind test kpop, kpop blind test | /blindtest | play a K-pop blind test | en | 182 Copilot citations, 78% share [V] | Copilot share | live |
| guess the kpop song | guess the kpop song | /guess-the-kpop-song | guess K-pop songs from clips | en | | clicks, impressions | live |
| which {group} member are you | which {group} member are you | /which-{group}-member-are-you | take a member personality quiz | en | "which aespa member" 52 Copilot citations, 22% share [V] | Copilot share | live |
| name them all | sporcle kpop, name them all, type them all | /name-them-all | name every member against the clock | en | 109 Copilot citations [V] | Copilot citations | planned |
| kpop groups a-z | kpop groups a-z | /groups | browse K-pop groups | en | 16 Copilot citations [V] | Copilot citations | live |
| {group} quiz | {group} quiz, {group} test | /{group}-quiz | play quizzes about one group | en | hubs at Google positions 5 to 9 [V, September] | clicks, Google position | live |
| {group} games | {group} games | section "{Group} games" of /{group}-quiz (#games) | play every game of one group | en | "stray kids games" 63 + 70 Copilot citations [V] | Copilot citations | ready (branch seo/m2-kpop-games, not merged) |
| kuis bts | kuis bts | /id/kuis-bts | play BTS quizzes in Indonesian | id | 17,500 Bing impressions [V] | clicks, impressions | planned |
| kpop history quiz | kpop history quiz, k-pop history quiz | /kpop-history-quiz | play K-pop history quizzes across groups | en | "how long does a kpop generation last" 7, "how long is a kpop generation" 5, "when does 5th gen kpop end" 5, "kpop generations timeline"... [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop debut quiz | kpop debut quiz, k-pop debut quiz | /kpop-debut-quiz | play K-pop debut quizzes across groups | en | "when did shinee debut" 1, "what year did ateez debut" 1, "what was the first 5th gen kpop group" 1. Thin search data; strong play data:... [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop company quiz | kpop company quiz, k-pop company quiz | /kpop-company-quiz | play K-pop company quizzes across groups | en | No query yet. Named gap: the most played General K-pop quiz (label matching) has no topic page; 4 single-label quizzes (HYBE, SM, JYP, YG). [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop fandom quiz | kpop fandom quiz, k-pop fandom quiz | /kpop-fandom-quiz | play K-pop fandom quizzes across groups | en | "what are ive fans called" 4, "blink fandom exam" 2, "exo fandom name exo-l" 1, "stray kids fandom name" 1, "i-dle fan name" 1. [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop discography quiz | kpop discography quiz, k-pop discography quiz | /kpop-discography-quiz | play K-pop discography quizzes across groups | en | "kpop discography quiz" 54 (position 8.3, 0 clicks), "aespa all songs test" 23, "cortis song quiz" 15, "twice songs quiz" 5 + "twice... [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop dance quiz | kpop dance quiz, k-pop dance quiz | /kpop-dance-quiz | play K-pop dance quizzes across groups | en | No query yet. Named gap: no page for choreography or music video quizzes; /q/k-pop-choreography-and-dance alone drew 19 impressions. [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop awards quiz | kpop awards quiz, k-pop awards quiz | /kpop-awards-quiz | play K-pop awards quizzes across groups | en | No query yet. Named gap: records and music show quizzes have no topic page. [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop drama and variety quiz | kpop drama and variety quiz, k-pop drama and variety quiz | /kpop-drama-variety-quiz | play K-pop drama and variety quizzes across groups | en | No query yet. Named gap: no page for idols in dramas, OSTs or survival shows. [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop idol quiz | kpop idol quiz, k-pop idol quiz | /kpop-idol-quiz | play K-pop idol quizzes across groups | en | "kpop picture trivia" 9, "quiz idol" 2, "kpop idol test" 1, "who is this idol" 2. "guess the kpop idol by picture" 44 belongs to... [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |
| kpop groups quiz | kpop groups quiz, k-pop groups quiz | /kpop-groups-quiz | play K-pop groups quizzes across groups | en | "name all kpop groups" 6, "kpop girl groups" 3, "how many kpop groups can you name" 2, "kpop girl groups list" 2, "kpop logo quiz" 1.... [V] | impressions, clicks (90 days after launch; fold into /general-kpop-quiz with a 301 if none) | live |

## Rules that come with this table
- One cluster, one URL. A group variant of a page type (for example /{group}-games) needs 300+
  impressions in 90 days or 30+ Copilot citations in a quarter; otherwise it is a section of the
  group hub, as "{group} games" is today.
- Only the hub /{group}-quiz may start its title with "{Group} Quiz".
- New quizzes cannot take the slugs {group}-quiz, {group}-test or {group}-trivia.
- A new game type is added to /kpop-games (lib/games/registry.ts) the day it ships.
