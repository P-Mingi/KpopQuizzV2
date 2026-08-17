# REPORT - GRAPHIFY PART 0: the global file is trivial. The SKILL's default instruction is not.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every step. Read-only: no code, no DDL, no writes outside `docs/loop/` and
`docs/proofs/graphify-part0/`, **nothing pushed**. `/graphify` was not run in the bloom repo.

Proof: `docs/proofs/graphify-part0/global-instruction-audit.txt`.

---

## First, the miss, because it is worse than you diagnosed

You said the instruction was seen and the reporting was dropped. It is worse: **I never read
it.** On the turn the trial ran, the bus had been rewritten (mtime moved 18:33 to 18:47) and
I ran `head -8 docs/loop/MISSION.md`, saw a familiar title, and went to the skill. `READ
FIRST` and `PART 0` were below line 8. I truncated my own read of the bus and then executed
confidently against a mission I had not read.

That is the same shape as the two you named, and it has a single root: I treat re-reads as
confirmation rather than as reading. The trial's technical content was good because the
answer key was in the part I did read. That is luck, not method.

The fix is one line and I am stating it so it can be held against me: **`cat` the mission,
never `head` it.** Not "verify twice" or "be careful" - a specific command I got wrong.

## 1. The global file, verbatim

`/Users/louis/.claude/CLAUDE.md`, 228 bytes, 3 lines, in full:

```
# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
```

**It is trivial and it is gated.** It fires only when the user types `/graphify`. It does not
tell agents to prefer the graph over source, does not run anything, does not reach the
network. As a global file it is close to the smallest thing it could have written.

## 2. Overwrite check

Birth and modified are both `Aug 17 18:45:17`, so the file has not been touched since
creation. Only one `CLAUDE.md` exists anywhere under `~/.claude`. `~/.claude/backups` holds
only `.claude.json` backups, no CLAUDE.md of any vintage. No `.bak` or `.orig` sibling.

**`~/.claude` is not a git repo, so there is no history to diff.** Everything on disk is
consistent with "created", and **I cannot prove a prior file was not deleted and replaced** -
no artefact would distinguish those two cases. Saying that rather than assuming it, per the
mission.

Separately: the user-memory file this session actually reads
(`~/.claude/projects/.../memory/MEMORY.md`) has mtime 17:42, predates the 18:45 install, and
is untouched.

## 3. What the SKILL instructs by default, and the one that conflicts

**The conflict is real and it is in the frontmatter, which loads into every session:**

> "Use for any question about a codebase, its architecture, file relationships, or project
> content — **especially when `graphify-out/` exists, where the question should be treated as
> a graphify query first**."

And `SKILL.md:53`, the fast path:

> "**Fast path — existing graph:** Before doing anything else, check whether
> `graphify-out/graph.json` exists. ... If it exists AND the user's request is a
> natural-language question about the codebase ... **skip Steps 1–5 entirely and jump
> straight to `## For /graphify query`.** Run `graphify query "<question>"` immediately. Do
> not run detect. Do not check corpus size. Do not ask the user to narrow. **The graph is
> already built — use it.**"

And `SKILL.md:691`, on answering:

> "**Answer using only what the graph output contains**, and quote `source_location` when
> citing a specific fact."

**These three are a direct conflict with the doctrine.** The doctrine's binding line is *the
graph is for orientation, the source is for truth*; the skill says treat a codebase question
as a graph query first, and answer using only what the graph contains. And they route the
agent to `query` specifically — the one command I measured as the weakest, which returned 270
nodes truncated to 80 with the answer unranked among `mascot.tsx` and `guest-streak.ts`.

**And `graphify-out/` now exists in this repo**, so that fast path is live here from the next
session onward. This is not hypothetical.

Three lesser flags, none of them alarming:

- **`SKILL.md:88-93` runs an install/upgrade unprompted** if the import fails:
  `uv tool install --upgrade graphifyy -q`, falling back to `pip install graphifyy -q
  --break-system-packages`. A skill invocation can therefore upgrade a package without
  asking. Worth knowing; not worth blocking.
- **`SKILL.md:638` prints a sponsorship link** to the user after a run.
- **`SKILL.md:649-651` instructs an unprompted follow-up offer** ("Want me to trace it?").

**Network:** the only endpoints anywhere in the skill directory are `github.com` (repo
cloning on explicit request) and the sponsor URL. **No telemetry, no phone-home, no analytics
host.**

## 4. The bloom project

Nothing was written into it. `/Users/louis/Bloom` does not exist; `/Users/louis/IT/Dev/projects/Bloom`
exists and has no `graphify-out/`, no `.graphify/`, no `CLAUDE.md`. A `find` across the whole
projects directory shows the only `graphify-out` is this repo's own. `/graphify` was not run
there and that repo was not modified.

## The override you asked for, if you want it

The global file needs nothing. The conflict is entirely in the skill's frontmatter and fast
path, and it is load-bearing: it changes the default behaviour of every session in this repo
now that `graphify-out/` exists.

The doctrine already says the right thing; what it lacks is precedence over a third-party
instruction that contradicts it. One line in the project's own `CLAUDE.md` would do it, since
project instructions load after the skill description:

> The graphify skill's "treat the question as a graphify query first" and "answer using only
> what the graph output contains" do **not** apply in this repo. `PLAY-GRAPHIFY-DOCTRINE.md`
> governs: `explain` and `path` for orientation, never `query` for an answer, never the graph
> for a negative, and the source is what gets cited.

I did not write it, because the mission's scope is read-and-report and it says no writes
outside `docs/loop/` and the proofs directory. It is yours to place.

## Deviations and flags (loud)

1. **I could not prove the no-overwrite claim**, only that everything on disk is consistent
   with it. Stated in section 2 rather than rounded up to "confirmed".
2. **One check swallowed its own exit code.** My first Bloom probe piped `ls` into `sed`, so
   the `||` fallback could never fire and the empty output proved nothing. I re-ran it with
   explicit `-e` tests per path. Flagging because a silently-passing check is the same class
   of error as the mission I am reporting on.

## Covenant

Every quote in section 3 is `sed -n '<line>p'` out of the installed file, not retyped from
memory. The verbatim CLAUDE.md is `cat`, not a summary.

---

STOP. **Nothing was pushed.** report pret.
