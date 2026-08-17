# REPORT - W5 PART 0c: the girl-group finding is solid, generations is thin, the quiz list shrinks by two thirds.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every run. **Read-only: no writes, no DDL, `git status --porcelain apps/` = 0.**
Nothing pushed.

Output: sections K, L, M, N appended to `docs/data/w5-dataset.md`. Sections 0-J untouched.
Proofs: `docs/proofs/w5-part0c/`.

---

## PART 1 - generations: survives the difficulty test, cannot take the period test

**Your suspicion was half right, and the half that is wrong matters.**

Standardising does **not** kill it. Every generation moves by at most 1.2 points (2nd 1.0,
3rd 1.1, 4th 0.9, 5th 0.7, not-recorded 1.2) and the ordering is unchanged. So 5th Gen's
76.9% is not an artefact of easy catalogues, which is what you expected it to be.

The period test cannot be run at all: **5th Gen has zero plays before 2026-05-01.** Its
entire contribution comes from May-Aug, so there is no second period to check it against.
That is not a pass and not a fail; the test does not apply.

What is left, on May-Aug only and above floor: 3rd **71.8%**, 4th **72.9%**, 5th **76.9%**.
A 5.1 point rise. Two things sit against publishing it as a gradient:

1. **2nd Gen is the highest-scoring generation in that window at 83.4%**, on **85 plays**
   across 2 groups. It is below the 100-play floor, so it is listed and not ranked, but a
   "newer generations know more" line has an older generation sitting on top of it and the
   only reason it is not in the ranking is our own floor.
2. **5th Gen is 12 quizzes across 4 groups**, with no `hard` quiz at all. In Mar+Apr the
   three generations that do have plays are within 1.1 standardised points of each other.

My read: it is a real 5.1 point difference in one window, not a gradient across five
generations, and it cannot carry a section on its own.

## PART 2 - the concrete section survives, at a third of its size

| | quizzes above the 50-play floor |
| --- | --- |
| all history (C1) | 227 |
| **May-Aug only** | **76** |

Losing 70.7% of the plays costs **66.5% of the qualifying quizzes**. 76 is not "a handful",
so the section is publishable, but the entries largely change: **9 of the 15 lowest and 11
of the 15 highest are different** from C1.

Six survive in the lowest list, including the one with real volume: "Ultimate BTS era quiz"
at **41.6% on 781 in-window plays**, harder in this window than in the pooled data (53.1%).
"BLACKPINK world records and achievements" is the new hardest at 40.0% on 71 plays.

## PART 3 - the girl-group gap is not one group in a trenchcoat

On May-Aug, standardised to section H's reference mix: **gg 76.5%, bg 70.9%, gap +5.6 pt**
(4,194 vs 9,651 plays).

The leave-one-out ran 32 times, once per group:

| test | result |
| --- | --- |
| any single removal moving the gap by more than the gap itself | **NO** |
| gap stays positive in all 32 runs | **YES** |
| range across all 32 runs | **3.8 to 7.6 pt** |

Largest movers are blackpink (+2.0, removing it *widens* the gap) and enhypen (-1.8).
Removing **stray-kids, the largest single contributor at 3,556 plays, moves the gap by
0.0 points**. Twelve gg groups and eight bg groups clear 100 plays inside the window.

The mechanism is visible in the tiers and the report should state it rather than hide it:
boy groups score **higher** on easy quizzes (85.5% vs 83.2%) and **lower** on medium ones
(66.8% vs 74.6%), and 44.6% of bg plays are easy against 17.9% of gg plays. The gap is a
medium-difficulty gap.

## PART 4 - the real sample

| | count |
| --- | --- |
| usable plays | **17,425** |
| groups clearing 100 plays | **21** |
| quizzes clearing 50 plays | **76** |
| duel matchups clearing 100 votes | **62** |

**One piece of good news I did not expect: every duel vote in the database is inside the
window.** Oldest 2026-06-11, newest 2026-08-17, zero before 2026-05-01. Section F loses
nothing to the period decision, so the 60,364 votes and 891 voters stand exactly as
written, with the same colour-only caveat.

## Deviations and flags (loud)

1. **The standardised numbers in K-N are not comparable with I1/I2/I4.** You asked for
   section H's reference mix and I used it throughout, but I4 standardised each period
   against its own mix. Same data, different reference, different number: the May-Aug
   girl-group gap is **+4.5 pt** under I4's reference and **+5.6 pt** under H's. Neither is
   wrong; a standardised score means nothing without its reference, and both are now stated
   next to their numbers. If the report quotes one, it must quote which.
2. **I wrote "less than 1.2 points" and the largest move is exactly 1.2.** Recomputed and
   replaced with "at most 1.2" plus the five per-generation moves, so the claim matches the
   table above it.
3. **The `hard` tier is unusable everywhere it appears here.** 22 gg plays and 30 bg plays
   in M1, 13 to 37 plays per generation in K. It is carried in the standardisation because
   the reference mix contains it, and it is 0.8% of the reference. Flagged rather than
   dropped, because dropping it silently would change every number in K and M.
4. **K3's 2nd Gen row is below floor and I put it in the table anyway**, labelled, because
   omitting the one row that contradicts a gradient would be the more dishonest choice.

## Covenant

Every figure counted from `plays` at read time, against a stated reference mix. Rows that
cannot be standardised say so instead of printing a number (K2's 2nd Gen, "medium only").
Below-floor rows are labelled where shown. Nothing rounded to flatter.

## Next

Three findings, in the order the evidence supports them: the girl-group gap survives every
test applied to it; the quiz list survives at a third of its size with mostly different
entries; generations is a one-window 5.1 point difference on 12 quizzes and should be a
paragraph rather than a section.

---

STOP. **Nothing was pushed.** report pret.
