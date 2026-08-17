# MISSION (W5 PART 0b - can the headline survive? READ-ONLY. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

PART 0 is Cowork-approved (177a4e9). 41 commits local, nothing pushed. Verse PAUSED.
**Read-only again: no writes, no DDL, no files under `apps/` changed.**

## WHY THERE IS A PART 0b
Your D1 is the best thing in the dataset: you saw that a pooled gap can have the opposite
sign to the controlled one, and you controlled it. **Section B has the same defect and
nobody controlled it, me included when I wrote the questions.**

The ladder says bts is LAST at 62.8% on 9,169 plays, and plays correlate negatively with
score (r = -0.242). That reads as "the biggest fandoms know the least", which is exactly
the headline this report wants - which is exactly why it has to be attacked before it is
believed. Your own C1 shows all 15 highest-scoring quizzes are labelled `easy` and 13 of
the 15 lowest are `medium`. So a group's score may be mostly a function of the difficulty
mix somebody wrote for that group. bts and blackpink have deep catalogues with deep-cut
quizzes; cortis (84.6%, 582 plays) and babymonster (82.8%, 263) have few.

If that is what is happening, the finding is not "ARMY knows less", it is "we wrote harder
quizzes about BTS", and publishing the first version is how this report dies in public.

Everything below is a test that can KILL a finding. That is the point. A killed finding is
a good outcome of this mission, not a failure of it.

## PART 1 - standardise the group ladder
Redo section B the way you did D1. For each of the 27 groups above floor, give me:
  - quizzes published about it, and its difficulty mix (easy / medium / hard counts)
  - plays per difficulty tier and the score in each
  - a difficulty-standardised score, using the combined mix across all groups as the
    reference, so every group is scored as if it faced the same mix
Then the two ladders side by side, raw and standardised, and the rank change per group.
And recompute the plays-vs-score correlation on the STANDARDISED scores.

If the negative correlation survives standardisation, say so plainly: that is a real
finding and it becomes the report's spine. If it collapses, say that just as plainly.
Do not soften either result.

## PART 2 - split everything by regime
Mar+Apr is 63.2% on 41,982 plays, May-Aug is 75.9% on 17,425, a 12.7 point step at a month
boundary, with plays collapsing 24,122 -> 3,281 at the same instant. A 7x traffic drop and
a 12.7 point score jump at the same moment is a change in WHO played or WHAT was played,
not fans getting smarter.

Rerun the headline breakdowns SEPARATELY for Mar-Apr and for May-Aug:
  - the group ladder (raw and standardised), and whether the ranking holds
  - the plays-vs-score correlation, within each period
  - the gg/bg comparison, raw and standardised
  - the difficulty mix of what was played, and the mix of what was PUBLISHED, per period
Then answer one question directly: **does the story change depending on which period you
use?** If it does, the report will be written on one period only and it needs to be the
defensible one.

## PART 3 - what changed between April and May, from the data alone
Do not speculate about marketing; look for what the rows can show. Candidates worth
checking, and add any you find: quizzes published per month and their difficulty mix; the
share of plays going to easy quizzes per month; plays per distinct player per month;
signed-in share per month; the perfect-score and zero-score share per month; quiz length
mix per month; whether the Mar-Apr volume concentrates on a handful of quizzes or spreads.

A zero-score or perfect-score share that moves sharply, or volume concentrated on very few
quizzes, would point at non-human or campaign traffic. Say what the evidence supports and
no more. "The data cannot distinguish these two explanations" is an acceptable answer and
a better one than a guess.

## PART 4 - two small ones
1. `docs/PLAY-W5-REPORT-PLAN.md` is untracked and ignored by `.gitignore:68`. It is the
   contract this workstream is written against and it lives on one disk. Add it to the
   allowlist the same way you added `docs/data/`. If you think it should stay out, say why
   and leave it.
2. In section B4 you list 10 below-floor groups. Give me their quiz counts too - I want to
   know whether the below-floor groups are new, or old and ignored. It changes what the
   report can say about coverage.

## OUTPUT
Append to `docs/data/w5-dataset.md` as sections H, I, J - do not rewrite the existing
sections, they are approved and the report will cite them. Numbers, queries, denominators.
**No interpretation.** Proofs in `docs/proofs/w5-part0b/`.

## STANDING RULES
- Print `pwd` before anything.
- Every number carries its query and its denominator.
- Recompute before writing a number in prose. That rule has caught its target twice now.
- Read the schema, do not assume it. Report any column whose meaning you had to guess.
- No writes, no DDL, no push, no application code.
- If a finding dies under one of these tests, that is the mission working.
