# GRAPHIFY DOCTRINE - how the graph is used, and where it is not allowed to be the answer

Owner ruling: Graphify becomes central to how we work on this project, and the reason given
is token cost. This document is the rule that makes that safe, because "central" and "cheap"
pull in opposite directions and the whole value of this loop is what happens at that seam.

Status: PROVISIONAL until the graph has been graded against the answer key in the trial
mission. Nothing below is licence to skip that.

## THE ONE RULE

**The graph is for ORIENTATION. The source is for TRUTH.**

Use the graph to find out *where to look* and *what touches what*. Read the file before you
assert, change, or report anything. The graph tells you the shape of the building; it does
not tell you what is written on the wall.

That split is what makes the token saving real instead of borrowed. The expensive part of
being wrong here is not the tokens, it is the mission that gets built on a relationship
nobody checked.

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

## THE GLOBAL CLAUDE.md

`graphify install` created `/Users/louis/.claude/CLAUDE.md`, a standing instruction file
that applies to **every** Claude session on this machine, including the worker in this repo
and the worker in the nuri/bloom repo that shares this bus convention.

We have not read it. Until we have, nothing in this doctrine is final, because a third-party
file now sits upstream of every mission and we do not know what it says. Reading it is PART
0 of the trial mission, and if anything in it conflicts with the rules above, the rules
above win and the conflict gets written down rather than silently resolved.

## THE HONEST POSITION

The tool may well be very good. Its own design choices are the right ones - local AST, no
API key, EXTRACTED versus INFERRED tagged rather than blended. Nothing here is scepticism
about the tool.

It is scepticism about *standing use granted before measurement*, which is the same
scepticism that killed three findings in the K-pop Knowledge Report and caught a published
timestamp that did not reproduce its own headline. The tool gets graded the way everything
else here gets graded, and if it grades well it earns the default. That is not a lower bar
than the owner asked for. It is the bar that makes "central" mean something.
