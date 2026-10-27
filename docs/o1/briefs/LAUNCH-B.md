# Launch decisions of the owner (2026-10-26): docs and two owner tools
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-launchb, branch o1/launchb (= o1/integration). Read
docs/launch/o1/RUNBOOK.md (sections A, K, L and "Still to decide"), SQL-ORDER.md, OWNER-TODO.md, docs/o1/LEDGER.md (D-099 onward),
apps/quiz/src/lib/site/registry.ts (PLACEHOLDERS, hub brand values), docs/o1/requests/H2b.md. Never open ~/kpq-o1/secrets; never
run anything against production; no en or em dash, no emoji. Never `git add -A`.
## Write
1. OWNER-TODO.md: a dated calendar with T0 = Tuesday 1 December 2026: B on 29 or 30 October, the watch until 6 November, D (008) on
   9 November, E on 10 November from 18:00 UTC, F 11 to 13 November, G 16 November, H 17 to 24 November, J 24 to 30 November, K on
   1 December, L after. Each section of the file gets its date. Item 2 of the open decisions (T0) is closed; so are L10 (at launch),
   the hub tables (yes, week 1 after launch, after L3, not on the launch path), the mascot and logo (the rabbit for now), the hub
   brand values (accepted: list them from the registry with their current value), legal/notice and privacy/age-15 (merged as
   P-Mingi/KpopQuizzV2#122 and #123), account-deletion.sql (the owner applies it this week, A4).
2. RUNBOOK: K5.3b, apply LAUNCH/L10-PERS-personality.sql after L08 and before L12 (from SQL-ORDER row 27b); "Still to decide": T0
   set; section L (week 1, after L3): the two hub tables 001-quiz-daily-plays and 002-xp-daily-snapshots with their nightly crons
   (from docs/o1/requests/H2b.md), with their checks.
3. docs/launch/o1/A1-A3.sh: one script the owner runs from the repo root: creates the work folder of A1, asks the production
   database password with `read -rs` (never echoed, never written to disk, never in a process argument: pass it through PGPASSWORD
   in the environment of each call only), runs the A2 pg_dump backup exactly as the RUNBOOK says, then the V0 and V1 checks of A3;
   prints only pass or fail lines and the backup file name and size; `set -euo pipefail`; refuses to run if the target is not the
   production ref of the RUNBOOK. Add `bash -n` and shellcheck-clean (if available) and a dry run flag that prints the steps only.
4. docs/launch/o1/A5-REVIEW.md: the summary for the owner's review of the pull request o1/integration to main, by zone (kpop pages
   and components, shared libs, middleware and next.config, API routes, crons, SQL files, tests and tools, docs), for each: what
   changes for kpopquiz.org, the risk, and the flag or guard that keeps it off until launch; then the 10 files to read first. Build
   it from `git diff --stat origin/main...o1/integration` and the LEDGER, reading the diffs of the kpop-facing files. 15 minutes of
   reading for the owner: short lines.
5. LEDGER: one line D-124 with these decisions.
One commit ("o1: launch decisions D-124, calendar, A1-A3 script, A5 review"; last line `Co-Authored-By: Claude Sonnet 5.5
<noreply@anthropic.com>`). Hand back at most 6 lines.
