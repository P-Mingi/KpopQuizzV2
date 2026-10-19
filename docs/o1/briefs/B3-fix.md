# Lot (c) fix, lane B3: the 3 blockers of review R (docs/o1/reviews/B3.md in .../worktrees/o1)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B3, branch o1/B3, head cca6812. Q = apps/quiz/src.
Read this brief, the review file above, and only the code you change. Same rules as before: no push, no production, no connector, no
supabase, vercel or gh; never open ~/kpq-o1/secrets; o1-scratch is the only database you may write; never edit an existing test or gate.
kpopquiz.org stays byte for byte and kpop arguments stay today's. No en or em dash, no emoji.
1. Q/app/api/quiz/[id]/play/route.ts: the kpop badges (perfect_score, hard_mode, viral_hit) are granted only when SITE_ID is 'kpop'.
2. Q/app/api/quiz/[id]/play/route.ts and Q/app/api/game/[id]/play/route.ts: the quiz (or game) must belong to the build's site, else 404.
   Use the existing site-scope helper of Q/lib/site/scope.ts (forSite and its SITE_SCOPE flag) so that on kpop with the flag off the
   query and the response are exactly today's; off kpop the check always applies.
3. docs/pending-migrations/multisite/008-write-locks.sql: record_bt_play takes its site from
   `COALESCE(NULLIF(current_setting('app.site_id', true), ''), 'kpop')`, never from the request's groups. Re-apply 008 on o1-scratch
   (/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/migrate-dev.sh --branch scratch, which re-runs a changed
   file; if it skips it, apply it with the env.sh psql command of the brief LC1), then rerun apps/quiz/e2e/o1/B3/equivalence.sh and
   checks.sh: same hash as before (bc1327561ca19bfa466208dbdcc1079e) and all checks pass. Update docs/o1/reports/LC/scratch.md.
4. A unit test per fix (a non-kpop build gets no kpop badge; a quiz of another site answers 404; kpop with the flag off unchanged).
   `pnpm -C apps/quiz exec tsc --noEmit` 0 errors; `pnpm -C apps/quiz exec vitest run src/app/api src/lib` green.
Commit on o1/B3 ("o1: B3 fix of the R blockers"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, the 3 fixes, hash, checks.
