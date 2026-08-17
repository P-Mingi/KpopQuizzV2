# REPORT - W5 PART 0b: the headline does not survive. Two findings killed, one strengthened.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every run. **Read-only: no writes, no DDL, `git status --porcelain apps/` = 0.**
Nothing pushed.

Output: sections H, I, J appended to `docs/data/w5-dataset.md`. Sections 0-G untouched.
Proofs: `docs/proofs/w5-part0b/`.

---

## The short version

**"The biggest fandoms know the least" is dead.** Not weakened, dead as a stable claim.
Standardising for difficulty removes 41.7% of the correlation's magnitude (-0.242 to
-0.141), and 49.2% excluding general-kpop. That alone would have left a real if smaller
finding. What kills it is the regime split:

    Mar+Apr  plays-vs-score correlation, standardised:  +0.199   (POSITIVE)
    May-Aug  plays-vs-score correlation, standardised:  -0.267   (NEGATIVE)

The correlation **changes sign** depending on which period you use. And the ladder itself
is not stable: across the 17 groups above floor in both periods, the Spearman rank
correlation of the standardised ladders is **rho = -0.474**. The two periods rank the
groups in close to opposite order. There is no "knowledge ladder" to publish; there are
two different ladders that disagree with each other.

You asked me not to soften either result. It collapses.

**The girl-group finding survives and gets stronger.** Standardised, the gap favours girl
groups in both periods independently: **+3.4 pt in Mar+Apr and +4.5 pt in May-Aug**, within
1.1 points of each other, while the raw gap changes sign between them (-0.4 then +2.0).
That is the one comparison in the dataset that holds up under both tests.

## PART 3 answered directly: what changed in May

The change is in **who played**, and the Mar+Apr cohort does not look like people.

| | Mar+Apr | May-Aug |
| --- | --- | --- |
| signed-in share of all plays | 51.6% | 7.1% |
| distinct signed-in accounts | 56 | 87 |
| median plays per account | **249** | **6** |
| accounts with >= 100 plays | **54 of 56** | **1 of 87** |
| median seconds per play | 95 | 34 |

Then the part that settles it. The ten heaviest Mar+Apr accounts:

    plays          642 - 674     (5.0% spread)
    score        60.1 - 62.5%    (2.4 points)
    median time    99 - 103 s    (4 seconds)
    plays/quiz    4.0 - 4.4

Ten separate accounts agreeing to within 2.4 points of score and 4 seconds of median play
time while each playing 640-674 times. Across all 56: **50 score within 58-65%** and **52
have a median time within 90-115 seconds**. The May-Aug control behaves like people: score
interquartile spread **24.1 points against 1.9**, median 6 plays per account against 249.

And it is **not just the heavy accounts**: removing the top ten moves the period by 0.4
points, and the 20,332 anonymous Mar+Apr plays score 64.7%, 10.7 points below the May-Aug
anonymous figure. The whole period is the anomaly, not a few users inside it.

**What the data cannot distinguish**, stated because you asked for that answer when it is
the true one: seeded data, automated play, or a real campaign that drove a small cohort to
grind the catalogue. `plays` records no source, IP, user agent or session, so no row in it
can separate those three. I did not investigate whether those 56 accounts exist in
`profiles` with distinguishing metadata; that is a read the mission did not authorise and
it is the obvious next step if you want the answer.

**Recommendation, and it follows from the numbers rather than from taste:** write the
report on **May-Aug only**, 17,425 plays. It costs 70.7% of the volume and buys a dataset
whose account behaviour is not uniform. Quoting the 59,407 figure means quoting a number
70.7% composed of traffic that behaves like this.

## What is now in the file

H: the standardised ladder, all 27 groups, raw vs standardised with the rank move and the
tiers each row could be standardised over. I: both periods, each with its own ladder,
correlation and gg/bg comparison, plus the rank-stability table. J: eleven diagnostics for
the April/May boundary, ending with what the evidence supports and what it cannot.

Also in H, flagged rather than buried: **loona's -24 rank move is a renormalisation
artefact**, not a measurement. 146 of its 158 plays are easy and 12 are medium;
standardising to a 77.5%-medium mix reweights those 12 plays until they set the score.
Three groups (le-sserafim, nmixx, bigbang) have medium plays only, so their standardised
score equals their raw one by construction and is evidence for nothing.

## PART 4

1. **`docs/PLAY-W5-REPORT-PLAN.md` is now tracked.** Added to the `.gitignore` allowlist
   beside `docs/PLAY-SEO.md`. It is the contract this workstream is written against and it
   was living on one disk. Verified with `git status`, not with `git check-ignore`, which
   prints the matching rule for a negation too and reads as "still ignored".
2. **Below-floor groups with quiz counts:** section J11. Seven of the ten were first
   published in June or July 2026; three (akmu, mamamoo, astro) date from March and April.
   Nine of the ten have 1-4 published quizzes.

## Deviations and flags (loud)

1. **I wrote a false note into the file and caught it before commit.** J11 originally said
   the difficulty mixes "do not always sum to the quiz count" and named three groups.
   Checked: **all ten rows sum correctly**. It was an assertion I never computed, in the
   same section as the numbers that disprove it. Corrected, and worth stating plainly
   because it is the third time this failure mode has appeared in this workstream.
2. **Two hedges replaced with the arithmetic.** "Roughly half" of the correlation is 41.7%
   and 49.2%; "roughly triples" is 2.99x. Both were describing numbers printed beside them.
3. **The standardisation is only as good as the difficulty labels**, and section G1 already
   showed those labels are author-assigned and not monotonic (hard scores 0.2 pt below
   medium). Every standardised figure in H and I inherits that.

## Covenant

Every figure counted from `plays` at read time. Below-floor rows listed, never ranked.
Where standardisation could not be applied honestly the row says so. The one question the
data cannot answer is written as unanswerable rather than guessed.

## Next

The report's spine has to change. The ladder cannot carry it, the girl-group comparison
can, and the period decision comes before any writing.

---

STOP. **Nothing was pushed.** report pret.
