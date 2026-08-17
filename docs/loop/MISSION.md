# MISSION (GRAPHIFY TRIAL - grade a new tool against facts we already proved. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W5 PART 1c is Cowork-approved (c12222e). 3 commits local, nothing pushed. Verse PAUSED.
**No application code, no DDL, no database writes, no push.**

## READ FIRST
`docs/PLAY-GRAPHIFY-DOCTRINE.md` - the rule the owner asked for, written before the
trial rather than after it. One line of it governs everything below: **the graph is for
orientation, the source is for truth.**

## WHY THIS EXISTS
The owner installed Graphify and wants it used as a standing tool. Standing use is the
heaviest thing this project grants: we have given "always" to exactly three gates, and each
one we proved red and then green before believing it. A tool that answers architecture
questions gets the same treatment, because the failure mode of a code-graph tool is not
crashing - it is confidently returning an edge that does not exist, which is the most
expensive kind of wrong for something we would then trust by default.

We are in an unusually good position to test it. This session established hard facts about
this codebase by measurement, not by reading. Those are the answer key.

## PART 0 - READ WHAT GRAPHIFY WROTE INTO EVERY SESSION (do this first)
`graphify install` printed `CLAUDE.md -> created at /Users/louis/.claude/CLAUDE.md`. That is
a **global** instruction file: it applies to every Claude session on this machine, this repo
and the nuri/bloom repo both. A third-party tool now sits upstream of every mission we run,
and neither the owner nor I have read a line of it. Cowork cannot: only this repo is mounted
on the bridge, `~/.claude` is not.

So, before anything else:
- Print `/Users/louis/.claude/CLAUDE.md` **in full** in your report. Verbatim, not summarised.
- Say whether it existed before (the CLI said "created", so presumably not - confirm nothing
  was overwritten).
- Read `/Users/louis/.claude/skills/graphify/SKILL.md` and say what it instructs an agent to
  do BY DEFAULT, without being asked.
- Flag anything that would change how a mission behaves: instructions to prefer the graph
  over reading files, to skip verification, to run commands, to phone home, or anything that
  conflicts with `docs/PLAY-GRAPHIFY-DOCTRINE.md`.

If it is boring and useful, say so and move on. If it tells agents to trust the graph
instead of the source, that is a direct conflict with the doctrine and with the covenant
this loop runs on, and I need the exact wording.

**Also note:** the install was run from `~/Bloom`, not from this repo. Check whether
anything was written into the nuri/bloom project itself, and do NOT run `/graphify .` from
there - graphing the wrong repo is the same class of mistake as the worker that was once
launched in the wrong project.

## SETUP
Build the graph **code-only, keyless**, as the skill describes. Do not point it at `docs/`
on this run: we found personal addresses and Supabase org labels in tracked docs two days
ago, and a first run is not the moment to widen the input.

`graphify-out/` is a build artefact. Decide whether it belongs in `.gitignore` and say why;
if you track it, say what stops it from rotting into a stale graph nobody notices. Given
we just inverted `docs/` to track-by-default, be explicit rather than letting the new
directory land by accident either way.

## THE ANSWER KEY - grade it, do not describe it
For each question below: ask the graph, record what it returns, then mark it **RIGHT**,
**WRONG**, or **MISSING**. Where it distinguishes EXTRACTED from INFERRED, record which,
because that distinction is the tool's own central claim and it is where it will fail first.

1. **The blind test playlist definition.** `src/lib/blind-test-playlists.ts` exports
   `getAdvertisablePlaylists`, and exactly three surfaces read it: the sitemap, the
   `/blindtest` index page, and the picker via `getBlindtestGroups`. Does the graph find all
   three consumers, and does it find that `getBlindtestGroups` is a delegating wrapper
   rather than an independent rule?
2. **The two Supabase clients in one file.** `src/app/sitemap.ts` calls
   `createPublicReadClient` at two sites and `createServiceRoleClient` at one. Does the
   graph separate them, or does it collapse them into "sitemap uses supabase"?
3. **The duplicated read.** Before the `cache()` fix, `/blindtest/page.tsx` reached
   `getAdvertisablePlaylists` twice in one `Promise.all`, once directly and once through
   `getBlindtestGroups`. Can the graph show that two paths from one page reach one function?
4. **A relationship that is NOT in the code.** `songs` and `blind_test_songs` have
   completely disjoint id spaces - 4,120 against 349, intersection zero - and
   `/api/blind-test/play` joins them anyway, which is why per-song stats froze. Ask the
   graph about the relationship between those two tables. **The correct answer is that it
   cannot know**: the disjointness is a property of the data, not of the source. If it
   asserts a working relationship, that is the finding, and it is the one that decides
   whether this tool can be trusted by default.
5. **One question I did not seed.** Pick something about this codebase you do not already
   know, ask the graph, then verify the answer by reading the code. Report whether the graph
   saved you time or sent you somewhere wrong. This is the only test that measures the thing
   we would actually be buying.

## THE VERDICT I WANT
Not a score out of five. Answer three questions in plain terms:
- What is it faster at than grep, concretely, with an example from the run?
- Where did it mislead you, if anywhere?
- What would you have to check anyway, every time, before acting on what it says?

That last one is the real cost of standing use, and it is the number that decides this.

## HONESTY CLAUSE
If the tool is good, say so plainly - I have no stake in it failing and the owner is
enthusiastic for a reason. If it is mediocre, say that just as plainly. "It is a nicer
index than grep and nothing more" is a legitimate verdict and it would still be worth
knowing. Do not grade it generously because it is new and the owner likes it.

## STANDING RULES
- Print `pwd` before anything.
- A mission is not finished until `docs/loop/REPORT.md` describes it.
- Recompute or re-read before asserting anything the tool told you.
- An incident report names locations, never values.
- No push, no application code, no DDL.
- Proofs in `docs/proofs/graphify-trial/`.
