# Lot a, lane O1: finishing (kpop text left on anime pages, /q params, anime /daily, the 4 small leftovers)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-O1, branch o1/O1. Q = apps/quiz/src, M = docs/pending-migrations/multisite,
S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1. Read this brief and the code you change; nothing else.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open or list ~/kpq-o1/secrets. Only o1-scratch may be written.
- Never edit an existing test or gate, docs/o1/**, scripts/o1/**, Q/middleware.ts, next.config.ts. Write files with Bash, never Write or Edit.
- Rule 18: reuse kpop components through optional props or the registry; kpopquiz.org stays byte for byte with SITE_SCOPE off (same
  queries, same render tree: prove any kpop component you change with Q/lib/o1-flight-tree.ts and a snapshot made from the base files).
- No en or em dash, no emoji, no image of a work.
## 1. Kpop text left on anime pages (copy from the registry vocabulary and the per-site copy files, Q/copy/anime/*)
Q/app/sites/[site]/u/[username], the anime name-all pages, the empty series hub texts, the "Ways to play" tiles of
Q/components/group/ux-v1/hub-growth.tsx, the anime dmca page. Then grep the anime build output for K-pop, kpop, idol, bias, comeback,
member, group (as copy, not code) and fix what is left; list anything you leave and why.
## 2. /q/[slug] build params by site: Q/app/sites/[site]/(anime)/q/[slug]/page.tsx generateStaticParams lists only the site's quizzes
(forSite); the kpop list is today's.
## 3. Anime /daily: the anime /daily page works like kpop's (the quiz of the day of the site: getQuizOfTheDay(SITE.id), the same play,
result and streak), fed by ensure_daily_quiz_v2 for 'anime'; kpop /daily unchanged; hub /daily stays 404.
## 4. The small leftovers
- Spoiler reports must not count toward report_count: report_spoiler (M/015-spoilers.sql) must not feed the existing handle_new_report
  trigger path (for example its own table or a reason the trigger skips, as docs/o1/contracts/schema.sql allows). Change 015 and its
  rollback in place (idempotent), re-apply on o1-scratch (S/migrate-dev.sh --branch scratch), prove with a scratch test that 5 spoiler
  reports leave report_count and the quiz untouched and a normal report still counts. Never change handle_new_report's kpop behaviour.
- Q/app/api/auth/me/route.ts calls getLevelInfo with the build's site.
- POST /api/passport/redeem answers 429 with outcome rate_limited after the limit the contract gives (or 10 per minute per IP hash).
- The transaction cookie helper the dev-multi cookies spec expects (its import path), per docs/o1/contracts/cookies.md, used by the
  passport routes instead of their inline code, same cookie on the wire.
## Checks
`pnpm -C apps/quiz exec tsc --noEmit` 0 errors; `pnpm -C apps/quiz exec vitest run` green; `S/check.sh $PWD` ok; anime and hub builds
(`S/env.sh offline -- env NEXT_PUBLIC_SITE_ID=anime NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 pnpm -C apps/quiz build`, same for hub) green.
Commit on o1/O1 ("o1: O1 ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, per item what changed, the SQL change and its scratch proof, checks, what is left.
