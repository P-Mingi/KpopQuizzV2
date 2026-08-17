# REPORT - W5 PART 1b: the window now closes, and the two figures are measured on it.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every gate run. Read-only against the database: no DDL, no writes, **nothing pushed**.

Output: section **R** appended to `docs/data/w5-dataset.md`. Sections 0 through Q untouched.
Proofs: `docs/proofs/w5-part1b/`.

---

## PART 2 first, because it decides PART 1

**The snapshot instant is recoverable and exact.** Section A already recorded it as the
newest play at the time, and closing the window there reproduces section N to the row:

    where created_at >= '2026-05-01T00:00:00+00:00'
      and created_at <= '2026-08-17T12:30:50.619691+00:00'

    usable in-window plays at that boundary : 17,425
    section N published                     : 17,425
    match                                   : EXACT

**One thing I did not expect, and it matters for exactly the reason this mission exists.**
Section A prints that timestamp truncated to the second, `2026-08-17T12:30:50Z`, and the
newest play sits at `.619691` inside that second. So a journalist who copies the timestamp
we published and applies `<=` gets **17,424**, not 17,425, and concludes our headline number
is wrong by one.

| boundary | attempts | vs N |
| --- | --- | --- |
| full precision `.619691` | 17,425 | exact |
| as printed in section A | 17,424 | **-1** |
| `12:30:51Z` | 17,425 | exact |
| window left open (today) | 17,435 | +10 |

Section R states the full-precision value as canonical and says the printed one does not
reproduce. The +10 is confirmed as ten attempts played after the snapshot inside an open
window, not drift and not an error. With the edge fixed, the number stops moving.

## PART 1 - the two figures, on exactly section N's basis

Denominator **17,425**, same window, same usable-play definition from section 0c:

| | count | share |
| --- | --- | --- |
| perfect (`score = total_questions`) | **6,257** | **35.9%** |
| zero (`score = 0`) | **109** | **0.6%** |

Perfect scores are **1 in 2.78** attempts, not one in five.

For comparison, kept in R3 rather than buried: all history is 20.6% and 2.1% on 59,417
attempts. The two bases differ by **15.3 points** on perfect scores and 1.5 on zero. Section
G5 is not withdrawn; it is correct for all history, and R2 is the pair that belongs to the
report's window.

Sections A through Q were **not** recomputed, per your instruction.

## PART 3 - untouched

`git status` on both paths is empty: no edit to
`apps/quiz/src/app/data/knowledge-report-2026/` and none to `docs/PLAY-W5-REPORT-DRAFT.md`.
The page still serves v3 prose with the two wrong figures in it, which is the correct state
until you write v4.

## The thing I had to rebuild, and why it is worth knowing

The dataset route reads the markdown at **build time**, which is the property you approved
and it is the right one. It also means **appending section R did not publish it**: the
running build kept serving the 52,416-byte pre-R file while the repo held 55,653 bytes.

Rebuilt, and re-verified: the served dataset is now **byte-identical to
`docs/data/w5-dataset.md` at 55,653 bytes**, carries section R, and serves the 6,257 count
and the 35.908% precise share.

The general form: **a dataset edit is not live until the app is rebuilt.** Worth stating
because the next person to correct a figure will assume the file is the publication.

## Gates, cwd printed before each

`check:docs-secrets` **0** · `check:routes` **0** · `check:indexability` **0** ·
`check:orphans` **0** (706 non-verse URLs, complete crawl, floor 706 vs 600) ·
`check:metadata-dupes` **unchanged** at 8 collision groups with `knowledge-report` in **0**
of them. `tsc` **0**, run as a no-regression check although no application code changed.

## On the two errors

For the record, since you called them yours: the perfect-score one was catchable only by
recomputing rather than reading the figure back, and the catalogue-range one was catchable
only by counting the rows the sentence claimed. Both are the same check, and it is the check
this loop keeps proving is worth the minute it costs. The half-fix point is the sharper
lesson of the two: correcting one clause and leaving the other made a sentence that reads
as reviewed.

## Deviations and flags (loud)

1. **Section R adds a fifth basis to a file that already has several.** The dataset now
   carries all-history figures, May-Aug figures, the canonical-window figures, and per-period
   splits. R3 states plainly which pair belongs to the report so v4 cannot pick the wrong
   one, but the file is getting easy to misread and that risk grows with each pass.
2. **The canonical boundary applies to R only, by instruction.** Sections A to Q were
   measured against the open window, so a reader reproducing, say, section L exactly could
   land a play or two off. Stated in R1 rather than fixed, because recomputing them is what
   you told me not to do and ten plays do not justify it.

## Covenant

Every figure in section R carries its query, its denominator and its boundary. The
boundary was tested four ways rather than assumed, which is what found the off-by-one in our
own published timestamp.

## Next

Section R exists, so v4 can be written. The page still needs a later mission to take it.

---

STOP. **Nothing was pushed.** report pret.
