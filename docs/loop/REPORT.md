# REPORT - TIERLIST phase 3.1: close the engage abuse hole + hardening. Push-ready. No push.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). PART 0 passed WITH a control (below). Short patch
phase: five items, all done. Built and proven on `next build` + `next start` (:3021), never dev.
Every live check seeded through the service role and TORE DOWN (final query `[][]`, DB + bucket
clean). No DDL applied by the worker, no env file touched, no push, no em dashes. Proofs:
`docs/proofs/tierlist-p3.1/`.

## PART 0 - 147 confirmed applied (with a control)

Standing rule now followed: use `apps/quiz/.env.local` (the repo-root `.env.local` points at a DEAD
project) and always include a control. CONTROL `groups?slug=eq.bts` -> 200 `[{"id":1,"name":"BTS"}]`
(proves the live project `rdkgouofytwfdpbxbzio`); `tier_list_likes` -> 200 (exists);
`rpc tier_list_bump_view` -> 200 `null` on a nonexistent slug (callable, harmless). Proceeded.

## Migration file committed

`supabase/migrations/147_tier_list_likes.sql` written EXACTLY as the owner applied it (the appendix
SQL, verbatim). Repo now matches the database. No defect found in that SQL.

## ITEM 1 - likes are authenticated idempotent rows (the hole, L-224)

- A like is a ROW in `tier_list_likes (list_id, user_id)`, idempotent by primary key. A like
  REQUIRES a signed-in user (anonymous likes cannot be idempotent, and this counter ranks a public
  surface). The endpoint `/api/tier-list/like` is a TOGGLE: like inserts, unlike deletes, a second
  like is a no-op. `tier_lists.likes` is maintained by the 147 trigger only - application code never
  writes it again (the old select-then-update counter path is gone; grep proof in the REPORT below).
- Writes use the cookie client so the 147 creator RLS is the guard, keyed by the verified
  `auth.getUser()` id, never a client value. Logged out: the page still shows the count + heart, a
  GET returns the viewer's own like state (filled heart), and the control prompts sign-in instead of
  silently failing. The old open `/api/tier-list/engage` route was removed.
- Live: `tier_list_likes` insert #2 with the same (list,user) -> 409, `likes` stays 1; unlike -> 0;
  logged-out POST /like -> 401 needsAuth, counter unchanged.

## ITEM 2 - views atomic + throttled

- `/api/tier-list/view` bumps through the atomic `tier_list_bump_view(p_slug)` RPC (one UPDATE, no
  read-modify-write, so concurrent views cannot lose increments), following the repo `.rpc(...)`
  convention. Open to logged-out viewers (views rank nothing), but a server-side per-ip+day throttle
  (the in-memory rate-limit pattern from `/api/claim-runs`, 30/min) caps a burst; the client keeps
  its per-browser dedup. Live: views 1/2/3 via the RPC; a 40-request burst -> 27x200 + 13x429.

## ITEM 3 - identity from the cookie, not the body

- `/api/tier-list/save` and `/api/tier-list/asset` now take the anon id from `readAnonCookie(req)`.
  A body value may ONLY mint a first id when no cookie exists and NEVER overrides an existing cookie
  (`resolveAnonId`, unit-tested). Live: a request with cookie B but body anonId=A (the owner's id)
  is refused 403 on the ownership check - the body cannot impersonate the cookie.

## ITEM 4 - upload verifies the real file type

- `/api/tier-list/asset` sniffs the uploaded buffer's magic bytes (`sniffImageType`: JPEG FF D8 FF,
  PNG 89 50 4E 47..., WEBP RIFF....WEBP) and rejects on mismatch; the sniffed type is authoritative
  for the stored content-type + extension. The declared-type allowlist (no SVG), 8MB cap and orphan
  cleanup are unchanged. Live: a text file sent as image/png -> 400; a real jpg -> 200.

## ITEM 5 - one overclaiming comment fixed (docs only)

`l/[slug]/page.tsx` no longer says "true 404": it now says the `notFound()` on that ISR route is a
CACHEABLE 200 soft-404 (the accepted site-wide posture, L-219/L-220). No behaviour change.

## Grep proof (no app write to the ranked counter)

