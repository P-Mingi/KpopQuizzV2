# GRAPHIFY DOCTRINE - how the graph is used, and where it is not allowed to be the answer

Owner ruling: Graphify becomes central to how we work on this project, and the reason given
is token cost. This document is the rule that makes that safe, because "central" and "cheap"
pull in opposite directions and the whole value of this loop is what happens at that seam.

Status: **GRADED** against the answer key (trial run 2026-08-17, graphify 0.9.45, 5,306
nodes / 13,177 edges over 990 files in `apps/quiz/src`). The measured range is in THE PROVEN
RANGE below and it is now the binding part of this document.

Still outstanding: nobody has read `/Users/louis/.claude/CLAUDE.md`, which `graphify install`
created and which governs every session on that machine. See THE GLOBAL CLAUDE.md.

## THE ONE RULE

**The graph is for ORIENTATION. The source is for TRUTH.**

Use the graph to find out *where to look* and *what touches what*. Read the file before you
assert, change, or report anything. The graph tells you the shape of the building; it does
not tell you what is written on the wall.

That split is what makes the token saving real instead of borrowed. The expensive part of
being wrong here is not the tokens, it is the mission that gets built on a relationship
nobody checked.

## THE PROVEN RANGE - measured, not assumed

**Trusted.** `graphify explain` and `graphify path`, for the question "what touches X, and
where". Three positive claims were checked against source and all three were right to the
line, including a transitive caller that grep would need a second pass to find, and edges
typed `imports` / `calls` / `contains` which grep cannot produce at all. On the reverse-
dependency question this was one command against roughly four.

**Never trusted: any NEGATIVE.** This is the finding that decides the doctrine. In
`sitemap.ts` the two Supabase clients are correctly modelled as distinct nodes, and **the
three actual call sites - L219, L382, L405 - are absent from the graph**, while a `calls`
edge from the same file was recorded elsewhere. So **absence in the graph is not evidence of
absence in the code.** "Nothing calls this, it is safe to delete" is exactly the question one
would want to ask a code graph, and it is the one question this graph cannot answer safely.
A negative always costs a grep before anyone acts on it.

**Not trusted, and it costs tokens rather than saving them:** the natural-language `query`.
Asked the Q1 question it returned 270 nodes truncated to 80, with the correct answer
unranked among unrelated files. Treat its output as a starting set of filenames, never as an
answer. If the goal is fewer tokens, `explain` is the cheap command and `query` is the
expensive one.

**Known and unexplained:** extraction produced 14,713 edges and 13,177 reached the graph, so
**1,536 edges - about 10% - were lost in between**. Nobody has chased this. It is consistent
with the Q2 gap and it is the first thing to investigate before anyone builds tooling on top
of the graph.

**Credit where it is due:** asked about a relationship between two database tables, it
answered "No node matching found" rather than inventing an edge. A tool that says it has no
node for something outside its model is rarer than one that answers everything, and that
result is why it earns standing use at all.

## WHERE IT SAVES REAL MONEY, AND WHERE IT SAVES NONE

Honest accounting, because "minimise tokens" needs a denominator.

**It should help:** finding every consumer of a function before changing it; answering
"what breaks if I touch this"; orienting in a part of the repo nobody has opened in months;
replacing a fan-out of greps with one query. This is mostly the WORKER's cost, on the
machine where the code is.

**It will not help at all:** REPORT.md, the dataset sections, the ledger, the missions and
the prose. That is the majority of what this loop actually spends, and no code graph touches
it. Anyone expecting the bill to halve should expect to be disappointed.

**It could cost more:** if a graph answer sends someone to the wrong place, the loop pays
for the wrong read AND the right one. That is the failure to watch for in the trial.

## WHEN THE GRAPH IS NOT ADMISSIBLE

Never as the sole basis for:

1. **Anything that must be ABSENT.** Absence is proven against the served HTML of a
   production build. A graph showing no edge is not a proof there is no edge - it is a
   proof the parser found none.
