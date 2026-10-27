# Content, lane K1: rewrite the blocked questions so they cite verified facts only
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1 (at f3851e7, the press rule lot).
D = docs/anime/data. Read this brief, docs/o1/briefs/K1-series.md (its rules apply: voice, formats, spoiler tags, no invented
content), docs/anime/editorial (the editorial guide and checks C1 to C14 in scripts/anime/editorial/lib), and per series only
D/series/<slug>.json, D/facts/<slug>.json, D/quizzes/<slug>/*.json and the daily rows of D/daily/*.json for that series.
## Rules
- No push, no production, no connector; never open ~/kpq-o1/secrets. Database writes on o1-scratch only. No en or em dash, no emoji.
- Never change a fact (value, status, sources); never edit check code, tests or docs/o1/contracts/**. Facts are the only truth:
  a question states nothing that its cited verified facts do not carry.
## Owner decision (2026-10-24)
A question is blocked when it cites a fact that is not verified (draft or rejected). Rewrite every blocked question of the
quizzes and of the daily rows so it cites verified facts only, in the same quiz, same format and same spoiler discipline (arc and
scope from what the question reveals; starters stay arc 0). If a series does not have enough verified facts for a good quiz of
10 questions (no near duplicate of another question of the same quiz or of the series' other quizzes, no trivial or weak item, a
fair spread of answers), withdraw the quiz instead of filling it with weak questions: move its file to
D/withdrawn/quizzes/<slug>/ (check first that no loader or check reads D/withdrawn) and list it in D/withdrawn/README.md with the
reason in one line. A rewritten quiz has 10 questions. A daily row that cannot be rewritten well is withdrawn the same way
(D/withdrawn/daily.json, its date left free).
Unblocked questions of a quiz stay as they are.
## Order
Start with the quizzes that have 1 to 3 blocked questions, then 4 to 6, then the rest; then the daily rows. Commit after each
series ("o1: K1 rewrite <slug>") so work is never lost.
## Checks
- `node scripts/anime/editorial/check.mjs D`: 0 fail on every item you keep (C1 to C14). Paste the summary line.
- `node --test scripts/anime/editorial/*.test.mjs scripts/anime/k1/*.test.mjs` green; `node scripts/anime/k1/validate-data.mjs`
  shows only the 10 known Kagurabachi lines.
- Regenerate the launch files with verified rows (apps/quiz/e2e/o1/L1/content-sql.mjs), replay on o1-scratch with
  psql --single-transaction; load D on o1-scratch twice (same counts).
- Packet for the owner's reading: `node scripts/anime/editorial/packet.mjs --batch k1-rewrite --lane K1 --out
  docs/anime/editorial/packets/k1-rewrite.html` with the rewritten quizzes and daily rows only (old question shown beside the new
  one if the tool allows it; otherwise new only).
Last commit on o1/K1 ("o1: K1 blocked questions rewritten"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha; questions rewritten (quizzes, daily); quizzes and daily rows withdrawn (with series); final counts:
publishable quizzes of 150, daily rows of 100; checks; packet path.
