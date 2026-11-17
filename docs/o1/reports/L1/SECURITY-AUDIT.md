# Security advisors triage (lane SECAUDIT, 2026-11-17), file L33

Source: Supabase advisors and the function, view and policy dump read by ORCH on 2026-11-17. Fix file:
`docs/pending-migrations/multisite/launch/L33-l1-security-audit.sql` (rollback beside it). Test: `apps/quiz/src/lib/security-audit-sql.test.ts`.

## Done in L33
- record_play: bound to the caller (anon or authenticated can only pass its own auth.uid(); a guest passes null). Score range checked.
  Caller read: `src/app/api/quiz/[id]/play/route.ts:88` (user-scoped client, `p_player_id = user?.id ?? null`) and `src/lib/db/queries/plays.ts:17`.
  `plays_insert_all` (with check true) replaced by `plays_insert_own`: no code inserts into plays directly (record_play is definer).
- Likes: count moved by a trigger on public.likes (UNIQUE user_id, quiz_id). increment/decrement_like_count are no-ops closed to
  anon and authenticated. Caller: `src/app/api/quiz/[id]/like/route.ts` (changed: no rpc, anonymous gets 401, because a visitor has no user to count).
  Product effect: anonymous likes no longer move the count. Existing like_count values are not recomputed (they include old anon likes).
- Trigger functions: EXECUTE revoked from PUBLIC, anon, authenticated for every public function returning trigger.
- search_path = public, pg_temp on the 30 flagged functions (bodies read: every table is in public, no extension function, auth.* qualified).

## Not changed, and why
- Views entity_images_public, site_assets_public, favourite_character_counts stay SECURITY DEFINER views. security_invoker would break them
  (proved on PGlite in the test): entity_images policy for anon covers only kinds series and character (idol, group, agency rows would vanish);
  site_assets has RLS and no policy (view reads nothing); favourite_characters is own-rows only (the aggregate would be empty). Opening the base
  tables would expose per-user picks and unverified licence data. Proposal: keep the projection views but move them to a non-exposed schema
  with a SECURITY DEFINER function or read through the service role (the pages are server-side); or add policies
  `entity_images: select using (license_verified and thumb_path is not null)` and `site_assets: select using (retired_at is null and published_at <= now() and (path is null or license_verified))`,
  and for favourite_characters an rpc returning only counts >= 30. Owner decision.
- anon and authenticated SECURITY DEFINER functions that the product calls on purpose (dle_*, cast_*_vote, submit_daily_bt_score,
  public_passport, quiz_comment_like_counts, my_passport, ensure_membership, ...): kept.
- 97 tables with RLS and no policy (INFO): intended, service-role only.
- Extensions pg_trgm and fuzzystrmatch in public, leaked password protection: dashboard or a separate owner step.

## Prod versus repo
record_play, increment_like_count, decrement_like_count, handle_new_quiz and passport_on_battle_result in prod equal the bodies of
`docs/pending-migrations/multisite/008-write-locks.sql` (compared whitespace-insensitively). No difference found for them.
