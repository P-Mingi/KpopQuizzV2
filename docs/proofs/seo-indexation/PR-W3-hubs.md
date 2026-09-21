# PR-W3 - SEVENTEEN + BABYMONSTER + aespa + Stray Kids hubs (proof)

Branch `feat/seo-w3-hubs`, **stacked on W2** (`feat/seo-w2-cortis-illit`) because all W PRs edit the
same `group-quiz-page.tsx` - stacking avoids the merge conflicts parallel branches would hit. Base is
main; merge order is W2 (#39) -> W3 -> W4. Zero DB/DDL.

## What these 4 hubs already had
- Title overrides for SEVENTEEN, aespa, Stray Kids (bespoke, and under the CTR freeze -> untouched).
- H1 leads "{group} Quiz"; ItemList; PR-I2 internal anchors; and the **FAQPage from W2** (shared).
So three of the four were already fully levered. The gaps: BABYMONSTER had no title override, and the
default hub intro did not lead with the keyword.

## Changes (shared `group-quiz-page.tsx`)
1. **BABYMONSTER title override** (816i, YG rookie, not frozen): `BABYMONSTER Quiz: Free Fan-Made
   Tests for the YG Rookies (2026)`. Neutral hook - no specific member count (lineup has shifted) and
   no fandom claim.
2. **Default hub intro now leads with the exact "{group} quizzes" anchor** (body-copy keyword
   prominence). `generateDefaultIntro` is only used when a group has NO curated `seo_intro`, so the
   high-value hubs that carry their own intro are untouched - the change lands on the rookie / smaller
   hubs that fall back to the default.

## Proof (dev :3021)
```
/babymonster-quiz  title: "BABYMONSTER Quiz: Free Fan-Made Tests for the YG Rookies (2026)"
                   intro: "BABYMONSTER quizzes, made by fans ..."  (leads with the anchor)
                   FAQPage: 1 (inherited from W2)
/seventeen-quiz    HTTP 200, FAQPage 1   (override frozen, intro = its own seo_intro)
/aespa-quiz        HTTP 200, FAQPage 1
/stray-kids-quiz   HTTP 200, FAQPage 1
```

## Gates
`tsc --noEmit` exit 0 - unit 121/121 - `next build` (see CI) - render 200 on all 4 - 0 em/en dash.
DO NOT MERGE - owner merges (after W2 #39).
