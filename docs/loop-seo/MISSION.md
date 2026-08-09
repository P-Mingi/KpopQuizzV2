# SEO-4 MISSION (PLAY-SEO fork · 2026-08-09) - the DID-YOU-KNOW card (O3)

The quiz page design is FINAL and good. Do NOT restyle it, do NOT
reprototype. This adds ONE missing SEO element from the P5 plan, in the
page's EXISTING design language: an inline "Did you know?" card showing
ONE real fact, DIFFERENT per quiz. Work on YOUR worktree (.worktrees/
play-seo, branch play-seo), never push, no schema, covenant, em-dash
gate, receipts, report to docs/loop-seo/REPORT.md, STOP after the report.

## WHAT EXISTS (do not duplicate)

apps/quiz/src/app/q/[slug]/page.tsx already renders: the dynamic intro,
crawlable questions, related quizzes, stats block, JSON-LD, and a
`trivia-entry` LINK to /[group]-trivia. What is MISSING is an inline
did-you-know: today the page only LINKS to the trivia page, it never
shows an actual fact. O3 wants one real fact on the quiz page itself,
distinct per quiz, so no two quiz pages of the same group read the same.

## THE ADD (O3)

1. DATA: reuse the EXISTING verified fact pool, do not invent a source.
   `getOverriddenFacts(groupId, groupSlug)` (apps/quiz/src/lib/trivia/
   facts.ts) already returns real, override-verified TriviaFact[]. Call
   it on the quiz page (it is React-cache()'d, so it dedupes with any
   other caller in the same request).
2. PICK ONE, DISTINCT + STABLE per quiz: choose index =
   stableHash(quiz.id) % facts.length. MUST be deterministic (no
   Math.random, no Date) so the ISR-cached page is stable and two
   different quizzes of the same group land on different facts. Put the
   hash in a tiny pure helper with a unit-style receipt (show that 3
   different quiz ids map to 3 different facts for a group with >=3).
3. RENDER: a "Did you know?" card in the EXISTING design. Reuse the
   `.trivia-entry` visual language (surface card, 14px radius, the
   brand-light icon chip, DM Sans, the reduced-motion rule). Add a
   sibling class e.g. `.quiz-dyk` in globals.css next to `.trivia-entry`
   using the SAME tokens (var(--surface), var(--border), var(--brand),
   var(--brand-light), var(--txt1/2/3)) - NO new colours, NO new font.
   Category label (fact.category) as a small brand-tinted eyebrow, the
   fact text as the body. Place it right ABOVE the existing trivia-entry
   link (one shows a taste, the other links to the full page).
4. HONEST EMPTINESS: if the group has 0 facts, render nothing (no empty
   card). If it has facts but fewer than the trivia-page gate, the card
   still shows (a single fact needs only 1, it is not the >=12 page).

## OUT OF SCOPE (do not do here)

- The entity-level trivia table (migration 149) enrichment is a LATER
  slice; this ship uses the existing derived pool so it needs no seed.
- No restyle of the quiz page. No new design language. No prototype.
- getPassRate / stats / JSON-LD: already shipped, do not touch.

## RECEIPT + GATES

docs/proofs/play-seo/seo4-dyk/: the hash-distinctness proof (3 quiz ids
-> 3 facts), a note of where the card renders, and the CSS class reusing
existing tokens. Gates: tsc on changed paths, check:routes (no new
route), em-dash scan, full build if the worktree allows else say so.
STOP after the report.