`grep` over `src/app/api` + `src/lib/tier-list` shows NO `update`/`set` of `tier_lists.likes`; the
two `.likes` reads in the like route are only for the response body. The 147 trigger is the sole
writer.

## Tests

Unit (vitest, 51 = 34 + 17): `resolveAnonId` (cookie wins, body only mints when no cookie, never
overrides); `resolveLike` (second like no-op, unlike removes, toggle); `sniffImageType` (accepts
real JPEG/PNG/WEBP, rejects a text file renamed .png, a disallowed real type (GIF), and RIFF-not-
WEBP). All phase-1/2/3 unit tests still green.

e2e (Playwright, 25 passed + 7 skipped): + a logged-out like is refused 401 needsAuth and writes no
row (asserted on the real endpoint, deterministic). The whole phase-2/2.5/3 suite still green.

Live integration (seeded, verified, torn down): `live-verify.txt` - the double-like showing likes=1
not 2, the logged-out refusal with an unchanged counter, the view RPC + the throttle refusing a
burst, the cookie-beats-body identity, the forged-content-type rejection. DB + bucket left clean.

## Render modes + SEO

`route-modes.txt`: `/api/tier-list/engage` removed; `/api/tier-list/like` + `/api/tier-list/view`
added (both `f` route handlers under the /api allowlist prefix). Public + subject pages still `●`
SSG/ISR indexable; tools still `f` noindex; no existing URL changed. `gates.txt`: docs-secrets,
routes, indexability AND orphans all PASS (732 URLs, complete crawl, zero orphans); only
metadata-dupes is NONZERO and its offenders are the pre-existing verse-inflation `/verse/*` dupes -
a grep for tier-list across every failing gate output = none. Zero emoji, zero em dashes.

## Env-file finding (REPORT ONLY - no file touched)

The repo-root `.env.local` points at the DEAD Supabase project; `apps/quiz/.env.local` points at the
LIVE one (`rdkgouofytwfdpbxbzio`). Scripts split into three groups:
- SAFE (LIVE): `apps/quiz/scripts/*` that read `new URL('../.env.local', import.meta.url)` - most of
  them (e.g. seed-industry-mvs, ingest-blindtest-songs, the vfoundation proofs, claim-funnel).
- WRONG (DEAD): scripts under the repo-root `scripts/` that read a relative `'.env.local'` or
  `join(process.cwd(), '.env.local')` - they resolve to the root DEAD project. Examples:
  `scripts/seed-duels.ts`, `import-batch1..3.ts`, `seed-comments.ts`, `audit-quizzes.ts`,
  `seed-expanded-games.ts`, `fetch-deezer-covers.ts`, `seed-platform.ts`, `apply-idol-images.ts`,
  `seed-this-or-that.ts`, `seed-name-all-games.ts`, `apply-audit-fixes.ts`,
  `seed-new-blindtest-groups.ts`, `extract-trivia-corpus.ts`, `generate-pins.ts`,
  `scripts/verse/01-seed-candidates.mjs`, `scripts/blindtest/import-curated.mjs`,
  `scripts/blindtest/populate-curated.mjs`.
- CWD-DEPENDENT: some `apps/quiz/scripts/*` read a bare relative `'.env.local'` (LIVE only if run
  from `apps/quiz`, DEAD if run from the repo root): `verify-identity-activity.mts`,
  `verify-threads-cleanup.mts`, `generate-question-pins.mts`, `verify-profile-cleanup.mts`,
  `verify-cards-purge.mts`, `verify-essays-cleanup.mts`, `verify-atlas-graph.mts`,
  `seed-personality.mjs`, `seed-battle-ghosts.mjs`.
Owner decides; I changed nothing.

## Owner gate

1. **Push** - local main is ahead of origin; nothing pushed (including this report + the 147 file).

---

STOP. The engage hole is closed (authenticated idempotent like rows + trigger counter), views are
atomic + throttled, identity comes from the cookie, uploads are type-sniffed, and the overclaiming
comment is fixed. 51 unit + 25 e2e green, live-verified and torn down, four of five SEO gates green
(the fifth is pre-existing verse dupes). The whole tier-list feature (phases 1 -> 3.1) is complete
and PUSH-READY. Nothing pushed.
