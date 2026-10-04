# F6d: the KPDH cover on the remaining surfaces (rule 10)

Progress: done. Branch `v12/f6d-kpdh-cover` (from feat/v12 5911c00). Next: ORCH merge. Blockers: none.

The 12 KPop Demon Hunters songs never show their Deezer cover (the film key art). F6a covered generate;
F6d reuses `isKpdhTrack` / `withoutKpdhCover` (`lib/blind-test-curated.ts`, unchanged) on every other surface.
Not flag-gated (rule fix). Every other song keeps its cover; each test proves it alongside the KPDH case.

## Items (one commit per owner)
1. Daily blindtest, owner F6, `ef40f85`. `app/api/daily/blindtest/route.ts`: the 10 songs pass through
   `withoutKpdhCover` after the Deezer re-fetch, so `album_cover_medium`, `album_cover_big` and
   `reveal.cover` are null for a KPDH song only. Test `app/api/daily/blindtest/kpdh-cover.test.ts`, 3 tests
   (Deezer answers / fails, a day with no KPDH song unchanged). Without the fix: 2 of 3 fail.
2. Ranked, owner F5, `25b9517`. `lib/ranked/service.ts` `issueRun`: after the fresh preview step, a round whose
   pool song is a KPDH track gets `reveal.cover` null (covers the pool cover, the Deezer cover and the
   fallback path). The ranked UI (`use-ranked-run.ts`) reads only `reveal.cover`. Test
   `lib/ranked/kpdh-cover.test.ts`, 3 tests (8 seeded runs each, Deezer answers / fails, pool without KPDH
   unchanged). Without the fix: 2 of 3 fail.
3. Legacy players, owner G1, `929bf78` (test only). `components/blind-test/**` has no cover source of its
   own: `blind-test-player.tsx` draws `song.cover` from `roundFromGenerate(POST /api/blind-test/generate)`,
   `blindtest-game.tsx` draws `q.reveal.cover` from generate and `GET /api/daily/blindtest`. The client never
   receives a Deezer id, so the rule can only hold at the routes (F6a for generate, item 1 for daily); no
   code change in G1's files. Test `components/blind-test/kpdh-cover.test.ts`, 2 tests, runs the real routes
   into what each player renders. With the route fixes removed (generate L311 and daily): 2 of 2 fail.
4. Verse song page, owner F6, `d9583f0`. `app/(site)/verse/[slug]/songs/[id]/page.tsx`: the read adds
   `deezer_track_id` and the cover is picked from `withoutKpdhCover(song)`, so a KPDH song shows the existing
   no-cover disc. Test `kpdh-cover.test.ts` next to it, 2 tests: the KPDH page HTML is byte-equal to the page
   of the same song with no stored cover (only the cover changes); any other song keeps its `<img>`.
   Without the fix: 1 of 2 fails.

## Checks
- Whole-app `tsc --noEmit -p .` green. vitest 99 files, 1953 tests passed.
- Real data (read-only anon read, `F6d/f6d-kpdh-rows.txt`): the 12 rows exist, all with a stored cover;
  the two TWICE songs are `active`, group 4 (`twice`), so they reach the daily set, ranked and the Verse
  TWICE song pages; the 10 others are `soundtrack` with no group (no Verse page).
- No em or en dash in the diff.

## NOT verified
- Daily blindtest live: not called against the dev server, because `ensure_daily_blindtest` writes today's
  set when absent (a production write). Unit tests only.
- Ranked live: not called (issuing a run writes `ranked_runs`). Runs issued before this ships keep their
  stored rounds until they expire (run TTL).
- Verse song page served HTML: `/verse/twice/...` answers 404 on the dev server (only `bts` is in
  `LIVE_SPACES`; TWICE is admin-only today) and no agent signs in, so render-level test only.
- No browser screenshots of the no-cover look on these surfaces (the null paths are existing code).