2. **Anything about DATA.** The graph parses source. `songs` and `blind_test_songs` are
   joined in the code and their id spaces are disjoint, intersection zero. No AST can know
   that. Every claim about rows, counts, coverage or relationships between records comes
   from a query, with its denominator, as it always has.
3. **Anything about RUNTIME.** Whether a route is static or dynamic, whether a `revalidate`
   export is honoured, whether a read fires twice per render - the build output and the
   served response answer these. The graph shows the call, not the schedule.
4. **A covenant or a gate result.** Gates are computed against the real artefact. A graph
   query is not a gate and must never be cited as one.
5. **Any number in a report.** Every figure stays traceable to a committed dataset with the
   query beside it. That rule cost this workstream four rounds of testing and three killed
   findings; a new tool does not get to reopen it.

## WHEN IT IS STALE, IT IS WORSE THAN NOTHING

`graphify-out/` is a build artefact of a moving codebase. A graph built before a refactor
describes a repo that no longer exists, and it will answer confidently anyway.

So: **state the graph's build time whenever an answer leans on it**, and rebuild before
relying on it after any structural change. If the build time cannot be established, the
answer does not count. This is the same discipline as the dataset snapshot boundary, and it
exists for the same reason.

## THE SKILL CONTRADICTS THIS DOCUMENT, AND THE PROJECT OVERRIDES THE SKILL

Read and quoted from the installed copy on 2026-08-17. The skill's frontmatter says a
codebase question "should be treated as a graphify query first"; its fast path says to skip
straight to `graphify query` when `graphify-out/` exists and not to check corpus size or ask
the user; and its answering section says to "answer using only what the graph output
contains".

All three contradict the binding line of this document, and they route to `query`, the one
command the trial measured as the weakest. `graphify-out/` now exists in this repo, so that
fast path is live rather than hypothetical.

**The override is in the project's own `CLAUDE.md`.** Project instructions load after the
skill description, so the repo wins. Anyone moving this doctrine to another repo has to move
that override with it.

**The two environments do not run the same skill.** The copy installed on the owner's machine
is 691+ lines with a `references/` directory and carries the instructions above. The copy
synced into Cowork is **49 lines, 2,211 bytes**, with a tamer description and **none** of the
contested phrases - grepped, zero matches. So the worker's default behaviour is shaped by
instructions that Cowork's copy does not contain, and Cowork could not have found this
conflict by reading its own copy. That asymmetry is worth remembering the next time a skill
"is installed": installed where, and in which version.

Also noted, not blocking: the skill will run `uv tool install --upgrade graphifyy -q`
unprompted if its import fails, so a skill invocation can upgrade a package without asking.
Its only network endpoints are `github.com` and a sponsorship URL; no telemetry.

## THE GLOBAL CLAUDE.md

Read in full on 2026-08-17. **It is trivial and it is gated**: 228 bytes, three lines,
firing only when the user types `/graphify`. It does not tell agents to prefer the graph over
source, runs nothing, and reaches no network. As a global file it is close to the smallest
thing the installer could have written, and it needs no override.

One honest limit: `~/.claude` is not a git repo, everything on disk is consistent with
"created", and **it cannot be proven that no prior file was deleted and replaced.** No
artefact would distinguish the two cases. Recorded as unproven rather than rounded up.

The bloom repo was untouched: no `graphify-out/`, no `.graphify/`, no `CLAUDE.md`, and
`/graphify` was never run there.

## THE HONEST POSITION

The tool may well be very good. Its own design choices are the right ones - local AST, no
API key, EXTRACTED versus INFERRED tagged rather than blended. Nothing here is scepticism
about the tool.

It is scepticism about *standing use granted before measurement*, which is the same
scepticism that killed three findings in the K-pop Knowledge Report and caught a published
timestamp that did not reproduce its own headline. The tool gets graded the way everything
else here gets graded, and if it grades well it earns the default. That is not a lower bar
than the owner asked for. It is the bar that makes "central" mean something.
