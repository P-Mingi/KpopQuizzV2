# Content, lane K1: "Guess the anime in 3 words", 10 multi-series quizzes (owner, 2026-10-26; replaces the emoji format)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-3words, branch o1/3words (= o1/integration). D = docs/anime/data.
Read this brief, docs/o1/briefs/K1-series.md, K1-new-series.md and K1-verify.md (their rules apply), the anime-mix quizzes of D as
models, and the series and facts files you use.
## Do
10 quizzes of 10 questions in D/quizzes/anime-mix/: each question gives exactly three words (or short terms) that point to one
series of the catalogue (50 series), and asks which anime it is; four options, all series of the catalogue, plausible. The three
words come from verified facts of that series (setting, a role, an object, a place: what the facts carry), cited in fact_ids; no
word that is the title or a character's full name; no spoiler above arc 0 unless the quiz is hard and says "spoilers". Each quiz
has a theme (shonen action, sports, slice of life, isekai, mystery, the 90s, ...) and a precise, catchy title, never "X basics".
A series appears at most twice across the 10 quizzes as the answer. Multiple choice quiz type (no new engine).
## Final verification (as K1-verify.md, done by you at the end, in D/verify/3words.json)
Every question: the three words follow from the cited facts on pages you opened; the wrong options are wrong; not 100% sure:
replace it.
## Checks
`node scripts/anime/editorial/check.mjs D`: 0 fail; node tests green; load D on o1-scratch. Commits per 5 quizzes ("o1: K1 3 words ...";
last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 5 lines: sha, quizzes, verification counts, checks.
