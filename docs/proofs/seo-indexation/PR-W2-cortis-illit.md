# PR-W2 - Cortis + ILLIT hubs (proof)

Branch `feat/seo-w2-cortis-illit` off main `c108937`. Targets: cortis quiz (3410i), illit quiz
(2347i) - the biggest rookie hubs. Zero DB/DDL.

## The lever set, and what was already done
Per hub the mission wants: title + H1 + intro leading with the exact "{group} quiz" anchor;
JSON-LD **Quiz + ItemList + FAQPage**; internal links with the exact anchor. Current state on main:
- **H1**: already `${group.name} Quiz - Test How Well You Know ${group.name}` (leads with the anchor) - all hubs.
- **Quiz schema**: already emitted on the individual `/q/` quiz pages (`q/[slug]/page.tsx`); the hub
  correctly uses CollectionPage + ItemList (a hub is a collection, not one quiz) - not changed.
- **ItemList**: already present (CollectionPage.mainEntity + a play-surfaces ItemList).
- **Internal anchor links**: home rail + sibling hubs (PR-I2) already point in with "{group} quiz" anchors.
- **Title**: bespoke overrides existed for 7 groups incl. ILLIT (and are under a CTR-measurement
  freeze, so untouched). **Cortis had none.**
- **FAQPage**: MISSING on every hub. This is the real W-gap.

## Changes (shared component `group-quiz-page.tsx`)
1. **FAQPage on the hub** (all hubs benefit): a `buildGroupFaqs` helper builds Q/A from REAL group
   facts only, reusing the hero's gates - `PLACEHOLDER_FANDOMS = {fan, ''}` and memberCount > 0 - so a
   thin group never gets a fabricated answer. The same array feeds a VISIBLE `<dl>` and the FAQPage
   JSON-LD (Google requires the answers on-page), gated on >= 2 real Q/A.
2. **Cortis title override** (not in the frozen set): `Cortis Quiz: Test How Well You Know the Rookie
   Group (2026)`, hook on the 2025 debut. No member/fandom claim (Cortis has no name-all game and a
   placeholder fandom in the DB).

## Proof (dev :3021)
```
/cortis-quiz  title: "Cortis Quiz: Test How Well You Know the Rookie Group (2026)"
              FAQPage: 1 | visible dt == schema Q: TRUE (2 Q)
              Qs: "How many Cortis quizzes are there?" / "Are the Cortis quizzes free?"
              -> NO fandom Q, NO member Q (placeholder fandom + no member count correctly skipped)
/illit-quiz   FAQPage: 1 | 3 Q: quizzes / "What is ILLIT's fandom called?" (GLLIT) / free
              -> member Q correctly skipped (ILLIT has no name-all game), real fandom kept
/bts-quiz     FAQPage: 1 | full set: quizzes / members (7) / fandom (ARMY) / blind test / free
```
Visible `<dl>` answers match the FAQPage schema answers (identical once HTML entities are decoded).

## Gates
`tsc --noEmit` exit 0 - unit 121/121 - `next build` (see CI) - render 200 on cortis/illit/bts -
FAQPage JSON-LD parses and matches the visible FAQ - 0 em/en dash. DO NOT MERGE - owner merges.
