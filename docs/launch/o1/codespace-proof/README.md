# Proof: the SQL sessions from a codespace (2026-11-06)

Run on the integrator's machine with Docker, never against Supabase. Image: `.devcontainer/Dockerfile` of this branch.

- `codespace-line.log`, made by `run-scenarios.sh`, which runs `inside.sh` in the image built for linux/amd64 (the codespace architecture), as the user `vscode`. A Postgres 17 container stands in for the Session pooler: it has the role `postgres.rdkgouofytwfdpbxbzio`, 720 tables and a local test password (`seed.sql`). There are two scenarios:
  - the codespace created on `o1/codespace` (the line switches to `main`);
  - the codespace created on `main` after the merge.

  In each scenario:
  - `post-create.sh` links `~/kpq-launch` to `/workspaces/kpq-launch` (mode 700, through sudo since `/workspaces` belongs to root).
  - The line of `CODESPACE.md` section 3, taken verbatim from the file, runs: `git checkout main` and `git pull`, the two prompts, `[YOUR-PASSWORD]` removed, the password through `PGPASSWORD`, then `pg_dump` 18 against Postgres 17. The dump has mode 600 and 2178 entries, so the `> 2000` check passes. `session.sh D` then passes its guards (target, time, branch, clean tree, psql 18, connection). Its gate 008 stops with KO, as it must on a base without the 11 functions: nothing is applied.
  - The same line ending in `--dry-run` prints the plan of D.
  - The 13 parts of `session.sh` run in `--dry-run`: exit 0, no KO.
  - The reconnect line runs, then psql connects without the password in the URL.
  - A dump copied into the repository folder shows in `git status` on today's main, and is ignored once this branch's `.gitignore` is merged.
- `rehearsal-linux.log`: `session-rehearsal.sh` of `o1/e1b-session` (PR #204, which holds main's session.sh plus E1b) in the same image, linux/arm64, plus the Postgres 18 server packages. The run used production's schema copy and no data: 65 PASS and 0 FAIL, the same result as on the Mac. session.sh and its checks run on GNU bash, sed, date and diff without a Homebrew path.
