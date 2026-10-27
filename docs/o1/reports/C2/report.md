# C2 final check: backend, data and security of run O1

Read-only review of `o1/integration` (152d365) against `origin/main` merge-base 8059cd3, areas: `apps/quiz/src`, `docs/pending-migrations`, `supabase`, `scripts/anime`, `scripts/o1-tools`.
Evidence sources: the diff read by area, `~/kpq-o1/prod-public.sql` (grep only), and read-only queries on o1-dev (catalog, `set role anon` selects). No write, no secret opened.

Totals: 1 blocker, 6 should fix, 11 notes.

## Blocker

### B1. `GET /api/quizzes` (and `/api/quizzes/count`) read `quizzes` with no site scope
- Where: `apps/quiz/src/app/api/quizzes/route.ts:55` (select with `status = published`, no `forSite`), `apps/quiz/src/app/api/quizzes/count/route.ts:18`. The only change O1 made to the file is a join hint.
- Why it blocks: this is the "load more" source of `InfiniteQuizList` on BOTH sites: anime `/new`, `/trending`, `/most-liked` (`app/sites/[site]/(anime)/{new,trending,most-liked}/page.tsx`, `fetchUrl="/api/quizzes?tab=..."`) and kpop `/new`, `/trending`, `/most-liked`, `/easy-kpop-quizzes`, `/hard-kpop-quizzes` and the pt twins. The first page is scoped (`getBrowseQuizzes`), every later page is not, so after launch kpopquiz.org lists anime quizzes and otakuquiz.org lists K-pop quizzes. RLS does not help: `quizzes_select_published` is `status = 'published'` only (o1-dev: anon sees all 165 anime quizzes through this exact join). SITE_SCOPE=1 does not help either, the route never calls `forSite`.
- Not caught by the leak suites: they test page HTML, not this fetch.
- Smallest fix: wrap the select, `forSite(supabase.from('quizzes').select(QUIZ_CARD_SELECT)).eq('status','published')`, same for the count route, and add a case to `lib/db/queries/site-scope.readers.test.ts` (or a route test) that the query carries `site_id`.

## Should fix

### S1. Slug-keyed readers used by anime pages read `groups` unscoped (kpop group served on the anime host)
- `lib/name-all/server.ts:40,72,110` (`getNameAllSet`, `getNameAllStats`, bridge slugs) and `lib/personality/data.ts` read `groups`/`idols` by slug with no `forSite`. The anime twins `app/sites/[site]/(anime)/name-all/[group]/page.tsx` and `which-character/[group]/page.tsx` call them, with no ownership check: `otakuquiz.org/name-all/bts` renders the K-pop BTS roster under the anime brand with a self canonical (middleware step is `pass` on non-kpop builds, so the kpop 301/404 never runs). `KPOP_ONLY_SAMPLES` lists `/name-all/bts` as must-404, but o1-dev has no idols (0 rows), so the leak spec passes by lack of data.
- Fix: `forSite(...)` on those reads (or `eq('site_id', SITE_ID)` in the twin pages) and re-run `route-leak.o1.ts` against a branch seeded with kpop idols. Reproduce with kpop idols before launch; treat as blocker if it reproduces.

### S2. Inserts that do not set `site_id` on a non-kpop build (reports, community replies, bell)
- `app/api/quiz/[id]/report/route.ts:44`, `app/api/debate/report/route.ts:31`, `app/api/quiz/create/route.ts:294` (auto-mod report), `app/api/ux-v1/p8/replies/route.ts:123`, `lib/ux-v1/p8/notify.ts:101` (creator_notifications). None calls `withSite`; the column default writes `'kpop'`. The report form and the community replies are reachable on anime (`components/quiz/ux-v1/report.tsx`, `components/community/ux-v1/replies.tsx`).
- Effects: a report on an anime quiz is stored as kpop, so the anime admin queue (`app/(site)/admin/page.tsx` reads `forSite`) never shows it and the kpop queue shows an anime quiz; a reply notification of an anime member lands in the kpop bell (the notifications API reads `forSite`) with a link that does not exist there; `passport_world_purge` (leave a world) cannot find these rows by `site_id`.
- Fix: `withSite(...)` on each insert (same pattern as `lib/notifications.ts`).

### S3. Nine kpop cron routes have no `cronForSite` guard, and CRON_SECRET is set on all three projects
- Unguarded: `ensure-daily-debate`, `fans-picked`, `live-expire`, `notification-prune`, `plays-counter-reconcile`, `prune-activity`, `seo-indexability`, `verse-role-decay` (all `app/api/cron/*/route.ts`) and `app/api/ranked/cron/nightly/route.ts`. `manifest.md` says "every cron of today not listed acts on kpop only", `vercel.json` is shared by the three projects and `docs/launch/o1/ENV.md:29` sets CRON_SECRET on anime and hub, so each runs three times a day (anime and hub also set NEXT_PUBLIC_UX_V1=1, so ranked nightly is not skipped). Mostly idempotent maintenance, but `seo-indexability` probes from the wrong origin and the ranked nightly closes runs and rolls seasons three times.
- Fix: `const skipped = cronForSite(['kpop']); if (skipped) return skipped;` right after the auth check in each.

