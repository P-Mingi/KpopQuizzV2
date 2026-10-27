# S4: PUBLIC execute on SECURITY DEFINER functions

Priority 1, standalone: independent of run O1, written against production of 2026-10-17
(`~/kpq-o1/prod-public.sql`). The owner applies it in production before anything else.

| File | What |
|---|---|
| `S4-revoke-public-execute.sql` | REVOKE EXECUTE FROM PUBLIC, anon, authenticated and GRANT EXECUTE TO service_role on 28 functions; one transaction, idempotent, self-check |
| `S4-revoke-public-execute.rollback.sql` | gives back the grants of 2026-10-17 (same grantee set), with a self-check |
| `report.md` | the runs on o1-scratch and o1-dev, and the e2e |

## The finding

The 32 functions below are SECURITY DEFINER (owner postgres) and none of them checks its caller. In production
their ACL holds `=X/postgres`: PUBLIC may execute them. Earlier migrations revoked anon and authenticated, but those
roles inherit PUBLIC, so anyone with the public anon key can call them through `POST /rest/v1/rpc/<name>` with
arbitrary arguments. 22 carry `{=X/postgres,postgres=X/postgres,service_role=X/postgres}`, 10 also hold an explicit
anon and authenticated grant.

## Caller map

Legend. Browser: a path that runs with the anon key or the user's session (a client component, `createServerClient()`
built from the user's cookies, `createPublicReadClient()`). Server: `createServiceRoleClient()`. SQL: called from the
body of another function (all callers are SECURITY DEFINER, they run as postgres and keep working). Cron: Vercel cron
routes (they use the service role); no pg_cron job references any of them (no pg_cron extension on the branches,
none in the dump; pg_cron would run as postgres anyway). Paths are relative to `apps/quiz/src` unless they start with
`apps/`.

