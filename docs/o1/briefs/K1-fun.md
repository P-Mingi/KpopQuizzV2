# Content, lane K1: more originality and fun on otakuquiz.org (owner, 2026-10-25), in parallel with the new-series batches
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-fun, branch o1/fun (= o1/integration). D = docs/anime/data.
Read this brief, docs/o1/briefs/K1-series.md and K1-new-series.md (their rules apply: sources, own words, C1 to C14, formats,
spoilers, forbidden questions, titles), the series and facts files you use, and two existing fun quizzes as models.
## Rules
As K1-new-series.md. Only the 30 series that existed before the new batches (not the 15+ new ones, whose fun quizzes exist) plus
the general mix group for multi-series quizzes. Never edit another lot's files: only new quiz files, and new facts appended to a
facts file when a question needs one (verified with 2 sources as C2 says). Never `git add -A`; files by path.
## Do
1. One more fun quiz of 10 questions for each of the 30 existing series, in a format that series does not have yet, among: guess
   the anime from 3 emoji, three progressive clues (studio, year, a plot hint), real or made up technique or name, the odd one out
   (which is not a Stand, a Breathing style, a Devil Fruit...), which came out first, same Japanese voice actor across series, food in
   the anime, the anime in numbers. Each series ends with 2 or more formats. Precise, catchy titles, never "X basics".
2. 10 multi-series fun quizzes (group: the general mix, as the existing mix quizzes) across the catalogue, each a different format
   or angle, citing verified facts of the series they use.
3. End-of-story facts only in hard quizzes with "spoilers" in the description; none of these fun quizzes is hard unless it says so.
## Checks
`node scripts/anime/editorial/check.mjs D`: 0 fail; node tests green; load D on o1-scratch. Commit per 10 quizzes ("o1: K1 fun ...";
last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 6 lines: sha, quizzes per format,
facts added, checks.
