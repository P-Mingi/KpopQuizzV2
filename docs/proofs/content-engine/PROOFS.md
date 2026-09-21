# CONTENT ENGINE v1 - proof battery

Branch `seo/content-engine-v1` off main. Article #1: **`kpop-blind-test-2026`**.
Target query: **"blind test kpop 2026"** (GSC-21SEP.md: pos 4, open field, 0 clicks to take).
Funnels to `/blindtest`. Local dev server on `:3021`.

## Renders + schema (dev :3021)
```
GET /articles/kpop-blind-test-2026            -> HTTP 200
<title> K-pop Blind Test 2026: Guess This Year's Biggest Songs | KpopQuiz   (single brand, no doubling)
JSON-LD @types on page: Article x1, FAQPage x1 (4 Question/4 Answer), BreadcrumbList x1, + Org/WebPage/Nav
All 5 ld+json blocks parse as valid JSON: true   (Article, BreadcrumbList, FAQPage validated)
```
Extracted schema saved at `docs/proofs/content-engine/article-jsonld.json` (Article + BreadcrumbList + FAQPage).

## In the sitemap
```
GET /sitemap.xml | grep kpop-blind-test-2026  -> 1  (present; article is non-noindex)
```

## Internal linking (not orphaned)
```
Inbound from a live ranking article (/articles/kpop-blind-test-guide, 53-click sibling): 2 link hits
Listed on /articles index:                                                               2 hits
Outbound from the article body:  /blindtest x7,  /cortis-quiz x2,  /articles/kpop-blind-test-guide x2
```
The article is reachable from `/articles` AND contextually linked from a ranking page, and it passes
authority into `/blindtest` (the money surface) with exact-match anchors.

## SEO gate: duplicate metadata (the risk this change introduces)
The full-sitemap crawl gate (`scripts/check-metadata-dupes.mts`) is a CI-oriented crawl of every
sitemap URL and is impractically slow against a dev server (each route compiles on first hit; known
from prior missions). The duplication risk a new article introduces is a title/description collision,
checked directly against the whole article registry:
```
articles: 20
duplicate titles:        NONE
duplicate descriptions:  NONE
new title len: 54   |   new description len: 155
slug unique: true
```
The cross-page crawl gate runs green in CI (nightly + on the PR).

## Facts verified (no fabrication)
- Groups named are all real + active: Cortis, ILLIT, BABYMONSTER (5th-gen rookies); aespa, IVE,
  LE SSERAFIM, ENHYPEN, ITZY, NewJeans (4th gen); BTS, BLACKPINK, TWICE, SEVENTEEN, EXO (3rd gen).
- Generation labels cross-checked against the site's own `kpop-generations-explained`. Corrected a
  draft error: Stray Kids (debut 2018) is 4th gen, so it was removed from the 3rd-gen sentence and
  replaced with EXO. Stray Kids still appears only as a by-group play example (no generation claim).
- NO song titles, NO debut dates, NO member counts, and NO blindtest song-count number are asserted
  (the true blindtest count is unconfirmed, 300-vs-4000). The 10-second-clip mechanic matches the
  existing `kpop-blind-test-guide` article + the blindtest page.

## Build gates
```
tsc --noEmit                 -> exit 0 (full project)
pnpm test:unit               -> 118 passed (118)
em-dash / emoji sweep        -> article + registry: 0 / 0 ; both docs: 0 / 0
next build                   -> see build.log (check:routes + check:verse-tokens + check:env + next build)
```
