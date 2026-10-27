# A5 review: the pull request o1/integration to main (for the owner, 15 minutes)

Written 2026-10-26 (D-124) from `git diff --stat origin/main...o1/integration` (main 73a4bd0, branch 34baa6a) and the LEDGER.
RUNBOOK step A5. Companion files in this folder: `RUNBOOK.md`, `SQL-ORDER.md`, `ENV.md`, `ROLLBACK.md`.

## The size, and what proves it is safe

- 536 commits, 3,408 files, +564,172 lines, 0 files deleted.
- 3,209 files are new. 199 are changed, mostly small edits (1,305 lines removed in all).
- The big part is not code: docs 2,177 files (anime facts 404, run evidence 1,277), tests and tools 291, public images 141.
- Tests: 4,241 of 4,241 pass (last merge, D-123).
- Offline parity of kpopquiz.org: 60 pages identical to main (last merge). Production proxy runs are in the LEDGER (D-088, D-102, D-114).
- Reports C1 (visual), C2 (backend, security), C3 (QA, SEO) exist. C2's one blocker and six findings were fixed (D-088).
- S4 is applied in production (D-103). B7 is inside this PR.
- Visible change on kpopquiz.org with every flag off: one. The contact mailbox is `hello@kpopquiz.org` (was `contact@` and `support@`) in the Organization JSON-LD, /privacy, /terms, /banned (D-115).
- Nothing in this PR touches the database. Vercel deploys code only. The SQL is yours, applied in phases B to G.

## The switches that keep it off (all off by default)

| switch | where | turns on | when |
|---|---|---|---|
| `SITE_SCOPE` | kpop project, server | site filter on 24 tables | B6, after 002 |
| `NEXT_PUBLIC_NET_FOOTER`, `_MENU`, `_BEACON`, `_FACTS` | 3 projects, public | network footer line, "Your sites" menu, counters, crossover facts | L3, one per day (FACTS later) |
| `NEXT_PUBLIC_NET_PRIVACY` | kpop, public | `/legal` page, login notice, footer link | L3b |
| `NEXT_PUBLIC_NET_DELETION` | kpop, public | "Delete account" through the passport | L3b, after 016 and 017 |
| `PASSPORT_JUMP` | 3 projects, server | `/auth/authorize`, `/auth/arrive`, `/api/passport/redeem`, signed-in jump | K7 |
| `NEXT_PUBLIC_SITE_ID`, `NET_INDEXING`, `NET_LAUNCH_DATE` | anime and hub projects only | which site a build is, indexing | H2, K10 |

Without `NEXT_PUBLIC_SITE_ID` a build is kpop. Kpop ignores `NET_INDEXING`.

## By zone

### 1. Kpop pages and components (20 pages and 55 components changed, 187 new, 60 new anime and hub pages)

