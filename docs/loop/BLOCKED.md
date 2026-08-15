# BLOCKED (message bus)

The worker writes here ONLY when it hits a real blocker (ambiguity it cannot
resolve from the spec/code, a gate it cannot pass honestly, or a decision that
belongs to the owner) and then STOPS. It never guesses through a gate.

Format for an entry:

```
## <step-id> - <one-line blocker>
- What is blocked: ...
- Why (the specific gate / ambiguity / owner decision): ...
- Options (each with its trade-off): 1) ...  2) ...  3) ...
- Recommendation: ...
- Proof / context: docs/proofs/<step-id>/ (if any)
```

When resolved, the worker clears the entry and continues.

---

## w1-ctr - the new duplicate-metadata gate is RED on a duplicate quiz the code cannot honestly split

- What is blocked: `check:metadata-dupes` cannot go green on the quiz side. One collision is left
  after every template fix: `/q/seventeen-true-or-false` and `/q/seventeen-true-or-false-65` render
  the identical title `SEVENTEEN true or false · 7 questions | KpopQuiz`.
- Why (owner decision): both rows are `status = published`, both are literally titled "SEVENTEEN
  true or false", both have 7 questions. They differ only in difficulty (medium vs easy), plays
  (257 vs 351) and creation date (2026-03-23 vs 2026-04-01). No metadata template can invent a
  difference that is not in the data, and inventing one would break the honesty gate. This is a
  CATALOGUE decision, not a code one.
- Options (each with its trade-off):
  1) Retitle one quiz in the admin (e.g. "SEVENTEEN true or false: hard mode"). Cheapest, keeps both
     quizzes and both URLs, fixes the collision at the source. Loses nothing.
  2) Unpublish the weaker one (the older medium, 257 plays) and 301 it to the survivor. Best for
     crawl budget, but deletes a page that has real plays.
  3) Add difficulty to the `/q` title template for every quiz. Fixes this pair mechanically but
     lengthens all 400 titles for one collision, and two quizzes could still share a difficulty.
- Recommendation: 1. It is a 30-second admin edit and it fixes the actual problem (two pages telling
  Google the same thing) instead of papering over it.
- Also awaiting the owner, NOT blocking this sprint: 7 collision groups in `/verse/*`, including 228
  URLs that all render the space-level description "The ARMY home on KpopVerse: ...". Verse is
  paused and out of this mission's scope, so it was left untouched. It needs its own pass when Verse
  resumes.
- Proof / context: docs/proofs/w1-ctr/partD-dupes.txt · docs/proofs/w1-ctr/partD-q-collisions.txt

push-gate-1b blocker CLEARED: owner ruled the four conflict groups (L-084); the merge was
re-run and the rulings applied EXACTLY (merge commit ae93720), the gate re-proven at the merged
tip, main left strictly ahead of origin/main. See docs/proofs/push-gate-1/ + the step entry in
docs/loop/REPORT.md. One flagged fallback: the Pinterest manifest/csv regeneration timed out, so
remote's committed artifacts shipped as-is (refresh with scripts/generate-question-pins.mts).
