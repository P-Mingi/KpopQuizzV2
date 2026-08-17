# REPORT - GRAPHIFY TRIAL: good at what exists, silent about what does not. Verdict inside.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every step. No application code, no DDL, no database writes, **nothing pushed**.

Proofs: `docs/proofs/graphify-trial/answer-key-graded.txt`.

---

## Setup

graphify 0.9.45, installed by the owner since the block. Built **code-only, keyless**:
scan root `apps/quiz/src`, 990 code files, AST only, no API key, no LLM, no subagents.
`docs/` was never an input.

One deviation and one warning:

- The detector found **one** markdown inside the source tree
  (`lib/verse/pages/requirements.md`). I dropped it so the run stayed strictly code-only,
  rather than letting a single file pull in semantic extraction.
- 990 files exceeds the skill's own 500-file "ask the user to narrow" threshold. I did not
  narrow, because questions 1 to 3 span `src/lib`, `src/app` and `src/components`, and any
  narrower root makes the answer key unanswerable. Stating it rather than hiding it.

Graph: **5,306 nodes, 13,177 edges, 238 communities**.

**The tool's own health check raised a warning and its honesty rules say to surface it:
1,221 dangling-endpoint edges, 300 collapsed directed, 315 collapsed undirected.**
Extraction produced 14,713 edges and 13,177 survived into the graph, so **1,536 edges were
lost between extract and build**. Nothing in the trial depended on the lost ones, but a tool
that silently drops 10% of its own edges is a fact that belongs next to any verdict.

## The answer key, graded

| # | question | grade |
| --- | --- | --- |
| 1 | three consumers of `getAdvertisablePlaylists` | **RIGHT** |
| 2 | two Supabase clients in one file | **SPLIT: identities RIGHT, call sites MISSING** |
| 3 | two paths from one page to one function | **RIGHT in the graph, MISSING in the interface** |
| 4 | a relationship that is not in the code | **RIGHT, and it is the one that mattered** |
| 5 | something I did not know | **RIGHT and useful** |

**Q1.** `explain` returned all three consumers with typed edges, all `[EXTRACTED]`, and every
one matched source line-for-line: sitemap L14/L234, blindtest page L5/L120, and the wrapper
call at `blindtest.ts:L23`. It also correctly did **not** list `pt/blindtest` as a direct
consumer, because that page reaches the function through the wrapper. The delegation is
visible as an edge.

**Q2.** It separates them properly: two distinct nodes, different IDs, different communities,
degrees 207 and 458. It is not "sitemap uses supabase". But **the call sites are absent**.
The only sitemap edge either client has is `[imports] L1`. The real calls sit at L219 and
L382 (`createPublicReadClient`) and L405 (`createServiceRoleClient`), and none of the three
is in the graph. The 2x-vs-1x multiplicity, which is the whole point of the question, is not
recoverable. Note the contrast with Q1, where a `calls` edge from the same file **was**
recorded.

**Q3.** Both legs are in the graph, so the duplication is representable and I recovered it in
two commands. But `graphify path` answers with the **shortest** route, returned the one-hop
direct call, and would have hidden the second path from anyone who trusted it.

**Q4.** It did not invent the edge. `explain blind_test_songs` and `path songs
blind_test_songs` both answer **"No node matching found"**, and `explain songs` resolves to
two API route files, not a table. A code-only AST graph models no database tables, and it
says so instead of guessing. The failure mode you named as decisive did not occur.

One caveat worth carrying: `explain` and `path` refuse explicitly, but the natural-language
`query` just returned adjacent noise (a `TABLE` constant from an unrelated route,
`yearsBetween()`) with no "no relationship found" statement. The refusal is in the precise
commands, not in the conversational one.

