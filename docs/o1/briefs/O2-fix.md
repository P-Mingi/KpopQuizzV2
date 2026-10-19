# Lot (b) fix, lane O2: make the kpop render tree identical again
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-LB, branch o1/LB, head 74dd4c9, base 04298d3. Q = apps/quiz/src.
Read this brief, `git diff 04298d3 74dd4c9` of the kpop files below, and the code you change; nothing else.
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets.
- Never edit an existing test or gate, docs/o1/**, scripts/o1/**. No en or em dash, no emoji. Keep every anime feature of 74dd4c9.
## The defect (production comparison of kpopquiz.org, 21 of 60 pages differ; the HTML is equal, the React Flight payload is not)
- /{group}-quiz hubs: `["$","span",null,{"children":"J-Hope"}]` became `{"children":["J-Hope","$undefined"]}`; member `li` gained
  `"className":"$undefined"` and a leading `"$undefined"` child; a new client component reference row (`I[...]`) is now rendered on the
  kpop hub. Files: Q/components/group/ux-v1/hub.tsx, member-tiles.tsx, hub-quizzes.tsx, group-avatar.tsx, hub-slots.ts.
- /q/{slug}: each "More X quizzes" TextCard gained a `"$undefined"` child (Q/components/ux-v1/text-card.tsx `{note}`); also check
  Q/components/quiz/ux-v1/quiz-page.tsx and Q/app/(site)/q/[slug]/ux-page.tsx (gate, origin).
- /{group}-trivia: a 5-byte shift in the trivia page tree (Q/app/(site)/[slug]/group-trivia-page.tsx, variant) and possibly
  Q/components/ui/breadcrumbs.tsx (origin).
## The rule for the fix
On the kpop path (no new prop passed), every element must carry exactly the props and the children shape it had at 04298d3: no `{x}` slot
that is undefined on kpop, no new prop (even undefined) on a host element, one child stays a single child, no new client component
rendered, no wrapper added. Pattern: branch before the JSX (`if (note === undefined) return <the 04298d3 JSX, verbatim>;`) or build the
children list only when the prop is set. The anime path may differ freely.
## The proof (commit it)
1. Write Q/lib/o1-flight-tree.ts: `flightTree(node)` walks a React element tree like the Flight serializer: host elements as
   ["$", type, key, props] with every prop kept (undefined written "$undefined") and children kept exactly as authored (single vs array);
   server function components are called (await async ones) and walked; client components (modules starting with 'use client') are not
   called and appear as ["$L", name, props]. Unit test it on small trees.
2. Q/components/o1-kpop-tree.test.ts: for each kpop component above, render with kpop props built from realistic fixture objects (a group
   with 7 members and images, 5 quizzes, a trivia page with 12 facts, a quiz page with 5 related quizzes; mock data reads as the existing
   tests do) and compare `JSON.stringify(flightTree(...))` with snapshot files in Q/components/__o1_kpop_tree__/*.json.
3. Make the snapshots from the base: `git checkout 04298d3 -- <the kpop files>`, run the test with O1_WRITE_TREE=1 to write them, then
   `git checkout 74dd4c9 -- <the same files>` (or your fixed versions) and run it without the flag: equal. Never write snapshots from head.
4. `pnpm -C apps/quiz exec tsc --noEmit` 0 errors; `pnpm -C apps/quiz exec vitest run src/components src/lib/anime src/app` green;
   `/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/check.sh $PWD` ok.
Commit on o1/LB ("o1: O2 fix ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, files changed, per page family what changed, the proof results, open issues.
