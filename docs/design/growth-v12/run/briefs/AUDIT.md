# V12 full audit on real data (owner request, 2026-10-04)

Every v12 SQL file is applied (bundles A, B, C: `run/SQL-PENDING.md`). The 9 seed accounts are editorial accounts.
ORCH serves a flag-on production build of the `feat/v12` head on `http://localhost:3071` (`NEXT_PUBLIC_UX_V1=1`,
`NEXT_PUBLIC_UX_V12=1`, `NEXT_PUBLIC_BT_TRACKING` unset). Never start, stop or rebuild it; never run `next build`.

Read `run/briefs/COMMON.md` (rules), `docs/design/growth-v12/SYSTEM.md`, the prototype
(`docs/design/growth-v12/prototype.html`, the "New in v12" views; dashed "Design note" boxes are not copy), the
reference set (`run/checks/reference/`), and `run/RUN-STATE.md` (owner decisions: what is a known deviation).

## What to produce, per feature of your scope
One row per feature: feature, URL(s), visible (yes/no), works (yes/no), what you did to check it, screenshot path,
issue (if any) with file:line when you can find it. Screenshots: 1440 light and 390 light at least, PNG, under
`docs/design/growth-v12/run/audit/<your id>/` (local only: images are excluded from git; commit only your markdown).
Write `run/audit/<your id>.md` (the table first, then the issues, each with: expected, actual, evidence, suspected
cause). An issue is anything missing, broken, empty when real data exists, showing an invented number, wrong copy,
a broken image, a dead link, or a console error. States that waited for SQL are now expected to show real data:
check them first.

## Production writes allowed (owner, 2026-10-04): exactly these, once each, and nothing else
- AU2: one This or that vote (through the real bonus card on a quiz result, as a guest).
- AU2: one Name them all round (through the real page, as a guest).
- AU1: one live test room (host on `/live`, one phone on `/join`, through the real pages; `is_test` is true because
  `VERCEL_ENV` is not production on :3071). Close it at the end with "Close the room".
- AU3: one quiz play started from a creator share link (`/s/<code>`), as a guest, to the end.
For each write: record the exact row ids (read-only SQL with the service role after the write) in your report, under
"Test writes", so the owner can delete them. Every other mutating request is answered locally with `guardWrites`
as usual. Never sign in except through the Playwright setup project; never load `/me` or `/profile` signed in; never
print a secret or an email; read-only SQL otherwise.

## Scopes
- AU1 (blindtest, live): `/blindtest` (Playlists rail, live band, language row, the play-by-group index), the 4
  landings, every themed page (`kpop-hits-2026`, `kpop-hits-2025`, `5th-gen`, `tiktok-viral`, `kpop-demon-hunters`:
  now with real songs), a full blindtest run on 3 playlists including KPDH and hits-2026 (answers locally stubbed
  except reads), and the COVERS: every album cover image on the hub, theme pages, track lists, game and results
  loads (no broken image, no placeholder where a cover exists; check the Deezer image URLs answer 200). `/live` and
  `/join` end to end with the test room. Decision 33 modes that now play as named.
- AU2 (play modes): Which member are you on every one of the 15 groups (`/which-<group>-member-are-you`), the KPop
  Demon Hunters quiz, Name them all on every one of the 17 groups (`/<group>-name-all-members`), This or that on quiz
  results (which groups get the card now: 84 song questions), Fans picked data through its API for 5 groups.
- AU3 (hubs, creators, community, editorial): group hubs (ways to play tiles link to what exists; Fans picked
  section; empty and thin hubs: RIIZE, KATSEYE and 2 others), the new groups' hubs (RESCENE, NCT WISH, KickFlip,
  Hearts2Hearts), share kit and `/creators`, `/leaderboard` (all tabs), the Team badge everywhere one of the 9
  editorial accounts is named (their quiz pages: by line, Made by, comments; their profiles `/u/<username>`; search;
  community), `/admin/editorial` and `/admin/blind-tests/runs` gates (no admin session: check the redirect only).

Anti-stall: no Write or Edit larger than about 100 lines; anything longer than a minute in the background; write the
report as you go. Final answer to ORCH: 15 lines max: counts (features ok / issue / not checked), the issue list with
owners, the test write ids.
