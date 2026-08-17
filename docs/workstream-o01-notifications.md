# O0 + O1 - notifications: in-site foundation + freshness

## Claude Code Implementation Prompt

---

Fix the in-site notification system per the Workstream O audit (Notion; findings
restated here). NO new channels (no push, no email - those are O2+, separate
decisions). This is correctness, noise control, user control, and hygiene.

Hard rules: NO em dashes. Commit per step, do NOT push. Migrations stop-and-wait
for owner (check the next free number, prod head was 121). check:routes green.

## O0 - foundation (P0 fixes + the preferences table)

1. **RLS hardening:** the `creator_notifications` UPDATE policy (mig 047) has no
   WITH CHECK. Add `WITH CHECK (auth.uid() = user_id)`; restrict updatable
   columns to `is_read` (column-level grant or trigger guard - pick the cleaner,
   justify). Verify a cross-user update attempt fails.
2. **Milestone dedup:** concurrent plays near a threshold can double-notify
   (play/route.ts reads count after increment). Add a uniqueness guard
   (user_id, quiz_id, type, title) ON CONFLICT DO NOTHING at insert (mirror the
   fan-out RPC's existing dedup pattern). Prove with a concurrent-insert test.
3. **Coalescing (the big anti-noise lever):** comments + reactions roll up into
   ONE row per quiz per 24h window: first event creates "New comment on {quiz}",
   subsequent events UPDATE that row's title/body to "N new comments on {quiz}"
   + bump created_at + reset is_read. Same pattern for reactions. new_follower:
   guard re-fire on unfollow/refollow (one row per follower pair ever, or per
   30d - pick, justify).
4. **Preferences table** (serves every future channel - design once):
   `notification_prefs` (user_id PK, per-type booleans or a jsonb map, quiz
   mutes uuid[], updated_at). Checked at INSERT time in the shared insert path
   (one gate, not scattered). Default = everything on. Settings UI: a
   "Notifications" section with per-category toggles (group the 10 live types
   into ~5 sensible categories, not 10 switches). Per-quiz mute: an action on
   the notification row itself ("mute this quiz").

## O1 - freshness + hygiene (P1 + P3)

5. **Unread-state sync:** shared unread-count store so bell + center agree;
   "mark all read" updates the bell instantly. Realtime subscription IF
   Supabase realtime is already enabled project-wise and costs nothing extra;
   otherwise a lighter shared-store + refetch-on-focus approach - investigate,
   pick, justify (NANO-safety beats fancy).
6. **Per-item actions:** wire per-item mark-read (API already supports {ids})
   + add dismiss/delete (DELETE policy scoped to owner + endpoint + UI swipe/x).
7. **Retention:** extend an existing cron (prune-activity pattern): delete read
   notifications older than 60 days + cap 200 rows per user (oldest read first).
   Report current table size before/after reasoning.
8. **Schema/type cleanup:** the 3 dead types (trending, like,
   achievement_unlocked): REMOVE from the CHECK + unions (they can return via
   migration when actually wired). Collapse the hand-duplicated type unions to
   one source of truth exported from lib/notifications.ts. Delete or mount
   NotificationsStrip - it is mounted on /me per M1.29; verify, then delete the
   claim mismatch (audit said mounted nowhere - check who is right, report).
9. **A11y pass:** real icons (existing icon set) instead of ASCII letter chips,
   roles/labels on cards, "load more" pagination past 50 in the center.

## Steps
1. Migration(s): RLS fix + dedup guard + prefs table + DELETE policy + type
   CHECK cleanup, one migration -> OWNER RUNS -> verify. Commit.
2. O0 items 2-4 code paths (dedup insert, coalescing, prefs gate + settings UI
   + mute). Commit.
3. O1 items 5-6 (unread sync + per-item actions). Commit.
4. O1 items 7-9 (retention cron, cleanup, a11y, pagination). Commit.
5. Verify sweep: cross-user update fails; double-fire test passes; 5 rapid
   comments = ONE row saying "5 new comments"; muted quiz notifies nothing;
   toggled-off category inserts nothing; bell/center sync instantly; dismiss
   works; dead types gone; tsc + build + check:routes green; zero em dashes.
   Commit.

/caveman report per step. Flag anything the audit got wrong about the current
code (verify-first) rather than fixing a claim that is stale.