### S4. `merge_anon_passport` (and `award_xp`, `record_bt_play`, ...) stay executable by anon through PUBLIC; the world branch extends it
- `docs/pending-migrations/multisite/008-write-locks.sql:765-766`: `REVOKE ... FROM anon, authenticated; GRANT ... TO PUBLIC, service_role`. A grant to PUBLIC makes the revoke void: o1-dev `proacl` is `{=X/postgres,postgres=X,service_role=X}` and `has_function_privilege('anon', ...)` is true. The function takes `p_user_id` from the caller and has no `auth.uid()` check, so with the public anon key anyone can call `rpc/merge_anon_passport(<any uuid>, ..., 'anime')`: it burns that member's once-per-world marker and adds up to 400 counter points. The world branch (`p_site`) is new in O1; the kpop branch is prod today (the header says "as production has it").
- Same shape, prod-parity and not touched by O1: `award_xp(uuid,int,text)` is `=X` on o1-dev (the dump revokes anon/authenticated/service_role but never PUBLIC), although the comment in `lib/passport/xp.ts` says it is "revoked from authenticated". If prod's `proacl` matches, any visitor can award XP to any kpop profile.
- Fix: read `proacl` of `award_xp`, `record_bt_play`, `merge_anon_passport`, `update_player_streak` in prod; then one owner file `revoke execute ... from public` (keep service_role; the app calls them with the service role). For merge_anon_passport do it in a follow-up of 008, not by editing 008.

### S5. Editing an anime quiz does not recompute its spoiler level
- `app/api/quiz/[id]/route.ts:113-119` (PUT, shared route, reachable on anime) updates `questions` but not `spoiler_arc_ord` / `spoiler_scope`; only create computes them (`lib/quiz/site-insert.ts`). No trigger recomputes them (quizzes triggers: group alerts, on_quiz_insert, site guard). `quizzes_insert_own` / `quizzes_update_own` also let a creator write those columns directly through PostgREST. So the stored level goes stale after any edit (a honest author can add a late-arc question to a level-3 quiz).
- Fix: in the PUT, when `SITE_ID !== 'kpop'` call `spoilerColumnsFor(admin, groupId, input.questions)` and include both columns; optional hardening, a `BEFORE UPDATE` trigger or column privilege.

### S6. Per-world ban is never set and never enforced
- `world_memberships.banned_at` exists and is read for display (`lib/passport-ui/world-reads.ts:69`, hub redirects), but the only ban routes (`app/api/admin/user/[id]/ban|unban`) write `profiles.banned_at`; no write path (`award_world_xp`, `ensure_membership`, play, create, follow, replies) checks the membership ban, and `passport_issue_code` checks only the profile ban. This is known note 4b in its wider form: the anime `/me` 404 for a banned member is only the visible edge.
- Fix before launch if per-world bans are promised: a `banned_at` check in `award_world_xp`/`ensure_membership` and in the world play and create routes, plus an admin action; otherwise say in the runbook that bans are global.

## Notes

