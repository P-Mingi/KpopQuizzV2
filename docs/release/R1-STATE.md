# R1 release state

Owner of this file: the R1 release agent. Prompt: `docs/design/growth-v12/R1-RELEASE-PROMPT.md` (on disk in the
main checkout). Working copy: `../KpopQuizzV2-r1`, branch `r1/fixes`. The flag `NEXT_PUBLIC_UX_V1` stays OFF in
production for the whole run (owner, 2026-09-30); R1 never sets, changes or removes it.

- Phase: **1 done, 2 (ship v11 flag off) starting.** Started 2026-10-01 by the owner, in the former W2 session
  ("New mission: R1"; the W2 conditions are met: its :3021 server is off, PR #66 checks are green on `d305bb2`).

## Preflight (2026-10-01)

- PR #66: open, draft, head `d305bb2`, MERGEABLE / CLEAN, 5 checks green, 1 skipped by design. `origin/main`
  (`450f053`) is an ancestor of `origin/feat/ux-v1-v11`, 0 commits on main missing from the branch. `main` has no
  branch protection.
- :3021: nothing listens. No build in progress on GitHub.
- Tools: `gh` logged in (P-Mingi, scopes repo + workflow). Vercel CLI 59.4.0 logged in (p-mingi), worktree linked to
  `p-mingis-projects/kpopquiz` (the `.env.local` with an OIDC token that `vercel link` wrote was deleted, the
  `.gitignore` change reverted). **SQL: no access.** The Supabase connector of this session only sees the Pricely
  project, never to be touched; for `rdkgouofytwfdpbxbzio` the owner pastes each file in the SQL editor and
  answers "applied <file>" (prompt section 4b).
- Vercel env (names only): `NEXT_PUBLIC_UX_V1` exists only for Preview on branch `feat/ux-v1-v11`, not for
  Production. `CRON_SECRET` exists for Production. `QOTD_ROTATION_FIX` and `UX_P4_CHALLENGE_SECRET` are not set.
- Production before the run: deployment `dpl_EFeDUcVmFJJdj7PsAAvLpVx1KTX2`
  (`kpopquiz-15753ssy9-p-mingis-projects.vercel.app`, 2026-09-21, commit `450f053`). **This is the rollback target.**
- Rollback rule, read in Vercel's docs (`/docs/instant-rollback`, 2026-10-01): "After a rollback, Vercel turns off
  auto-assignment of production domains. This means new pushes to your production branch won't go live
  automatically." `vercel promote <deployment>` undoes it and restores auto-assignment. A rollback also brings the
  cron jobs back to the rolled-back deployment's state and does not change env vars. So: every step after a
  rollback ends with `vercel promote <good deployment> --yes` and `vercel inspect kpopquiz.org`.
- Snapshot script: `docs/release/snapshot.mjs` (GET only, 40 URLs: status, redirect, title, description,
  canonical, hreflang, robots, og, H1, parsed JSON-LD, internal links; sitemap as a sorted URL list without
  lastmod; robots.txt body). `docs/release/snapshots/before.json` taken 2026-10-01: 40 / 40 answer 200, sitemap
  645 URLs. Natural variance between two snapshots one minute apart: one link on `/pt/leaderboard` (the random
  fake accounts, removed by F4); nothing else.
- A second Claude session was open in this worktree's terminal since 2026-09-30 with an empty prompt (no
  transcript, nothing done). The owner was asked to close it: one R1 only.

## PRs

| PR | What | Status |
|---|---|---|
| #66 | v11 behind the flag (feat/ux-v1-v11 -> main) | open, draft, green |

## SQL

Nothing applied. Order and gates: prompt section 4 (`go migrations`, later `go rls`). `r1-ranked-season1.sql` is
written in this run and NOT applied.

## Decisions and notes

- Normalized, not failures: hashed `/_next/static` paths, build id, `self.__next_f` order, timestamps, sitemap
  lastmod, live counters, the quiz of the day.

NEXT ACTION: section 2. `gh pr ready 66`, confirm its checks are green, `gh pr merge 66 --merge`. Wait for the
Vercel production deployment of the merge commit (retry once on Supabase timeouts when nothing else builds; if it
fails again do F7 first). Snapshot `after-merge.json` and compare to `before.json`; any difference beyond live
counters: `vercel rollback`, promote rule, revert PR, tell the owner, stop.