| # | Function (production signature) | Prod ACL extra | Browser | Server (service_role) | SQL caller | Decision |
|---|---|---|---|---|---|---|
| 1 | `award_xp(uuid, integer, text)` | | none | `lib/passport/xp.ts` from `api/quiz/[id]/play`, `api/game/[id]/play`, `api/quiz/create`, `lib/daily-streak.ts` (all pass the admin client) | award_like_xp, record_game_play | revoke |
| 2 | `award_bt_xp(uuid, integer)` | | none | `apps/blindtest/src/app/api/play/ranked/route.ts` (adminDb) | none | revoke |
| 3 | `award_daily_capped_byeol(uuid, character varying)` | | none | none | none | revoke (byeol gone) |
| 4 | `award_first_time_byeol(uuid, character varying, text, integer, integer)` | | none | none | none | revoke (byeol gone) |
| 5 | `award_like_xp(uuid, uuid)` | | none | `api/quiz/[id]/like/route.ts` (admin) | none | revoke |
| 6 | `dev_award_byeol(uuid, integer, text, text)` | | none | none | award_first_time_byeol | revoke (byeol gone) |
| 7 | `dev_open_card_pack(uuid, text)` | | none | none | none | revoke (byeol gone) |
| 8 | `dev_open_starter_pack(uuid)` | | none | none | none | revoke (byeol gone) |
| 9 | `create_quiz_bypass(jsonb)` | | none | `api/quiz/create/route.ts` (admin) | none | revoke |
| 10 | `merge_anon_passport(uuid, integer, integer, integer, integer, jsonb)` | | none | `api/passport/merge-anon/route.ts` (admin) | none | revoke (both signatures, see O1 below) |
| 11 | `record_play(uuid, uuid, integer, integer, integer)` | anon, authenticated | `api/quiz/[id]/play/route.ts`: `supabase.rpc` on `createServerClient()` (user session or anon, signed in and signed out) | none | none | KEEP, fix below |
| 12 | `record_bt_play(uuid, text, integer, integer, integer, double precision, integer, jsonb, integer, jsonb)` | | none | `apps/blindtest/src/app/api/play/record/route.ts` (serviceClient) | none | revoke |
| 13 | `record_game_play(uuid, uuid, jsonb)` | | none | none (games route inserts game_plays itself) | none | revoke |
| 14 | `update_player_rank(uuid)` | | none | none | award_bt_xp | revoke |
| 15 | `update_player_streak(uuid)` | | none | none | record_bt_play | revoke |
| 16 | `grant_streak_badges(uuid, integer)` | | none | `lib/daily-streak.ts` from `api/daily/complete` (svc) | none | revoke |
| 17 | `emit_activity(text, uuid, text, jsonb)` | | none | `lib/daily-streak.ts` (svc) | record_play, record_bt_play, cast_debate_vote, cast_duel_vote, handle_new_quiz, passport_on_battle_result | revoke |
| 18 | `fanout_followed_new_quiz(uuid, uuid, text, text)` | | none | `api/quiz/create/route.ts` (admin) | none | revoke |
| 19 | `generate_daily_challenges(date, integer)` | | none | none | none | revoke |
| 20 | `ensure_daily_blindtest(date)` | | none | `api/daily/blindtest/route.ts` (svc) | none | revoke |
| 21 | `ensure_daily_debate(date)` | | none | cron `api/cron/ensure-daily-debate` and `lib/db/queries/debate.ts` (both service role) | none | revoke |
| 22 | `reconcile_quiz_counters()` | anon, authenticated | none | cron `api/cron/plays-counter-reconcile` (service role) | none | revoke |
| 23 | `recalculate_difficulty(uuid)` | | none | none | none | revoke |
| 24 | `increment_game_play_count(uuid)` | | none | none | none | revoke |
| 25 | `increment_like_count(uuid)` | anon, authenticated | `api/quiz/[id]/like/route.ts`: `supabase.rpc` on `createServerClient()` (signed in and signed out) | none | none | KEEP, fix below |
| 26 | `decrement_like_count(uuid)` | anon, authenticated | same route, unlike | none | none | KEEP, fix below |
| 27 | `increment_tot_appear(uuid[])` | anon, authenticated | none (This or That removed in 526364d) | none | none | revoke |
| 28 | `increment_tot_category_plays(uuid)` | anon, authenticated | none (removed in 526364d) | none | none | revoke |
| 29 | `increment_tot_pick(uuid)` | anon, authenticated | none (removed in 526364d) | none | none | revoke |
| 30 | `tier_list_bump_view(text)` | anon, authenticated | none (tier lists removed in 526364d) | none | none | revoke |
| 31 | `get_personality_counts(integer, timestamp with time zone)` | anon, authenticated | `lib/personality/data.ts` on `createPublicReadClient()` (the anon key, server side, cached) | none | none | KEEP, fix below |
| 32 | `get_daily_bt_leaderboard(date)` | anon, authenticated | none | `(site)/blindtest/leaderboard/page.tsx` and `api/daily/blindtest/leaderboard` (both service role) | none | revoke |

Searched: `apps/quiz/src`, `apps/blindtest/src`, `packages`, `scripts`, `supabase/functions` (`.rpc('name'`, dynamic
`.rpc(fn`, `/rest/v1/rpc/`), the SQL bodies of `prod-public.sql` and of the branches (`pg_proc.prosrc`), and the cron
lists. No client component calls any of the 32.

Result: 28 revoked, 4 kept (record_play, increment_like_count, decrement_like_count, get_personality_counts).

## The 4 kept functions: risk and proposed fix

