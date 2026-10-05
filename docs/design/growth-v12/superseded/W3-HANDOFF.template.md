# W3 handoff (fill in at the end of the W3 run, save as docs/growth/W3-HANDOFF.md)

Run: W3 growth, branch `feat/growth-w3`, PR <link>, report `docs/growth/REPORT.md`.

## 1. What landed

| Area | Status | Where |
|---|---|---|
| Blindtest tracking (`bt_runs`, `/api/track/bt-run`, `trackBtRun()`) | DONE / OPEN | `lib/tracking/bt.ts` |
| Admin runs page | | `/admin/blind-tests/runs` |
| Score helpers and fixed averages | | `lib/quiz/scoring.ts` |
| RESCENE, NCT WISH, new songs, 2026 songs, KPDH songs | | `docs/pending-migrations/w3-t3-*.sql` |
| Themed playlists | | `lib/blind-test-modes.ts` (ids: ...) |
| Landings en, fr, es, id | | `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`, `/id/tebak-lagu-kpop` |
| KPop Demon Hunters bridge quiz | | `/kpop-demon-hunters-quiz` |

## 2. Pending SQL

| File | Status (written / shown / go / applied / verified) | Unlocks |
|---|---|---|

## 3. For W2 (the owner forwards this section)

- P6 (v11 blindtest): call `trackBtRun.start()` when the first clip plays, `.answer()` per round,
  `.finish()` on the results screen; pass `source` and `playlist` (format in SYSTEM.md 1). The helper
  never throws and never blocks the game.
- Averages and score labels: use `avgScorePct()` and `runScoreLabel()` from `lib/quiz/scoring.ts`.
  Files in W2's paths that still compute inline (from T2):
  | File | Line | Current expression |
  |---|---|---|
- Counts are live: groups, songs, playlists (was 79, now <n>).
- /blindtest Playlists section: read the themed entries of `STATIC_MODES` (ids above). Language row: link
  the four landings.

## 4. For W4 (after W2 merges)

- Landings and the bridge quiz use page CSS (`styles/growth/`, `gl-` classes): move them onto the A0
  components and the v11 blindtest game (with the `strings` prop).
- The bridge quiz data (`lib/growth/kpdh-quiz.ts`) moves onto the Which-member engine.
- `next.config.ts` still 301s `/which-:group-member-are-you`.

## 5. Env vars and owner decisions

- `NEXT_PUBLIC_BT_TRACKING=1` on production: set / not set.
- Decisions needed: ...

## 6. Numbers at handoff

Runs recorded since tracking went live: <n> (completion <x>%), top sources, playable playlists before and
after the catalogue files.
