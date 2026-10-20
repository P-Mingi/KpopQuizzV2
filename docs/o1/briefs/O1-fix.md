# Fix lot after the e2e pass, lane O1: the 4 app failures of docs/o1/reports/C3/e2e-dev.md
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-O1, branch o1/O1. Q = apps/quiz/src,
S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1. Read this brief, the e2e report above (in your worktree),
the failing specs under apps/quiz/e2e/o1 (leak, C3) and the code you change; nothing else.
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets (not
  even to list names), never print a URL with a key, token, code or ticket. The e2e may write to o1-dev only through the app and its
  own test users (run-dev.sh --with-jump is allowed). Never edit an existing spec, test or gate, docs/o1/**, scripts/o1/**.
- Write files only with Bash (heredoc, sed, python), never with the Write or Edit tools. No en or em dash, no emoji. Stop every server.
- kpopquiz.org stays byte for byte with SITE_SCOPE off: same queries, same render tree (Q/lib/o1-flight-tree.ts and a snapshot from the
  base for any kpop component you change). Site differences come from the registry (Q/lib/site/registry.ts), never a hardcoded brand.
## Fixes
1. The jump: Q/app/(site)/auth/passport/out/route.ts was never committed (.gitignore line 11 `out/`). Take it from
   /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B3/apps/quiz/src/app/(site)/auth/passport/out/route.ts (read only),
   add a narrow negation to .gitignore for that folder, commit it, and check nothing else of the repo is ignored by `out/` that should not.
2. Site scope of the kpop readers: every read of a site-scoped table in Q/lib/db/queries/quizzes.ts goes through forSite (Q/lib/site/scope.ts),
   and so does every other reader the leak specs catch (content-leak, /q/<anime slug> on kpop answers 404). With SITE_SCOPE off on kpop
   the query text is today's. Add a unit test per reader family.
3. Anime and hub chrome: Q/components/layout/ux-v1/ux-footer.tsx shows no kpop top groups, /stats or Discord off kpop (features off per
   the registry, through an optional prop or the registry, kpop tree unchanged); the Organization JSON-LD of Q/app/sites/[site]/layout.tsx
   and the /series JSON-LD use the site's name and origin; the hub /directory Open Graph tags use the hub's name.
4. Per-site robots and sitemap: /robots.txt and /sitemap.xml answer 200 on anime and hub with their own origin (anime lists its home,
   /series, the series hubs and quizzes; hub lists its home and /privacy), kpop's unchanged. Locale paths /es/, /fr/, /id/ and the /daily
   redirect are kpop only: on anime and hub they answer 404. Routing lives in Q/lib/site/routing.ts (you may change it; middleware.ts and
   next.config.ts stay untouched).
## Checks (all must pass)
1. `bash apps/quiz/e2e/o1/C3/run-dev.sh --with-jump` (rebuilds the 3 sites against o1-dev): every test passes or skips with a reason that
   is not an app defect; the jump passes end to end. Results in docs/o1/reports/O1/e2e-after-fix.md.
2. `pnpm -C apps/quiz exec tsc --noEmit` 0 errors; `pnpm -C apps/quiz exec vitest run` green; `S/check.sh $PWD` ok.
Commit on o1/O1 ("o1: O1 ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, per fix what changed, the e2e totals before and after, open issues.
