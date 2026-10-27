# Lot (e), part 2, lane K1: content wiring of otakuquiz.org and the editorial tools per site
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1 (part 1 put SQL 009 to 015 there and on
o1-scratch). C = docs/o1/contracts, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1, Q = apps/quiz/src.
Read this brief, the files it names and the code you change; nothing else.
## Rules
- Same as part 1: no push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets nor print a database URL;
  only o1-scratch may be written; never edit an existing test or gate, C/**, scripts/o1/**; no en or em dash, no emoji.
- kpopquiz.org stays byte for byte; a kpop component or route you change keeps today's queries, arguments and render tree on kpop.
- No new editorial tool: the existing kpop ones take a site (owner). No invented content: the only anime content is the frozen fixtures.
## 1. Content loader
scripts/anime/k1/load-fixtures.mjs <scratch|dev>: reads C/fixtures/series/death-note.json, one-piece.json, spy-x-family.json (schema
C/fixtures/series-fixture.schema.json) and writes, idempotently (upsert on slugs), through `S/env.sh <target> -- psql` (never another
way): an anime system profile and sites row values for anime (system_user_id, fallback_group_slug) if missing, one groups row per series
with site_id 'anime', its series, arcs, characters, series_themes, and its 5 quizzes with their questions, spoiler tags and
quizzes.spoiler_arc_ord and spoiler_scope computed by Q/lib/anime/spoilers (computeSpoilerLevel), published, site_id 'anime'. Refuse any
target other than scratch or dev. A dry-run flag prints the row counts only. You run it on scratch only; ORCH runs it on dev.
## 2. Editorial tools per site (kpop unchanged)
- Admin quiz tools: Q/app/api/admin/quiz, quizzes, search-quizzes, editorial, quiz-bank and their pages under Q/app/(site)/admin read and
  write the build's site: reads through forSite, inserts set site_id = SITE.id where the column exists. On kpop with the SITE_SCOPE flag
  off, the queries are today's. If the anime build does not reach /admin, add the thinnest re-export under Q/app/sites/[site]/ that
  imports the kpop page (rule 18), with a twins row only if the twins check asks for one (then say so in the hand-back: ORCH adds it).
- Q/app/api/quiz/create/route.ts: a quiz created on a non-kpop build gets site_id = SITE.id and earns XP through awardXpForSite; kpop path
  unchanged. (This file is on HOT.txt; the lane is exempt, keep the change small and additive.)
- Q/app/sites/[site]/(anime)/series/page.tsx: the directory lists the anime series through forSite (lot (b) left it on kpop groups).
## 3. Proof on o1-scratch (evidence in docs/o1/reports/K1/content.md, numbers only)
1. load-fixtures.mjs scratch twice: same counts, no duplicate. 3 series, their arcs, characters and themes, 15 published anime quizzes.
2. Anime build against scratch (S/env.sh scratch -- env NEXT_PUBLIC_SITE_ID=anime pnpm -C apps/quiz build, then start on your lane's
   port): /death-note-quiz, /one-piece-quiz, /spy-x-family-quiz answer 200 with the series facts, arcs, characters and openings blocks;
   /q/<one fixture quiz above arc 0> shows the spoiler interstitial and no tagged question text in the HTML; /series lists the 3.
   Stop the server after. A kpop page on the same build answers 404 or redirects as today.
3. Unit tests for the loader (fixture to rows) and the site-aware tools; `pnpm -C apps/quiz exec tsc --noEmit` 0 errors;
   `pnpm -C apps/quiz exec vitest run src/lib src/app/api` green; `S/check.sh $PWD` ok.
Commit on o1/K1 ("o1: K1 ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, files changed (count), the proof results, what ORCH must do on dev, open issues.
