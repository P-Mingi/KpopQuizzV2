# Owner tour of the 3 sites on o1-dev: screenshots, issues, obvious fixes (lane C1)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-C1, branch o1/C1 at o1/integration. Read this brief,
docs/o1/reports/Q0b/tools.md (dev-up.sh, signin-link.sh), docs/o1/reports/C1/report.md and C3/report.md (known items) and the code you change.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open or list ~/kpq-o1/secrets; never print or save a sign-in link
  or token (use them only inside your scripts). Files with Bash only. No en or em dash, no emoji, no image of a work.
- kpopquiz.org must not change in production: fix only anime and hub pages and world-only modules, or a shared component with an optional
  prop and the proofs (o1-flight-tree snapshot from the base, apps/quiz/e2e/o1/P1/kpop-chunks.sh, check.sh twins ok). A read that leaks
  content across sites is fixed with forSite (kpop with SITE_SCOPE off unchanged).
## The tour (Playwright, scripts/o1-tools/dev-up.sh --rebuild --ports 3180,3181,3182 from your worktree, o1-dev data)
Viewports 1440 and 390 px; signed out and signed in (fixtures: dual, kpop_heavy, anime_new through signin-link.sh in local mode).
- otakuquiz: home, /series, three series hubs (A, B, C tiers, one long name), a series trivia page, /quizzes, /new, /trending,
  /leaderboard, /daily, a quiz played to the result (and one gated by the spoiler shield), /me, /u/<member>, /settings, /login, search, 404.
- fanquiz: home, /privacy, /login, /passport and /settings (redirects), /u/<member> (redirect).
- kpopquiz: home, a group hub, a quiz played to the result, /me, the network menu (Your sites), the passport jump kpop to otakuquiz and
  otakuquiz to kpop (dual), then otakuquiz to fanquiz.
For each screen: K-pop words or kpop links on anime and hub, anime content on kpop, broken layout, overflow at 390 px, contrast, empty
blocks or empty lists, dead links (crawl every href of the page, report 4xx and 5xx), console errors.
## Output
One self-contained HTML file docs/o1/reports/TOUR/tour.html (JPEG screenshots at quality 70, embedded as data URIs, under 15 MB): the issue
list first, most serious to lightest (each with site, page, viewport, what, and fixed sha or "owner choice"), then all screenshots grouped
by site then page, signed out then signed in, 1440 then 390. Known in advance and to fix: the anime home "From the community" row shows a
K-pop debate (unscoped read); the series picker in settings.tsx still shows initials (lanes O2 and C1 are HOT-exempt, so fix it).
Fix everything obvious (wording, scoping, layout, contrast, dead links) and re-shoot the fixed screens; list the choices for the owner.
Prove: `pnpm -C apps/quiz exec tsc --noEmit` 0; `pnpm -C apps/quiz exec vitest run src/components src/lib src/app --testTimeout=120000`
green; check.sh twins ok; kpop-chunks no new client module on kpop. Stop the servers and delete builds after.
Commit on o1/C1 ("o1: C1 owner tour and fixes"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, counts of issues by severity, fixed and left, the HTML path and size, owner choices.
