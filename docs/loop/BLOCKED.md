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

(no open blockers)

vbuilder3-step3 blocker CLEARED: owner applied migration 146
(docs/pending-migrations/146_verse_block_images.sql); the full image rail was
then built, proven, and committed. See docs/proofs/vbuilder3-step3/ and the
step-3 entry in docs/loop/REPORT.md.
