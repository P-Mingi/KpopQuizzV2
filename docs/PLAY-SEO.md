# PLAY-SEO - indexation diagnostic (GSC snapshot 2026-08-05)
Cowork analysis 2026-08-07. Honest read of the Search Console
"Indexation des pages" export. Quiz side only. This snapshot PREDATES
the 2026-08-06 push, so the merged SEO fixes are not yet reflected.

## 1. The trend is genuinely good (not flattery, it is in the data)

- Indexed pages: 57 (May 11) -> 371 (Aug 5). ~6.5x.
- Non-indexed: ~433 -> 397 (slowly shrinking).
- Impressions/day: ~10 in mid-May -> 250-412 in late July / early Aug.
- Step-ups align with deploys: Jun 13 (65->186), Jul 1 (->213),
  Jul 11 (->293), Jul 25 (->371). The SEO work is compounding.
- The dangerous flag is CLEAN: "Indexed despite robots block" = 0.
  Duplicate-canonical mismatch = 0.

## 2. The 397 "non-indexed" is THREE different things, not one problem

Lumping them as "failures" is what GSC's red UI does; it is misleading.

BUCKET A - non-indexed BY DESIGN (~27 pages, correct behavior):
- noindex (13): /u/* profiles, /create, /battle, /news,
  /rankings/stray-kids/members, /q/pick-out-the-odd-artms-picture.
  Profiles + create forms SHOULD be noindex. "Echec" here only means
  "still noindex", which is exactly what we want.
- redirect (11): /group/bts, /group/aespa, /group/blackpink,
  /group/seventeen, /blind-test, /blind-test/group-*,
  /games/this-or-that/4th-gen-groups... OLD url patterns that now
  301 to the current ones. The redirects are CORRECT (eternal-redirect
  philosophy). They are flagged only because they are still advertised
  (sitemap or stale internal links).
- param canonical (3): /games/this-or-that?group=...&type=... and
  ?daily=quiz variants correctly canonicalize to the clean URL. Working
  as intended.
  => THE ONLY FAULT in bucket A: these URLs are still being advertised
     to Google (sitemap and/or internal links). Fix = HYGIENE, never
     "index them". This is exactly the C5 discipline the Verse F1 just
     built; the quiz side needs the same rule.

BUCKET B - the 336 "discovered, not indexed" (the real frontier):
- These are the programmatic /articles/* pages (bts-discography-guide,
  best-kpop-quizzes-for-beginners, aespa-vs-newjeans-quiz...). "Last
  crawl: N/A" means Google found the URL (via sitemap) but has NOT even
  crawled them yet: deprioritized.
- HONEST verdict after fetching one: ~450-500 words, FAQ + routing to
  quizzes, thin-but-purposeful. Templated. Google deprioritizes thin
  programmatic pages. No technical toggle indexes a thin page; only
  content depth + internal-link signal + genuine uniqueness do.

BUCKET C - the small middle (~29):
- "Crawled, not indexed" (27): Google crawled and passed. Usually thin
  or near-duplicate. Spot-check candidates.
- "Redirect error" (2): a chain or loop. Worth one look (could be a
  real bug, unlike bucket A's clean redirects).
- "Blocked by robots.txt" (5): confirm intentional.

## 3. The plan (prioritized, all quiz-side)

P1 SITEMAP + LINK HYGIENE (cheap, highest ROI, clears ~25 false reds):
   the sitemap must emit ONLY final, 200, indexable URLs. Drop every
   noindex page, every redirecting old URL, every ?param variant. Audit
   internal links for the old /group/* and /blind-test patterns and
   point them at current URLs. Re-submit. This stops wasting crawl
   budget on ~27 dead-end URLs and frees it for bucket B.

P2 THE 336 ARTICLES - owner decision (the real lever):
   Option 1 (recommended): TIER them. Keep + ENRICH the ~30-40 highest
   intent articles (real unique prose, data from our DB, strong internal
   links FROM the matching group/quiz pages), and NOINDEX or drop the
   thin long-tail rest so they stop diluting crawl budget. Honest: a
   450-word templated FAQ will index partially at best; concentration
   beats spray.
   Option 2: leave them as a long-tail net and wait (some index slowly);
   accept most stay unindexed.
   Option 3: consolidate clusters of thin articles into fewer strong
   hub pages.

P3 Spot-check bucket C: the 2 redirect errors (fix if real), confirm
   the 5 robots blocks are intentional.

P4 RE-RUN GSC validation AFTER the Aug 6 push propagates (1-2 weeks):
   the merged /u-sitemap-trim likely already clears part of bucket A.
   Measure before doing more.

## 4. Sequencing (does NOT touch the Verse F1 build)

This is a Play-side workstream for the GAMES worker (play-games branch),
NOT the Verse worker (mid V-FOUNDATION F1, must not be interrupted).
Prototype-free (pure SEO/data work). Enters the Play queue after the
owner rules P2. P1 + P3 can be one small mission whenever a slot opens.

## 5. Honest limits of this analysis

The sitemap.xml is gzipped; WebFetch could not parse it, so "the
sitemap advertises noindex/redirect URLs" is INFERRED from GSC flagging
them, not directly confirmed. The P1 mission's first receipt must be:
dump the actual sitemap URLs and prove which dead-end classes are in it.
