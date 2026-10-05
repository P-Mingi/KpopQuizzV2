# Mission W3: measure the blindtest, fix the averages, complete the catalogue, open the blindtest to new players

You are the W3 ORCHESTRATOR for kpopquiz.org (repo `KpopQuizzV2`, app `apps/quiz`, Next.js 16 App Router,
Supabase project `rdkgouofytwfdpbxbzio`, Vercel, pnpm). You do not write feature code yourself. You set
up the run, spawn the agents below, keep them inside their paths, integrate their work, and run the check
loop until everything in section 8 is true.

Another run is working in the same repository at the same time: W2, the v11.2 redesign (orchestrator
in the main checkout on `feat/ux-v1-v11`, agents in `KpopQuizzV2/.claude/worktrees/agent-*` on `ux11/*`
branches). W3 must be invisible to W2. Section 3 is not optional.

Package (read first): `docs/design/growth-v12/`
- `SYSTEM.md`: the validated system. Sections 1 to 4 are W3's scope. Section 5 is W4 (after W2 merges):
  do not build it.
- `prototype.html`: the v12 design (`window.UX_VERSION = "v12 growth (2026-09-25)"`). Live copy for looking:
  https://claude.ai/artifact/AcDCcgsUaeM39VqeQC7B5d (never measure against it). Button "New in v12" lists
  the new views. Dashed boxes starting with "Design note" are annotations, never shipped copy.
- `capture-v12.mjs`: reference screenshots of every v12 state (`STATES`, W3 states have `w3: true`).
- `W3-OWNERSHIP.json`: who may touch what, and the paths W2 owns (`FORBIDDEN_W2`).
- `W3-HANDOFF.template.md`, `MESSAGE-TO-W2.md`.

The owner (Mingi) validated the plan and the design. If an agent thinks something should change, it
writes it in its report; it does not change it.

---

## 0. Rules that do not bend (copy this block into every brief)

