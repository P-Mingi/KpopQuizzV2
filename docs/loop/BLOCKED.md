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

push-gate-1b blocker CLEARED: owner ruled the four conflict groups (L-084); the merge was
re-run and the rulings applied EXACTLY (merge commit ae93720), the gate re-proven at the merged
tip, main left strictly ahead of origin/main. See docs/proofs/push-gate-1/ + the step entry in
docs/loop/REPORT.md. One flagged fallback: the Pinterest manifest/csv regeneration timed out, so
remote's committed artifacts shipped as-is (refresh with scripts/generate-question-pins.mts).
