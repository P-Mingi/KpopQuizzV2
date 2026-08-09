# PLAY-SEO REPORT (SEO-3b)

## SEO-3b: correction pass on SEO-3 (DONE, 1 commit)

Commit: `seo: SEO-3b correction pass (R1-R5)` (50c2a07)
Scope: rewrite the covenant-violating R0 receipt with real Cowork
numbers, implement three owner rulings (R1 R2 R3), fix two defects
(R4), and reword one editorialising line (R5). No new features.

## Shipped + files

### R0: acceptance receipt rewritten with real values

File: `docs/proofs/play-seo/seo3-acceptance/three-quiz-comparison.txt`
(fully rewritten, 154 lines vs 132)

The prior receipt printed illustrative values with "(real)" labels.
That was called out as a covenant failure and is now corrected:
- explicit note at the top acknowledging the previous failure
- every number is from Cowork's production read
- each of BIG / MID / TINY includes:
  - preconditions (which flags / branches the code enters)
  - the EXACT intro sentence the shipped code produces
  - the EXACT stats-block cells the shipped code renders
  - the gate line for TINY (below-threshold path)
- anti-thin bar mapping preserved

Test cases and rendered strings:

BIG - ultimate-bts-era-quiz-only-real-armys-survive
  intro branch D fires; sentence quotes 2,060 (plays-table count).
  7 stats cells, ranking-ish trio visible (avg 53%, pass 32%,
  fastest 18s), no caption, no gate.

MID - enhypen-world-ultimate-fan-challenge
  intro branch C fires; sentence quotes 853.
  7 stats cells, ranking-ish trio visible (avg 57%, pass 36%,
  fastest 41s).

TINY - girls-generation-the-legend-quiz
  intro branch B fires; average NEVER quoted (introAvg is gated
  by scoresUnlocked). 3 stats cells (Plays 5, Completions 5,
  Perfect scores 2), plus gate line
  "Scores unlock at 30 completions (5 so far)."

### R1: owner ruling recorded

File: `docs/proofs/play-seo/seo3-step2/questions-crawlable.txt`
(the "FLAG FOR OWNER" paragraph replaced with a CLOSED ruling block).
No code change per the ruling.

### R2: threshold-30 gates, does not caption

File: `apps/quiz/src/components/quiz/quiz-stats-block.tsx` (rewritten)

Before: ranking-ish cells rendered with an "early results" hint below
30 completions. Consequence in prod: TINY would print
"Average score 92% · Pass rate 100%" off 5 completions.

After: below 30, Average score / Pass rate / Fastest perfect are
HIDDEN. Only counts render (Plays, Completions, Perfect scores,
Likes). One honest gate line appears below the cells:
"Scores unlock at 30 completions (N so far)." - itself a
unique-per-quiz string because N differs per quiz.

At >= 30, ranking-ish cells render with NO caption.

Local `RANKING_UNLOCK = 30` deleted. Imports `RANKING_UNLOCK_VOTES`
from `@/lib/db/queries/duels`, the shared source of truth.

Intro also gated: `introAvg` is now null when scoresUnlocked=false,
so branch B / branch A never quote the average in prose either.

File: `apps/quiz/src/styles/globals.css`
`.quiz-stats-hint` (unused) removed; `.quiz-stats-gate` added.

### R3: plays table is the source of truth

File: `apps/quiz/src/app/q/[slug]/page.tsx`
File: `apps/quiz/src/components/quiz/quiz-stats-block.tsx`

Both the intro sentence's play count AND the stats block's "Plays"
cell now prefer `extra.totalPlaysWithScore` when > 0, falling back to
`quiz.play_count` when the extra query was skipped (zero-play quiz)
or degraded.

Verified: BIG's page will now say "2,060 fans have battled it" (matches
the pass-rate denominator) instead of the prior "1,880 fans" beside a
pass rate computed over 2,060 rows.

Row reconciliation of the 3 disagreeing quizzes stays with Cowork
under the owner SQL gate, per mission.

### R4: two defects fixed

File: `apps/quiz/src/lib/db/queries/plays.ts`

Defect 1 - silent failures. Every one of the four sub-queries inside
`getQuizExtraStats` now checks `.error` and throws with a descriptive
message. `safeFetch` catches, logs, and falls back to zeros - matching
`getPassRate`'s existing policy. No more "the query broke, we quietly
read 0".

Defect 2 - comment drift. `QuizExtraStats.fastestTimeSeconds` said
"fastest COMPLETED play (any score)" while the query filters
`score = totalQuestions`. UI label "Fastest perfect" was correct;
comment now matches: "Fastest perfect run: MIN(time_taken_seconds)
among plays where score === total_questions."

### R5: intro copy reworded

File: `apps/quiz/src/app/q/[slug]/page.tsx` (intro branch D)

"...and only 224 have scored perfect. Join them?" -> "...and 224 have
scored perfect. Join them?"

224 of 2,060 is ~11%; "only" editorialises a number that is not rare.
Removed. Every other branch is unchanged.

## Not in scope (Cowork carries)

- JSON-LD is FROZEN as shipped (Google deprecated Quiz + FAQ rich
  results in January 2026; markup kept for crawler / AI answer-engine
  clarity). Confirmed no change here.
- Migration 149 (trivia table), O1, O3.
- The 3-row counter reconciliation.

## Gates

- em-dash / en-dash scan: CLEAN across all changed files (six files)
- tsc: CLEAN for changed paths (main tree's pinned typescript@5.9.3
  against apps/quiz/tsconfig.json; the worktree has no node_modules,
  so the noise of "cannot find module 'next'" errors is filtered out).
  No real errors in the files edited this pass.
- check:routes: N/A (no new page.tsx added)
- Full build: cannot run in this worktree (no node_modules).
  Same as SEO-2 / SEO-3 precedent. The standing merge condition holds:
  the full gate suite runs on main after the merge and before the
  owner's next push.
- Nothing pushed.

## Deviations

None. One commit as the mission permitted.

## Deferred (per mission)

Nothing new. All non-scope items are already carried by Cowork.
