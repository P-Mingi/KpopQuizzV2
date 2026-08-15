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

w3-partA blocker CLEARED 2026-08-15: the owner applied migration 155, so
`plays.anon_id` and `battle_results.anon_id` both exist (verified live). PART A is
unblocked and not yet built.

w2-notify blocker CLEARED 2026-08-15: migration 154 is applied. Re-probed with
controls, `battle_beaten` inserts cleanly and a bogus type is still rejected
(docs/proofs/w2c-supply/partC-mig154-reprobe.txt).

## w3b-part3 - the game result screens have nothing an account can own

- What is blocked: PART 3 (claim on blindtest / name-all / sort-it / match-up
  results). Not built, on purpose, per the mission's own rule.
- Why: `claim-runs` can only move rows carrying `anon_id`, which migration 155 added
  to `plays` and `battle_results` only. blindtest, sort-it and match-up persist NO
  result row at all; name-all and this-or-that write `game_plays`
  (id, game_id, player_id, choices, created_at), which has no `anon_id`. On every one
  of those screens the block would move zero rows, so showing it would be a promise
  the code cannot keep.
- Options:
  1) Owner applies a migration adding `anon_id uuid` to `game_plays` (and to
     `name_all_member_results` if those runs should be ownable). The component then
     drops onto those screens unchanged: it already takes a `surface` enum with
     'game-result' defined, and the write paths mirror the quiz one.
  2) Leave game runs unownable. Those screens keep showing nothing, which is honest,
     and the claim stays a quiz-and-battle feature.
  3) Show the block there anyway, pointing at quiz/battle runs the browser made
     earlier. Rejected: the reader just finished a game and would reasonably read it
     as claiming THAT run.
- Recommendation: 1 if game results are meant to belong to people, otherwise 2. Both
  are honest; 3 is not.
- Proof / context: docs/proofs/w3b-claim/part3-not-claimable.txt

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
