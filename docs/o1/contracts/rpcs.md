# Database functions and server modules (o1-contract-v1)

`schema.sql` is the source for every name, argument, default, return type, SECURITY mode, `search_path` and grant;
`lib/db/contract.types.ts` (generated from it) types every call (`FnArgs<'name'>`, `FnReturns<'name'>`). This file adds
what the DDL only sketches: who calls each function, from where, with which role, and the semantics callers rely on.
BACKLOG 5.3: the names and signatures of the 11 locked functions, `ensure_daily_quiz` and its v2, `award_world_xp` and
`ensure_membership` never change inside the run. `contract.test.ts` checks that section 2 lists exactly the callable
functions of `schema.sql`, with the same SECURITY mode and EXECUTE roles, and that section 3 names every server module
of BACKLOG 5.1.

## 1. Rules for every call

1. **Roles.** `anon` and `authenticated` functions are called with the viewer's own session: from the browser
   (supabase-js, anon key) or from a server route with `createServerClient()`; inside, `auth.uid()` is the viewer.
   `service_role` functions are called only on the server (route handler, server action, cron, owner script) with the
   admin client, never from a client component; a `p_user` argument always comes from the server's own session check
   (or the cron's own query), never from a request body.
2. **Typed calls.** `supabase.rpc('name', args)` with `args` typed `FnArgs<'name'>` and the result read as
   `FnReturns<'name'>`; the anime, passport and network types (`lib/{anime,passport,network}/types.ts`) narrow the
   text columns to their unions.
3. **Refusals are values.** A refusal the caller must tell apart is a returned value (`passport_issue_code` and
   `passport_redeem_code` return an outcome; `report_spoiler` a count; `passport_cancel_deletion` false). An exception
   means a bad argument or a bug: the caller logs it without personal data and fails closed (no session, no write,
   a 500 or the signed-out path).
4. **New functions** are SECURITY DEFINER with `search_path = public`, schema-qualify `passport.*`, revoke PUBLIC,
   `anon` and `authenticated`, then grant exactly the roles of section 2. A function granted to `authenticated` acts on
   `auth.uid()` only and raises when it is null.
5. **Replaced functions** (008, 010) keep today's signature, return type and ACL (CREATE OR REPLACE keeps the ACL;
   confirmed against G3's catalog copy of production on 2026-10-17); each kpop branch is today's body verbatim.
   Their callers do not change. Where today's ACL leaves EXECUTE to PUBLIC on a SECURITY DEFINER function, the
   contract records it as it is and request F0-14 puts it to the owner: a production ACL fix is the owner's file,
   and the contract then follows it without a CR (it records today's state).

## 2. Database functions

### 2.1 New callable functions

| function | file | security | EXECUTE | callers |
|---|---|---|---|---|
| `ensure_membership(p_site, p_via, p_via_code)` | 003 | definer | authenticated | B4 `/api/passport/redeem` (`jump`, the ticket's `via`), B4 `/api/passport/after-signin` (`signup`), B7 `/auth/confirm` (`signup`), B3's first write on a non-kpop site (`play`) |
| `create_profile_for_site(p_username, p_site, p_avatar_bg, p_avatar_text, p_via, p_via_code, p_user_id)` | 003 | definer | authenticated, service_role | P1 and H1 onboarding "Pick a username" on anime and hub (with the viewer's session); K2's editorial accounts (service role, `p_user_id`) |
| `net_bridge_bump(p_src, p_dst, p_bridge, p_step, p_signed_in, p_n)` | 005 | definer | service_role | B6 `/api/n/b` (shown, click, land, dismiss, optin); B3 and B4 server code for `join` (a membership created with a `via_code`) and `first_play` (`first_play_at` set) |
| `passport_issue_code(p_user, p_from_site, p_to_site, p_code_hash, p_code_challenge, p_via_code, p_ip_hash, p_ua_family)` | 006 | definer | service_role | B4 `/auth/authorize` |
| `passport_redeem_code(p_code_hash, p_to_site, p_code_challenge, p_via_code, p_ip_hash, p_ua_family)` | 006 | definer | service_role | B4 `/api/passport/redeem` |
| `passport_log_event(p_outcome, p_user, p_from_site, p_to_site, p_via_code, p_ip_hash, p_ua_family)` | 006 | definer | service_role | B4: `/auth/arrive` (`bad_ticket`), `/auth/authorize` (`login_required`, `rate_limited`), `/api/passport/redeem` (`state_mismatch`, `rate_limited`) |
| `passport_cleanup()` | 006 | definer | service_role | B4 `/api/cron/passport-cleanup` (hub) |
| `award_world_xp(p_user, p_site, p_amount, p_reason)` | 007 | definer | service_role | B3 `awardXpForSite` for a non-kpop site; 008's non-kpop branches (inside SQL) |
| `bump_world_counter(p_user, p_site, p_counter, p_delta)` | 007 | definer | service_role | 008's non-kpop branches (inside SQL); server writers of a non-kpop site that count outside those functions (B5) |
| `public_passport(p_username)` | 007 | definer, stable | anon, authenticated, service_role | H1 `/u/{username}` on the hub (W1b) |
| `my_passport()` | 007 | definer, stable | authenticated | H1 `/passport` (W1); B6 `/api/n/me` |
| `update_my_membership(p_site, p_patch)` | 007 | definer | authenticated | P1 anime `/settings` (profile fields, visibility); H1 hub `/settings` W4 (`show_elsewhere` per site, `auto_continue`); P1 and B6 welcome surfaces (`notice_seen_at`) |
| `set_passport_prefs(p_patch)` | 007 | definer | authenticated | H1 hub `/settings` W4; B6 (`dismissed`, `welcomed_sites`, `your_sites_menu`); X1's opt-in popover (`worlds`) |
| `ensure_daily_quiz_v2(p_date, p_site)` | 010 | definer | service_role | B5 `/api/cron/ensure-daily-quiz` with `SITE.id` (kpop through the wrapper below) |
| `ensure_daily_opening(p_date, p_site)` | 014 | definer | service_role | O6 `/api/cron/ensure-daily-opening` (anime) |
| `report_spoiler(p_quiz_id)` | 015 | definer | authenticated | O3: the anime quiz page's report control with the reason "spoiler", server side with the viewer's session |
| `passport_request_deletion(p_user, p_from_site, p_keep_quizzes)` | 016 | definer | service_role | B7 `/api/passport/delete` (hub) |
| `passport_cancel_deletion(p_user)` | 016 | definer | service_role | B7 `/api/passport/cancel` (hub) |
| `passport_run_deletion(p_user, p_dry_run)` | 016 | definer | service_role | B7 `/api/cron/passport-deletions` (hub); B7's dry-run script (owner) |
| `passport_leave_world(p_user, p_site, p_dry_run, p_keep_quizzes)` | 016 | definer | service_role | B7 `/api/passport/leave` (hub) |

### 2.2 Replaced functions (008, 010): signature, return type and ACL as today

| function | file | security | EXECUTE | callers |
|---|---|---|---|---|
| `award_xp(p_user_id, p_amount, p_reason)` | 008 | definer | as today (G3: PUBLIC and service_role; migration 082 revoked anon and authenticated only, request F0-14) | today's routes; B3 `awardXpForSite` on kpop |
| `record_play(p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)` | 008 | definer | as today | today's play route (shared by anime through its twin) |
| `increment_like_count(quiz_uuid)` | 008 | definer | as today | today's like route |
| `decrement_like_count(quiz_uuid)` | 008 | definer | as today | today's like route |
| `cast_duel_vote(p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash)` | 008 | definer | as today | today's duel route (kpop only in the run) |
| `record_bt_play(p_player_id, p_mode_id, p_score, p_correct, p_total, p_total_time, p_best_combo, p_songs, p_xp_earned, p_group_mastery_updates)` | 008 | definer | as today (G3: PUBLIC and service_role, request F0-14) | today's blind test route; O6 on anime |
| `merge_anon_passport(p_user_id, p_quizzes_played, p_blindtests_played, p_duels_voted, p_battles_played, p_group_stats, p_site)` | 008 | definer | as today (G3: PUBLIC and service_role; migration 087 revoked anon and authenticated only, request F0-14) | today's `/api/passport/merge-anon` (no `p_site`: kpop); on anime the same route passes `SITE.id` (request F0-12: the route has no owner yet) |
| `ensure_daily_quiz(p_date)` | 010 | definer | as today | today's callers; becomes the kpop wrapper of v2 |

### 2.3 Trigger functions (no EXECUTE grant; the trigger names are frozen)

| function | trigger | file |
|---|---|---|
| `quizzes_site_guard()` | `trg_quizzes_site_guard` BEFORE INSERT OR UPDATE OF site_id, group_id ON quizzes | 002d |
| `profiles_membership()` | `trg_profiles_membership` AFTER INSERT ON profiles | 003 |
| `world_follows_counts()` | `trg_world_follows_counts` AFTER INSERT OR DELETE ON world_follows | 004 |
| `handle_new_quiz()`, `notify_badge_earned()`, `notify_group_quiz_alerts()`, `passport_on_battle_result()` | today's triggers, names kept (`on_quiz_insert`, `trg_notify_badge_earned`, `group_quiz_alerts_on_insert`, `group_quiz_alerts_on_publish`, `trg_passport_on_battle_result`) | 008 |

### 2.4 Semantics callers rely on

- **`ensure_membership`** is idempotent: the first call inserts `(auth.uid(), p_site)` with `joined_via = p_via`,
  `via_code = p_via_code` and `created = true`; later calls change nothing and return `created = false` (the first
  `via` wins). It raises when `p_via` is not a `JOINED_VIA` value or `p_via_code` fails `VIA_RE`. On `kpop` the row
  is activated at once (as the trigger does). The caller writes the `join` counter when `created` and `via_code`
  is set (`split_part(via_code, '.', 2)` is the link id).
- **`create_profile_for_site`** runs `set_config('app.site_id', p_site, true)` then inserts the profile with today's
  username rules, so `trg_profiles_membership` creates the `p_site` membership; it then sets `joined_via` and
  `via_code` from its arguments. An authenticated caller creates its own profile only (`p_user_id` null or
  `auth.uid()`); the service role passes `p_user_id`. kpop's `/api/auth/create-profile` insert is unchanged.
- **`update_my_membership(p_site, p_patch)`**: keys `MEMBERSHIP_PATCH_KEYS_ANY_SITE` on every site,
  `MEMBERSHIP_PATCH_KEYS_NON_KPOP` on non-kpop sites only (lib/passport/types.ts); any other key, or a non-kpop key
  on `kpop`, raises; a key set to null clears a nullable column; the table checks validate the values. A missing
  membership raises (the caller ensured it first).
- **`set_passport_prefs(p_patch)`** upserts the viewer's row. Top-level keys replace their column, except `worlds`
  and `dismissed`, whose given keys merge into the stored object (a key set to null removes it). Keys:
  `PASSPORT_PREFS_PATCH_KEYS`; any other raises. `showcase_badges` holds at most 3 ids of badges the viewer owns.
- **`my_passport()`** returns one row per membership of `auth.uid()` (`MyPassportRow`). kpop values come from
  `profiles` (xp, daily streak, quizzes created; `plays` = `quizzes_played + blindtests_played`), other sites from the
  membership (`plays` = `quizzes_played + blindtests_played + games_played`, nulls as 0). `/api/n/me` derives
  `NetMe.sites` from it (`level` by `getLevelInfo(xp, site)`, `activated` = `activated_at` not null).
- **`public_passport(p_username)`** returns one row per visible stamp (`show_elsewhere`, activated, membership and
  profile not banned); `passport_xp` only with `show_passport_level`; `showcase_badges` filtered to badges of
  visible stamps. No visible stamp: no row (the hub's `/u` is then a 404).
- **`net_bridge_bump`** adds `p_n` to today's (UTC) row of `(src, dst, bridge, step, signed_in)`, creating it at 0;
  it raises on an unknown site, a step outside `NET_STEPS` or a link id outside `^[a-z]{2,8}$`.
- **`passport_issue_code`** checks in order: email confirmed, `profiles.banned_at` null, no pending deletion, the
  two rate limits (`PASSPORT_LIMITS`, counted from `passport.handoff_events`); the first failure is returned and
  logged. On success it stores the hash (expiry now + 60 s) and logs `issued`.
- **`passport_redeem_code`** returns `redeemed` with `user_id` and `from_site`, or `pkce_fail` (the code is burned),
  `replay` or `expired` (an unknown hash too), and logs the outcome. The app compares nothing itself: it passes the
  challenge it computed from the cookie's verifier.
- **`award_world_xp`** and **`bump_world_counter`** raise on `kpop`. `bump_world_counter`'s counters:
  `quizzes_played`, `blindtests_played`, `games_played`, `quizzes_created`, `plays_received`, `likes_received`.
  The Team accounts get XP only from real events (their creations, real likes), and every board leaves them out
  (defaults.md RUN-4): no caller awards them XP for anything else.
- **`report_spoiler(p_quiz_id)`** inserts one `reports` row (reason `spoiler`, unique per reporter) and returns the
  number of distinct signed-in reporters; at 3 it sets `quizzes.spoiler_cover_until` (a temporary cover until a
  moderator decides), never unpublishes. A repeated report returns the count unchanged.
- **Deletion functions** (016) are dry run by default: `p_dry_run = true` returns the counts per table and writes
  only the `passport.deletion_log` row. `passport_request_deletion` returns `run_after` (now + the G16 grace
  period); while a request is pending, `passport_issue_code` returns `deletion_pending`.

## 3. Server modules and component props (BACKLOG 5.1)

The signature types live in the F0 type modules; an implementation is written
`export const forSite: SiteServerFns['forSite'] = ...`, so a drifting signature fails tsc. Owners follow
`OWNERSHIP.json`; where it and the BACKLOG lane card name different lanes, both are given and request F0-12 asks ORCH
to settle it.

| name | signature type | module | owner |
|---|---|---|---|
| `forSite(query, site?)` | `SiteServerFns` | `lib/site/scope.ts` | B2 |
| `withSite(row, site?)` | `SiteServerFns` | `lib/site/scope.ts` | B2 |
| `cronForSite(sites)` | `SiteServerFns` | `lib/site/cron.ts` | B1 |
| `getQuizOfTheDay(site?)` | `SiteServerFns` | `lib/db/queries/quizzes.ts` | B1 (OWNERSHIP), B5 (BACKLOG card) |
| `levelTitlesFor(site)` | `SiteServerFns` | `lib/level-titles.ts` | B1 (OWNERSHIP), B3 (BACKLOG card) |
| `getLevelInfo(xp, site?)` | `SiteServerFns` | `lib/constants.ts` | no owner yet (request F0-12) |
| `profileForSite(site, profile, membership)` | `PassportServerFns` | `lib/network/profile.ts` | B3 |
| `awardXpForSite(site, user, amount, reason)` | `PassportServerFns` | `lib/passport/xp.ts` | B3 |
| `safeReturnTo(raw, fallback?, site?)` | `PassportServerFns` | `lib/auth/return-to.ts` | B4 |
| `bridgeHref(dst, path, bridge)` | `NetLinkFns` | `lib/network/links.ts` | B6 |
| `editorialHref(dst, path)` | `NetLinkFns` | `lib/network/links.ts` | B6 |
| `eligibleFor(me, dst)` | `NetEligibilityFns` | `lib/network/eligibility.ts` | B6 |
| `canShow(me, dst, id, caps, now?)` | `NetEligibilityFns` | `lib/network/eligibility.ts` | B6 |
| `computeSpoilerLevel(questions, mangaOnlyArcs?)` | `AnimeSpoilerFns` | `lib/anime/spoilers/` | O3 |
| `isSafeFor(level, progress)` | `AnimeSpoilerFns` | `lib/anime/spoilers/` | O3 |
| `PersonName` and `BiasTag` prop `tagIcon` | `PersonNameTagProps` | `components/ux-v1/person-name.tsx` | B3 |
| `NetLink` props | `NetLinkProps` | `components/network/net-link.tsx` | B6 |
| `CrossoverFact` props | `CrossoverFactProps` | `components/network/crossover-fact.tsx` | X1 |
| `SpoilerShield` props | `SpoilerShieldProps` | `components/spoilers/spoiler-shield.tsx` | O3 |

Rules the types cannot carry:

- A `site` parameter that is optional defaults to the build's site (`SITE.id`): on the kpop build every call of today
  keeps its answer, and on the anime build a shared component calling `getLevelInfo(xp)` shows the anime ladder
  (rule 18: the shared component is imported, never forked).
- `safeReturnTo` keeps `fallback` as its second parameter because today's `return-to.test.ts` pins it (ratchet
  law); BACKLOG's `safeReturnTo(path, site)` is the third parameter (F0 decision 65).
- `getLevelInfo` keeps today's curve on every site (the anime ladder uses the kpop thresholds, decision 56); only
  `name` differs.
- `profileForSite` is pure: the caller reads the membership with the projection of section 4.
- `awardXpForSite` on kpop calls `award_xp` with exactly today's arguments (BACKLOG B3 done test).

## 4. Reading another member

`world_memberships` has a select policy for the viewer's own rows only. Another member's row is read on the server
with the service role, selecting `MEMBER_PUBLIC_COLUMNS` plus the filter columns `MEMBER_FILTER_COLUMNS`
(`lib/passport/types.ts`) and never `MEMBER_PRIVATE_COLUMNS` (`joined_via`, `via_code`, `first_play_at`,
`auto_continue`, `notice_seen_at`, `last_seen_at`). `contract.test.ts` checks that the three lists cover the table's
columns exactly once.

| where | rule |
|---|---|
| the member's page on a world site (`/u/{username}` on anime, P1) | the membership of that site; 404 when it is missing, not activated, or banned there or network-wide |
| another site's view of the member (hub `/u/{username}`, H1) | `public_passport(p_username)` only, which applies `show_elsewhere` |
| a kpop page | `profiles` as today; no membership read (P 7.3) |

Fields go through `profileForSite(site, profile, membership)` before a shared component renders them, so no kpop
`bio`, bias or group list reaches an anime page.

## 5. Writes without a function (RLS)

| table | write | caller |
|---|---|---|
| `favourites` | insert, update, delete own rows, never `kpop` | P1 anime settings (series and oshi slots), H1 |
| `world_follows` | insert and delete own follows, never `kpop` | the follow route on anime (the twin of today's `/api/follow`); the Team accounts are refused by the route (RUN-4) |
| `series_progress` | insert, update, delete own rows | O3 `SpoilerShield` (signed in); the guest store is claimed at sign-in |
| `favourite_characters` | insert, update, delete own rows | O2 oshi button, P1 settings |

Every other new table is written by SQL files (content) or by the functions above with the service role.