- N1 (known note 1, oshi spoiler refusal is client-side): accepted as a courtesy shield. `series`, `arcs`, `characters`, `episodes` are `select ... using (published)` for anon, so the whole spoiler layer is client/render side by design; `favourite_characters` has RLS own-rows but no check that the character belongs to the series (`group_id`) or is published (no composite FK).
- N2 (known note 2, banned member on anime `/me` 404 but stays signed in): accepted for the profile ban (`/auth/confirm` and `after-signin` sign out a banned profile); the member-level case is S6.
- N3 (known note 3, land beacon not counted on a signed-in jump): analytics only, no data effect. `net_bridge_bump` validates every argument. The beacon trusts an `Origin` any script can forge and its limit (60/min per IP hash) is per server instance; counters can be inflated, nothing else.
- N4 (known note 4, real deletion waits for Mission U part D): safe as built. `passport_run_deletion` raises on a real run while `admin_delete_account` is missing, the cron route (`app/api/cron/passport-deletions`) is not in `apps/quiz/vercel.json`, and RUNBOOK G2 applies 016 only after part D. One edge: with 016 applied and no part D, `handleDelete` (hub) records the request, signs the member out and emails "deleted in 7 days" while the cron fails; the RUNBOOK gate prevents it, no code guard does.
- N5 Rate limits: handoff issue is limited in the database (30 per user and 60 per IP hash an hour, `passport_issue_code`); redeem 10/min per IP hash and beacon 60/min are in memory per instance (the code is single use, redeem is safe); delete, cancel, leave, after-signin, confirm have no limiter but need a session and (delete, leave) a sign-in within 10 minutes plus `@username` confirm. `ipHash` is null without `NET_IP_HASH_SALT`, which silently removes the per-IP limits (ENV.md should mark the salt required). `clientIp` takes the first `x-forwarded-for` hop, right on Vercel only.
- N6 Redirects, cookies, secrets: all clean. `safeReturnTo` (site-bound) feeds every `next`/`returnTo`; `/auth/passport/out` `to`, `/auth/authorize` `client` and `from` are registry site ids, and `netOrigin` ignores `NEXT_PUBLIC_NET_ORIGINS` on production. The tx cookie is `__Host-pp_tx` (HttpOnly, Secure, Lax, Path=/, no Domain, 300 s, cleared on every redeem answer); session cookies are the untouched host-only `@supabase/ssr` ones, so no session crosses sites except through the PKCE handoff. No `NEXT_PUBLIC_` variable carries a secret and no client component imports server-only or service-role code. No new route returns `error.message` (only logs). `/api/passport/revalidate` is HMAC-signed but has no timestamp (a replay only purges caches) and reads the body before the 4 KB check.
- N7 Service-role routes all authenticate first: delete/cancel/leave/merge-anon/n-me by session, cron by `CRON_SECRET` (fail closed), revalidate by HMAC, redeem by tx cookie + PKCE + single-use code, beacon by Origin only (counter bump, no user data). Handoff SQL (006) is sound: 60 s code, one `UPDATE` consumes it, constant-time PKCE compare, tables RLS-on with no grants, all functions service_role only.
- N8 Database objects: all 16 new tables have RLS on; policies match the contract (own-row reads for memberships, prefs, progress, oshi; public reads only for published catalogue rows, favourites, follows, daily openings, sites; no policy and no grant for `bridge_daily`, `review_batches`, `spoiler_reports`, `passport.*`). All new functions are SECURITY DEFINER with `search_path = public`, internal ones service_role only, user ones (`ensure_membership`, `update_my_membership`, `set_passport_prefs`, `my_passport`, `report_spoiler`, `create_profile_for_site`) `authenticated` and bound to `auth.uid()`, `public_passport` anon with fail-closed visibility. The 11 write-lock functions are redefined with ACL and (missing) `search_path` unchanged from prod; they run SECURITY DEFINER with no `search_path`, as in prod. `favourite_character_counts` is an owner-run aggregate view (threshold 30), the Supabase advisor will flag it as security-definer view: expected. `world_follows`, `favourites`, `series_progress`, `favourite_characters` insert policies do not require a membership; `favourites.label` is free text shown on public pages.
- N9 PostgREST ambiguity: no embed in the code touches a junction-shaped table (`world_follows`, `series_progress`, `favourite_characters`, `world_memberships`) and `spoiler_reports` got a surrogate key in 015; the quiz-creator embeds already carry the `!quizzes_creator_id_fkey` hint.
- N10 Rollbacks: 19 forward files, 19 rollbacks plus `launch/L01`; each refuses when it would lose non-kpop data and 007 refuses while 008 calls it. `002a` rollback does not refuse while the 008 functions (which read `site_id`) exist; order is only in ROLLBACK.md. Cheap guard: refuse if `prosrc ilike '%site_id%'` for those functions.
- N11 Indexes: adequate for the new paths (`quizzes (site_id, status, created_at)`, `groups (site_id, slug)`, `world_memberships (site_id, joined_at)` and `(site_id, xp)`, `world_follows (site_id, followed_id)`, unique per-site daily keys, `deletion_requests_due_idx`). The `009` unique indexes replace the kpop single-date keys that `010` drops; the code already conflicts on `site_id,featured_date`.

## Data on o1-dev (check 5)

| table | anime | kpop | note |
|---|---|---|---|
| groups | 31 | 1 (`general-kpop`) | |
| quizzes | 165 | 0 | all published |
| quiz_bank | 100 | 0 | RLS on, no anon policy |
| trivia | 1188 | 0 | all `draft`, anon sees 0 |
| editorial_accounts | 31 | 0 | anon has no grant |
| activity_events | 172 | 0 | |
| games, songs, badge_definitions, qotd_log, editorial_drafts, editorial_posts, creator_notifications | 0 | 0 | |
| world_memberships | 38 | 43 | `show_elsewhere` true: 0 anime |

- Anon role, no filter: 165 anime quizzes, 31 anime groups, 172 anime activity events are readable (policies are public by design), so the kpop/anime separation is entirely `forSite` in the app; any unscoped reader leaks (B1, S1). With the kpop filter the same queries return 1 group and 0 quizzes/activity/trivia: no anime row reaches a scoped kpop reader.
- o1-dev holds no kpop content (no quizzes, no idols), so cross-visibility of kpop rows on anime pages (S1) cannot be reproduced there; run the leak suite on a branch seeded from prod-like kpop data.
