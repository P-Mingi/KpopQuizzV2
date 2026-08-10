# REPORT - SEO iteration: articles indexation fix (8 thin articles earn their indexing)

Scope kept to /articles + lib/db/queries/stats.ts. /verse untouched. tsc 0; next build green.
NOTHING pushed - Cowork reviews the diff, the owner holds the push gate.

## ROOT CAUSE, FIXED
`noindex: true` on 8 registry entries drove BOTH the robots meta and sitemap exclusion. Removing
the flag re-indexes AND re-adds to the sitemap from the same source. Per the owner decision the
flag was only removed after each article was expanded to 600+ words of original prose and its
numbers were made honestly dynamic.

## THE 8 ARTICLES

| Article | Words | Dynamic | Live values observed in dev | Links verified |
|---|---|---|---|---|
| kpop-quiz-statistics | ~778 | YES | 399 quizzes, 58,055 plays, 88 groups, 4,120 songs, 5 gens; top groups by plays; hardest/easiest by real avg | 4 (/stats, /quizzes, /hard-, /easy-) + live /q/ links |
| most-played-kpop-quizzes | ~639 | YES | 10 live entries: SKZ true or false 186, BTS era 181, Cortis 159 ... | /quizzes, /stats + live /q/ + derived group hubs |
| girl-groups-vs-boy-groups | ~662 | YES | girl 68% / boy 70%; 65 vs 77 quizzes; completions per side | 2 (/quizzes, /stats) |
| hardest-kpop-groups-to-memorize | ~738 | YES | SEVENTEEN 13, EXO 9, NCT 9, TWICE 9, Stray Kids 8, ATEEZ 8, BTS 7 ... | 2 (/games/name-all, /quizzes) |
| rookie-kpop-groups-2026 | ~753 | YES | risers derived from the live 30d chart: Cortis #4 (159), ILLIT #6 (145) | 2 (/quizzes, /stats) |
| best-kpop-quizzes-for-beginners | ~763 | no (evergreen) | n/a | 2 (/easy-kpop-quizzes, /blindtest) |
| guess-the-kpop-idol-guide | ~774 | no (evergreen) | n/a | 2 (/guess-the-kpop-idol, /quizzes) |
| kpop-blind-test-by-group-ranked | ~776 | no (opinion) | n/a | 2 (/blindtest, /blackpink-quiz) |

All internal links return HTTP 200 (checked live): /blackpink-quiz, /blindtest, /easy-kpop-quizzes,
/games/name-all, /guess-the-kpop-idol, /hard-kpop-quizzes, /quizzes, /stats, plus a sampled dynamic
/q/<slug> and /<group>-quiz.

## THE "18 CURATED SONGS" CLAIM - FALSE, REMOVED
Verified against the live blind_test_songs catalogue: 57 groups, playlist sizes range 2 to 29, the
median is 4, and exactly ONE group has 18. The number was dropped (not replaced with another fixed
figure, since the catalogue grows) and the prose now explains that playlist length varies by group.
The matching FAQ answer was corrected too.

## THREE NEW QUERY HELPERS (lib/db/queries/stats.ts, pure reads, cached hourly, tagged 'stats')
- `getMostPlayedQuizzes30d(limit=10)` - counts plays over the trailing 30 days, paginating past the
  1000-row PostgREST cap (30-page ceiling, warns if hit), then resolves the top quizzes and skips any
  that are no longer published. Observed: 5,301 plays across 343 distinct quizzes in the window.
- `getGroupTypeScores()` - girl vs boy averages. `groups` has no gender column, so each group's type
  is the majority gender of its catalogued songs ('gg'/'bg'/'coed'; coed and mixed excluded, along
  with custom, needs_review and general-kpop). avgPct computed exactly like getQuizScoreExtremes.
  Returns NULL when either bucket has < 10 quizzes, and the article then falls back to evergreen
  prose with no invented percentages. Both buckets are currently healthy (65 and 77 quizzes).
- `getGroupMemberCounts(limit=12)` - active member counts from `idols`, joined to groups, mirroring
  the name-them-all filters. Counts verified against the expected roster sizes.

## PER-ARTICLE CORRECTIONS BEYOND EXPANSION
- kpop-quiz-statistics: hardcoded 374 / 54,000 / 87 / 3,964 replaced with live totals; the
  girl-vs-boy 71.8 / 68.1 block DELETED (it has no source in this query and lives in the other
  article); the "87 groups covered" overclaim replaced with the real catalogue total plus an explicit
  note that the group count is not the same as groups that have quizzes; no "updates hourly" claim on
  the weekly-cached totals (phrased "refreshed regularly").
- most-played: the entire hardcoded top ten (stale, e.g. 44 plays where the real leader now has 186)
  replaced by the live 30-day ranking; the "trailing 30 days" framing is now true.
- girl-vs-boy: hardcoded 68.1 / 71.8 / 16,005 / 9,421 table replaced with live values, plus a stated
  caveat that a few points across this sample is a weak signal.
- hardest-groups: source claim corrected. The counts are the catalogued group rosters (idols table),
  not a by-product of a game mode. NOTE for the owner: the mission said the "Name All Members" game
  names GROUPS not members, but /games/name-all is genuinely a member-naming game (its own metadata:
  "Can you name every member of BTS, BLACKPINK, SEVENTEEN, Stray Kids"), and per-group name-all games
  do name members. So the CTA was left pointing there (it is true), and only the sourcing sentence was
  fixed. Flagging in case Cowork meant a different surface.
- rookie-2026: no hardcoded "as of July 2026" ranking. A group is only called climbing when it is
  actually present in the live 30-day list (an ESTABLISHED allowlist filters out the majors); when
  nothing qualifies the article says so and stays evergreen.

## REGISTRY CHANGES
(a) `noindex: true` removed from all 8 entries - zero remain in registry.ts. (b) `updatedAt` bumped
to '2026-08-10' on all 8. (c) Stale numbers softened out of titles, descriptions, coverAlt AND the
FAQ answers (the FAQs are kept and are now consistent with the new bodies).

## ISR
`export const revalidate = 3600;` added to apps/quiz/src/app/articles/[slug]/page.tsx.
generateStaticParams kept. `loadArticleContent` now types bodies as sync-or-async server components
so the 5 data bodies compile and render (verified in dev and in the production build).

## VERIFICATION RESULTS
1. tsc --noEmit: 0 errors. next build: "Compiled successfully".
2. All 8 pages load HTTP 200 in dev with real non-zero numbers (values in the table above), 600+
   words each, no dead links.
3. robots noindex: 0 occurrences on all 8 rendered pages.
4. Sitemap delta: the 8 URLs are now emitted; /articles URLs went from 11 to 19.
5. Grep for the old hardcoded stat literals across the 8 content files: none remain in prose (the
   single match is an explanatory code comment recording that the 18-song claim was false).

## NOTHING PUSHED
Committed locally only. Cowork reviews the diff; the owner holds the push gate.
