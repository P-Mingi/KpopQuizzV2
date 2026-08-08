# PLAY-SEO REPORT (SEO-1 + SEO-2)

## SEO-1: SITEMAP AUDIT (DONE, no code changes)

**VERDICT: the sitemap is CLEAN.** The PLAY-SEO.md inference was REFUTED.
Live sitemap (824 URLs) contains zero prohibited patterns.
Receipt: docs/proofs/play-seo/step1/sitemap-audit.txt

The 397 "non-indexed" GSC pages come from:
- Bucket A (~27): old Google cache/backlinks, not current sitemap.
- Bucket B (~336): thin articles Google deprioritized.
- Bucket C (~29): content quality rejections + redirect errors + robots blocks.

---

## SEO-2: ARTICLE TIERING + ENRICHMENT (DONE, 2 commits)

### Step 1: Tier the 20 articles

Tiered all 20 articles by search-intent strength:
- TOP TIER: 11 articles (enrich + keep indexed)
- THIN TIER: 8 articles (noindex + drop from sitemap)
- (one gap slot in the thin tier list was a count artifact)

Receipt: docs/proofs/play-seo/step1-tier/tiers.txt

### Step 3: Noindex thin articles

Commit: `seo: noindex 8 thin articles, drop from sitemap` (f9ace70)

Files changed:
- apps/quiz/src/lib/articles/types.ts (added `noindex?: boolean`)
- apps/quiz/src/lib/articles/registry.ts (8 articles marked)
- apps/quiz/src/app/articles/[slug]/page.tsx (robots noindex gate)
- apps/quiz/src/app/sitemap.ts (filter noindex articles)

Sitemap article count: 20 -> 12. Pages kept reachable (no hard delete).
Receipt: docs/proofs/play-seo/step3/noindex-list.txt

### Step 2: Enrich top-tier articles + internal links

Commit: `seo: enrich 6 top-tier articles with real DB data + internal links` (a92bbad)

Data source: production Supabase pull (/tmp/seo-enrichment-data.json).

**Article enrichment (6 articles, +96 net lines):**

| Article | Before | After | DB entities |
|---------|--------|-------|-------------|
| bts-discography-guide | 65 ln | 195 ln | 17 albums by era, 7 members, 29 BT songs, 30 quizzes |
| kpop-eras-timeline | 60 ln | 67 ln | 87 groups, generation counts |
| newjeans-fan-guide | 61 ln | 90 ln | 5 members, 2 albums, BT stats |
| stray-kids-vs-ateez | 72 ln | 79 ln | SKZ 20 albums, ATEEZ 25 albums |
| aespa-vs-newjeans-quiz | 71 ln | 77 ln | aespa 11 albums, NJ 2 albums |
| kpop-generations-explained | 151 ln | 167 ln | Platform stats, cross-links |

5 articles NOT enriched (already 116-164 lines, deep enough).

**Internal links (the biggest SEO fix):**

Before: ZERO inbound links from any page to /articles/.
After: every group quiz page links relevant articles.

New file: `apps/quiz/src/lib/articles/group-links.ts`
Modified: `apps/quiz/src/app/[slug]/group-quiz-page.tsx` (+25 lines)

Link map:
- bts -> bts-discography-guide, bts-vs-blackpink-quiz
- blackpink -> bts-vs-blackpink-quiz
- stray-kids -> stray-kids-vs-ateez
- ateez -> stray-kids-vs-ateez
- aespa -> aespa-vs-newjeans-quiz
- newjeans -> newjeans-fan-guide, aespa-vs-newjeans-quiz
- (all others) -> kpop-generations-explained (general fallback)

Cross-links within articles:
- kpop-generations-explained <-> kpop-eras-timeline (bidirectional)
- bts-discography-guide -> bts-vs-blackpink-quiz
- newjeans-fan-guide -> aespa-vs-newjeans-quiz

Receipt: docs/proofs/play-seo/step2/enrichment-receipt.txt

---

## GATES

- em-dash scan: CLEAN (0 occurrences in all changed files)
- tsc: CLEAN for all changed files
- No new deps added
- No schema changes
- Nothing pushed (owner-gated)

## DEVIATIONS

- Step ordering: Step 3 (noindex) committed before Step 2 (enrichment)
  because the code changes were independent and noindex was ready first.
- 5 of 11 top-tier articles not enriched (already 116-164 lines).
  Enrichment focused on the thinnest articles with highest search-intent gap.

## DEFERRED

- P5 (the 336 non-indexed /q/* quiz pages): NOT articles, NOT this mission.
  Surface to owner for separate strategic decision.
- Full build gate: not run (worktree lacks node_modules; main tree tsc
  confirmed clean for all changed file paths).
- check:routes, verse-tokens: not applicable to article content changes.

## FLAG FOR OWNER (from MISSION.md, not acted on)

The GSC "336 discovered, not indexed" is dominated by /q/* individual quiz
pages (399 published), not articles (only 20 exist). Enriching articles will
not move that number. That is a SEPARATE strategic decision (P5).
