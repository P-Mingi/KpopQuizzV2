# S1 articles batch 2 - the remaining 15

## Claude Code Implementation Prompt

---

Write the remaining 15 articles from docs/content-plan-articles.md into the EXISTING
articles system (lib/articles/content/ + registry.ts - study the 5 shipped articles first
and match their template, tone, and structure exactly; the template is already approved).

Already shipped (do NOT redo): plan items 1 (bts-vs-blackpink), 5 (generations), 6
(blind-test guide), 14 (hardest quizzes), 18 (best sites).

TO WRITE - plan items, in this order (data-dependent first while queries are fresh):
3 (girl vs boy groups data), 10 (most-played this month), 11 (songs everyone gets wrong),
12 (hardest groups to memorize), 13 (quiz stats hub), 2 (SKZ vs ATEEZ), 4 (aespa vs
NewJeans), 7 (NewJeans guide), 8 (BTS discography), 9 (guess the idol), 15 (beginner
quizzes), 16 (50 facts), 17 (blindtest playlists ranked), 19, 20 (read the plan file for
these last two).

Rules (all from the plan file, repeated because they are the point):
- REAL DATA ONLY: every stat from a real query, dated ("as of Jul 2026"). If a data
  article's numbers are too thin to be honest (e.g. a group with 12 plays), reframe the
  claim honestly or narrow scope; NEVER fabricate or inflate. If an article cannot be
  written honestly at current data volume, SKIP it and flag in the report.
- 40-60 word extractable answer leading each section; H2s phrased as real queries;
  FAQ + FAQPage schema; Article JSON-LD; byline "KpopQuiz Team"; Last updated date;
  breadcrumbs; 2-4 internal links per article to real quizzes/blindtest/games/stats.
- Fact accuracy: K-pop facts (debut years, member counts, discography) verified against
  the site's own groups/songs data where it exists; anything not verifiable stays out.
  Never invent facts about real people.
- NO em dashes anywhere. No fabricated quotes. No keyword stuffing.
- Comparison articles = real tables. Listicles = numbered lists.
- #16 (50 facts): facts must be common-knowledge-verifiable, no rumors, no personal-life
  content about idols, nothing negative targeting an individual.
- #10 (most-played) + #13 (stats hub): pull from the same queries as /stats where
  possible; #13 links prominently to /stats as the living version.

Housekeeping per article: registry entry, sitemap inclusion (honest lastmod), footer
articles index already exists (verify), tsc + build green.

Batch commits: one commit per 3-4 articles is fine (5 commits total), do NOT push.

VERIFY at the end: all 20 registry entries render, /articles index lists 20, sitemap has
20, zero em dashes across all content (grep), all internal links resolve (no 404s),
JSON-LD valid on 3 spot-checked articles, check:routes green.

/caveman report per commit: which articles, which data queries used, any skipped-as-thin
articles + why.
