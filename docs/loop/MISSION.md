# MISSION (W5 PART 0 - produce the dataset. NO code changes. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W7 arc closed at 6a745ba, Cowork-approved. Verse PAUSED. 40 commits local, nothing pushed.

## WHAT THIS IS
W5 is the K-pop Knowledge Report: original data, published, pitched, to earn real links.
It is the only lever we have on Domain Rating 1/100 that is not a link scheme. The plan,
the angle and the honesty rules are in `docs/PLAY-W5-REPORT-PLAN.md` - **read it first**,
because it decides what counts as a usable number.

Cowork writes the report. Cowork cannot reach the database: Supabase MCP has refused with
"You do not have permission" since W8. So this mission exists for one reason: **every
number the report ships must exist in a committed file, derived by you, traceable.** A
figure that is not in `docs/data/w5-dataset.md` will not appear in the report.

**This is a READ-ONLY mission.** No migration, no DDL, no app code, no schema change, no
write of any kind to the database. If a question needs a write to answer, it does not get
answered.

## THE RULE THAT MATTERS MOST
I am giving you QUESTIONS, not SQL. I cannot verify the schema from here, so any SQL I
wrote would be invented column names dressed up as instructions. **Read the real schema
first, write the query it supports, and print the query next to its result.** If a question
cannot be answered by the schema as it stands, write "NOT ANSWERABLE" and why. That is a
useful answer. A plausible number derived from a column that means something else is not.

## THE OUTPUT: docs/data/w5-dataset.md
Numbers and the query that produced each one. **No prose, no interpretation, no
conclusions** - interpretation is my job and mixing them is how a report ends up asserting
what its data does not support. Every table states its denominator and its date window.

## THE FLOOR, DECIDED BEFORE THE NUMBERS
Set a minimum sample per row (per group, per quiz, per question) BEFORE you look at any
result, state it at the top of the file with your reasoning, and apply it everywhere.
Anything under it is listed separately as "below floor", never mixed into a ranking. The
top of a leaderboard is exactly where a tiny sample hides, and that is what gets a report
taken apart in public.

## THE QUESTIONS

**A. Scope.** How many plays, over how many published quizzes, how many groups, over what
date range. The oldest and newest play. How many plays are from signed-in players vs
anonymous. This is the report's method section, so it must be exact.

**B. The knowledge ladder.** Average score per group, as a percentage, with the play count
behind each. Both directions: the best-scoring groups and the worst, above the floor. Then
the question I actually care about: **do the most-played groups score better, or just play
more?** Give me the ranking by plays next to the ranking by score.

**C. Hardest and easiest.** The lowest-scoring and highest-scoring quizzes above the floor,
with their play counts. Then, if the schema stores per-question results, the same at
question level: the questions most people get wrong, with the number of attempts. Question
level is the most quotable section of the report, so if it is not answerable, say so
clearly rather than approximating from quiz-level data.

**D. Girl groups vs boy groups.** Average score and play count for each, AND the numbers a
fair comparison needs: how many quizzes on each side, and whether the difficulty mix is
comparable. If we cannot control for difficulty, say so - a raw gap on unmatched quiz sets
is a selection artefact and it will not ship.

**E. Generations.** Average score and play count by generation, if generation is real data
on groups rather than something we infer.

**F. Duel votes, colour only.** Total votes, distinct voters, votes per voter, and the most
lopsided and most contested matchups above the floor. Flagged in the file as **COLOUR
ONLY**: roughly 870 self-selected voters cannot carry a headline.

**G. Anything you find that I did not ask for.** You are the one who will see the shape of
this data. If something is more interesting than the six questions above, put it in a
clearly marked section at the end with its numbers. Do not leave it out because it was not
on the list.

## STANDING RULES
- Print `pwd` before anything.
- Every number in the file carries the query that produced it and its denominator.
- Read the schema, do not assume it. Report any column whose meaning you had to guess.
- No DDL, no writes, no push. This mission changes no application code at all.
- If a query is expensive, say how expensive rather than silently sampling. If you sample,
  the file says SAMPLED and states the size.
- Proofs / raw output in `docs/proofs/w5-part0/`, committed.
