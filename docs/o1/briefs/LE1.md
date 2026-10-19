# Lot (e), part 1, lane K1: SQL 009 to 015 and the daily quiz per site, tried on o1-scratch
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1. M = docs/pending-migrations/multisite,
C = docs/o1/contracts, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1, Q = apps/quiz/src.
Read this brief, the files it names and the code you change; nothing else. Model to follow: M/003 to 008 (headers, idempotence,
rollbacks) and apps/quiz/e2e/o1/B3/*.sh (how checks and the equivalence hash run on o1-scratch).
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets and never
  print a database URL. Only o1-scratch may be written: S/migrate-dev.sh --branch scratch, or
  `S/env.sh scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -v ON_ERROR_STOP=1 -f <file>'`.
- Never edit an existing test or gate, C/**, scripts/o1/**, Q/middleware.ts, next.config. No en or em dash, no emoji.
- kpopquiz.org stays byte for byte; a kpop component you change keeps its render tree (Q/lib/o1-flight-tree.ts and a snapshot from the base).
## SQL (DDL frozen in C/schema.sql: take each object from its `@file` marker; never invent a column). Each with its .rollback.sql.
- M/009-daily-prep.sql (`-- o1-transaction: none`): sites.system_user_id (FK profiles) and sites.fallback_group_slug, kpop values
  '00000000-0000-0000-0000-000000000001' and 'general-kpop'; unique indexes quiz_bank_site_date and qotd_log_site_date CONCURRENTLY;
  quiz_bank_category_check (kpop plus the 7 anime categories) NOT VALID then VALIDATE. If the branch lacks that profile or group, write a
  branch-only seed apps/quiz/e2e/o1/K1/seed-branch.sql (never a migration) and apply it first.
- M/010-daily-v2.sql (dangerous): ensure_daily_quiz_v2(p_date date, p_site text), service_role only; ensure_daily_quiz(p_date text) becomes
  the kpop wrapper with today's ACL; drops quiz_bank_scheduled_date_key and qotd_log_featured_date_key. Its rollback restores today's
  ensure_daily_quiz verbatim from ~/kpq-o1/prod-public.sql (grep, sed ranges; no secret in it) and re-adds the two constraints.
- M/011-anime-series.sql, M/012-editorial-quiz.sql, M/013-formats.sql, M/014-daily-openings.sql, M/015-spoilers.sql: as C/schema.sql marks
  them (series, arcs, characters, episodes, series_themes, series_progress, favourite_characters, view favourite_character_counts, trivia,
  entity_sources, daily_openings, quizzes.spoiler_arc_ord, spoiler_scope, spoiler_cover_until, report_spoiler, and the rest marked there),
  RLS public read of published rows, own-rows policies for series_progress and favourite_characters.
## App, daily quiz per site (kpop result unchanged)
- onConflict 'featured_date' becomes 'site_id,featured_date' in Q/lib/ux-v1/p1/qotd-rotation.ts (featureQuiz) and
  Q/app/api/admin/set-qotd/route.ts; Q/lib/db/queries/quizzes.ts getQuizOfTheDay(site = SITE.id); Q/app/api/cron/ensure-daily-quiz/route.ts
  calls ensure_daily_quiz_v2 with SITE.id off kpop and today's call on kpop; Q/lib/quiz-bank-scheduling.ts and the admin quiz-bank,
  auto-schedule and auto-select-qotd routes filter by site (forSite), weekly limit kpop 3, anime 2.
## Checks on o1-scratch (evidence in docs/o1/reports/K1/scratch.md, numbers only)
1. Apply 009 to 015 in manifest order; apply twice: no change. Catalog diff (pg_dump --schema-only of public, before 009 and after the
   rollbacks 015 to 009): identical. Re-apply and leave scratch applied.
2. Daily equivalence: apps/quiz/e2e/o1/K1/daily.sql inside BEGIN ... ROLLBACK runs the kpop daily for 110 consecutive dates with today's
   function and with the wrapper (before and after 010): same quiz per date (one md5). Then a kpop and an anime daily on the same date both
   publish and qotd_log has 2 rows.
3. `S/env.sh scratch -- /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/node_modules/.bin/tsx
   apps/quiz/scripts/o1/check-contract.mts --target db --applied-only`: 0 diff; contract.test.ts green.
4. Unit tests for the app changes (kpop call shapes unchanged, anime branch); `pnpm -C apps/quiz exec tsc --noEmit` 0 errors;
   `pnpm -C apps/quiz exec vitest run src/lib src/app/api` green; `S/check.sh $PWD` ok.
Commit on o1/K1 ("o1: K1 ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, files, the checks with results (hashes may be shown), what you decided where the files are silent.
