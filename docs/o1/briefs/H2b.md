# Lane H1, lot H2b: the real data of the new FanQuiz home (in parallel with H2a, which builds the page on sample data)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-h2b, branch o1/h2b (= o1/integration). Q = apps/quiz/src.
SOURCE: docs/o1/design/fanquiz-hub/Plan.dc.html section 3 (the algorithms) and section 5 (SEO, robustness), followed to the letter;
Main.dc.html's script at the bottom gives the shape of each block's sample data (your return types must match those shapes).
Read this brief, those files, Q/lib/site/registry.ts (NETWORK, netOrigin), Q/lib/site/scope.ts, the daily quiz, daily blind test,
debate and XP code you query (find them from Q/app/api/cron and Q/lib), and docs/pending-migrations/multisite/manifest rules.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets; never print a key or a URL with a key.
SQL is written, never applied anywhere except o1-scratch (`/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/env.sh
scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -v ON_ERROR_STOP=1 -f <file>'`). No en or em dash, no emoji.
Never `git add -A`; files by path. Do not touch the page, its components or Q/styles (lot H2a owns them) nor docs/o1/contracts/**.
## Do: one server module per block, Q/lib/site/hub/data/<block>.ts, each `async (opts) => Shape | null`
- Hot right now: score over 7 days with a 0.85 daily decay, x1.5 before 72 h, quality clamped 0.5 to 1.5, the exclusions, at most
  2 quizzes per group or series, never the quiz of the day, K-pop and anime alternating in All mode, OtakuQuiz's start-up rule, as
  the Plan writes them. If plays per day per quiz do not exist, write the table and its SQL with rollback in
  docs/pending-migrations/hub/ (header, idempotent, RLS, service_role writes, like multisite/016) and a fallback that works today
  without it (say which). Try the SQL on o1-scratch only.
- Daily quizzes of each bank; the daily blind test (K-pop only, audio only, soundtrack covers hidden as the existing rules do) with
  the real 10 second preview URL of its first song; the debate of the day or null (the card then disappears); the countdown target
  from the real rotation time of the cron (read vercel.json and the cron code; the canvas says 02:05 Paris; report the truth).
- The 60 second question and the two Did you know as the Plan says (no spoiler, no repeat over 60 days; the question gives no XP).
- For you, Start easy, Surprise me, Crossover (an editorial list file), Top fans (XP of the week on both sites, public profiles only,
  Team accounts excluded), the real counts of the two doors.
- Every link is the canonical page on its own site (netOrigin); nothing is copied onto fanquiz.org.
- Robustness: each block cached one hour (unstable_cache or the existing cache helper, tag per block); if the database fails, the
  last good value or null, never a throw (a 500 is a failure of this lot).
## Checks
Unit tests per block with a mocked Supabase (ranking maths with fixed dates, caps, alternation, start-up rule, null paths, links
canonical, no Team account, private profiles out). tsc 0, `pnpm -C apps/quiz exec vitest run src/lib/site/hub` green, check.sh ok.
One run of every block against o1-dev (`scripts/o1/env.sh dev`), counts only in docs/o1/reports/H2/data.md.
Commits on o1/h2b ("o1: H2b ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 8 lines:
sha, modules, what is missing on the data side, SQL prepared (paths), the real rotation time, checks.
