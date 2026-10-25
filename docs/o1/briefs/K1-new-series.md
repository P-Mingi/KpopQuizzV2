# Content, lane K1: new Japanese series for otakuquiz.org (owner, 2026-10-25), one batch of 5 (named in your prompt)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1 (first `git merge --no-edit o1/integration`).
D = docs/anime/data. Read this brief, docs/o1/briefs/K1-series.md (its rules apply: allowed sources, own words, no image, no lyrics,
Bash writes), docs/o1/contracts/formats.md (quiz types: multiple_choice, true_false, guess_from_clues, intruder; never image),
two existing series as models (D/series/death-note.json, D/facts/death-note.json, D/quizzes/death-note/), and your sources.
## Rules
- No push, no production, no connector; never open ~/kpq-o1/secrets; database writes on o1-scratch only (the loader). No en or em
  dash, no emoji. Never edit check code, tests or contracts. C2 as it is (2 sources, one Wikidata or official, or the press rule
  of strong-source.mjs); every question cites verified facts only (C3); a figure that changes is dated; nothing that can become
  false without a date (running series: "as of <date>").
- Series art: nothing to add. The art is drawn from the slug (lib/anime/series-art.ts, no image of the work); check that the slug
  is new and the series page renders it on the scratch load.
## Per series
1. D/series/<slug>.json (same schema as the 30), D/facts/<slug>.json (enough verified facts for 4 good quizzes, 40 or more).
2. Four quizzes of 10 questions in D/quizzes/<slug>/:
   - a general one whose title works for the search "<series> quiz" (e.g. "<Series> Quiz: ..."), arc 0, no spoiler;
   - a hard one; end-of-story facts only here, and then the word "spoilers" in its description;
   - two fun ones in two different formats among: guess the anime from 3 emoji (multiple_choice), three progressive clues
     (guess_from_clues: studio, year, a plot hint), real or made up technique or name (true_false), the odd one out (intruder),
     which came out first, the same Japanese voice actor across series, food in the anime, the anime in numbers.
   Personality ("Which X character are you?", "Would you survive in X?") only if the anime data path already loads personality
   quizzes from D (check scripts/anime/k1/data-load.mjs); if it does not, do not write one and say so.
3. Forbidden: questions from the first line of Wikipedia, "what is the hero's name", the same template copied from series to series,
   quoted lines word for word (describe the moment instead). Titles precise and catchy, never "X basics". Each series has 2 or more
   formats. Spoiler tags and arcs as the editorial guide says.
## If a series lacks sourced facts for 4 good quizzes
Replace it with the next unused one of this list, in order, and say so: Assassination Classroom, The Promised Neverland, Hell's
Paradise, Yu Yu Hakusho, Bungo Stray Dogs (D/series tells you which ones are already used).
## Checks
`node scripts/anime/editorial/check.mjs D`: 0 fail; `node --test scripts/anime/editorial/*.test.mjs scripts/anime/k1/*.test.mjs` green;
`node scripts/anime/k1/validate-data.mjs` no new line; load D on o1-scratch (`node scripts/anime/k1/load-fixtures.mjs scratch --data D`).
Update the counts of apps/quiz/e2e/o1/L1/content-sql.test.mjs is ORCH's: give the new totals instead.
Commit per series ("o1: K1 new series <slug>"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 8 lines: last sha; series added (and replaced, why); facts verified per series; quizzes per format; totals
(series, quizzes, daily rows); checks.
