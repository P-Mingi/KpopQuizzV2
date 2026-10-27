# Content, lane K1: back the arc data of Fairy Tail and Kagurabachi with facts (validate-data shows 13 problems)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-arcs, branch o1/arcs (= o1/integration). D = docs/anime/data.
Read this brief, docs/o1/briefs/K1-series.md and K1-verify.md (rules), D/series/fairy-tail.json, D/series/kagurabachi.json, their
facts files, and the pages you cite. `node scripts/anime/k1/validate-data.mjs` lists: Fairy Tail arcs 14 to 16 episode ranges and
Kagurabachi arcs 2 to 5 names and chapter ranges "not backed by a fact".
## Do
For each value: add the verified fact that backs it (2 sources when it is a count, as C2 says), read on the page you open; if no
allowed source carries the value, change the series data to what the sources say, or drop the arc field (and say so). Questions
that cite a changed value: fix them. Never `git add -A`.
## Checks
validate-data: 0 problems; check.mjs 0 fail; node tests green; load D on o1-scratch. One commit ("o1: K1 arcs backed"; last line
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 4 lines: sha, facts added, values changed, checks.
