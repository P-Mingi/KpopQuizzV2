# Content, lane K1: "Which X character are you?" for 10 series (owner, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-which, branch o1/which (= o1/integration). D = docs/anime/data.
Read this brief, docs/o1/briefs/K1-series.md and K1-verify.md (their rules apply), docs/o1/reports/PERS/report.md, the schema
scripts/anime/k1/personality.schema.json, the model D/personality/death-note.json, and the series and facts files you use.
## Which 10 series
No series has been played yet on otakuquiz.org, so "the 10 most played" is replaced by the 10 series with the largest verified
copies-in-circulation figure in D/facts (list them with their figure in the hand-back). Death Note keeps its proof set.
## Each set (D/personality/<slug>.json)
8 questions, answers with trait weights, 6 to 8 character profiles. Every result is a character with spoiler level 0 and not an
identity spoiler (C5 enforces arc 0). Profiles written by us in our own words (first line starts with "You"), true to the character:
every claim about the character (role, traits, habits) comes from a verified fact of D/facts (cite them in the set as the schema
allows; add facts with 2 sources where needed). No quote of the work, no image. Each profile wins 3 to 40 percent of answer sheets
(the check computes it). Questions are about the player (habits, choices, tastes), not trivia.
## Final verification (as K1-verify.md, by you at the end, D/verify/which.json)
Every profile claim and every cited fact checked on a page you opened; not 100% sure: rewrite the claim from a proven fact.
## Checks
`node scripts/anime/editorial/check.mjs D`: 0 fail; node tests green; `load-fixtures.mjs scratch --data D --only personality` twice,
same rows. Commits per 2 series ("o1: K1 which ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, the 10 series with their figure, profiles per series, verification counts, checks.
