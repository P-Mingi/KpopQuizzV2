# PR-W4 - Rescue BLACKPINK + TWICE (proof)

Branch `feat/seo-w4-rescue`, **stacked on W3** (-> W2). Base main; merge order W2 (#39) -> W3 (#40)
-> W4. Targets the biggest fandoms ranking worst: blackpink quiz (pos 10.6, just off page 1),
twice quiz (pos 9.3). Zero DB/DDL.

## The rescue was mostly already delivered by earlier PRs
Both hubs already had, or gained across this mission, the full on-page lever set:
- **Title**: bespoke overrides ("BLACKPINK Quiz: Can Every BLINK Name All 4? (2026)", "TWICE Quiz:
  Can You Name All 9 Members? (2026)") - under the CTR freeze, so untouched.
- **FAQPage**: from W2 (both get a rich FAQ: member count, fandom BLINK/ONCE, blind test, free).
- **H1 + ItemList**: present. **Home rail + sibling cross-links**: from PR-I2 (they cross-link
  each other; blackpink<->twice are in each other's `RELATED_GROUPS`).
- **Article inbound links**: BLACKPINK already had 2 exact-anchor links. **TWICE had ZERO.**

## The one real gap: TWICE had no article inbound link
`/twice-quiz` had 0 links from any article (vs BLACKPINK's 2). The girl-groups-vs-boy-groups article
carried a REDUNDANT duplicate `/quizzes` link and no group-hub links - its natural exact-anchor home.
Change (`registry.ts`): replaced the duplicate with `TWICE quiz` -> `/twice-quiz` and
`BLACKPINK quiz` -> `/blackpink-quiz` (both girl groups; fitting for that article).

## Proof (dev :3021)
```
/articles/girl-groups-vs-boy-groups-kpop-quiz  ->  href="/twice-quiz" now present (1)
/blackpink-quiz  HTTP 200  FAQPage 1  title "BLACKPINK Quiz: Can Every BLINK Name All 4? (2026)"
/twice-quiz      HTTP 200  FAQPage 1  title "TWICE Quiz: Can You Name All 9 Members? (2026)"
```
The rescue pair now has the full lever set: bespoke title + H1 + FAQPage + home/sibling links +
(new for TWICE) an article inbound link.

## Gates
`tsc --noEmit` exit 0 - unit 121/121 - `next build` (see CI) - render 200 - no title/desc dupes
(21 articles) - 0 em/en dash. DO NOT MERGE - owner merges (after W2 #39, W3 #40).
