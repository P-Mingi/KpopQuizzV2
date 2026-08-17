# MISSION (W5 PART 0d - THE LAST DATA PASS. READ-ONLY. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

PART 0c is Cowork-approved. Verse PAUSED. **Read-only: no writes, no DDL, no `apps/`.**

## THIS IS THE LAST ONE, AND HERE IS WHY IT EXISTS
Four data missions is enough. I am not going to keep testing forever - at some point that
is just a way of never publishing. But there is exactly one threat left to the report's
spine that I can name precisely, and it is the same threat that killed the ladder.

The girl-group gap is standardised on `quizzes.difficulty`. Your own G1 showed that label
is author-assigned and not monotonic (`hard` scores 0.2 pt BELOW `medium`). So
standardising on it controls for the LABEL, not for difficulty. If our boy-group `medium`
quizzes are systematically harder than our girl-group `medium` quizzes, the +5.6 pt gap is
a fact about what we wrote, not about who knows more - which is precisely what "the biggest
fandoms know least" turned out to be.

Your L1 makes this worth checking rather than assuming: the May-Aug hardest list is heavy
with boy-group deep-cut quizzes (Ultimate BTS era 41.6%, Stray Kids Guess the Song 41.5%,
BTS concerts 52.3%, ENHYPEN 54.5%), though it is not exclusively so - aespa B-sides sits at
60.3%.

**If it dies, it dies, and I will write a different report.** I would rather that than
publish it and be corrected in public.

## PART 1 - the within-label test
Restrict to May-Aug, `medium` quizzes only, gg and bg groups only. Work at the QUIZ level,
not the play level, so one heavily-played quiz cannot carry it:
  - the distribution of per-quiz scores for gg medium quizzes and for bg medium quizzes:
    n, median, quartiles, min, max
  - the same for `easy`
Then answer directly: **are our boy-group medium quizzes harder as written than our
girl-group medium quizzes?** A clear difference in the per-quiz medians means the
standardisation is not controlling what it claims to control, and the gap is a
quiz-writing artefact. Similar distributions mean the finding stands on much firmer ground
than a label.

## PART 2 - matched formats, the strongest evidence available
Some quiz FORMATS exist on both sides. Your lists show the shape: "How well do you know
SKZ members?", "BTS members real names", "TWICE discography quiz", "BTS discography
challenge", "Stray Kids discography test", "SEVENTEEN true or false", "IVE true or false".

Group the May-Aug above-floor quizzes into formats by their titles - members, discography,
true-or-false, guess-the-song, timeline, deep-cuts, whatever the titles actually support.
**State the rule you used to assign each one and list the assignments**, so I can see
whether the buckets are honest rather than fitted.

Then, for every format that has quizzes on BOTH sides: gg score, bg score, quiz counts and
play counts. Does the gap point the same way inside matched formats as it does overall?
If too few formats have both sides above floor, say so - that is a real answer.

## PART 3 - one number for the method section
Per group, in May-Aug: published quizzes, plays, and the group's own share of plays that
are `easy`. I want to state in the report, with a number, how uneven the catalogue is
across the groups being compared. That unevenness is the report's main limitation and it
should be quantified rather than described.

## OUTPUT
Append as sections O, P, Q to `docs/data/w5-dataset.md`. Do not rewrite anything before it.
Numbers, queries, denominators, **no interpretation**. Proofs in `docs/proofs/w5-part0d/`.

## AFTER THIS
No more data missions for W5. I write the report from what the file says, and its limits
section will state exactly what these four passes could not control for. Anything you find
that is interesting but out of scope goes in BLOCKED.md as a candidate.

## STANDING RULES
- Print `pwd` before anything.
- Every number carries its query and its denominator.
- Recompute before writing any number in prose. Three assertions in this workstream have
  been caught that way, one of them inside the dataset file.
- A standardised number means nothing without its reference mix. Say which, every time -
  you were right to flag that +4.5 and +5.6 are the same data against different references.
- Where a cell cannot be computed honestly, say so instead of printing a number.
- No writes, no DDL, no push, no application code.
