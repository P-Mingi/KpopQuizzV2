# MISSION (W5 PART 0c - apply the two killer tests to what is left. READ-ONLY. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

PART 0b is Cowork-approved (42 commits local, nothing pushed). Verse PAUSED.
**Read-only: no writes, no DDL, no files under `apps/`.**

## OWNER RULING ON THE MAR-APR COHORT
The owner says it was a real influx of people who farmed the catalogue. That is consistent
with the tightness you measured if a small number of humans were behind many accounts,
which is what farming for a reward looks like. It does not change the conclusion: that
period is not representative and the report will be written on **May-Aug only**. It is not
being treated as fraud and it is not being deleted. Do not go looking for culprits.

## WHY THERE IS A 0c
Your two tests - standardise for difficulty, then split by period - killed the group
ladder. **The remaining sections have never been put through them, and at least one of them
is the dead finding wearing a different hat.**

Section E says 5th Gen scores 76.2% and 3rd Gen 65.2%. But 5th Gen is 4 groups and 795
plays, and those groups are the same ones that topped the raw ladder (cortis 84.6%,
babymonster 82.8%, illit 75.1%) - groups with small, mostly-easy catalogues. "Newer groups
score higher" may be "newer groups have fewer and easier quizzes", which is the ladder
finding again. It has to face the same two tests before it can carry a section, and if it
dies, it dies.

I would rather spend one more read-only mission than publish a section that dies in public.

## PART 1 - generations, standardised and split
For each generation: quizzes and their difficulty mix, plays per tier, a
difficulty-standardised score using the same combined reference mix as section H, and the
same figures computed separately for Mar-Apr and May-Aug.
Then answer directly: **does the generation gradient survive standardisation, and does it
survive the period split?** Include the per-generation group count and play count in every
table, and treat `(not recorded)` - 16,337 plays of which 15,464 are `general-kpop` - as
its own row, never folded into a gradient.

## PART 2 - the hardest and easiest quizzes, on the reporting window
Section C1 is computed over the whole history. Recompute it on **May-Aug only**, with the
50-play floor applied inside that window, and tell me how many of the 227 above-floor
quizzes still clear it. Give me the same lowest and highest lists for that window, and say
which entries appear in both C1 and the May-Aug version.

This decides whether the report's most concrete section survives losing 70.7% of the plays.
If only a handful of quizzes clear the floor in-window, say so - a "hardest quizzes" list
of six entries is a fact about our floor, not about K-pop.

## PART 3 - the girl-group finding, hardened
It is the one thing that survived both tests, so it will carry the report and it deserves
the hardest look. On May-Aug only:
  - the standardised gap with its play counts per tier
  - the same gap computed with each of the 13 gg and 12 bg groups removed one at a time,
    so we know whether one group is carrying it
  - how many groups clear the floor on each side WITHIN the May-Aug window
If a single group's removal moves the gap by more than the gap itself, the finding is one
group in a trenchcoat and I need to know that now rather than after publication.

## PART 4 - what May-Aug can actually support
A plain inventory, no interpretation: within May-Aug, how many groups clear 100 plays, how
many quizzes clear 50, how many duel matchups clear 100 votes, and the total usable plays.
This is the report's real sample and every section will be sized against it.

## OUTPUT
Append as sections K, L, M, N to `docs/data/w5-dataset.md`. Do not rewrite 0-J.
Numbers, queries, denominators. **No interpretation.** Proofs in `docs/proofs/w5-part0c/`.

## STANDING RULES
- Print `pwd` before anything.
- Every number carries its query and its denominator.
- Recompute before writing any number in prose. That rule has now caught three assertions
  in this workstream, including one you wrote into the dataset file itself.
- Where standardisation cannot be applied honestly (a row with plays in only one tier),
  say so in the row instead of printing a number that means nothing. You did this for
  le-sserafim, nmixx and bigbang in H; do it everywhere.
- No writes, no DDL, no push, no application code.
- A finding that dies under these tests is the mission working.
