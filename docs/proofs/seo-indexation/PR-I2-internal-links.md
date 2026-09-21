# PR-I2 - Internal-linking crawl paths (proof)

Branch `feat/seo-internal-links` off main `d944d50`. Zero DB/DDL. Three real gaps closed.

## Gap 1 - the home rail omitted the biggest rookie hubs
`components/home/home-group-pills.tsx` capped its `ORDER` at 13 slugs and left out `cortis` (the #1
hub by impressions, 3410i), `illit` (2347i), `babymonster` (816i) and `itzy`. Fixed: `ORDER` now
carries all 15 Tier A/B priority hubs, with the high-impression rookies surfaced near the front. The
rail is a horizontal `ScrollRow`, so more coins scroll rather than break layout.

**Proof (home links every priority hub as a `/{slug}-quiz` coin):**
```
cortis illit seventeen babymonster aespa stray-kids blackpink twice bts newjeans
le-sserafim ive enhypen txt itzy  ->  15/15 present (1 each)
```
Every Tier A/B hub is now reachable from home in ONE click (the mission asked for <= 2).

## Gap 2 - hubs had no UP link to /quizzes
`[slug]/group-quiz-page.tsx` breadcrumb was `Home > {group} Quiz`. Added a `/quizzes` item, which the
`Breadcrumbs` component renders as a real link AND folds into the inline `BreadcrumbList` JSON-LD.

**Proof (every hub now):**
```
/bts-quiz        UP link href="/quizzes": 1   breadcrumb schema: Home > Quizzes > BTS Quiz  (valid)
/cortis-quiz     UP link href="/quizzes": 1
/illit-quiz      UP link href="/quizzes": 1
/babymonster-quiz UP link href="/quizzes": 1
```

## Gap 3 - three rookie hubs emitted no sibling cross-links
`RELATED_GROUPS` had no keys for `cortis`, `illit`, `babymonster`, so their "Fans also play" section
did not render (no across-links). Added entries (a labelmate + fellow rookies, all with quizzes so the
section renders) plus their display names in `RELATED_GROUP_NAMES`.

**Proof (sibling hub links now render on each rookie hub):**
```
/cortis-quiz       -> /enhypen-quiz  /illit-quiz     /txt-quiz
/illit-quiz        -> /babymonster-quiz  /le-sserafim-quiz  /newjeans-quiz
/babymonster-quiz  -> /blackpink-quiz  /cortis-quiz   /illit-quiz
```

## No orphan priority hub
Each of the 15 priority hubs now has inbound internal links from: the home rail (1 click), the
`/groups` A-Z directory (already), and sibling "also play" sections. None is orphaned.

## Gates
`tsc --noEmit` exit 0 - unit 118/118 - `next build` (see CI) - 0 em/en dash on all touched files.
Render 200 on home + every hub checked. BreadcrumbList JSON-LD parses. DO NOT MERGE - owner merges.
