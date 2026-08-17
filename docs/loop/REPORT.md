# REPORT - W5 PART 0d: the girl-group gap does not survive the format-matched test.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every run. **Read-only: no writes, no DDL, `git status --porcelain apps/` = 0.**
Nothing pushed.

Output: sections O, P, Q appended to `docs/data/w5-dataset.md`. Nothing before them
touched. Proofs: `docs/proofs/w5-part0d/`.

---

## The answer you asked for: it dies

**PART 2 kills it.** Matching quizzes by format is the only control available that does not
depend on score, and inside matched formats the gap does not point one way:

| | gg median above bg | bg median above gg |
| --- | --- | --- |
| all 7 formats | **3** | **4** |
| 6 classified formats | **3** | **3** |

And the largest gaps point in opposite directions: general-fan **+14.3** to girl groups,
photo-visual **-14.8** and timeline-era **-13.8** to boy groups. A finding that reverses
depending on whether you look at "how well do you know" quizzes or photo quizzes is not a
finding about knowledge.

**PART 1 says the same thing in a second way.** Within the `medium` label, girl-group
quizzes score higher at every floor (+9.7 / +5.6 / +4.7 pt). Within `easy`, boy-group
quizzes score higher at every floor (-4.7 / -4.7 / -3.7 pt). **The sign flips with the
label.** The +5.6 pt overall gap is the weighted result of two sub-gaps that disagree.

This is the ladder's failure mode exactly, and you named it before I measured it.

## The deeper problem, which is worth putting in the limits section

The within-label test cannot settle the question even in principle, and I want to be
precise about why rather than leave it as a caveat.

A quiz's score is **the only difficulty measure this schema has**. `quizzes.difficulty` is
an author-assigned label that section G1 already showed does not order the measured scores
monotonically. So "our boy-group medium quizzes are harder as written" and "players know
girl groups better" produce the *identical* measurement, and nothing in `plays` or
`quizzes` separates them.

That is why PART 2 was the right test and why its answer is the one that counts: format
matching is content-based, independent of score, and it says the direction is not stable.

## PART 3 - the number for the method section

Across the 21 groups being compared in May-Aug, the share of plays on `easy` quizzes:

    min 0.0%   p25 6.4%   median 18.1%   p75 52.5%   max 92.3%
    range: 92.3 percentage points

Three groups have **0.0%** easy plays (ateez, ive, le-sserafim). loona has **92.3%**.
Published quizzes across the same groups run from **3** to **152**, median 8.

The sharpest illustration is two boy groups with comparable volume: **stray-kids 70.1%
easy plays, bts 7.6%**, both above 2,500 in-window plays. They are not being measured on
the same material, and the ladder puts them 10 rank positions apart.

## What I would say the file now supports

Not my call, but you asked me to be plain rather than soft, so: after four passes the
dataset supports a report about **how uneven our own catalogue is and what that does to
naive comparisons**, and it supports the concrete hardest/easiest quiz list (76 quizzes
above floor in-window). It does not support a group ranking, a gender comparison, or a
generation gradient as claims about knowledge. Section Q is the honest headline: we can
measure what people got right, and we cannot yet compare groups fairly because we did not
write comparable quizzes.

That is a smaller report. It is also one nobody can take apart, and every limitation in it
is one we found ourselves.

## Deviations and flags (loud)

1. **A formatter bug made the first O run print `-` for every distribution.** I called
   `.length` on a stats object, so all six rows read as empty while the medians beneath
   them computed correctly. Caught on reading the output rather than the code, fixed, re-run.
   Every number in O is from the corrected run.
2. **`(unclassified)` is the joint-largest format bucket**, 14 quizzes on each side, which
   is a limit of my rule set and not of the data. I report the direction count both with
   and without it (3-4 and 3-3) because dropping it silently would have improved the
   apparent result.
3. **The format buckets are small**: 2 to 15 quizzes per side, and play counts inside a
   format are lopsided (members: 627 gg plays against 1,998 bg). The 3-3 split is a weak
   signal in absolute terms. It is still the strongest available evidence, and it does not
   support the finding.
4. **`hard` is not computable here at all**: no quiz on either side clears floors 50 or 20,
   and at floor 10 there are 2 bg quizzes and zero gg. Stated as not computable rather than
   printed.

## Covenant

Every figure counted at read time. The format rule is published in full so the buckets can
be judged rather than trusted. Where a cell could not be computed it says so. No number was
chosen after seeing which way it pointed.

## Next

No more data passes, per the mission. The file is what it is, and its four sections of
tests are the limits section writing itself.

---

STOP. **Nothing was pushed.** report pret.
