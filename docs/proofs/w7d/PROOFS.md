# W7d - proofs

Production build on :3021. `pwd` printed before every gate run.

## PART 1 - blocked, see BLOCKED.md `w7d-ci`

7 workflows, all content crons, 5 secrets between them. The gates need the app built and
running, and `SUPABASE_SERVICE_ROLE_KEY` is not among the repo's secrets. Without it
`sitemap.ts` falls back to static-only and `check:orphans` would grade a sitemap missing
every quiz, group and playlist URL: a green that means nothing. Blocked rather than
fabricated. One real enabler shipped: `check-indexability.mts` no longer hard-requires a
gitignored `.env.local` file, it falls back to `process.env`. Detail in `ci-env.txt`.

## PART 3 - the clip condition had no runtime meaning (measured, not reasoned)

The mission's trace was right. `/api/blind-test/generate` reads `songs` and re-fetches
Deezer previews; nothing in the group blind test path reads `blind_test_songs`.

Groups with >= 10 clean `songs` rows and **zero** clip rows, hit locally:

| playlist | clip rows | questions | with preview_url |
| --- | --- | --- | --- |
| loona | 0 | 10 | 10 |
| astro | 0 | 10 | 10 |
| tws | 0 | 10 | 10 |
| artms | 0 | 10 | 10 |
| katseye | 0 | 10 | 10 |
| **bts** (control, has clips) | many | 10 | 10 |

Identical. The thinnest real pools also fill a full round, which is what justifies
dropping the threshold from 15 to ROUND_SIZE:

    akmu (11 songs) -> 10 questions, 10 previews
    jeon-somi (11)  -> 10 / 10
    cortis (13)     -> 10 / 10
    babymonster (13)-> 10 / 10
    taeyang (13)    -> 10 / 10

So the clip condition was dropped. The old justification ("advertised-basis: it has
clip-ready rows") was circular: advertisable because the old sitemap advertised it.

## PART 2 - the third surface is collapsed

`getBlindtestGroups` no longer has its own rule; it delegates to
`blind-test-playlists.ts`. One threshold, ROUND_SIZE, which is the number generate
actually needs.

    linked on /blindtest:   97   (97 link instances, so each exactly once)
    in the sitemap:         97
    sitemap NOT linked:      0
    linked NOT in sitemap:   0
    picker groups in the server payload: 79   (= the 79 group playlists; 97 = 18 + 79)

The two symptoms named in the mission are gone:

    akmu:    sitemap=true  linked=true  offered=true
    taeyang: sitemap=true  linked=true  offered=true

and the 23 playable-but-unadvertised playlists are now advertised, linked and offered.
Sitemap: 679 -> 705 non-verse URLs, every one of them linked.

## PART 4 - the sitemap batch is not at risk

Direct timing of the pieces inside the 15s race, 3 runs:

| piece | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| playlist read (paginate songs + groups) | 253 ms | 190 ms | 153 ms |
| the query it replaced (one round trip) | 50 ms | 92 ms | 42 ms |
| quizzes read (the batch's other big one) | 230 ms | 156 ms | 198 ms |

The playlist read is **1.0 - 1.7% of the 15s ceiling** and is the same order as the
quizzes read that has always been in the batch. It also got cheaper this mission:
dropping the clip condition removed a second paginated read.

The route itself, cold after boot:

    hit 1: 0.031s  200  571466 bytes
    hit 2: 0.003s  200
    hit 3: 0.003s  200
    <loc> in root sitemap: 3046
    static-only warnings in the server log: 0

The sitemap is prerendered, so the race runs at build time, not per request, and it did
not fall back. **No cache added:** the mission said cache *if* it is a meaningful
fraction of 15s. It is not, and adding a cache layer without evidence is complexity that
has to be maintained and invalidated.

## PART 5 - report only: the stats ARE frozen, and it is worse than a mismatch

`/api/blind-test/play` looks up `blind_test_songs` by ids that `/api/blind-test/generate`
took from `songs`. The two id spaces are **completely disjoint**, tested exhaustively, not
sampled:

    songs ids:            4120
    blind_test_songs ids:  349
    INTERSECTION:            0

So `if (!song) continue` fires on every choice, and `times_played`, `times_correct` and
`avg_answer_time` can never be written by the current game.

Corroborating dates, which put a number on when it stopped:

    newest blind_test_songs.updated_at:  2026-06-05T17:36:42Z
    newest blind_test_plays row:         2026-06-05T17:36:38Z
    blind_test_plays since 2026-07-01:   0

Both stop at the same instant on 2026-06-05. 327 of 349 rows have `times_played > 0`, so
the stats were real once and froze when the game moved to the `songs` table.

**Not fixed, per the mission.** It needs its own mission with a before/after, and there is
a design question first: whether per-song stats should live on `songs` at all now, rather
than being repaired on a table the game no longer reads.

## Gates

tsc **0** · build **0** · check:routes **0** · check:indexability **0** (running server) ·
check:orphans **0**, unscoped, complete crawl of **705** URLs ·
check:metadata-dupes **unchanged**: 8 collision groups, 0 non-verse skips, no `/blindtest`
URL in any collision (checked URLs 971 -> 997, the 26 newly advertised playlists).