1. Never push to `main`, never merge into `main`, never force-push. The owner merges into `main`.
2. Never run a git command inside `../KpopQuizzV2` (the main checkout, W2's branch) or inside any path
   under `KpopQuizzV2/.claude/worktrees/` or `KpopQuizzV2/.worktrees/`. Never check out, reset, rebase,
   delete, rename or push a branch that is not `feat/growth-w3` or `w3/*`. Never run `git stash` (the
   stash is shared by every worktree), `git worktree prune`, `git worktree remove` on a worktree you did
   not create, `git gc`, `git remote prune`, `git config` without `--worktree`. Never delete a git lock
   file: on a lock error, wait 20 seconds and retry, 5 times at most, then stop and report.
3. Never edit a path in `FORBIDDEN_W2`. Stay inside your own globs (the guard rejects anything else).
4. Never write, print or commit a secret (service role key, tokens, cookies, passwords). Copy env files
   with `cp`, never `cat` them. Env vars only.
5. No DDL and no data write against production. Everything that writes to the database is a file
   `docs/pending-migrations/w3-<agent>-<topic>.sql` (idempotent: `create ... if not exists`,
   `insert ... on conflict do nothing`, `create or replace`) with a header comment: what, why, rows
   touched, how to verify, how to undo. The code fails soft until it is applied. A file is applied only
   after the owner types exactly `go <filename>` in this session (section 4c).
6. Data safety: never change anyone's XP, level, streak, badges, likes, comments, settings or plays.
   Every row W3 code writes outside production (`process.env.VERCEL_ENV !== 'production'`, which covers
   localhost and previews) is marked `is_test = true`. Read-only SQL for everything else. Every W3
   Playwright spec stubs with `page.route` every existing write endpoint it could reach
   (`/api/blind-test/play`, `/api/daily/blindtest/submit`, `/api/quiz/*/play`, challenge creation, likes,
   comments, anything under `/api/auth`) and lets only `/api/track/bt-run` through. W2's checks use the
   same test user (daily one try, XP): a W3 spec must never consume them.
7. SEO is a blocker: every existing public URL keeps its URL, title, meta description, H1, intro text,
   FAQ text, JSON-LD, canonical, hreflang, `/pt` mirror and server rendering. The only allowed changes on
   existing pages: corrected average percentages (T2) and new sitemap entries (T4).
8. Real data only. No floored, random or invented counts. A number that is not available is hidden.
9. No emoji. No em or en dashes in UI copy, code comments you add, docs or reports.
10. KPop Demon Hunters: text and audio only. No poster, still, character art, logo, Netflix or Sony
    branding. The film title is used descriptively ("KPop Demon Hunters songs blind test"). TikTok: no
    logo, no branding, the word only.
11. Do not redraw group logos or the KpopQuiz logo. Photos only from `apps/quiz/public/idols/`. No photo
    scraping, no web scraping of any site. Deezer's public API is the only external data source for songs.
12. No account creation, no password typed anywhere, no inbox opened (section 3b).

---

## 1. Facts checked in the repo on 2026-09-25 (verify, do not trust blindly)

- Blindtest: the hub game `components/blind-test/blindtest-game.tsx` (used by `/blindtest` and
  `/pt/blindtest`) calls `/api/blind-test/generate`, `/api/daily/blindtest`, `/api/daily/blindtest/submit`,
  `/api/daily/blindtest/leaderboard`. The playlist pages `/blindtest/[mode]` render
  `components/blind-test/blind-test-player.tsx`, which calls `/api/blind-test/generate` and
  `/api/blind-test/play` (old `blind_test_plays` / `blind_test_songs`, last row 2026-06-05).
- `lib/blind-test-modes.ts`: `STATIC_MODES` feeds `/blindtest/[mode]` (`generateStaticParams`) and the
  sitemap. `category` is `'difficulty' | 'group' | 'era' | 'special'`. Existing ids include `recent-hits`
  (2024 to 2026) and `4th-gen`. `lib/blind-test-playlists.ts`: `ROUND_SIZE = 10`, 79 advertisable groups.
- `/api/blind-test/generate` takes a `playlist` value (all, gg, bg, solo, generations, title-tracks, hits,
  deep, a group slug, a list of group slugs) and filters `songs` on `status = 'active'`, `group_id`,
  `gender`, `generation`, `is_title_track`, `tier`, `is_curated`.
- Routing: `middleware.ts` 301s any path unknown to `lib/route-allowlist.ts` (`KNOWN_ROUTES`, startsWith)
  to `/`. Any path ending in `-quiz` is known. `src/middleware-matcher.test.ts` covers the matcher.
  `next.config.ts` 301s `/which-:group-member-are-you` (not W3's business).
- i18n: `lib/i18n/config.ts` knows `en` and `pt` only and drives site hreflang; `/pt` pages set `lang`
  with an inline script in `app/(site)/pt/layout.tsx`. Do not add fr, es, id to `SUPPORTED_LOCALES`.
- Scores: `lib/quiz/scoring.ts` has `scoreIsPerQuestion` (hides numbers for clue quizzes on `/q/[slug]`).
  Averages are computed inline as `total_score_sum / total_completions / question_count` in
  `components/quiz/quiz-card.tsx`, `components/home/quiz-of-the-day.tsx`, `components/home/trending-card.tsx`,
  `lib/quiz/teaser.ts`, `lib/db/queries/stats.ts` (drops values over 100), `app/(site)/admin/page.tsx`,
  `app/api/admin/quizzes/route.ts`. Clue quizzes (`guess_from_clues`) score up to 3 points per question
  (`quiz-player.tsx`, play API `max_score`).
- Catalogue: `apps/quiz/scripts/ingest-blindtest-songs.mts` pulls a group's tracks from Deezer and writes
  straight to `songs` (idempotent on `deezer_track_id`, no dry run).
- Analytics: `lib/analytics.ts` wraps Vercel Web Analytics with six fixed event names. Do not add names.
- Git: `extensions.worktreeConfig = true`. W2 sets `core.hooksPath` per worktree (`--worktree`). Do the same.

---

## 2. The team

Create each agent's worktree yourself, then spawn the agent with the Agent tool WITHOUT the worktree
isolation option (where that option puts worktrees is not guaranteed, and `KpopQuizzV2/.claude/worktrees/`
is W2's): `git worktree add ../KpopQuizzV2-w3-agents/<id> -b w3/<id>-<name> feat/growth-w3`, then
`git -C ../KpopQuizzV2-w3-agents/<id> config --worktree core.hooksPath scripts/w3-hooks` and
`git -C ../KpopQuizzV2-w3-agents/<id> config --worktree w3.agent <id>`. The brief gives the agent that
absolute path; its first reply includes `git rev-parse --show-toplevel` and `git config --worktree w3.agent`
from there. Builders own disjoint paths and run in parallel (max 4 at once). Q runs in Phase 2.

| Id | Agent | Scope |
|---|---|---|
| T1 | Tracking | `bt_runs` model, `/api/track/bt-run`, `trackBtRun()`, wiring in both blindtest components, claim of guest runs, `/admin/blind-tests/runs`, the `strings` prop on the game |
| T2 | Scores | score helpers in `lib/quiz/scoring.ts`, every average and score label outside W2's paths |
| T3 | Catalogue | RESCENE, NCT WISH, songs for Hearts2Hearts, KickFlip, RESCENE, NCT WISH, 2026 releases, KPop Demon Hunters songs, sourced title tracks, all as pending SQL |
| T4 | Acquisition | themed playlists, generate API filters, 4 landing pages, KPop Demon Hunters bridge quiz, route allowlist, sitemap, hreflang, JSON-LD |
| Q | QA + SEO checker | build, types, lint, unit, e2e, axe, Lighthouse, SEO diff vs main, layout vs prototype, tracking proof, REPORT.md |

---

## 3. Isolation from W2 (hard rules)

- Your session runs in `../KpopQuizzV2-w3` (worktree of `feat/growth-w3`, created from `origin/main` by
  the owner before launch). Check: `git rev-parse --abbrev-ref HEAD` prints `feat/growth-w3` and
  `git rev-parse --show-toplevel` ends with `KpopQuizzV2-w3`. If not, stop and tell the owner.
- Worktrees W3 may create, use and remove: `../KpopQuizzV2-w3` (yours), `../KpopQuizzV2-w3-agents/<id>`,
  `../KpopQuizzV2-w3-base` (Q). Nothing else. Agent branches: `w3/<id>-<name>` (e.g. `w3/t1-tracking`).
- Hooks and identity: `git config --worktree core.hooksPath scripts/w3-hooks` and
  `git config --worktree w3.agent <id>` (ORCH for you) in every W3 worktree. Environment variables do not
  survive between shell calls, so the identity lives in the worktree config. Never touch the shared config.
- Guard: `scripts/w3-owner-guard.mjs` (ORCH writes it in Phase 0): reads `git config --worktree w3.agent`
  (missing = reject) and `docs/design/growth-v12/W3-OWNERSHIP.json`, rejects a staged path outside the
  agent's globs or inside `FORBIDDEN_W2`. Installed as `scripts/w3-hooks/pre-commit`. You also run it on
  the full diff of a branch (`--range feat/growth-w3...w3/<id>`) before every merge.
- Pushing: agents never push and never open PRs. You merge their branches locally and push only
  `feat/growth-w3`, with `git push origin feat/growth-w3` (no `-u`, no other branch). One Vercel preview.
- Ports: ORCH and Q use 3031, agents 3032 to 3035. Never 3021 (W2). At most 2 Next builds at once on
  this machine; queue the rest.
- W2's files are read only from disk (for example `../KpopQuizzV2/docs/design/ux-dashboard-v1/v11/
  OWNERSHIP.template.json`), never through git in that checkout.
- Shared-file requests: a builder that needs something in another builder's path writes it in
  `docs/growth/requests/<id>.md`; you forward it. The only planned one: T4 defines the `BtStrings` type
  and the fr, es, id dictionaries in `lib/growth/bt-strings.ts`; T1 adds the optional `strings` prop to
  the game (default English, output unchanged byte for byte).

## 3a. Merge touch points with W2 (checked 2026-09-25, recheck in Phase 0)

W2's branch already changes two files W3 must also edit. Keep W3's hunks away from W2's so both PRs merge
without conflict. Recheck the list with (read only, in your worktree):
`git diff --stat origin/main origin/feat/ux-v1-v11 -- <every W3 glob>` and add any new file here.
- `components/quiz/quiz-card.tsx`: W2 adds two imports after `import { formatCount } from '@/lib/utils';`
  and a flag return just above `const avgPct = ...`. T2 adds its import after the
  `import type { QuizCardData } ...` line and changes ONLY the second line of the `avgPct` expression
  (the `? Math.round(...)` line); the `const avgPct = ...` line stays untouched.
- `lib/route-allowlist.ts`: W2 adds `UX_V1_ROUTES` after the `KNOWN_ROUTES` array and one line in
  `isKnownRoute()`. T4 adds its entries on one new line right after `'/daily',` inside the array and
  touches nothing else in the file.

## 3b. Signed-in testing

- The only signed-in identity is the parity test user (`UX_V1_TEST_EMAIL`, `UX_V1_TEST_USER_ID`, in the
  owner's shell like for W2). `origin/main` has no parity setup yet: copy W2's
  `../KpopQuizzV2/apps/quiz/e2e/ux-v1/auth.setup.ts` and the helpers it imports (read from disk) into
  `apps/quiz/e2e/growth/` (ORCH owns `auth.setup.ts`; put helpers inside it or next to it under a name
  ORCH owns). Mechanism: the service role only mints a one-time OTP for that email
  (`auth.admin.generateLink`, no email sent), the OTP is verified through the app's own `@supabase/ssr`
  client, the emitted `sb-<ref>-auth-token` cookies are injected. Used by
  `apps/quiz/e2e/growth/playwright.growth.config.ts`.
- The storage state lives OUTSIDE the repo: `$TMPDIR/kpq-w3/test-user.json`. Never commit, print, upload
  or quote it. Delete it in Phase 3. Do not touch `.gitignore` (W2 owns it).
- Env: `cp ../KpopQuizzV2/apps/quiz/.env.local apps/quiz/.env.local` (and `.env.test.local` if present),
  then `git check-ignore apps/quiz/.env.local` must print the path. If a variable is missing, signed-in
  specs skip and REPORT.md says "signed-in NOT verified".
- The service role is used for two things only: minting the test-user OTP and READ-ONLY SQL. Never call
  `/api/dev/login`.
- Signed-in runs only prove that `player_id` is set and that guest runs are claimed. They never finish a
  daily blindtest or anything that awards XP.

---

## 4. Phase plan

Phase 0 (you):
1. If `docs/growth/RUN-STATE.md` exists on `feat/growth-w3`, this is a RESUME: go to 4b.
2. Copy the package: `cp -R ../KpopQuizzV2/docs/design/growth-v12 docs/design/` (read from disk). It is
   listed in the shared `.git/info/exclude`, so commit it with `git add -f docs/design/growth-v12` as the
   FIRST commit "docs(growth): v12 growth package". Check `git status` first: anything else modified,
   stop and ask the owner.
3. Read W2's real ownership file from disk (`../KpopQuizzV2/docs/design/ux-dashboard-v1/v11/OWNERSHIP.json`,
   the template if it does not exist) and add every glob it contains to `FORBIDDEN_W2` (commit).
4. Env (3b), `pnpm install`, guard + hooks + `w3.agent ORCH`, `apps/quiz/e2e/growth/playwright.growth.config.ts`
   (baseURL `http://localhost:3031`, its own projects, the write-endpoint stubs of rule 6 as a shared
   fixture, never edit `apps/quiz/playwright.config.ts`).
5. Grep every inline average and every `score/total` label (`total_score_sum`, `avgPct`, `avg_score`,
   `score}/{`). Files outside `FORBIDDEN_W2` not yet in T2's globs: add them to W3-OWNERSHIP.json (commit).
   Files inside `FORBIDDEN_W2`: list them for the handoff.
6. From `apps/quiz`: `node ../../docs/design/growth-v12/capture-v12.mjs ../../docs/growth/checks/reference`
   (PNGs are not committed: add nothing to .gitignore, just never stage them).
7. Write RUN-STATE.md, commit, create the agent worktrees, spawn T1, T2, T3, T4. Order inside the
   parallel start: T4 delivers first a type-only `lib/growth/bt-strings.ts` (the `BtStrings` type and
   the English strings), you merge it at once, T1 merges `feat/growth-w3` into its branch before it adds
   the `strings` prop, and T4's landing pages merge after T1.

Phase 1 (builders): each builds, tests, writes its report and tells you "ready" with its branch and
sha (no push, no PR). Pending SQL goes to you as soon as it is ready (4c).

Phase 2 (you + Q): merge builder branches one at a time (`git merge --no-ff`, guard first, agent checks
green), push with `git push -u origin feat/growth-w3` (always name the branch; Vercel builds a preview), run Q on localhost:3031 (production build) and on
the preview. Issues go to `docs/growth/issues/<owner-id>.md`; owners fix on their branch; up to 3 loops.

Phase 3 (you): remove the worktrees you created (`git worktree remove` on `../KpopQuizzV2-w3-agents/*` and
`../KpopQuizzV2-w3-base` only, after their branches are merged), draft PR `feat/growth-w3` -> `main` with
REPORT.md, the pending migrations and their status,
env vars to set, owner decisions. Write `docs/growth/W3-HANDOFF.md` from the template. Delete the test
storage state. RUN-STATE says DONE. Send the owner the end message (section 9).

If W2's PR is merged into main before yours: `git merge origin/main` into `feat/growth-w3` (never rebase),
rerun Q, update the PR. If yours lands first, nothing to do: W2 merges main on its side.

## 4b. Run state and resume

- `docs/growth/RUN-STATE.md` on `feat/growth-w3`, updated and committed after every event: phase, one row
  per agent (id, branch, status, last sha, open issues, report path), pending SQL files with status
  (written / shown to owner / go received / applied / verified), owner decisions, and one line
  `NEXT ACTION: ...` a fresh session can execute as is.
- Each agent keeps a Progress block (done, next, blockers) at the top of `docs/growth/reports/<id>.md`.
- Agents answer you in 20 lines max (status, branch, sha, PR, blockers). Details stay in files.
- RESUME: read RUN-STATE.md, check it against git (branches, shas, PRs), fix the file if git disagrees,
  run NEXT ACTION. A "running" agent whose branch has commits is respawned with its brief plus "continue
  from your branch and your Progress block". Never redo finished work.
- Before you run out of context or usage: finish the merge in progress, update RUN-STATE.md, commit, stop
  with "Paused at <phase>. Resume with the same launch message."

## 4c. Pending SQL: the only path to the database

- For each file, show the owner: file name, what it creates or inserts, row counts from the dry run, what
  it unlocks, the undo. Group ready files in one message. Then wait.
- On `go <filename>` (exact): apply that file only, with the Supabase MCP tool if this session has it,
  otherwise ask the owner to paste it in the Supabase SQL editor and say "applied <filename>". Then run
  the verification queries from the file header (read-only) and record the result in RUN-STATE.md.
- Never apply two files in one go, never edit a file after the owner saw it (write a new one).
- Order is in each file header (groups before their songs, `w3-t3-kpdh-schema.sql` before
  `w3-t3-kpdh-songs.sql`). Songs reference groups by `(select id from groups where slug = '...')`, never
  by a hardcoded id.
- T3's files change counts W2 checks (79 playlists, 90 visible groups). When you show them, remind the
  owner that `MESSAGE-TO-W2.md` must already be in the W2 session.

---

## 5. Briefs

Template (fill one per agent):
```
You are <id> <name> on the KpopQuiz W3 growth run. Rules: <paste section 0 and section 3>.
Your worktree: /Users/louis/IT/Dev/projects/KpopQuizzV2-w3-agents/<id> (branch w3/<id>-<name>, hooks and
w3.agent already set). cd there first and work only there; put its toplevel and w3.agent in your first
reply. Port: <3032..3035>. Never push. Owned paths: <globs from W3-OWNERSHIP.json>.
Read: docs/design/growth-v12/SYSTEM.md section <n>, the prototype states <names>, section 1 facts.
Tasks: <section 5.x>. Done when: <section 5.x>. Report: docs/growth/reports/<id>.md with a Progress
block on top. Answer the orchestrator in 20 lines max.
```

### 5.1 T1 Tracking (SYSTEM.md section 1)
1. Find out, read only (code history in your worktree, Vercel logs if reachable), why nothing reached
   `blind_test_plays` after 2026-06-05. Report it. Leave `/api/blind-test/play` working as it is.
2. `w3-t1-bt-runs.sql`: table `bt_runs` exactly as SYSTEM.md (with `is_test`), indexes, RLS enabled with
   no anon or authenticated policy (the API writes with the service role), function
   `bt_bump_song_plays(ids ...)` with the id type `songs.id` really has, called only for non-test runs,
   `revoke execute ... from public, anon, authenticated`; view `bt_song_stats` created
   `with (security_invoker = true)`, excluding `is_test`, select revoked from anon and authenticated.
3. `POST /api/track/bt-run` (`start` / `finish`): schema validation, clamped values, idempotent start
   (client uuid, `on conflict do nothing`), finish only once per run and only by the same anon id or
   player, `is_test = (process.env.VERCEL_ENV !== 'production')` (never from the Host header), user agent
   class from the header,
   no IP stored, max 60 starts per anon id per hour (then 202 and nothing written), 202 and a single log
   line when the table does not exist yet. Never awards XP.
4. `lib/tracking/bt.ts`: `trackBtRun.start()`, `.answer()` (buffered), `.finish()` (fetch keepalive),
   abandon on `pagehide` with `navigator.sendBeacon` (`completed=false`). `source` from the path and a
   `?src=` param (hub, landing-en, landing-fr, landing-es, landing-id, group-hub, daily, challenge,
   share, other). Enabled when `NEXT_PUBLIC_BT_TRACKING=1` or on a non-production host.
5. Wire it into `blindtest-game.tsx` (every flow: playlists, groups, daily, challenge) and
   `blind-test-player.tsx`. The game never waits on tracking. Add the optional `strings` prop (T4's type).
6. `/api/claim-runs`: also attach the guest's `bt_runs` rows on sign-in (same rules as today's claim).
7. `/admin/blind-tests/runs`: same admin gate as the other admin pages; runs per day, per source, per
   playlist, completion rate, runs per player per week, top and hardest songs; `is_test` excluded.
8. Tests: unit (payload clamp, source mapping, abandon), API (validation, idempotency, rate limit,
   missing table), e2e `t1-*.spec.ts` on localhost: a guest run creates start + finish rows (read back
   with SELECT, `is_test = true`), a closed tab gives `completed = false`, signed-in run has `player_id`.
   The claim test uses a fresh anon id that read-only SQL shows owns no `plays` rows.
Done when all of that passes on the preview after `go w3-t1-bt-runs.sql`, and flag off changes nothing.

### 5.2 T2 Scores (SYSTEM.md section 2)
1. In `lib/quiz/scoring.ts` (keep `scoreIsPerQuestion`): `maxPointsPerQuestion`, `maxScore`,
   `avgScorePct`, `runScoreLabel`, as SYSTEM.md. Table-driven unit tests (clues 18 of 6 questions = 100%,
   classic 5 of 10 = 50%, zero completions = null, edited quiz with fewer questions clamps to 100).
2. Replace every inline computation in your globs with the helpers (one expression per file, nothing
   else in those files changes). Add `quiz_type` to the card data only if it is missing, additively.
3. Every "score/total" label for a clue quiz shows points over max points (18/18), never 18/6.
4. Optional `w3-t2-score-view.sql`: view `quiz_score_stats` if a query needs it.
5. List every consumer inside `FORBIDDEN_W2` for the handoff (file, line, current expression).
Done when no page outside W2's paths can show an average above 100%, and Q's SEO diff shows only the
corrected numbers.

### 5.3 T3 Catalogue (SYSTEM.md section 3)
1. Read-only SQL: columns and constraints of `groups` and `songs`, how 2024 debuts are tagged
   (generation, gender, label fields), current rows for Hearts2Hearts and KickFlip.
2. RESCENE and NCT WISH: every fact from two public sources (official or label page, plus a reference
   wiki), cited in `docs/growth/catalogue/SOURCES.md`. `w3-t3-groups.sql` (`on conflict (slug) do nothing`).
3. Add `--dry-run --sql-out <file>` to `ingest-blindtest-songs.mts` (the write mode stays as is and is
   never run). Produce `w3-t3-songs-new-groups.sql` for Hearts2Hearts, KickFlip, RESCENE, NCT WISH until
   each has at least 10 clean songs (no remix, instrumental, inst., karaoke, sped up, live; Deezer preview
   present). Title tracks flagged only with a cited source.
4. `w3-t3-songs-2026.sql`: 2026 releases of groups already in the catalogue (Deezer release date in
   2026), year = 2026, same cleaning. Report the count; hits-2026 needs 10.
5. KPop Demon Hunters songs: they must never enter a pool W3 does not control (the daily blindtest,
   `getAdvertisablePlaylists()`, W2's ranked engine all read `songs where status = 'active'`). Insert
   them with their own non-active status (check the `status` constraint read only; if a new value is
   needed, `w3-t3-kpdh-schema.sql` widens it) and a null `group_id` only if the column allows it. Only
   T4's playlist selects that status. Never create a HUNTR/X or Saja Boys row in `groups`. Soundtrack
   songs by real groups (TWICE) keep their group and stay out of this playlist's status trick: the
   playlist lists them by id. `w3-t3-kpdh-songs.sql`.
6. `language` mixes `korean` and `ko`: list every reader first; propose `w3-t3-language.sql` only if
   nothing breaks. `is_title_track` backfill: out of scope, write the size of the gap in the report.
7. Each file header: verification queries (row counts, `getAdvertisablePlaylists()` count before and
   after, clean songs per group). Deezer API politely (no more than 40 requests per 5 seconds).
Done when every file is written, dry-run reports are in `docs/growth/catalogue/`, and the files the owner
approved are applied and verified.

### 5.4 T4 Acquisition (SYSTEM.md section 4, prototype views `btland`, `btpl`, `kpdh`)
1. Themed playlists in `lib/blind-test-modes.ts` (`category: 'special'` so no existing switch breaks,
   plus the data they need): `kpop-hits-2025`, `5th-gen`, `tiktok-viral` (curated list in
   `lib/blind-test-curated.ts`, one public source per song, sources in the file), `kpop-demon-hunters`
   (after T3's KPDH files are applied: selects T3's KPDH status plus the listed TWICE song ids),
   `kpop-hits-2026` (only once 10 songs of 2026 exist). A mode is
   added to `STATIC_MODES` only when it has at least 10 playable songs: it becomes `/blindtest/<id>` and a
   sitemap entry automatically. Extend `/api/blind-test/generate` for them (additive).
2. `lib/growth/bt-strings.ts`: `BtStrings` type, English extracted exactly from the game, fr, es, id.
   Reviewed copy only (the prototype's `LAND` and `THL` objects are the source; no raw machine output).
3. Landing pages `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`,
   `/id/tebak-lagu-kpop`: server rendered, one H1, lead, Start (existing game with `strings` and the
   landing `source`), themed playlists grid, 3 steps, localized FAQ with matching FAQPage JSON-LD,
   BreadcrumbList, canonical, hreflang cluster (en, fr, es, id, x-default en), `lang` set like
   `app/(site)/pt/layout.tsx`, language switch linking the four. Live numbers from the database (songs,
   playlists); the "fans playing today" line only from `bt_runs` once it exists, hidden otherwise. No
   "Play with friends" button (live mode is W4). Page CSS in `styles/growth/`, classes `gl-`, tokens
   scoped to the page root, measured against the prototype states `land-*` and `theme-*`.
4. `/kpop-demon-hunters-quiz`: "Loved HUNTR/X? Find your real K-pop girl group." Six picture-free
   questions and the six results from the prototype (`PERS.kpdh`), server-rendered intro, client quiz,
   result links to the group page and `/blindtest/group-<slug>`, share link. No film imagery at all.
5. `lib/route-allowlist.ts`: add `/guess-the-kpop-song`, `/fr/`, `/es/`, `/id/` (trailing slash) and the
   tests; do not edit `middleware.ts` (a missing matcher exclusion only costs an invocation).
6. `app/sitemap.ts`: the 4 landings with `alternates.languages`, `/kpop-demon-hunters-quiz`. New modes
   arrive through `STATIC_MODES`.
7. e2e `t4-*.spec.ts`: each landing renders server-side with the right H1, lang, canonical, hreflang,
   JSON-LD; Start plays a run; each themed page plays; the bridge quiz reaches a result; unknown paths
   like `/fr/nope` 301 to `/` only if they did before (check the rule).
Done when Q passes the pages at 1440 and 390, light and dark, and the SEO checks.

### 5.5 Q QA + SEO checker (read only on app code)
- Production build on 3031, types, lint, `test:unit`, the growth e2e config, and the existing
  `e2e/smoke.spec.ts` and `e2e/refonte-301.spec.ts`: all green.
- SEO diff: a detached worktree of `origin/main` at `../KpopQuizzV2-w3-base` (yours, removed at the
  end), built on 3032. For every URL of main's sitemap (sample 300 if larger, all hubs and `/blindtest*`
  included): title, meta description, canonical, H1, JSON-LD, hreflang, robots, server HTML landmarks.
  Allowed differences: average numbers (T2), sitemap additions. Anything else is a blocker.
- Layout vs prototype for the W3 states: content column only (the site chrome is today's): font sizes,
  weights, line heights, colours from tokens, radii, gaps, paddings within 2px, no horizontal scroll at
  390, dark theme, reduced motion. Evidence in `docs/growth/checks/layout/<state>/`.
- axe: 0 serious or critical. Lighthouse mobile on the 4 landings and the bridge quiz: performance 85+,
  SEO 100, accessibility 95+, CLS under 0.1.
- Tracking proof on the preview after the migration: a guest run, an abandoned run, a signed-in run and
  a claim, each read back with SELECT (test rows only).
- `docs/growth/REPORT.md`: one section per agent (DONE / OPEN), numbers, evidence paths, open issues,
  pending SQL status, owner decisions.

---

## 6. Env vars and flags

- `NEXT_PUBLIC_BT_TRACKING=1` on Vercel production turns tracking on (owner, after `go w3-t1-bt-runs.sql`).
- No other new env var. No new Vercel Analytics event name.

## 7. What W2 needs (goes into W3-HANDOFF.md, the owner forwards it)

- The v11 blindtest (P6) records every run through `trackBtRun()` from `lib/tracking/bt.ts`.
- Every average uses `avgScorePct()` and every score label `runScoreLabel()` from `lib/quiz/scoring.ts`
  (list of W2-owned consumers from T2).
- Group, song and playlist counts are live values (catalogue grows).
- The /blindtest Playlists section and language row of the prototype read `STATIC_MODES` themed entries
  and link the four landings.

## 8. Definition of done

- Tracking live on the preview with proof; admin page shows today's runs; flag off changes nothing.
- No average above 100% outside W2's paths; the W2 list is in the handoff.
- Catalogue SQL written and dry-run reported; the files the owner approved applied and verified.
- Landings, themed playlists and the bridge quiz pass Q (layout, e2e, axe, Lighthouse, SEO).
- One draft PR `feat/growth-w3` -> `main` with REPORT.md; RUN-STATE says DONE; test storage state deleted;
  no W3 worktree left with uncommitted work (only yours: never list, prune or remove anyone else's).

## 9. End message to the owner

Short: what is done, the PR link, SQL files waiting for `go`, env vars to set, decisions needed, the
report path, and the ready-to-forward text for W2 if it changed from `MESSAGE-TO-W2.md`. No secrets, no
raw logs.
