# R1 release state

Owner of this file: the R1 release agent. Prompt: `docs/design/growth-v12/R1-RELEASE-PROMPT.md` (on disk in the
main checkout). Working copy: `../KpopQuizzV2-r1`, branch `r1/fixes`. The flag `NEXT_PUBLIC_UX_V1` stays OFF in
production for the whole run (owner, 2026-09-30); R1 never sets, changes or removes it.

- Phase: **2 done (v11 shipped flag off, production unchanged), 3 (fixes) in progress.** Started 2026-10-01 by the owner, in the former W2 session
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
| #66 | v11 behind the flag (feat/ux-v1-v11 -> main) | MERGED 2026-10-01 10:33 UTC, merge commit `9affc2e` |

## Section 2 result (2026-10-01)

- Production deployment of `9affc2e`: `dpl_5J83dTjwFr7Ji7gkdnnzrPadqRvN` (`kpopquiz-n2nrieowg`), READY at the first
  build, `kpopquiz.org` serves it. CI on main: Tests (unit + e2e) green.
- `after-merge.json` vs `before.json`: 40 / 40 answer 200; status, title, canonical, robots, hreflang, H1, og and
  `robots.txt` identical on every URL. Differences, all data refreshed by the new build, none from v11 code:
  play counters and dateModified in JSON-LD and one meta description (910 -> 911 plays); the news feed; /stats
  top list; `/easy-kpop-quizzes` shows its 10 quizzes again (the old deployment had cached an empty list, the
  legacy cached failed read of decision 28); the sitemap went from 645 to 661 URLs: 9 new quizzes, /tuide-quiz,
  /illit-trivia, 3 pulse months, and `/verse` + `/verse/promises` (sitemap.ts, unchanged by v11, drops the whole
  Verse block when its seed query passes 8 s at build time; the old build had hit that timeout).
- One visible change, not from v11 code: the home footer now shows the "Portugues" language link (`/pt`) like the
  8 other translated pages. `locale-switcher.tsx`, `footer.tsx`, the middleware and the flag-off branches of the
  layouts and of the home are unchanged; the old deployment's cached home did not render it, the fresh build does.
  Not a rollback case; to re-check after the home revalidates (3600 s).
- "SEO gates" workflow on main: its `docs-secrets` job is red. It was already red every night before the merge (1
  hit); the merge brought 49 more: 37 `URL-WITH-CREDENTIALS` are false positives (the pattern reads
  `https://schema.org","@type"` in JSON-LD dumps of the v11 reports as user:password@), 12 emails are placeholders
  (`example.com`, the commit attribution address) or bytes in PNG / WEBP files. No key, token or password hit.
  **One real finding, for the owner:** `docs/design/ux-dashboard-v1/DECISIONS-LOG.md` (design package, public on
  GitHub since 2026-09-25) holds the email of the parity test account `testtest`, a public disposable mailbox:
  anyone can read that inbox and get a sign-in link for the account. Owner action: change the account's email to
  a private address (Supabase, Authentication, Users) and update `UX_V1_TEST_EMAIL` in Vercel and GitHub. R1 makes
  the gate green again in `r1/fixes` (fix F11: pattern, binary files, placeholders, the address replaced by a
  placeholder in the doc).

## SQL

Nothing applied. Order and gates: prompt section 4 (`go migrations`, later `go rls`). `r1-ranked-season1.sql` is
written in this run and NOT applied.

## Decisions and notes

- Normalized, not failures: hashed `/_next/static` paths, build id, `self.__next_f` order, timestamps, sitemap
  lastmod, live counters, the quiz of the day.

NEXT ACTION: section 3 on `r1/fixes` (already merged with `origin/main` 9affc2e; node_modules and
apps/quiz/.env.local are symlinks to the main checkout, never staged). One commit per fix with its test:
F1 (done, to commit), F2 .. F10, F11 (docs-secrets gate). Then the checks of section 3 (tsc, vitest, flag-off and
flag-on builds one at a time and only when nothing builds on Vercel or GitHub, v11 specs p2 p6 p9 shell at 1440
and 390, flag-off snapshot), push, PR, merge when green, `after-fixes.json`.
