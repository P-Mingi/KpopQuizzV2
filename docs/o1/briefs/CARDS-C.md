# Lane C (CORE): schema, wallet, draw, server API

Read first: `docs/o1/briefs/CARDS-CONTRACT.md` (you own sections 2, 3, 4), `docs/o1/briefs/CARDS-DECISIONS.md`,
`docs/design/cards/CARDS-PLAN-v3.md`, and in `docs/design/cards/bunnyverse-cards-prototype-v4.html` the script part
(`RAR`, `KW`, `rollR`, `rollK`, `draw`, `sync`, `extras`, the recycle handler).
Worktree `.claude/worktrees/o1-cardcore`, branch `o1/cardcore`. Commit with `git -c o1.agent=CARDS` (the id of all four card lanes in OWNERSHIP.json). Never push.

## Order of work (U and B code against your types: land step 1 first, in its own commit, fast)

1. `apps/quiz/src/lib/cards/types.ts` and `lib/cards/rules.ts` (constants, `creditLine`, `LOCK_SENTENCES` with the five
   exact sentences, `drawPack(pool, rng)`, `walletAt(row, now)`, `nextParisMidnight(now)`), with their unit tests. Commit.
2. Schema SQL: `docs/pending-migrations/cards/001-schema.sql` (+ `.rollback.sql`), `002-functions.sql`, `003-rls.sql` as
   needed: one `do $cNNN$ ... end $cNNN$;` block per file, additive, a header, `-- Verify` lines. Add the files to a test in
   the style of `apps/quiz/src/lib/dle/editor-safe-sql.test.ts` (new test file, do not edit that one).
3. SQL proofs with pglite (`apps/quiz/src/lib/dle/pglite-harness.ts` shows how; `@electric-sql/pglite` is already a
   dependency) or the throwaway Postgres of `apps/quiz/scripts/o1/contract/pg.ts`: run the exact files, then prove
   `cards_wallet` and `cards_apply_pack` with an injected `p_now`: refill 1 per 10 minutes up to 5, the anchor rules of the
   prototype `sync()`, midnight Paris tops up to 5 and resets `ads_today` and `bonus_today`, the two clock changes of
   2026 (29 March, 25 October) and of 2027, a ticket used twice (refused), a ticket of another user (refused), the ad
   limit, 50 shards, the bonus allowance, the fifth card C refused, a concurrent double spend of the last pack (one wins).
   If pglite lacks the Europe/Paris zone, use the throwaway Postgres and say so.
4. `lib/cards/draw.ts`: the server draw with `crypto.randomInt` (never Math.random), the pool loaded from
   `cards_catalog where in_packs` with `fetchAllRows` (`lib/db/fetch-all.ts`, the 1,000-row cap) and cached for 5 minutes.
   A large-draw test with an injected seeded rng: 1,000,000 cards (or 200,000 packs), each rarity within 4 standard errors
   of its odds, the fifth card never C and at U 84 %, kinds by weight among the available ones.
5. The routes of contract section 3 under `apps/quiz/src/app/api/cards/`: hub build only (`SITE_ID === 'hub'`, else 404),
   `NET_CARDS` on (else 404), `no-store`, signed-in (401), `teamRefusal` (403), the service role for the RPC calls,
   `cards_issue_ticket` before an ad and `ad/grant` spending the ticket once (a replay is 409). The bonus allowance reads
   the existing play tables of the day (find them: quiz plays on kpopquiz.org, Kpopdle results); document which. The
   report route: no sign-in, the existing IP-hash rate limit pattern (find it), contact optional.
6. The flags of contract section 4 in `lib/site/registry.ts` and `docs/o1/contracts/flags-env.md`; `lib/cards/flags.ts`
   (`cardsOpen()`, `cardsBridgesOn()`, `cardsAdsOn()`, `adsPerDay()`, `bonusPerDay()`), modelled on
   `lib/site/hub/daily-guess.ts` `dleOpen()`. The route allowlist and `docs/o1/contracts/routes.md` rows for the API.
7. An admin API for the owner's photo review: `POST /api/admin/cards/photos` (list pending, approve, reject, set focal
   point, set a lock reason incl. `hiatus`), behind `requireAdmin` like the other admin routes (ADMIN-1). The admin-lock
   tests count the admin routes exactly: update those exact values and list them as flipped by the owner's new mission.

## Rules

Every value shown to a player comes from the database. No XP, level, streak or badge touched. No new dependency. No dash.
Tests: tsc, your test files, and the admin-lock and registry tests you touch. Do not run `next build` (ORCH does).

## Report (to ORCH, English, short)

Commits in order, the SQL files in apply order, what each proof proves, the play tables used for the bonus, anything
you could not do.
