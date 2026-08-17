# CTR Sprint + Index Health - Baseline (Workstream S)

**Baseline captured:** 2026-07-27
**Re-check window:** 2026-08-24 to 2026-08-31 (3 to 4 weeks after deploy)
**Data source:** Google Search Console, last 3 months at capture time.

## Site-wide baseline (GSC, last 3 months)

| Metric | Value |
|---|---|
| Clicks | 803 |
| Impressions | 6,890 |
| Average CTR | 11.7% |
| Average position | 9.7 |
| Indexed pages | 213 |
| Excluded pages | 407 |
| Total known (indexed + excluded) | 620 |

## Target pages - per-page baseline (before Part A title/meta rewrite)

Ordered worst CTR-vs-position first (the sprint's priority order).

| Page | Impr | CTR | Avg pos | Notes |
|---|---|---|---|---|
| /games | 153 | 1.3% | 5.5 | Page 1, dead snippet - worst offender |
| /seventeen-quiz | 842 | 6.5% | 12.9 | Highest impressions of the group set |
| /quizzes | 702 | 5.8% | 20.3 | Deep position; title now leads with live count |
| /aespa-quiz | 334 | 4.5% | 8.6 | |
| /blackpink-quiz | 172 | 2.3% | 15.7 | |
| /twice-quiz | 121 | 3.3% | 13.2 | |
| /articles/best-kpop-quiz-sites-2026 | 90 | 1.1% | 12.2 | Page 2; title now leads with "5 ranked" |
| /bts-quiz | 46 | 2.2% | 9.6 | |
| /stray-kids-quiz | 94 | 4.3% | 7.9 | |
| /illit-quiz | 252 | ~8% | 7.0 | Already performing - light touch only |

## What shipped (Part A + Part B)

- **Part A** (commit `f352812`): new `<title>` + meta description on all 10 pages.
  Group titles use stable member counts (verified against each group's published
  name_all_members game); quiz counts interpolate live from `group.quiz_count`;
  /quizzes count is live-floored from `getSiteStats` ("380+" today); the article
  leads with the real "5 sites" count. No em dashes, no clickbait.
- **Part B** (commit `41050ac`): `/quizzes?group=<valid>` now canonicals to
  `/<slug>-quiz` instead of self-canonicalizing, ending the facet-vs-group-page
  cannibalization (e.g. `?group=exo` was leaking ~107 impressions at pos ~13.5).

## Measurement rule

- **Success:** CTR up on at least 6 of the 10 target pages at re-check.
- **Revert rule:** if a page's CTR DROPPED after 4 weeks, revert that page's
  title to its baseline (recorded above) and note it here.
- Position is a co-variable: a CTR change alongside a big position move is not a
  clean read of the title change. Compare CTR at similar position where possible.

## Re-check log

_(fill in at 2026-08-24+)_

| Page | Baseline CTR | New CTR | Baseline pos | New pos | Verdict |
|---|---|---|---|---|---|
| /games | 1.3% | | 5.5 | | |
| /seventeen-quiz | 6.5% | | 12.9 | | |
| /quizzes | 5.8% | | 20.3 | | |
| /aespa-quiz | 4.5% | | 8.6 | | |
| /blackpink-quiz | 2.3% | | 15.7 | | |
| /twice-quiz | 3.3% | | 13.2 | | |
| /articles/best-kpop-quiz-sites-2026 | 1.1% | | 12.2 | | |
| /bts-quiz | 2.2% | | 9.6 | | |
| /stray-kids-quiz | 4.3% | | 7.9 | | |
| /illit-quiz | ~8% | | 7.0 | | |
