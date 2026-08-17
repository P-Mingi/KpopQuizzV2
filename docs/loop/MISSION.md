# MISSION (W5 PART 1c - take v4 onto the page. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

PART 1b is Cowork-approved (62733b7). `origin/main` is at `fab3911`; every commit from here
is one push from production. No DDL, no database writes, no push.

## WHAT YOU FOUND, AND WHY IT IS THE BEST CATCH OF THE WORKSTREAM
You did not just measure the two figures. You tested the boundary four ways and found that
**the timestamp we publish does not reproduce the number we publish**: section A prints the
instant truncated to the second, the newest play sits at `.619691` inside it, so a reader
copying our own timestamp with `<=` gets 17,424 and concludes our headline is off by one.

The entire pitch is "here are our figures, here are the queries, check us". A reader who
checks us and lands one short is worse than a reader who never checks. Nobody would have
found that except by reproducing our own published method as an outsider would.

The rebuild note is the other one worth keeping: **a dataset edit is not live until the app
is rebuilt**, because the route reads the markdown at build time. That property is correct
and it is now a documented trap.

## THE JOB
`docs/PLAY-W5-REPORT-DRAFT.md` is now **v4**. Take it onto
`/data/knowledge-report-2026`, replacing the v3 prose.

Same rule as PART 1, and for the same reason: **ship it verbatim.** Do not add a number, a
ranking or an example. Do not soften or shorten "What we cannot say". If a figure looks
wrong, **BLOCK and name it** - that instruction has now caught three errors, two of them
mine, and it is worth more than any speed it costs.

What changed in v4, so you know what to look for:
- the perfect and zero shares are now the window's own: 6,257 of 17,425, 35.9%, and 109 at
  0.6%, replacing the all-history 20.6% and 2.1%
- the window is described as a snapshot, with a sentence saying the exact boundary is in the
  dataset and that a boundary rounded to the second lands one attempt short
- the catalogue sentence now says 21 rows, 20 groups plus the general bucket, 3 to 27 quizzes
  per group and 152 in the bucket

## THE PART THAT IS NOT COPY-PASTE
The report now tells the reader the exact boundary is in the dataset. **Make that true.**
Section R has to be findable by someone who lands on the raw markdown and searches for it -
not buried as a line in the middle of a 55KB file with no way in. How you do that is yours;
the test is that a journalist who reads the sentence in the report can get to the value in
under a minute.

And rebuild before you verify, or you will check the served page against a stale dataset -
you documented that trap yourself this morning.

## GATES
All four, cwd printed before each. `check:orphans` unscoped. `check:metadata-dupes` must
stay at 8 with `knowledge-report` in none of them - the metadata is unchanged, so a change
there means something else moved.

## STANDING RULES
- Prove against the SERVED HTML of a production build. The numbers, the method paragraph and
  the JSON-LD all have to be in the response body.
- Recompute before writing any number in prose.
- An incident report names locations, never values.
- No DDL, no database writes, no push.
- Proofs in `docs/proofs/w5-part1c/`.
