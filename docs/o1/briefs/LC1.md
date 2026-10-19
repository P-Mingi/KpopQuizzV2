# Lot (c), part 1, lane LC: the passport SQL 003 to 008, tried on o1-scratch
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-LC, branch o1/LC. Read this brief, the files it names and the
code you change; nothing else. M = docs/pending-migrations/multisite, C = docs/o1/contracts, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1.
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets and
  never print a database URL or key. The only database you may write is o1-scratch, and only through S/migrate-dev.sh --branch scratch
  or `S/env.sh scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -v ON_ERROR_STOP=1 -f <file>'`.
- Never edit tests, gates, C/**, scripts/o1/**. kpopquiz.org must behave byte for byte as today. No en or em dash, no emoji.
## What to write (one file each, plus `<name>.rollback.sql` beside it)
The DDL is frozen in C/schema.sql: each object carries an `@file` marker naming its file; take it from there, do not invent columns.
Each file: header (what, why, rows touched, verify queries, undo), idempotent (IF NOT EXISTS, CREATE OR REPLACE, DO blocks), one
transaction, grants as the contract says. Order: 003, 004, 005, 006, 007, 008.
- M/003-memberships.sql: public.world_memberships (PK user_id, site_id), check world_memberships_kpop_null_check, policy
  world_memberships_select_own; backfill one kpop row per profile (joined_via 'backfill'); trigger trg_profiles_membership AFTER INSERT
  ON profiles (fn profiles_membership, EXCEPTION WHEN OTHERS so it can never block a sign-up, site from current_setting('app.site_id', true),
  default kpop); fns ensure_membership(p_site, p_via, p_via_code) and create_profile_for_site(...) as in C/schema.sql.
- M/004-passport-prefs.sql: passport_prefs, favourites (site_id <> 'kpop'), world_follows, trigger trg_world_follows_counts, views
  world_progress and favourites_all (security_invoker), RLS.
- M/005-net-counters.sql: bridge_daily (RLS on, no policy) and net_bridge_bump(...) for service_role only.
- M/006-passport-handoff.sql: schema passport (never in the Data API), passport.handoff_codes, passport.handoff_events, fns
  passport_issue_code, passport_redeem_code, passport_log_event, passport_cleanup, service_role only. passport_issue_code must refuse a
  user in 'deletion_pending' when passport.deletion_requests exists (guard with to_regclass; that table comes later).
- M/007-world-xp.sql: award_world_xp (raises on 'kpop'), bump_world_counter, public_passport, my_passport, update_my_membership,
  set_passport_prefs.
- M/008-write-locks.sql, the dangerous one: redefine the 11 functions award_xp, record_play, handle_new_quiz, increment_like_count,
  decrement_like_count, notify_badge_earned, notify_group_quiz_alerts, cast_duel_vote, passport_on_battle_result, record_bt_play,
  merge_anon_passport. For each: the kpop branch is today's body copied verbatim from ~/kpq-o1/prod-public.sql (the production schema
  dump, read it with grep and sed ranges; it holds no secret), the non-kpop branch writes world counters through the 007 helpers.
  award_xp counts badges on kpop quizzes only; notify_* set site_id. Keep trigger names (on_quiz_insert, trg_notify_badge_earned,
  group_quiz_alerts_on_insert, group_quiz_alerts_on_publish, trg_passport_on_battle_result) and today's ACL exactly (owner keeps PUBLIC
  EXECUTE as today). merge_anon_passport: drop the 6-arg form, create it with `p_site text default 'kpop'`, as C/schema.sql says.
  Its rollback holds today's definitions and ACL verbatim from prod-public.sql, never a reconstruction.
- Rollbacks run in reverse order and leave the schema exactly as before (diff the catalog, see below).
## Tests on o1-scratch (all must pass, evidence in docs/o1/reports/LC/scratch.md, numbers only, no URL)
1. Apply 003 to 008 in order with S/migrate-dev.sh --branch scratch; then the verify queries: count of world_memberships with site_id
   'kpop' equals count of profiles; sum(xp) of profiles unchanged; no badge_definitions row with site_id <> 'kpop'.
2. A new profile insert gets its kpop membership; with `set app.site_id = 'anime'` it gets an anime one; a forced failure inside the
   trigger function does not block the insert; award_world_xp('kpop', ...) raises.
3. Equivalence of 008: write apps/quiz/e2e/o1/LC/equivalence.sql, a deterministic batch with at least 50 calls of each kpop write path
   (plays, likes and unlikes, quiz creates, follows, duel votes, battles, blind test plays, anon merge, badges) inside BEGIN ... ROLLBACK,
   ending with one md5 over the touched profiles columns (xp, counters, badges, streaks) and notifications. Run it before 008 and after
   008: the two hashes must be equal. Write the runner as apps/quiz/e2e/o1/LC/equivalence.sh (uses S/env.sh scratch).
4. Catalog diff: `/opt/homebrew/opt/postgresql@18/bin/pg_dump --schema-only` of public and passport (via env.sh scratch, to a file under your worktree, not committed)
   before 003 and after the rollback of 008 to 003: identical except ordering. Then re-apply 003 to 008 and leave scratch applied.
5. `S/env.sh scratch -- /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/node_modules/.bin/tsx
   apps/quiz/scripts/o1/check-contract.mts --target db --applied-only` and `pnpm -C apps/quiz exec vitest run src/lib/site/contract.test.ts`.
6. `pnpm -C apps/quiz exec tsc --noEmit`: 0 errors.
Commit on o1/LC ("o1: LC ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Do not write app code: part 2 does.
Hand back at most 10 lines: last sha, files, the 6 checks with results (hash values may be shown), anything unspecified you decided.
