# PLAY-SEO REPORT (SEO-3c)

## SEO-3c: correction pass on SEO-3b (DONE, 1 commit)

Commit: `seo: SEO-3c correction pass (C1-C3)` (7b175c3)
Scope: three small fixes to the residual falsehood + noise left by the
half-applied R3. No new features.

## Shipped + files

### C1: drop the Completions cell

File: `apps/quiz/src/components/quiz/quiz-stats-block.tsx`
Also: `apps/quiz/src/app/q/[slug]/page.tsx` (call site prop removed)

Cowork measured prod and found `play_count === total_completions`
on all 399 published quizzes and every plays row has a non-null
score - in this schema a play IS a completion. The prior "Completions"
cell was noise on 396 quizzes (same number under two labels) and a
false abandonment signal on the 3 drifted rows (BIG rendered
"Plays 2,060 / Completions 1,880", inviting "180 abandoned"; nobody
did).

- Cell removed from the block.
- `totalCompletions` prop dropped from `QuizStatsBlockProps`.
- Plays cell continues to source from `extra.totalPlaysWithScore` with
  `quiz.play_count` fallback (R3, unchanged).
- Inline comment documents the schema fact so a future editor knows
  why the cell is absent.
- If a completion metric ever becomes meaningful (schema records
  abandoned attempts), the cell comes back with real data behind it.

### C2: remove the hardcoded threshold literal + gate on same base

File: `apps/quiz/src/app/q/[slug]/page.tsx`

Before: `const scoresUnlocked = quiz.total_completions >= 30;` - a
literal 30 and a base (`quiz.total_completions`) that is not the
source of truth the rest of the page reads.

After:
- `import { RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';`
- `const plays = extra.totalPlaysWithScore > 0 ? ... : quiz.play_count;`
- `const scoresUnlocked = plays >= RANKING_UNLOCK_VOTES;`
- Intro branch B boundary also uses `RANKING_UNLOCK_VOTES` (not `30`).

Zero numeric literals for the threshold anywhere in the quiz page or
its components. Verified by grep:
`grep -E '>= *30|< *30|=== *30|== *30' page.tsx quiz-stats-block.tsx`
returns nothing except comments about the constant.

Gate and display share their base (`plays`), so a quiz sitting on the
boundary cannot unlock on one number and render another.

Component also updated to gate on `playsDisplay >= RANKING_UNLOCK_VOTES`
so the same invariant holds if the component is ever consumed from a
different call site. The gate line now reads "Scores unlock at 30
plays (N so far)." (was "30 completions"), matching the base.

### C3: pass rate from extra, drop getPassRate call

File: `apps/quiz/src/app/q/[slug]/page.tsx`

Before (6 plays-related count queries per render):
- `getPassRate(quiz.id, questionCount)` -> 2 counts (total plays,
  passing plays)
- `getQuizExtraStats(quiz.id, questionCount)` -> 1 select + 3 counts
  (fastest select, perfect count, passing count, total count)
- `extra.passingPlays` had no reader (dead)
- `extra.totalPlaysWithScore` duplicated getPassRate's total count

After (4 plays-related count queries per render):
- `getQuizExtraStats(...)` -> 1 select + 3 counts (unchanged)
- `passRate = round(extra.passingPlays / extra.totalPlaysWithScore * 100)`
  when `extra.totalPlaysWithScore > 0`, else `null`
- `getPassRate` NOT imported and NOT called from this page.
  Left in place for other callers (per mission).

Two fewer round trips per render. Zero dead values. Pass rate is
mathematically guaranteed to share its denominator with the Plays
cell (both use `extra.totalPlaysWithScore`).

### Acceptance receipt recomputed

File: `docs/proofs/play-seo/seo3-acceptance/three-quiz-comparison.txt`

- All three tiers show the new cell inventory (Completions gone) and
  the C3-derived pass rate.
- Query-count comparison block added: 6 -> 4 (33% reduction) with
  attribution of which queries went away and why.
- Gate line copy updated for TINY: "Scores unlock at 30 plays (5 so
  far)." (previously "30 completions").
- The false-abandonment risk on BIG is called out explicitly and
  shown fixed: only "Plays 2,060" now, no adjacent 1,880.

## Not touched (per mission)

- JSON-LD frozen (unchanged since SEO-3).
- Migration 149, O1, O3: Cowork.
- The 3-row DB reconciliation: Cowork, under the owner SQL gate.
  Once it lands, counter and table agree everywhere and the
  score-derived averages sit on the same base as the counts. Nothing
  in this pass depends on the reconciliation to be honest today;
  it will just make one already-consistent path slightly more so.
- `getPassRate` itself: still exported for other callers.

## Gates

- em-dash / en-dash scan: CLEAN across all changed files
- tsc: CLEAN for changed paths (main tree's pinned typescript@5.9.3
  against apps/quiz/tsconfig.json). No errors in the files edited
  this pass.
- No hardcoded 30 anywhere in the quiz page or components (verified
  by grep).
- check:routes: N/A (no new page.tsx added)
- Full build: cannot run in this worktree (no node_modules).
  Same as SEO-2 / SEO-3 / SEO-3b precedent. Standing merge condition
  holds: full gate suite runs on main after the merge and before the
  owner's next push.
- Nothing pushed.

## Deviations

None. One commit as the mission permitted.

## Cowork's completion-metric question (mission's out-clause)

Mission C1 offered: "if you believe a completion metric carries
information TODAY, say so in the report with the query that proves it,
and change nothing."

Cowork's own measurement (max gap 0 across 399 quizzes, all plays with
non-null score) closed that door before it opened. There is no query
that would prove the cell carries information today. Removed without
reservation. If a schema change ever tracks abandoned attempts (e.g.
a `plays.abandoned_at` column, or a separate `attempts` table), the
cell should return with the new column as its source.