**Q5.** The graph told me `isAdmin()` is the 4th most connected symbol in the codebase at 201
edges. I did not know that and would not have thought to look. Verified by reading: 213
mentions across `src`, and **50 admin API route files**. The admin surface is far larger than
I assumed. Counter-note: the report's "Surprising Connections" section was not surprising,
five entries all saying an API route calls `createServerClient`.

## The verdict you asked for

**What is it faster at than grep, concretely.** Reverse dependency lookup with typed edges
and line numbers. `graphify explain getAdvertisablePlaylists` returned eight edges in one
call, each labelled `imports` / `calls` / `contains` and each with `file:line`. The grep
equivalent is one search for the symbol, then reading every hit to tell an import from a
call from a re-export, then a second pass to find the transitive caller. On Q1 that is a
single command against roughly four, and the typing is the part grep cannot give you at all.

**Where it misled me.** The `query` command, twice. Q1 as natural language returned 270
nodes truncated to 80, with the right answer unranked among `mascot.tsx`, `guest-streak.ts`
and `threads.ts`. Q4 as natural language returned unrelated nodes next to a question about a
relationship that does not exist. And `path` gave a confident one-hop answer that omitted the
second route. **The precise commands are trustworthy; the conversational one is a
concordance with a ranking problem.**

**What I would have to check every time, which is the real cost.** *Whether an absent edge
means an absent relationship.* Q2 settles it: the call sites exist in the source and not in
the graph, so **absence in this graph is not evidence of absence in the code**. Every
positive claim it made was true and line-exact, 3 out of 3 verified. Every negative claim
needs a grep before you act on it. That asymmetry is the price of standing use, and it is
not small: "nothing calls this, safe to delete" is exactly the question you would want to ask
a code graph, and it is the one question this graph cannot answer safely.

## My recommendation, stated plainly

**Standing use: yes for `explain` and `path`, no for `query`, and never for a negative.**

It earns "always" the way the three gates did, but only within its proven range. Concretely:
use it first for "what touches X and where", which it does better and faster than grep; do
not use it to conclude "nothing touches X"; and treat `query` output as a starting set of
filenames, not an answer. It is meaningfully more than a nicer index — the typed edges and
the transitive call in Q1 are things grep genuinely cannot produce — but it is not an oracle,
and the Q2 gap is the reason.

I have no stake in this and the owner's enthusiasm is not misplaced. Q4 is the result that
earns the trust: a tool that answers "I have no node for that" when asked about something
outside its model is rarer and more valuable than a tool that answers everything.

## `graphify-out/` is gitignored

Rule added at `.gitignore:118`, verified by `git status` showing it clean. 19MB, derived from
a codebase that changes every commit, so a tracked copy is stale on the next merge. We
inverted `docs/` to track-by-default only because `check:docs-secrets` made its safety
property automatic; a tracked graph has the mirror problem with **no equivalent gate**, and a
stale graph nobody notices is precisely the failure mode this trial was run to test for. The
rebuild command is in the comment.

## Deviations and flags (loud)

1. **I dropped one file from the corpus** to keep the run code-only. Named above; it is a
   requirements doc inside `src/lib/verse/pages/`, not in `docs/`.
2. **I did not narrow at the 500-file prompt**, for the reason given. The skill asks the user;
   I decided, because narrowing would have made the mission's own answer key unanswerable.
3. **The 1,536 lost edges are unexplained.** I did not chase them: the trial is about the
   answers, not the extractor, and none of the five questions depended on a lost edge. It is
   worth a look before anyone builds tooling on top of the graph.
4. **Q3's grade depends on how you read it.** The information was there; the command that
   exists to answer that shape of question did not surface it. I graded the graph RIGHT and
   the interface MISSING rather than picking one.

## Covenant

Every claim the tool made was re-read against source before I graded it. The three
`[EXTRACTED]` edge sets in Q1, the three call sites in Q2, and the `isAdmin` count in Q5 were
all verified by grep or by reading the file, not accepted from the tool.

---

STOP. **Nothing was pushed.** report pret.
