# MISSION (W5 PART 1b - measure the two figures I got wrong, then relabel the window. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

PART 1 is Cowork-approved (578550f). `origin/main` is at `fab3911`; every commit from here
is one push from production. **Read-only against the database. No DDL, no writes, no push.**

## YOU CAUGHT TWO ERRORS IN MY DRAFT AND BOTH ARE MINE
You were told to ship the prose verbatim and to block rather than fix if a figure looked
wrong. You did exactly that, and both blocks are correct.

**The perfect-score line is the worse of the two, and it is my error.** The draft says one
in five attempts is perfect and 2.1% score zero. Those are dataset section G5, computed on
**all history**. The method section immediately above them explains why 70.7% of that
history is excluded. So the report excludes a period and then quotes a statistic computed on
it. It is the exact failure I have been auditing out of your work for six missions, sitting
in the one document I wrote myself.

**The catalogue range is also mine, and it is a half-fix.** v2 said 3 to 152. I spotted that
152 is `general-kpop`, the catch-all, and changed the number to 27 - and left "across the 21
groups" untouched, so the sentence now describes 20 groups and counts 21. Correcting one
half of a sentence is how you get a wrong sentence that survives review.

## PART 1 - measure them properly, on the report's own basis
Your recomputation used the live table, n=17,435, while the report cites the snapshot,
n=17,425. Ten plays, and the principle is the whole report: a figure in the report must be
reproducible from the committed dataset, not from a table that has moved.

So compute, on **exactly the basis section N used** (the same window, the same usable-play
definition, the same snapshot boundary):
  - perfect scores in window: count and share
  - zero scores in window: count and share
  - the usable in-window play count you get, stated next to N's 17,425 so any drift is
    visible rather than silent

Append to `docs/data/w5-dataset.md` as **section R**, numbers and queries, no interpretation.

## PART 2 - the window is open and that is a bug in my method section
The report's window ends 2026-08-17, which is the day it was measured. So it is still
filling: your 17,435 against the file's 17,425 is not drift, it is people playing inside a
window that has not closed. A journalist who re-runs any figure next week gets a different
one and we look like we cannot count.

Fix it as a **label, not a re-measurement**: the window is a snapshot taken at a stated
instant. Give me the exact timestamp of the section N snapshot if it is recoverable, and if
it is not, say so and use the date. Then state in section R what the closing boundary is, so
every future figure uses the same one.

Do **not** recompute the rest of the dataset to a new boundary. Ten plays do not justify
invalidating sections A through Q, and a report that keeps re-cutting itself never ships.

## PART 3 - do not touch the page or the draft
No edits to `/data/knowledge-report-2026` and none to `docs/PLAY-W5-REPORT-DRAFT.md`. I
write v4 from section R once it exists, then a later mission updates the page from v4. I am
not having the page and the draft edited from two directions at once.

## YOUR THREE DECISIONS: ALL THREE APPROVED
1. **Dataset route noindex and out of the sitemap.** Right, and for the right reason: it is
   a raw file, not a page competing for a query, and keeping it out means it can never
   become an orphan-gate or duplicate-metadata problem. Reachable is what the report
   promises and reachable is what it is.
2. **`text/markdown`, served byte-identical from the single copy in the repo.** Right. The
   SQL in the file is the offer, and reading it from the repo at build time means the page
   cannot drift from the doc.
3. **Footer placement.** Accepted. A footer link is weak, and it is where this site already
   indexes its data work; the `/data/pulse` link is the real one.

And building the page while blocking on its content was the right call, not a deviation. The
page is ready the moment the figures are settled, and it costs nothing sitting unpushed.

## STANDING RULES
- Print `pwd` before anything.
- Every number carries its query and its denominator.
- Recompute before writing any number in prose. It has now caught six assertions in this
  workstream, two of them mine.
- An incident report names locations, never values.
- No DDL, no database writes, no push.
- Proofs in `docs/proofs/w5-part1b/`.
