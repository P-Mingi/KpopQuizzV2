# REPORT - TIERLIST phase 3.3: the test suite runs in CI, and a missing env fails legibly. Preview push only.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). The audit gap - 51 unit + 26 e2e tests existed but
NOTHING ran them in CI - is closed. Both items done and proven by a real GitHub run, not a local
log. No push to main, no env file touched, no new migration, no em dashes, zero emoji. Proofs:
`docs/proofs/tierlist-p3.3/`.

## ITEM 1 - a test workflow that actually gates

New `.github/workflows/tests.yml` (seo-gates.yml untouched: `git diff` vs origin/main empty), two
jobs, copying the seo-gates setup shape (pnpm 10.32.1, node 20, `pnpm install --frozen-lockfile`):
- **unit**: `pnpm run test:unit` in apps/quiz. No server, no DB, no secrets (the unit tests are
  pure and mock fetch), so it runs on EVERY push and every PR and stays fast.
- **e2e**: maps the existing secrets exactly as seo-gates does (`QUIZ_SUPABASE_URL` ->
  `NEXT_PUBLIC_SUPABASE_URL`, `QUIZ_SUPABASE_ANON_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SITE_URL/NAME`, and the same `not-a-credential-ci-placeholder` service-role key),
  installs the bundled Chromium, builds and starts the app on :3021, waits for a 200, then runs
  `test:e2e`; the Playwright report is uploaded as an artifact on failure. It runs on `main`,
  `preview/**` and pull requests, not on every branch push (a full build + start is too heavy for
  that).
- Playwright browser trap handled: `playwright.config.ts` is now CI-aware - `channel: 'chrome'`
  locally (the owner's Mac Chrome), `channel: undefined` on CI (the key is set explicitly so it
  overrides any device default), which uses the Chromium that
  `npx playwright install chromium --with-deps` installs. The local system-Chrome run is unchanged.

**CI proof (a runner executed it):**
Run https://github.com/P-Mingi/KpopQuizzV2/actions/runs/34841673270 on `preview/verse-stack`
(commit 91dc629), conclusion **success**.
- unit: `Test Files 7 passed (7)`, `Tests 51 passed (51)`.
- e2e: `Running 34 tests` -> `8 skipped`, `26 passed (29.6s)`, after the in-workflow `check:env`
  printed OK, Chromium installed, the app built and started on :3021.

Coverage in numbers (so the green is not over-read): unit = 51 pure tests (mock fetch, no DB, no
secrets); e2e = 26 passed + 8 skipped (the desktop-only discovery/wizard specs skip on the mobile
project), against the anon key only. NOT covered: signed-in creator/admin flows - a runner has no
auth session, so those stay the phase-3 live checks, not CI (the same honesty seo-gates.yml applies
to /verse and /rankings).

## ITEM 2 - a missing env fails fast and legibly

New `apps/quiz/scripts/check-env.mts`, chained into the build before `next build`:
`check:routes && check:verse-tokens && check:env && next build`. It asserts
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present, checking `process.env`
(Vercel injects vars there) and then the local env files Next itself would load (a dev's
`apps/quiz/.env.local`), since this runs before Next loads them. On a miss it exits 1 immediately,
naming the missing variable(s) and the environment; it never prints a value. So the Vercel Preview
failure that surfaced as `Export encountered an error on /leaderboard` would now fail at the top of
the build as `[check:env] Build preflight FAILED ... Missing required public env var(s):
NEXT_PUBLIC_SUPABASE_URL, ...`.

`/leaderboard` (and `CommunityContent`) were deliberately NOT wrapped in `safeFetch`: that unwrapped
read is the only thing that fails a build when the database is unreachable, and wrapping it would let
a build with no database ship as a silently empty green site. The preflight replaces the accidental
canary with a deliberate, legible one; the hard failure stays.

**Preflight proof (`preflight.txt`):** with the env present -> `[check:env] OK ...` (exit 0), build
proceeds (verified in the local build and in the CI e2e build); with the vars unset and no env file
-> the named failure (exit 1).

## Local still green

`test:unit` = 51 passed; `test:e2e` = 26 passed + 8 skipped with `channel: 'chrome'` on the Mac - the
CI-aware change did not break the local run.

## Not pushed / not touched

main NOT pushed (production stays the owner's gate); only `preview/verse-stack` was pushed
(46289a2 -> 91dc629). No env file edited. `seo-gates.yml` unmodified. No phase 1-3.2 work reopened.

## Owner gate

1. **The Vercel Preview scope still needs the Supabase env vars** (NEXT_PUBLIC_SUPABASE_URL +
   NEXT_PUBLIC_SUPABASE_ANON_KEY, and the service-role key) for the preview DEPLOY to build - the CI
   test workflow has them from repo secrets and is green, but the Vercel deploy reads Vercel's own
   env. With the preflight in place, a missing one now fails at `check:env` naming the variable.
2. **Push main** for production, when you choose.

---

STOP. The 51 unit + 26 e2e tests now gate in CI (run 34841673270, success on preview/verse-stack),
and a missing Supabase env fails at `check:env` naming the variable instead of as an unrelated
/leaderboard error. main not pushed. seo-gates untouched.
