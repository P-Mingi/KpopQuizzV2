# Phase 0 answers + data safety contract (owner decisions, 2026-09-21)

Paste this to the worker as the reply to the Phase 0 report. It has two parts: the five answers, and a
contract that applies to every phase from now on. The contract is the priority: no existing account,
setting, message, play, comment, badge, streak or XP value may change because of this redesign.

## Part 1 - answers to the five questions

**Q1. Intro mode - KILLED (owner override).** The intro blindtest mode is dead. Remove it fully: from
the hub picker, the modes grid, `STATIC_MODES`, the gameplay / route path, and the sitemap. The indexed
URL `/blindtest/intro-challenge` is **301-redirected to `/blindtest`** (the closest relevant page) so the
mode dies without dropping the page's rankings or link equity into a 404. Do NOT leave a live 404, and
do NOT keep the page playable. (Only if the owner later wants zero trace and accepts losing that page's
search traffic: 410 Gone instead of the 301 - default is the 301.) This is a real SEO change, so it
ships in Phase 5 with the before / after SEO diff attached in the PR. The `blind_test_songs.clip_intro`
column stays in the DB untouched (additive rule - no drop; it just stops being read).

Distinction for the OTHER modes: hiding a mode from the picker is NOT the same as killing it. Only
"Intro" (and the never-existed "Lyrics") are killed and 301'd. Any other `STATIC_MODES` page we merely
stop featuring stays live and indexed; we do not 301 or delete those. If the owner later names another
mode dead, it gets the same 301 kill.

**Q2. Canonical blindtest tables.**
- `blind_test_plays` stays the play history. Keep writing it from `POST /api/blind-test/play` with
  the same payload. It is never migrated, never rewritten.
- `bt_players` (keyed by `user_id`) becomes the blindtest progression record: rank title, rank level,
  bt XP, best score, best combo, streak. Create a row on a user's first blindtest submit after the
  change; never backfill from history. Wire `award_bt_xp` then `update_player_rank` on submit.
- `ranked_plays -> bt_players` for ranked (Phase 6), with the two new columns from the pending
  migration.
- `bt_plays` and `players` are legacy: no reads, no writes, no drop. Leave them.
- Profile XP through `award_xp` keeps its exact current behaviour and amounts. bt XP is a separate
  counter that only feeds the rank title. Nobody's level or XP changes.

**Q3. Live rooms.** New tables `rooms` and `room_messages` (DESIGN-SPEC 12.5) when Phase 7 needs them.
`party_rooms` / `party_players` are game lobbies for the future blindtest party mode, a different
object; keep them untouched for that. Both are additive; neither is built before Phase 7.

**Q4. Font.** Confirmed: Inter everywhere, DM Sans and Syne removed, in Phase 1. Load Inter with
`next/font/google` (subset latin, `display: swap`, weights 400 to 800). Add `Noto Sans KR` as the
Korean fallback for the Hangul labels (verdict stamps, level titles) so they do not fall back to a
random system font. No content changes.

**Q5. Screenshots.** Keep them in git on the branch. They are the acceptance reference for every PR
and 12 MB is fine. Re-encode to WebP at quality 80 in one commit if you want (halves the size), never
resize them: pixel comparison needs 1440 wide.

## Part 2 - data safety contract (applies to every phase)

The redesign is a new skin over existing data. These rules are checked in every PR review.

1. **Additive schema only.** Every migration in `docs/pending-migrations/` may only `CREATE TABLE`,
   `ADD COLUMN ... NULL` (or with a default), `CREATE INDEX`, `CREATE POLICY` that widens nothing for
   anon. Forbidden: `DROP`, `RENAME`, `ALTER COLUMN TYPE`, `TRUNCATE`, `DELETE`/`UPDATE` backfills on
   user tables, changing or removing an existing RLS policy, changing an existing RPC's signature or
   return. Each migration file ends with a commented rollback statement.
2. **Owner applies, after a backup point.** No migration is applied by the worker. The owner checks the
   Supabase backup / PITR state, applies the file, and only then merges the PR that depends on it.
   Code merged before the migration must fail soft (feature hidden, no 500s).
3. **Writes only through existing endpoints.** Profiles, settings, plays, comments, reactions, likes,
   follows, badges, notifications and prefs, daily scores, streaks, activity events, blind test plays
   are written by the endpoints in the wiring map, with the same payloads. The new UI is a new caller,
   not a new writer. New behaviour gets a new endpoint; it never modifies an existing row's meaning.
4. **Auth and identity untouched.** `/login`, `/auth/callback`, `/onboarding`, username claim,
   `claim-runs`, `merge-anon`, cookies, session handling: re-skinned at most, logic byte-identical.
5. **Settings round-trip.** The re-skinned `/settings` submits the exact same fields to
   `POST /api/auth/update-profile`. New preferences (appearance, weekly recap email) are stored in new
   nullable columns or client-side, never in existing columns. Saving a form that the user has not
   changed must produce zero diff in `profiles`.
6. **XP, levels, streaks, badges: no recomputation.** No script re-awards, re-scores or re-levels
   anyone. New XP sources (bt XP, ranked) are separate counters. The level titles and thresholds in
   `lib/level-titles.ts` do not change.
7. **Feature flag and rollback.** The shell and every new page ship behind `NEXT_PUBLIC_UX_V1`
   (default off on main until the owner flips it). Rollback is the flag, not a revert. Vercel preview
   deploys per PR are where the owner tests with his own account.
8. **Data guard script, run before and after every deploy** (`apps/quiz/scripts/data-guard.ts`,
   read-only, service role from env, never printed): row count and `max(updated_at)` for profiles,
   quizzes, plays, quiz_comments, quiz_reactions, likes, follows, user_badges, notifications,
   notification_prefs, daily_blindtest_scores, daily_challenge_plays, blind_test_plays,
   activity_events, debate_votes. Counts may only grow. Output goes into the PR as a table.
9. **Existing-account e2e.** One Playwright test signed in as an owner-provided test account (env,
   never committed): passport values, settings values, badge shelf, comments count and play count
   read the same numbers before and after the shell, in light and dark. Runs on every PR.
10. **No production seeding, no sample data.** Prototype handles and numbers never reach a migration
    or a script. Local dev uses a local Supabase or a copy; production is read-only for the worker.
11. **Privacy.** No new endpoint returns another user's email, auth id, or prefs. New feeds (posts,
    rooms, ladder) expose only what `/u/[username]` already exposes today. No logs of request bodies
    that contain user text.
12. **SEO is data too.** Sitemap, canonical, hreflang `/pt`, JSON-LD, H1 and intro text of every
    public page are compared before and after each PR (existing `seo-indexability` cron logic can be
    run locally); a diff is a blocker, not a note.

If a phase cannot be done inside these rules, stop and write the question. Do not work around a rule.
