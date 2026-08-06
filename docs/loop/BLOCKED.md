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

## vbuilder3-step5 - precondition not met: the concurrent chat still shares this worktree
tsc is now clean (precondition 1 met), BUT the "dev server is quiet" precondition is NOT: the concurrent chat is still here (owns uncommitted game-images/name-them-all[x2]/verse/page.tsx + new prototypes/foundation-prototypes.html, and committed b59bd11/b19c21b/cc80b15 after my step 4). Per the mission I stop until the owner finishes moving it to its own worktree; then R-A (scriptable) + R-B (screenshots) + step 5 in one pass. Nothing started, nothing touched.

vbuilder3-step4 blocker CLEARED: owner ruled all four governance questions (L-068)
and applied migration 147 (idols.origin / created_by / detached_at). Step 4 built to
the governance contract, proven, committed. See docs/proofs/vbuilder3-step4/ and the
step-4 entry in docs/loop/REPORT.md.

NOTE for the owner (not a blocker): a concurrent chat is editing this same working tree
(its dev server is churning RSC/HMR) and it committed 3ea961d, which leaves ONE tsc error
in src/app/games/name-them-all/page.tsx(96) - outside V-BUILDER, not mine to fix. Every
step-4 file is tsc-clean. Worth coordinating so two chats do not share one worktree.
