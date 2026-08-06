# /caveman report - PUSH-GATE-1b: reconcile remote - BLOCKED at merge conflicts (owner rules)

Did 1b-1 (inventory the remote delta) and attempted 1b-2 (merge). The merge conflicts on 19
files where the local rebuilds and Mingi's PRs both touched the same code, so per the mission I
resolved NOTHING, aborted the merge (tree clean, still 304 ahead / 18 behind), and hand the
resolution to the owner. 1b-3 (build + re-prove + re-capture heads) waits for the rulings.
Nothing pushed.

## 1b-1 - the remote delta (docs/proofs/push-gate-1/remote-delta.txt)

18 commits, all P-Mingi GitHub PR merges (Jul 30 - Aug 3) that were merged on GitHub but never
pulled locally: SEO fixes (og/group Satori 500, robots, sitemap /u trim, /quizzes FAQ), profile
alignment (/me + /u), a 5-tier badges redesign, the Pinterest per-question pipeline (~2900 pins
+ RSS feed), the /games hub redesign + Sort It / Match-Up, home/search circular coins, and mobile
polish. Per-commit triage in the file: much of Play (games, home, mobile, badges, pinterest) was
REBUILT locally in another form; a few are fixes local never got (og Satori, robots, /me+/u
alignment, games build-guard, the RSS feed).

## 1b-2 - the merge conflicts (19 files) -> BLOCKED

`git merge origin/main` auto-merged the non-overlapping files but conflicted on 19 (12 content,
7 add/add). Grouped, with my recommendation (full detail + file list in BLOCKED.md):
- A) Play surfaces rebuilt locally (games hub, players, home pills, mobile top bar): take LOCAL,
  graft the small net-new remote bits. Open call: adopt Mingi's net-new game-preview /
  games-spotlight into the local hub, or drop them?
- B) styles/globals.css: UNION - both added distinct blocks (my carousel-arrow/quiz-row work vs
  Mingi's games/badges/mobile styles); careful hand-merge, not a side-pick.
- C) profile + badges (/u, badge-icon, badge-grid, badges.ts): diverged; owner picks the badges
  system (remote is a 5-tier redesign) + likely takes remote's /u 520-col alignment.
- D) Pinterest (question-pin*, generate route/script, manifest/csv): diverged; remote pipeline is
  fuller (~2900 + RSS) - likely take remote, and REGENERATE the manifest/csv artifacts (never
  hand-merge generated files).

## What unblocks it

One ruling per group A-D (or per file). The simplest form - "A local, B union, C remote, D remote
+ regenerate" - is enough; I then re-run the merge, apply exactly those resolutions (nothing
blind), and continue to 1b-3: tsc + check:routes + verse-tokens + full npm run build, re-run the
PG-1 anonymous probe on the prod build (hidden), re-capture the PG-2 heads to heads-local-2.txt,
em-dash clean on the merged files.

## STOP

Merge aborted (local tip 94a3a2b intact, my ScrollRow / blindtest / VERSE_PUBLIC work preserved).
Receipt committed (remote-delta.txt + BLOCKED.md + this report). Nothing pushed. Waiting on the
owner's A-D rulings.
