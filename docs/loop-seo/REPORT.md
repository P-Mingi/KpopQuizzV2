# PLAY-SEO REPORT (SEO-3c, includes C4)

## SEO-3c: correction pass on SEO-3b + C4 patch (DONE, 2 commits)

Commit 1: `seo: SEO-3c correction pass (C1-C3)` (7b175c3)
Commit 2: `seo: C4 quiz-type-aware suppression (score-derived metrics)` (fdda5fa)

C1-C3 fixed the residual falsehood and noise left by the half-applied
R3. C4 (appended to the same mission file after commit 1 landed) fixes
a real bug found in the SQL audit: the score-derived metrics assumed
`score` is bounded by qcount, which is FALSE for `guess_from_clues`.

## Shipped + files (C1-C4)

### C1: drop the Completions cell

File: `apps/quiz/src/components/quiz/quiz-stats-block.tsx`
Also: `apps/quiz/src/app/q/[slug]/page.tsx` (call site prop removed)

`play_count === total_completions` on all 399 published quizzes (max
gap 0), and every plays row has a non-null score. In this schema a
play IS a completion. The prior "Completions" cell was noise on 396
quizzes and a false abandonment signal on the 3 drifted rows.

Cell removed. `totalCompletions` prop dropped from the component.
Inline comment records why the cell is absent.

### C2: hardcoded 30 removed + gate on same base

File: `apps/quiz/src/app/q/[slug]/page.tsx`

Before: `const scoresUnlocked = quiz.total_completions >= 30;` (a
literal 30 AND the wrong base).

After:
- imports `RANKING_UNLOCK_VOTES` from `@/lib/db/queries/duels`
- `const plays = extra.totalPlaysWithScore > 0 ? ... : quiz.play_count;`
- `const scoresUnlocked = plays >= RANKING_UNLOCK_VOTES;`
- Intro branch B boundary also uses `RANKING_UNLOCK_VOTES`.

Zero numeric literals for the threshold anywhere in the quiz page or
its components. Component also updated to gate on `playsDisplay >=
RANKING_UNLOCK_VOTES`. Gate line reads "Scores unlock at 30 plays".

### C3: pass rate from extra, dropped getPassRate call

File: `apps/quiz/src/app/q/[slug]/page.tsx`

Query-count reduced 6 to 4 (plays-related counts per render):
- `getPassRate` NOT called from this page (still exported)
- passRate now derived: `round(extra.passingPlays / extra.totalPlaysWithScore * 100)`
- `extra.passingPlays` now has a reader (was dead)
- Pass-rate denominator identical to Plays cell (mathematically)

### C4: quiz-type-aware suppression (score-derived metrics)

New file: `apps/quiz/src/lib/quiz/scoring.ts`
  `scoreIsPerQuestion(quizType)` allowlist:
    `multiple_choice` `true_false` `image` `intruder` -> true
    `guess_from_clues` -> false
    (deny-by-default: any new quiz type must opt in explicitly)

Modified: `apps/quiz/src/app/q/[slug]/page.tsx`
  imports the helper, gates the intro's:
  - `introAvg` -> null when !perQuestionScore
  - `introPerfCount` -> 0 when !perQuestionScore
  passes `quizType={quiz.quiz_type}` to `<QuizStatsBlock>`

Modified: `apps/quiz/src/components/quiz/quiz-stats-block.tsx`
  accepts `quizType: QuizType`. Gates ALL score-derived cells:
  - Average score
  - Pass rate
  - Perfect scores (counts `score === qcount`)
  - Fastest perfect (`score === qcount` filter)
  - Gate line (would tease an unlock that has no key)

Both consumers call the same predicate. One source of truth.

For guess_from_clues quizzes:
- above the gate: only Plays and Likes render, no percentage anywhere
- below the gate: same as above (gate line suppressed too)
- intro sentence has no avg-quoting arm (introAvg is null)

For per-question quiz types: unchanged behavior.

Cowork's separate data question about inflated `total_score_sum` on
some clue quizzes is orthogonal; the DISPLAY never shows a broken
percentage regardless.

## Not touched (per mission)

- JSON-LD frozen (unchanged since SEO-3).
- Migration 149, O1, O3: Cowork.
- The 3-row DB reconciliation + the clue-quiz `total_score_sum` data
  question: Cowork, under the owner SQL gate.
- `getPassRate` itself: still exported for other callers.

## Acceptance receipt

File: `docs/proofs/play-seo/seo3-acceptance/three-quiz-comparison.txt`

Now a 4-quiz comparison. For each tier, the EXACT strings the shipped
code renders:

  BIG   (multiple_choice, 2060 plays):  6 cells, branch D
        "2,060 fans have battled it (avg 53%), and 224 have scored
         perfect. Join them?"
  MID   (multiple_choice, 853 plays):   6 cells, branch C
        "853 fans have taken it, averaging 57%. Think you can beat that?"
  TINY  (multiple_choice, 5 plays):     2 cells + gate line, branch B
        gate line: "Scores unlock at 30 plays (5 so far)."
  CLUE  (guess_from_clues, 7 plays):    1-2 cells, NO gate line, branch B
        "7 players have tried it so far."
        (percentage/perfect metrics never render for this quiz type)

Includes a hypothetical UNLOCKED clue-quiz section showing that
above-gate clue quizzes also render no percentage metrics.

Query-count comparison block: 6 -> 4 per render (33% reduction).
Attribution: which queries went away and why.

C4 correctness verification block: lists the allowlist and states the
deny-by-default policy for new quiz types.

## Gates

- em-dash / en-dash scan: CLEAN across all changed files (four files)
  Commit message also verified free of dashes.
- tsc: CLEAN for changed paths (main tree's pinned typescript@5.9.3
  against apps/quiz/tsconfig.json). No errors in the files edited
  this pass.
- No hardcoded 30 anywhere in the quiz page or components (grep
  confirmed).
- check:routes: N/A (no new page.tsx added)
- Full build: cannot run in this worktree (no node_modules).
  Same precedent as SEO-2 / SEO-3 / SEO-3b. Standing merge condition
  holds: full gate suite runs on main after the merge and before the
  owner's next push.
- Nothing pushed.

## Deviations

- Two commits instead of one because C4 was appended to the mission
  file after commit 1 (C1-C3) had already landed. Splitting matches
  the natural fault-boundary too (C1-C3 are display-plumbing fixes;
  C4 is a real correctness bug in a different code path).

## Cowork's completion-metric question (mission's out-clause)

Mission C1 offered: "if you believe a completion metric carries
information TODAY, say so in the report with the query that proves it,
and change nothing."

Cowork's own measurement (max gap 0 across 399 quizzes, all plays
non-null score) closed that door before it opened. No such query
exists. Cell removed without reservation.
