# Owner test tools, lane Q0b: 3 local sites on o1-dev, and a one-time sign-in link for a fixture account
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-Q0b, branch o1/Q0b. S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1.
Read this brief, apps/quiz/e2e/o1/C3/run-dev.sh and apps/quiz/e2e/o1/O1/run-dev.sh (how the 3 sites are built and served on o1-dev),
S/env.sh and S/dev-multi.sh headers, docs/o1/fixtures-dev.json (keys only: never print a password field) and the code you change.
## Rules
- Never touch production, never push, never use a connector or the supabase, vercel or gh commands. Never open or list ~/kpq-o1/secrets;
  scripts source it through S/env.sh only. Never print a key, a database URL, a token or a link except the one link tool 2 prints on purpose.
- New files only under scripts/o1-tools/ and docs/o1/reports/Q0b/. No app code change unless tool 2 cannot work without it (then the
  smallest change, compiled out of every production build, and say so). Write files with Bash, never the Write or Edit tools.
- No en or em dash, no emoji.
## Tool 1: scripts/o1-tools/dev-up.sh [--rebuild] [--stop] [--status]
Builds kpop, anime and hub from o1/integration (the worktree's checkout) against o1-dev exactly as O1/run-dev.sh does (SITE_SCOPE=1,
NEXT_PUBLIC_UX_V1=1, NEXT_PUBLIC_UX_V12=1, PASSPORT_JUMP=1 with run-only secrets generated once per start and shared by the 3 servers),
reuses a build when the sources did not change, starts the 3 servers in the background with logs under ~/kpq-o1/logs/dev-up/, waits until
each answers, and prints exactly three lines: `kpopquiz  http://...`, `otakuquiz http://...`, `fanquiz   http://...` (the hosts and ports
the cross-site jump works with). --status prints the same three lines or "stopped"; --stop stops them. Refuses if the env is not o1-dev.
## Tool 2: scripts/o1-tools/signin-link.sh <fixture key or email> [kpop|anime|hub]
Prints one one-time sign-in link for that fixture account on o1-dev, opening the chosen local site (default kpop) signed in. No password
anywhere. Refuses any target but o1-dev (check the branch ref the way S/env.sh does), refuses an email that is not in docs/o1/fixtures-dev.json.
Preferred: Supabase's own magic link (admin generateLink, type magiclink) consumed without any app change, for example a tiny local helper
on the same host as the site (cookies ignore ports) that verifies the token with @supabase/ssr and sets the session cookie, then redirects
to the site; the link is valid once and for 10 minutes at most. Say which way you chose and why.
## Checks
1. dev-up.sh starts the 3 sites; curl of each / answers 200; --status and --stop work; a second start without --rebuild reuses the builds.
2. signin-link.sh for 2 fixture accounts (one kpop-only, one anime member): opening the link with curl (cookie jar) gives a signed-in
   page (the account's username in the HTML); the same link a second time fails; a non-fixture email and a production-looking env are refused.
3. Stop everything after the checks. Report in docs/o1/reports/Q0b/tools.md (what each command does, its exact usage, the checks; no secret).
Commit on o1/Q0b ("o1: Q0b ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, the 2 exact commands with an example, the 3 addresses, the checks.
