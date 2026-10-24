# Content, lane K1: three quiz titles that say exactly what the quiz asks
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1 (merge o1/integration first: `git merge --no-edit o1/integration`).
D = docs/anime/data. Read this brief, docs/o1/briefs/K1-series.md (voice and title rules) and the three quiz files below. Nothing else.
## Rules
- No push, no production, no connector; never open ~/kpq-o1/secrets. No en or em dash, no emoji. Questions, facts and slugs stay
  as they are (the slug is the URL; do not change it). Only `title`, and `description` when it no longer matches.
## Do
The owner validated the questions. Retitle, so the title describes exactly what the 10 questions ask (read each one):
- D/quizzes/spy-x-family/ the quiz titled "Four Blocks ... by Season"
- D/quizzes/chainsaw-man/ the quiz titled "Kick Back: Staff, Songs and Studio"
- D/quizzes/death-note/ the quiz titled "Before and After Episode 26"
Same length and tone as the series' other titles, no clickbait, no spoiler above the quiz's arc in the title.
## Checks
- `node scripts/anime/editorial/check.mjs D`: 0 fail. `node --test scripts/anime/editorial/*.test.mjs scripts/anime/k1/*.test.mjs` green.
- Load D on o1-scratch once (`node scripts/anime/k1/load-fixtures.mjs scratch --data D`): the three titles changed.
Commit on o1/K1 ("o1: K1 three titles"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha; for each quiz: old title, new title, one line on what its questions cover.
