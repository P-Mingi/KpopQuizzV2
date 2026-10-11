# V12 public launch (2026-10-11)

The owner pushed `v12/private-fixes` and gave the go for SWITCH-ON.md sections 1 to 7 in one run.
Everything below happened on 2026-10-11, times in UTC.

## Done

| Step | Result |
|------|--------|
| 1. PR and merge | PR #93 (`v12/private-fixes` to `main`), CI green (unit, e2e), squash merge `dce3a0f`. Vercel built it for production, flags off: `dpl_Hw7EgbTKjs9NFPEvW81sUj7moNyM` (kpopquiz-kepgo2kci-p-mingis-projects.vercel.app). kpopquiz.org answered normally (/, /quizzes, /bts-quiz, /blindtest 200; /community and /live 301; /api/live 404). **Rollback target: `dpl_Hw7EgbTKjs9NFPEvW81sUj7moNyM`**, backup `dpl_CPRDSnFf57KbPGDzXnc4TxGk8X53`. |
| 2. Switch-on | Production only: `NEXT_PUBLIC_UX_V1=1`, `NEXT_PUBLIC_UX_V12=1`, `NEXT_PUBLIC_BT_TRACKING=1` (Preview, Development and `NEXT_PUBLIC_SITE_URL` untouched). The merge's git deployment rebuilt for production without build cache through the Vercel API (`forceNew`, no `withCache`; the build log says "Skipping build cache"): `dpl_77VBFb2YcYBFPcZw3yRnzGy5AVgk`, Ready at 17:02, on kpopquiz.org and www. Checks: /live 200, /api/live `{"ok":true,"max":50}`, stylesheet `v=1cd4d03aef0f`, Google sign-in returns to `https://kpopquiz.org/auth/callback`, no private address in the build. |
| 3. Ranked season 1 | `r1-ranked-season1.sql` applied through the connector at 17:03. Verification: id 1, 2026-10-11 00:00 to 2026-12-06 00:00, 56 days, `covers_now` true. `/api/ranked/me` answers season 1. |
| 4. Editorial calendar | Drafts 1 to 8 approved (reviewer `mingi`, the admin of production), 10:00 and 18:00 UTC, day 1 = 2026-10-11 to day 4 = 2026-10-14. Draft 5 (SEVENTEEN) corrected first (below). Draft 1 published at 17:15 (`post:1`, its 10:00 slot had passed) and shows on /community with the Team link. |
| 5. Pages | The 24 pages of section 5, signed out, phone (390) and desktop (1440), light and dark: 96 loads, all 200, one H1, no sideways scroll, no console error. Admin pages send a signed-out visitor to /login. Sitemap: 721 URLs with the new pages; robots.txt identical to before. No Team account on /leaderboard or /creators; /u/kpophistory shows the Team badge, no level, no XP. |
| 5. Runs | One full run on each landing (en, fr, es, id) in its language. The three named playlists start a run. Hub ways to play on BTS and Stray Kids; This or that card after a BTS quiz; the three new modes show their start. A run with a desktop user agent is recorded in `bt_runs` (landing-fr, 10/10, completed). |
| 5. Community | With the test account: a thread with a photo (production photo check 7.9 s, cold), a blog, a comment, a nested reply, and a reply that notified `localdev` ("testtest replied to your comment", link to the reply). Then hidden: thread 13 removed, blog 14 rejected, comments deleted, the notification marked read; both URLs answer 404. |
| 5. Live | Room 8Q4C28: 2 phones, 5 rounds, 10 answers, podium, closed by the host (players cleared). |
| 5. Snapshot | `docs/release/snapshots/after-v12.json` against `before-v12.json`: titles, H1, canonical, robots, hreflang and status unchanged except the live figures (quiz count, play counts, averages). Links changed by the new design (+18 on the home, +56 on /groups); the ones gone are rotating quiz lists, General K-pop off the home and /groups (owner decision 2026-10-06) and the /verse links (Verse closed). |
| 5. Logs | 17:02 to 17:34: no 5xx, no error log. 4xx: `/apple-touch-icon-precomposed.png` (missing icon, also before) and the two hidden test posts. |
| 6. Private version | `kpopquiz-private.vercel.app` still on `dpl_4FDzR15jgLiQK7ELVteHuvbdJEH8`, protected (302 without a Vercel session). Nothing removed in Supabase. |

## Crons

| Path | State |
|------|-------|
| `/api/cron/editorial-publish` | 200 at 17:15 (published draft 1) and 17:30 (nothing due). 404 before the switch-on, as expected. |
| `/api/cron/live-expire` | 200 at 17:30. |
| `/api/cron/fans-picked` | 200 (run once by hand at 17:18). |
| `/api/ranked/cron/nightly` | 200 (by hand): season 1, nothing to close. |
| `/api/cron/ensure-daily-debate` | 200 (by hand): today's debate ensured. |
| `/api/cron/ensure-daily-quiz` | unchanged, not run by hand (00:05). |

## Gaps found

- Draft 5 (SEVENTEEN) said "the thirteen come together for the group's title tracks": aged, most members are doing or
  starting their military service (through October 2026). Now "the thirteen members come together as one group", as
  the linked page says; EDITORIAL-DRAFTS.md updated.
- Live: one round offered "I Am The Best" and "I AM THE BEST" as two choices (two versions of the same song in the
  pool). The choices are not deduplicated by title.
- The first live script misread the host flow (Show the leaderboard comes before Next round) and left room 7AJR4X open;
  closed with `live_close_room`, the function the host's Close calls.
- Automated runs are not tracked: the tracking route drops a headless browser as a bot, by design. A run with a
  desktop user agent is recorded.
- The first editorial post showed on the /community feed a few minutes after it was published (feed cache).
- Not checked: the signed-in admin views (`/admin/editorial`, `/admin/blind-tests/runs`), no admin session here.
- RESCENE has no quiz yet: its hub is the empty one, no ways to play.