- Changes for kpopquiz.org: brand name, domain and links come from the registry (its kpop values are today's literals). The footer, nav and logo follow it. `/login` now renders a shared component (same output). The mailbox text above.
- Risk: low to medium. The shared chrome (footer, nav, tab bar, logo) and `/login` are on every page. The sign-in page is the one to try by hand.
- Guard: parity 60 of 60. New chrome parts are behind the NET flags and lazy. Kpop-only branches test `SITE_ID === 'kpop'`.
- New routes on kpop: `/legal` (404 until NET_PRIVACY), `/auth/*` (404 or plain redirect until PASSPORT_JUMP, `/auth/confirm` 404 on kpop), `/api/passport/*` (404 until the flags).
- The 60 files of `app/sites/**` (anime and hub pages) cannot answer on kpop: the middleware gives `/sites` the unknown-route 404.
- About 60 HTML and JSON snapshots under `components/__o1_*_tree__` and `app/(site)/quizzes/__o1_kpop_quizzes__` are test fixtures of today's kpop output. They are not routes.

### 2. Shared libs (67 changed, 157 new, 91 new in `lib/site`)

- Changes: `forSite` and `withSite` (`lib/site/scope.ts`) wrap reads and inserts. A level ladder per site. Share text and OG image take the brand from the registry. Badges and XP go through site-aware helpers.
- Kpop with `SITE_SCOPE` off: no filter added, same queries, same insert payloads. `award_xp` and `ensure_daily_quiz` are called as today.
- One real change in kpop queries: the quiz-to-profile embed names its foreign key (`profiles!quizzes_creator_id_fkey!inner`). Needed once 015 adds a second link (C1 found it, D-084). The production proxy runs read it fine.
- Risk: medium. These are read paths of every page. A wrong filter after `SITE_SCOPE=1` would hide content.
- Guard: flag off until B6. V1 (60 pages) and the leak check right after B6. Rollback is removing the variable.

### 3. Middleware and next.config (middleware, next.config, route-allowlist, vercel.json, plus root layout, robots, sitemap)

- Middleware: one new step. For kpop it only answers `/sites/**` with the 404 of an unknown route.
- next.config: kpop rewrites keep the V12 rules (now in `afterFiles`) and add `beforeFiles` blocks. Kpop answers its own IndexNow key file only; the two other keys are 404 on kpop. Redirects are untouched on kpop. The `X-Robots-Tag: noindex` header exists only on anime and hub.
- Root layout: no `data-site` attribute on kpop. `robots.txt` sitemap line and `sitemap.xml` come from the registry (same string; reads go through `forSite`).
- vercel.json: 2 new crons (`passport-deletions` 03:50, `passport-cleanup` 03:55), the rest re-sorted. 17 jobs.
- Risk: medium to high by reach. Every request crosses this code. The change is small and covered by tests.
- Guard: the kpop branch returns today's values. Instant Rollback in Vercel is the way back (RUNBOOK A5).

### 4. API routes (39 changed, 24 new)

- Changes: scoped reads and writes (no-ops on kpop), site-aware profile creation (kpop keeps the same insert), XP through `awardXpForSite` (kpop: `award_xp` as today), new passport and network routes.
- Watch: `/api/admin/set-qotd` and `/api/admin/auto-select-qotd` now upsert `qotd_log` on `site_id,featured_date`. That key exists only after 009. Do not use "set quiz of the day" or "auto select" between A5 and E (RUNBOOK A5 note). The 00:05 cron is not affected on kpop (`QOTD_ROTATION_FIX` stays unset there; the RPC path is today's).
- Risk: medium, concentrated on the play, create and admin routes.
- Guard: no-op while the flag is off. New routes answer 404 until their flag (the beacon answers 204 and counts nothing without NET_BEACON).

### 5. Crons (10 changed, 4 new files, 2 of them routes)

- Changes: nine kpop crons return `{"skipped": true}` on anime and hub (`cronForSite(['kpop'])`). `ensure-daily-quiz` calls the per-site daily; kpop still calls `ensure_daily_quiz(date)`. Two new routes: `passport-deletions`, `passport-cleanup`.
- Risk: low. On kpop the work runs as before. The new routes do nothing until 006, 016 and 017 exist.
- Guard: `passport-cleanup` answers 500 at 03:55 until 006 is applied (log noise only, RUNBOOK A6). Check "17 jobs" in Vercel Cron Jobs after the deploy.

### 6. SQL files (78 new, 1 changed; none runs on merge)

- Content: `docs/pending-migrations/multisite` 001 to 017 with rollbacks, `launch/` L01 to L12, `s4/`, `hub/` (two optional tables), and the `send-email` edge function (hook off, D-115).
- Changed: `daily-bank-2026-10-lot1.sql` gets two comment lines.
- Risk: none at merge. At apply time four files are DANGEROUS: 002d (every quiz insert), 003 (sign-up trigger), 008 (write locks), 010 (daily v2).
- Guard: each file is idempotent, starts with `lock_timeout`, has a rollback beside it, and has a V check. Order is in `SQL-ORDER.md`.

### 7. Tests and tools (291 files)

- Content: e2e specs, `scripts/o1/**` (parity, leak, merge), `scripts/anime/**` (loaders, editorial checks), `apps/quiz/scripts/daily-bank/to-sql.mts` (two comment lines).
- Risk: none for the site. These files are not in the app build.
- Guard: the ratchet. No existing test or gate was weakened. The PR only adds files here.

### 8. Docs (2,177 files, 453,639 lines)

- Content: anime facts and images metadata, run evidence and reports, briefs, contracts, the launch kit.
- Risk: none for the site. Repo size only.
- Guard: `docs/` is not served.

## The 10 files to read first

1. `apps/quiz/next.config.ts` (rewrites, redirects, headers: kpop branch vs the others)
2. `apps/quiz/src/middleware.ts` (the one new step)
3. `apps/quiz/src/lib/site/scope.ts` (`forSite`, `withSite`, `SITE_SCOPE`: why kpop sends the same queries)
4. `apps/quiz/src/lib/site/registry.ts` (kpop values equal today's, all flags and secrets named)
5. `apps/quiz/vercel.json` (the 17 crons)
6. `apps/quiz/src/app/api/cron/ensure-daily-quiz/route.ts` (daily per site; kpop path unchanged)
7. `apps/quiz/src/app/api/admin/set-qotd/route.ts` (the `site_id,featured_date` conflict key that waits for 009)
8. `apps/quiz/src/app/api/quiz/[id]/play/route.ts` (the busiest write path)
9. `apps/quiz/src/components/login/login-body.tsx` with `apps/quiz/src/app/(site)/login/page.tsx` (the sign-in page, now shared)
10. `docs/pending-migrations/multisite/008-write-locks.sql` (the riskiest file of the SQL, applied later, read now)

## Merge when

- Checks are green (type check, tests, twins check).
- C1, C2, C3 have no open blocker (their blockers were fixed: D-084, D-088, D-089).
- Lane B7 is in the PR (it is).
- The last production comparison was identical on 60 pages (LEDGER, last D entry).

After the deploy: V1, the Vercel deployment is Ready, one hour of Runtime Logs with no new error type, 17 jobs in Cron Jobs.
