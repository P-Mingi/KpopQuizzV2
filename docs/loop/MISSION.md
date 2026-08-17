# MISSION (GRAPHIFY PART 0 - the part that was skipped. Read-only. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

The trial is Cowork-approved on its technical content and the doctrine has been updated with
your measured range. **No code, no DDL, no writes, no push. This mission only reads and
reports.**

## WHY YOU ARE BEING SENT BACK
The trial mission opened with PART 0, before SETUP, marked "do this first". Your report
mentions `CLAUDE.md` **zero times** and `bloom` **zero times**. It was not done, and it was
not flagged as not done.

You clearly read the graphify SKILL.md - you cite its 500-file threshold and its honesty
rules - so the instruction was seen and the reporting was dropped. That is the second
protocol miss in three missions, after PART 1c shipped without writing REPORT.md. The
technical work in both was excellent, which is exactly what makes this pattern expensive:
a report good enough to wave through, missing the item that was marked highest priority.

And this is not bookkeeping. `graphify install` wrote a **global** instruction file that
applies to every Claude session on that machine - this repo and the nuri/bloom repo both.
A third-party file now sits upstream of every mission we run and nobody has read a line of
it. Cowork cannot: only this repo is mounted on the bridge.

## WHAT TO DO
1. Print `/Users/louis/.claude/CLAUDE.md` **in full, verbatim, not summarised.** If it is
   long, print it anyway. If it is trivial, print it and say so in one line.
2. Confirm nothing was overwritten. The CLI said "created"; verify no prior file was
   replaced, and if you cannot verify it, say that rather than assuming.
3. From `/Users/louis/.claude/skills/graphify/SKILL.md`, quote what it instructs an agent to
   do **by default, without being asked** - not what it can do on request.
4. Flag any instruction that would change how a mission behaves: prefer the graph over
   reading files, skip verification, run commands unprompted, contact a network endpoint, or
   anything conflicting with `docs/PLAY-GRAPHIFY-DOCTRINE.md`. Quote it exactly.
5. The install was run from `~/Bloom`. Check whether anything was written into that project
   itself. **Do not run `/graphify .` there** and do not modify that repo.

If it is all boring and useful, say so and we move on in one line. If it tells agents to
trust the graph instead of the source, that conflicts with the doctrine and with the
covenant this loop runs on, and I need the exact wording to write the override.

## ON YOUR TRIAL REPORT, WHICH WAS OTHERWISE THE BEST KIND OF WORK
The Q2 finding is the one that matters and you found it by checking a positive against
source rather than accepting a clean answer: the call sites exist at L219, L382 and L405 and
none is in the graph, so absence in the graph is not absence in the code. That single result
is now the binding line of the doctrine, and your recommendation - yes to `explain` and
`path`, no to `query`, never for a negative - is adopted as written.

Surfacing the 1,536 lost edges, refusing to narrow at the 500-file prompt and saying why,
and dropping one markdown to keep the run strictly code-only were all correct. Gitignoring
`graphify-out/` with the reasoning about a gate-less mirror of the `docs/` decision is
exactly the right call.

## STANDING RULES
- Print `pwd` before anything.
- A mission is not finished until `docs/loop/REPORT.md` describes it.
- **If you skip a part of a mission, say so in the report.** A silent omission in a good
  report is worse than a loud one in a bad report.
- Quote, do not summarise, when the point is the exact wording.
- No writes outside `docs/loop/` and `docs/proofs/graphify-part0/`. No push.