| Function | Risk (one line) | Proposed fix |
|---|---|---|
| `record_play` | Anyone with the anon key can insert plays for any quiz and any `p_player_id` (inflating play counts, creator `total_plays_received`, another user's `quizzes_played` and group mastery, and firing their activity events). | The route already resolves the user and holds a service role client (`admin`): call `admin.rpc('record_play', ...)` in `api/quiz/[id]/play/route.ts` (and drop the unused `lib/db/queries/plays.ts`), then `REVOKE EXECUTE ON FUNCTION public.record_play(uuid, uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated`. Until then, a guard in the body: `IF auth.role() <> 'service_role' AND p_player_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;` (closes impersonation, not anonymous count inflation). |
| `increment_like_count` | Anyone can raise any quiz's `like_count` and its creator's `total_likes_received` without limit, with no likes row. | Move both calls of `api/quiz/[id]/like/route.ts` to `createServiceRoleClient()` (the route keeps its auth and validation, and can rate limit the anonymous path), then revoke from PUBLIC, anon, authenticated. Better still: derive the counter from the `likes` table (trigger) for signed-in likes and count anonymous likes server side only. |
| `decrement_like_count` | Anyone can lower any quiz's `like_count` and its creator's `total_likes_received` down to 0. | Same change as increment_like_count, in the same commit. |
| `get_personality_counts` | Read only: exposes per-member result counts of a group, an aggregate already shown on the personality pages; low risk (only enumeration of the aggregate). | Switch `readCounts` in `lib/personality/data.ts` to the service role client (it runs server side under `unstable_cache`), then revoke from PUBLIC, anon, authenticated; or keep it public deliberately and mark it so in the schema comment. |

## Interaction with run O1

Checked every O1 file `docs/pending-migrations/multisite/003` to `016` for GRANT, REVOKE, DROP FUNCTION and CREATE
of the 32 names, `TO PUBLIC`, `ALL FUNCTIONS` and default privileges.

- `008-write-locks.sql` uses CREATE OR REPLACE on award_xp, record_play, increment_like_count, decrement_like_count
  and record_bt_play: CREATE OR REPLACE keeps the ACL, so S4 holds.
- `008-write-locks.sql` DROPs `merge_anon_passport(uuid, integer, integer, integer, integer, jsonb)` and creates the
  7 argument form `(..., p_site text DEFAULT 'kpop')`, then line 766 hands EXECUTE back to PUBLIC:
  `GRANT EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) TO PUBLIC, service_role;`
  Applied after S4 in production, this reopens merge_anon_passport to anon and authenticated (through PUBLIC). The
  branches show it today: `{=X/postgres,postgres=X/postgres,service_role=X/postgres}` on the 7 argument form.
- `008-write-locks.rollback.sql` line 478 does the same on the 6 argument form it recreates.
- No other O1 file touches the 32 or grants anything to PUBLIC.

Fix for ORCH (exact):

In `docs/pending-migrations/multisite/008-write-locks.sql`, replace lines 765 and 766

```sql
REVOKE EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) TO PUBLIC, service_role;
```

with

```sql
REVOKE EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text) TO service_role;
```

and in its header the expected ACL of line 38 `{=X/postgres,postgres=X/postgres,service_role=X/postgres}` becomes
`{postgres=X/postgres,service_role=X/postgres}`, and line 8 "(ACL restored as today: PUBLIC and service_role)" becomes
"(ACL: service_role only, as S4 left it)". Optionally add to its self-check:
`if has_function_privilege('anon', 'public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text)'::regprocedure, 'EXECUTE') then raise exception '008-write-locks: merge_anon_passport is executable by anon'; end if;`

In `docs/pending-migrations/multisite/008-write-locks.rollback.sql`, lines 477 and 478 the same way on the 6 argument
form (`FROM PUBLIC, anon, authenticated` then `TO service_role`); its header line 5 "(PUBLIC and service_role; anon
and authenticated revoked, as migration 087 left it)" becomes "(service_role only, as S4 left it)" and line 9 expects
`{postgres=X/postgres,service_role=X/postgres}`.

General rule for the coming migrations: a DROP plus CREATE of a function resets its ACL to PostgreSQL's default
(PUBLIC execute) plus Supabase's default privileges (anon, authenticated, service_role). Every such function needs an
explicit `REVOKE ALL ... FROM PUBLIC, anon, authenticated` after its CREATE, as 003 to 016 already do for their new
functions.

On o1-scratch and o1-dev S4 itself handles the 7 argument form (its DO block revokes whichever signature exists), so
the branches are closed now; the 008 fix is needed so that a fresh O1 run on a database where S4 is applied does not
reopen it.

## Apply in production

1. Run `S4-revoke-public-execute.sql` as postgres (SQL editor or psql with ON_ERROR_STOP). It aborts and changes
   nothing if a function is missing or the self-check fails.
2. Run the verify query of its header: 28 rows, anon f, authenticated f, service_role t.
3. Smoke: play a quiz, like and unlike, open /blindtest and /api/daily/blindtest, the daily quiz, signed out and
   signed in; create a quiz while signed in (create_quiz_bypass, fanout_followed_new_quiz by the service role).
4. If a server path fails with `permission denied for function`, run the rollback and report the path.
