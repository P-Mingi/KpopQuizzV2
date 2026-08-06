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

## push-gate-1b - `git merge origin/main` conflicts on 19 files; owner must rule the resolutions

- What is blocked: reconciling the 18 remote commits (all P-Mingi PR merges) into local main.
  `git merge origin/main` auto-merged most files but CONFLICTED on 19 where both the remote PRs
  and the local rebuilds touched the same code. Per the mission I resolved NOTHING and aborted
  the merge (tree is clean at 94a3a2b, still 304 ahead / 18 behind). Inventory + per-commit
  triage: docs/proofs/push-gate-1/remote-delta.txt.
- Why (owner decision): the local branch REBUILT several Play surfaces (games hub, home rows,
  mobile, badges, pinterest) in a different form than Mingi's PRs, so both sides have legitimate,
  divergent work. Which side wins is a product call, not a mechanical merge.

- The 19 conflicts, grouped with a recommendation:

  A) PLAY SURFACES REBUILT LOCALLY -> take LOCAL (the newer rebuild), graft the small net-new bits:
     - src/components/game/games-hub.tsx
     - src/components/game/match-up-player.tsx
     - src/components/game/sort-it-player.tsx
     - src/app/games/match-up/[slug]/page.tsx
     - src/app/games/sort-it/[slug]/page.tsx
     - src/app/games/name-them-all/page.tsx
     - src/components/layout/mobile-top-bar.tsx
     - src/components/home/home-group-pills.tsx  (local = circular coins + my ScrollRow arrows;
       remote adds title={g.name} + size 64 - worth grafting the title tooltip onto local)
     NET-NEW from remote (auto-merged, NO conflict, Mingi-only): game-preview.tsx, games-spotlight.tsx.
     Owner call: should the LOCAL games hub adopt Mingi's spotlight/preview components, or drop them?

  B) src/styles/globals.css -> UNION (both sides added DISTINCT blocks: local = the carousel-arrow
     + trending-card + quiz-row work; remote = Mingi's games/badges/mobile styles). Recommend
     keeping BOTH, reconciling only the few overlapping selectors (.home-group-rail, .trending-*,
     mobile top bar). This one needs a careful hand-merge, not a side-pick.

  C) PROFILE + BADGES -> the two branches DIVERGED; owner picks the system (state both):
     - src/app/u/[username]/page.tsx  (remote = Mingi's 520-col profile alignment - a targeted fix
       local may simply lack; likely take REMOTE unless local changed /u too)
     - src/components/profile/badge-icon.tsx (add/add), src/components/ui/badge-grid.tsx,
       src/lib/badges.ts  (local already ships a badges impl; remote is Mingi's 5-tier redesign -
       owner picks which badges system, then the other three follow it)

  D) PINTEREST -> exists on BOTH, diverged; remote (e89ce4b) has fuller coverage (~2900 pins + RSS):
     - src/lib/pinterest/question-pin.tsx (add/add), question-pin-batch.ts (add/add),
       scripts/generate-question-pins.mts (add/add),
       src/app/api/admin/pinterest/generate-question-pins/route.ts (add/add)
       -> likely take REMOTE (the fuller pipeline) since local's pinterest is older.
     - pinterest-output/manifest.json + pinterest-question-pins.csv (add/add) are GENERATED
       ARTIFACTS - do NOT hand-merge; pick the remote pipeline then REGENERATE them.

- What I need: one ruling per group A-D (or per file). Simplest: "A local, B union, C remote, D
  remote+regenerate" - I then re-run the merge, apply exactly those resolutions (nothing blind),
  and proceed to 1b-3 (build + re-prove the gate + re-capture heads).

- Proof / context: docs/proofs/push-gate-1/remote-delta.txt (18-commit inventory + triage).

FLAG for the owner - PUSH-GATE-1 PG-3 was a no-op: `git merge play-games` -> "Already up to date". play-games (f860d32) is main~1, its worktree is clean, no divergent games batch exists to merge (the games work is already on main). Not a conflict. Confirm the games batch is complete on main before pushing, OR advance play-games and re-run PG-3. PG-1 (VERSE_PUBLIC hide) + PG-2 (prod head snapshots) are DONE; see docs/proofs/push-gate-1/ + the REPORT.

(resolved) vbuilder3-step5 precondition: the games chat was moved to .worktrees/play-games, main is single-writer again, tsc clean. Step 5 + R-A/R-B run AFTER the push (per the current mission).

vbuilder3-step4 blocker CLEARED: owner ruled all four governance questions (L-068)
and applied migration 147 (idols.origin / created_by / detached_at). Step 4 built to
the governance contract, proven, committed. See docs/proofs/vbuilder3-step4/ and the
step-4 entry in docs/loop/REPORT.md.

NOTE for the owner (not a blocker): a concurrent chat is editing this same working tree
(its dev server is churning RSC/HMR) and it committed 3ea961d, which leaves ONE tsc error
in src/app/games/name-them-all/page.tsx(96) - outside V-BUILDER, not mine to fix. Every
step-4 file is tsc-clean. Worth coordinating so two chats do not share one worktree.
