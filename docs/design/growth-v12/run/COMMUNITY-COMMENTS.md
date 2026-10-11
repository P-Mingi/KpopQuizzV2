# V12 private test: comments on every post, replies like on Reddit (2026-10-06)

Branch `v12/private-fixes`, not merged and not pushed. Everything is behind the flags
(`NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`); the flags-off site is unchanged (parity below).
Follows `COMMUNITY-POSTS.md`. Reuses the existing stores and routes: `verse_discussions`
(threads, blogs), `community_replies` (fan debates, challenges, Team posts, and now the daily
debate), `/api/verse/discussions`, `/api/ux-v1/p8/replies`, `verse_flags` and its 3-report trigger.

## What changed

| # | Ask | Done |
|---|-----|------|
| 1 | Comment everywhere | Every signed-in fan comments on a thread, a blog, a fan debate, a challenge, a Team post and the daily debate, open or closed, voted or not. The daily debate keeps its vote with a reply and gains its own comment box, independent of the vote, still open after the close (`community_replies`, `target_type 'daily_debate'`, `target_id` = the day as YYYYMMDD). Voters keep "voted Agree" on their comments, the new ones included. A signed-out visitor sees the box; a click opens the sign-in sheet and brings them back to the post with the box open. |
| 2 | Replies like on Reddit | Reply on any comment and any reply, at every level, 10 levels at most. The one-level limit is gone from `/api/verse/discussions` and `/api/ux-v1/p8/replies`; the parent must belong to the same post and be visible (`lib/ux-v1/p8/nesting.ts`). Each level is indented under a thin line; past 6 levels "Continue this thread" opens the rest (`?branch=<id>`, back button included); a round button under the avatar folds and unfolds a whole branch. Every comment has Reply, the heart and Report. The reply count covers every level (post view and feed). Banned words and the 3-report rule apply to each comment and reply, the daily debate's vote comments included. A hidden reply keeps the place of its replies as "[removed]" (no name, no text sent to the browser). |
| 3 | Disagree bar in dark | The losing side's track and bar were two near-black surfaces (#232120 on #1C1B19). Dark only: an edged track and a lighter bar (`styles/ux-v12/community.css`). |
| 4 | Thread and Blog | Checked end to end: a comment and a reply under a thread and under a blog posted from /community (e2e below). |
| 5 | The 7 localdev items | Out of the /community feed for good, whatever the Verse gates (`retiredVerseRow` in `verse-gate.ts`: threads 1, 2, 3 and blog 2, matched by id and author; their URLs answer 404). |

Reply notifications: none exists today for community replies (the only notification types
are quiz comments, follows, badges and the like), so none was added.

## Database (applied by me through the connector)

- File: `docs/pending-migrations/v12-community-comments.sql` (migration `v12_community_comments`).
  Additive: `community_replies` target types + `daily_debate`; `community_replies.parent_vote`
  (a reply to a vote comment) with a one-parent check; `debate_votes.comment_hidden_at` (a vote
  comment hidden by 3 reports, the vote still counts); `verse_flags.target_ref` and the
  `debate_vote` report type with one report per account; `community_autohidden.target_ref`;
  the 3-report trigger taught the vote comment. No existing row changed or deleted.
- Rollback: `docs/pending-migrations/v12-community-comments-rollback.sql`.
- Trigger proved in a cancelled transaction on a real vote comment: shown after the 1st and
  2nd report, hidden after the 3rd, logged once, a 2nd report by the same account refused.
- Restore: `/admin/community-reports` lists vote comments too ("vote comment") and restores them.

## Checks

- `tsc`: 0 errors. `vitest`: 2060 / 2060 (new: `nesting.test.ts`, `replies/route.test.ts`).
  Route allowlist: green. Docs gate: green. No dash added.
- e2e `e2e/ux-v12/community-comments.spec.ts` (1440, signed-in test user), 7 / 7 with
  `COMMUNITY_E2E_WRITES=1`: a comment on a closed daily debate (real write, then reload); a
  signed-out visitor sees the box and gets the sign-in sheet; a reply to a reply to a reply
  (3 levels, kept after reload) and a comment under a thread posted from /community; folding
  and unfolding a branch; a banned word refused in a reply by the real route (422, nothing
  posted); a comment and a reply under a blog posted from /community; light and dark (thread
  line and the losing debate bar). Captures: `checks/community-comments/` (local, not in git).
  Without writes: the comment is stubbed, the banned-word reply still hits the real route.
- `e2e/ux-v12/community-posts.spec.ts`: 4 / 4 without writes.
- `e2e/ux-v1/p8.spec.ts`: two v11 assertions made v12-aware, as the owner's requests changed
  them (a closed daily debate now has its comment box; with the Verse closed the editor offers
  Thread and Blog and `?compose=thread` opens it). v11 expectations unchanged. One test still
  fails on data, not code: `/community/challenge/1` is a real challenge posted on the private
  version on 2026-10-06 at 20:28 UTC, so it is no longer a 404.
- Test rows: thread 10 (`removed`), blog 12 (`rejected`), their replies and the closed-debate
  comment (`deleted`).

## Flags-off parity

Local build with the flags off (fetch cache moved aside) against https://kpopquiz.org, 40 URLs
(`docs/release/snapshot.mjs`): only live data differs (play and quiz counts, the news feed, 3
new sitemap URLs: kiiikiii and one new quiz) plus the `/pt` home link of a fresh build. Flags
off, `/community` stays a 301, `/api/ux-v1/p8/replies` and `/api/ux-v1/p8/photo` answer 404.
Captures: `checks/community-comments/parity-{main,branch}.json` (local, not in git).

## Deploy

Private only: `dpl_9Nt9TWPBvkRo77Xr8WJ5Wsomko2L` (commit `bc18dfa`), alias
https://kpopquiz-private.vercel.app. kpopquiz.org is still on `dpl_CPRDSnFf57KbPGDzXnc4TxGk8X53`.
Checked on the deploy: the closed debate of 2026-10-04 shows its comment box and "voted Agree",
the nested reply styles are served, `/community/thread/1` and `/community/blog/2` answer 404.
