# /caveman report - G-HUB v2 recovery + merge into main (owner-approved, all local)

The owner approved recovering from the shared-clone collision and fast-forwarding the G-HUB v2
fork (`play-ghub`) into `main`, all LOCAL, zero push. Done + verified + committed. Never pushed.

## What happened (context)

A concurrent G-HUB fork worker was doing git surgery on the SAME clone (it should have used a
`.worktrees/` checkout). Twice it clobbered my working tree and, mid-verification, `git reset`
main back to `44dda93` (undoing an earlier ff-merge) + amended `play-ghub`. I stopped and
flagged it. The owner halted that worker and told me to finish. This pass the tree stayed
stable (main held its position through the commit).

## Steps executed

0. Removed a stale `.git/index.lock`.
1. `git checkout main` (already on main) + `git merge --ff-only play-ghub` -> main
   fast-forwarded `44dda93 -> bd6fd41`. `git log --oneline -1` = **bd6fd41 "G-HUB legal wall:
   rankings strip idol photos to CSS-art initials"** (the expected G-HUB HEAD). My V-BUILDER
   1..8 commits are preserved as ancestors; the owner's uncommitted VERSE-LEDGER.md update was
   preserved (never staged).
2. `git worktree prune` (removed a stale worktree).
3. Re-ran every gate ON THE MERGED HEAD (bd6fd41) and saved to docs/proofs/ghub-v2/merged/;
   committed on main (**3a6bdfd**):
   - next build: **BUILD_EXIT=0** (full route manifest).
   - check:routes: **335 page routes reachable**.
   - check:verse-tokens: **pass** (no raw hex in Verse surfaces).
   - test-play-untouched: **12 passed, 0 failed** (720px, verse-page-free).
   - em-dash grep over the **30** merged files (44dda93..bd6fd41): **clean**.
   - legal wall (zero idol image refs on /games): the rendered /games hub +
     /games/this-or-that/all + /games/name-all carry **only the app mascot** (idol-photo-src=0
     on all three); the hub live-ranking is text-only; the rankings-strip component renders
     aria-hidden **CSS-art initials** (and has no import site). Idol images live only inside
     GAMEPLAY (this-or-that / name-all), where identifying idols IS the game.

## State

- `main` = **3a6bdfd** (bd6fd41 G-HUB work + this verification commit). main == play-ghub content.
- Nothing pushed (law 15). main is still diverged from origin/main; production is owner-only.

## Note on my own V-BUILDER-3 step 2

My in-progress V-BUILDER-3 step 2 (content tab plumbing) was BUILT + fully proven this session
(browser round-trips + gates + byte-identical) but its UNCOMMITTED edits were clobbered by the
collision. They are preserved off-tree at `scratchpad/vb3-step2-recovery/` (the new content-tab.tsx
+ a RECOVERY.md with the exact 6-change list). It re-applies cleanly on `main` in one pass when
Cowork resumes V-BUILDER-3; step 1 (44dda93) is safely on main. NOT part of this recovery commit.

STOP.
