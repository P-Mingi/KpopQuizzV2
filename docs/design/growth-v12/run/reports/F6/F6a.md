# F6a: blindtest fixes (AU1 I1, I2)

Progress: done. Branch `v12/f6a-blindtest` (from feat/v12 d251d8e). Next: ORCH merge. Blockers: none.

## Items
1. AU1 I1, KPDH covers (owner G2), commit `4e38305`. `withoutKpdhCover` in `lib/blind-test-curated.ts`;
   generate drops `album_cover_medium`, `album_cover_big` and `reveal.cover` for the 12 `KPDH_DEEZER_IDS`
   after the Deezer re-fetch, every playlist, every flag state (not gated). The game, results rows and share
   image already fall back to the no-cover look on null (`span.p6-cv`, `span.p6-scv`, `preview.image` null);
   theme page, track lists and hub rail never render a song cover (typographic), so no change there.
   Test: `generate/kpdh-cover.test.ts`, 9 tests (3 flag states x Deezer up/down, KPDH playlist, helpers);
   mutation check: 7 of 9 fail with the fix removed.
2. AU1 I2, kpop-legends and title-tracks (owners G2 `91f3309`, G3 `3979a4e`). `modes.ts`: `NAMED_WHEN_PLAYABLE`,
   `staticPlaylistFor` / `modeRun` take `namedPlayable`; `blind-test-playlists.ts`: `isNamedModePlayable`
   counts generate's own pool (legends: curated active, year <= 2017; title tracks: curated active,
   `is_title_track`), true at 10 or more, false on error, no query with the flag off. `mode-page.tsx` passes it.
   Decision: these are v11 mode pages (URL, title, H1, copy kept), so "hidden under 10" hides the named run,
   not the page: under 10 the page plays its v11 run, labelled with what it plays. Test:
   `generate/named-modes.test.ts`, 10 tests.

## Real-data proof (dev server :3062, read-only generate + anon reads; `F6a/`)
- Flag on: `/blindtest/kpop-legends` serves pick `kpop-legends` "K-pop legends"; `/blindtest/title-tracks`
  serves `title-tracks` "Title tracks only". 3 runs of 15 each: legends years 2009 to 2017 only, title tracks
  all `is_title_track = true`.
- Covers, flag on (18 runs: legends, title-tracks, KPDH, twice, gg, all): 43 KPDH questions, 0 with a cover;
  all 218 other questions have a cover. v11 only (9 runs: twice, gg, all): 7 KPDH questions, 0 with a cover;
  128 others, all with a cover. `f6a-probe-on.json`, `f6a-probe-v11.json`.
- v11 only: kpop-legends still plays `all` "All K-pop", title-tracks `hits` "Hits" (unchanged).
- Served HTML of /blindtest, /blindtest/kpop-demon-hunters, /blindtest/girl-groups (flag on): 0 `dzcdn` URLs.
- Whole-app tsc green; vitest 93 files, 1925 tests passed.

## NOT verified
- Both flags off was checked by unit tests only (no dev server in that state).
- No browser screenshots of the no-cover reveal or results rows (the null path is v11 code, unchanged).
- Outside F6a's owners, the same KPDH cover can still show for the two active TWICE songs in: the daily
  blindtest (`app/api/daily/blindtest/route.ts`, no owner), ranked (`lib/ranked/db.ts`, F5), the legacy
  player (`components/blind-test/**`, G1) and the Verse song page (`verse/[slug]/songs/[id]`, no owner).
  `isKpdhTrack` / `withoutKpdhCover` are ready for them; ORCH to assign.
