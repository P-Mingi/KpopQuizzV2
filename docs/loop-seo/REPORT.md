# REPORT - SEO-4 (O3): the inline "Did you know?" card

Shipped on the play-seo worktree (branch play-seo). One real fact on the quiz page
itself, distinct + stable per quiz, in the page's EXISTING design language. No restyle,
no new route, no schema. Committed, NOT pushed.

## THE ADD
1. DATA: reuses the existing verified pool - getOverriddenFacts(quiz.group_id,
   quiz.group_slug) (lib/trivia/facts.ts), React-cache()'d so it dedupes with the
   hasTriviaPage() gate in the same request. No new source, no invented facts.
2. PICK (pure, deterministic): lib/trivia/pick-fact.ts - stableHash (FNV-1a) +
   stableIndex(quiz.id, n) = hash % n. NO Math.random, NO Date, so the ISR-cached page
   is stable and two quizzes of the same group land on different facts.
3. RENDER: an <aside class="quiz-dyk"> right ABOVE the existing .trivia-entry link, in
   the same surface language (surface card, 14px radius, brand-light icon chip). Category
   as a brand-tinted eyebrow, the fact as the body. No heading (one-H1 kept).
4. HONEST EMPTINESS: 0 facts -> nothing. >=1 fact -> the card shows (it needs only one),
   even when the >=12 trivia-PAGE gate is not met.

## RECEIPTS (docs/proofs/play-seo/seo4-dyk/)
- hash-distinctness.txt: group BTS, 27 quizzes, 98-fact pool. The first 3 quiz ids map to
  indices [12, 69, 52] = 3 DISTINCT facts; determinism PASS; DISTINCT-3 + DETERMINISTIC PASS.
- placement-and-css.txt: where the card renders + the .quiz-dyk class reusing only
  --surface / --border / --brand / --brand-light / --txt1 (no new colours, no new font).

## GATES (worktree; deps symlinked from main to run them, then removed)
- tsc --noEmit: EXIT 0.
- full build (check:routes + check:verse-tokens + next build): EXIT 0; check:routes pass;
  "Verse token gate passed: no raw hex colors in Verse surfaces."; "Compiled successfully".
  (Unlike SEO-1..3c, the full build DID run here - deps symlinked from main's node_modules.)
- em-dash / en-dash scan on the changed files: clean.

## OUT OF SCOPE (untouched, per the mission)
- The entity-level trivia table (migration 149) enrichment - a later slice.
- No restyle of the quiz page; getPassRate / stats / JSON-LD untouched.

## STOP
SEO-4 complete on play-seo. Committed, nothing pushed. NOT part of the play-seo -> main
merge that just shipped (that carried SEO-1..3c only); this slice awaits a future integration.
