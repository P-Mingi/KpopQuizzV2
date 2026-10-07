# V12 private test: community notifications in the bell (2026-10-07)

Branch `v12/private-fixes`, not merged and not pushed. Everything is behind the flags
(`NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`); the flags-off site is unchanged (parity below).
Follows `COMMUNITY-COMMENTS.md`. Built in the existing system: `creator_notifications` (the
bell and `/notifications`), `notification_prefs` (the Social category, enforced by the mig-122
gate trigger). No new system.

## What changed

| Ask | Done |
|-----|------|
| Reply to your comment | `community_reply`: "X replied to your comment", with the start of the reply, to the author of the comment or reply answered, at any level (a vote comment of the daily debate included). |
| Comment on your post | `community_comment`: "X commented on your post", with the start of the comment, to the author of the thread, blog, fan debate or challenge. A reply to a thread's opening post counts as a comment. The daily debate (posted by the site) and Team posts tell no one. |
| The click | Opens the post on the reply (`?reply=<id>`): its branch unfolds, "Continue this thread" opens when it sits deeper than 6 levels, the list grows to include it, it scrolls into view and is highlighted for a moment (static tint without motion). Works from the bell while already on the post. |
| Never yourself, never Team | Checked in `lib/ux-v1/p8/notify.ts` before any write. |
| Social | Off = nothing: the gate trigger drops the insert, and a grouped update checks it too. |
| Grouping | While a notification is unread, the next reply to the same comment (or comment on the same post) updates it: "X and 2 others replied to your comment", with the newest text and link. Once read, the next one starts a new row. |
| Refused or hidden | A text the banned words refuse notifies no one (the routes notify after the insert). A reply hidden by 3 reports leaves its notifications: the 3-report trigger calls `community_notifications_retract`, which rebuilds the title from what is left or deletes the row. |
| p8 test on `/community/challenge/1` | Now aims at `999999999999`, the largest id a post URL accepts (12 digits, a trillion rows past any sequence here); `/community/thread/999999999` moved to the same id. |

Other tests checked for the same dependency: `g9.spec.ts` now aims at `e999999999999` (it used
`e999999999`); its `e1` check runs only with v12 off, where the code answers 404 whatever the
data. The reverse dependency was found too: the QA axe and keyboard walks required thread 1 and
blog 2, the localdev rows the owner retired for good. They now take the first community thread
or blog linked from /community and skip (never pass) when there is none.

## Database (applied by me through the connector)

- File: `docs/pending-migrations/v12-community-notifications.sql` (migration
  `v12_community_notifications`). Additive: the type check widened with the two types; two
  nullable columns `group_key` and `sources` (who and what, for grouping and retraction); one
  partial unique index (one unread row per recipient and group); a GIN index on `sources`;
  the gate function maps both types to Social; `community_notifications_retract(ref)`; the
  3-report trigger calls it. No existing row changed or deleted.
- Rollback: `docs/pending-migrations/v12-community-notifications-rollback.sql`.
- Proved in a cancelled transaction: hiding one of two replies rebuilds the title from the
  other ("Local Dev replied to your comment"), hiding the last one deletes the row, and an
  insert for a fan with Social off is dropped.

## Checks

- `tsc`: 0 errors. `vitest`: 2072 / 2072 (new: `notify.test.ts`; the replies route test now
  asserts who is told). Route allowlist: green. Docs gate: green. No dash added.
- e2e `e2e/ux-v12/community-notifications.spec.ts`, 6 / 6 with `COMMUNITY_E2E_WRITES=1`: a reply
  at level 3 notifies the author of level 2 and no one else; a comment on a blog notifies its
  author; two replies to the same comment while unread stay one row, "testtest and 1 other";
  Social off notifies no one; a click in the bell opens the post on a reply 8 levels deep
  ("Continue this thread" opened, highlight, in view, marked read); a reply hidden by 3
  reports takes its notification away. The test user acts through the real routes; the
  owner's local test account `localdev` is the author who gets notified.
- Regression: `p8.spec.ts`, `g9.spec.ts`, `community-comments.spec.ts`, `community-posts.spec.ts`:
  25 passed, 0 failed. QA post cases: skipped (no community post in the feed today).
- Test rows: threads 11 and 12 `removed`, blog 13 `rejected`, comments `deleted`, the
  notifications made by the run deleted, localdev's notification settings back as before (none).

## Flags-off parity

Local build with the flags off (fetch cache moved aside) against https://kpopquiz.org, 40 URLs:
only live data differs (play and quiz counts, the news feed, 4 new sitemap URLs) plus the `/pt`
home link of a fresh build. Flags off, `/community` stays a 301 and the replies route answers
404. Captures: `checks/community-notifications/parity-{main,branch}.json` (local, not in git).

## Deploy

Private only: `dpl_8KwgeyfgCm7VvHZnN1duH5wGhcpX` (commit `04bd2a4`), alias
https://kpopquiz-private.vercel.app. kpopquiz.org is still on `dpl_CPRDSnFf57KbPGDzXnc4TxGk8X53`.
The first CLI attempt answered "Not authorized" (transient: the login was fine); the retry went through.
