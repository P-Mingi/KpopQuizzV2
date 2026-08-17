# W7-CLOSE - proofs

`pwd` printed before every gate run. Numbers here are the numbers in the report.

## PART 1 - the answer is (b), and no new key is needed

### What anon can actually read (`anon-vs-service-per-table.txt`)

Counts, anon vs service role, on the tables the sitemap needs:

| table | anon | service | verdict |
| --- | --- | --- | --- |
| quizzes (published) | 400 | 400 | MATCH |
| groups | 88 | 88 | MATCH |
| games (published, name_all) | 24 | 24 | MATCH |
| tot_categories (published) | 20 | 20 | MATCH |
| pulse_reports | 1 | 1 | MATCH |
| idols (active) | 118 | 118 | MATCH |
| albums | 351 | 351 | MATCH |
| songs (active) | 4120 | 4120 | MATCH |
| photocards (published) | 7 | 7 | MATCH |
| collectibles (published) | 5 | 5 | MATCH |
| **verse_seed_ids** | **0** | **30** | DIFFERS |
| **awards** | **45** | **55** | DIFFERS |

**My first sweep was incomplete, and the CI simulation caught it.** The mission's table
list did not include the `duel_*` tables, and neither did I. `getRankingsIndex()` reads
them through the service role and feeds 21 non-verse URLs. Measured after the fact:

| table | anon | service | verdict |
| --- | --- | --- | --- |
| duel_questions | 20 | 20 | MATCH |
| duel_ratings | 360 | 360 | MATCH |
| **duel_votes** | **0** | **60361** | DIFFERS |

`duel_votes` is per-user vote data and RLS is **right** to hide it from anon. Because
`getRankingsIndex` derives each question's vote count from that table, under anon every
ranking reads as locked and its URLs leave the sitemap. So it is not switched: doing so
would break the live `/rankings` pages, not just the sitemap.

### What changed, and what did not

The non-verse sitemap batch and the pulse block now use `createPublicReadClient`.
Production output is **identical**, verified on a build with the real environment:

    total sitemap URLs: 3046    non-verse: 705    verse: 2341

That is the same 705 the orphan gate has been asserting on all arc, and the same 2341
Verse URLs. `server.ts` reserves the service role client for admin routes; this returns
two of the sitemap's three uses to the client it should have had.

### The CI simulation: a build with NO valid service role key

    SUPABASE_SERVICE_ROLE_KEY=invalid-key-ci-simulation npm run build
    -> BUILD_EXIT=0
    -> [sitemap] verse query failed, skipping verse pages: Error: fetchAllRows: Invalid API key
    -> static-only fallbacks: 0
    -> total sitemap URLs: 684    non-verse: 684    verse: 0

**No static-only fallback**, which was the whole risk in the w7d-ci block. Before this
change that build would have produced a static-only sitemap of ~41 URLs and any gate on
it would have been meaningless.

Coverage lost in CI: **21 of 705 non-verse URLs** (`/rankings` + its 20 pages, 3%) and all
2341 Verse URLs. Verse is PAUSED. So the nightly asserts on 684 non-verse URLs, and the
workflow states that in its own header so a green is not over-read.

### All three gates, run against that anon-only build (`gates-under-anon.txt`)

    check:indexability   EXIT=0   34 sampled pages index-consistent
    check:orphans        EXIT=0   684 of 684 crawled, complete crawl
    check:orphans+inject EXIT=1   x /nobody-links-here      <- still fails when it should
    check:metadata-dupes EXIT=1   1 collision group

`check:indexability` was reading through the service role for its inverse DB checks. It
reads only `quizzes` (published) and `groups`, both MATCH under anon, so it now uses the
anon key. That is what makes it CI-capable rather than a fourth reason to ship a key.

### The workflow

`.github/workflows/seo-gates.yml`: nightly at 04:30 UTC plus manual dispatch, builds the
app, boots it on :3021, runs all three gates (each still runs if an earlier one failed,
so one nightly reports everything), and posts to Discord on failure. It uses exactly the
two secrets that already exist, `QUIZ_SUPABASE_URL` and `QUIZ_SUPABASE_ANON_KEY`, and
adds none.

Two bugs were caught and fixed before commit rather than on first run:
1. `secrets` is **not available in a step-level `if:`**. The presence test for the webhook
   moved into the shell via `env:`.
2. The gates were guarded with `always()`, which would have run them even when the app
   failed to boot. They now require `steps.start.outcome == 'success'`.

**The nightly will be RED on its first run**, and not for a new reason: under CI
conditions `check:metadata-dupes` reports exactly 1 collision, the SEVENTEEN duplicate
already filed as `w1-ctr`. Filed as `w7-close-1`, because a nightly that is red from day
one for a known reason teaches people to ignore it.

## PART 2.1 - the double read is deduped

`getAdvertisablePlaylists` is now wrapped in React `cache()`. Counted during one build
with `PLAYLIST_TRACE=1`:

    wrapper calls (getBlindtestGroups): 2
    EXECUTE (real DB read):             3

Four call sites are invoked across the build (`/blindtest` twice: once directly for the
links and once through `getBlindtestGroups` for the picker; `/pt/blindtest` once; the
sitemap once), and only **3** reached the database. `/blindtest`'s two calls collapsed
into one, which is exactly the duplicated pagination of `songs` the mission pointed at.
Without the cache it would be 4. The trace lines are env-gated and silent otherwise
(0 lines in the normal build).

## PART 2.2 - /pt/blindtest

    HTTP 200, 92305 bytes, h1 renders ("Adivinhe a musica de K-pop")
    picker groups in the payload: 79      (same set as /blindtest)
    akmu present: yes    taeyang present: yes
    /blindtest/ playlist links: 0        (unchanged, and deliberately so)

It renders correctly with the new set. No playlist section was added, as instructed.

**Is alphabetical right for that page too? Yes, and the old order was worse than the
mission's description suggests.** The previous sort was `b.count - a.count`, where `count`
is *how many songs we happen to have catalogued for that group*. That is an
implementation detail leaking into the UI: it told a user nothing they could act on, and
it put whichever group we imported most for at the front. The picker is 79 unlabelled
name chips in a grid with **no search box**, so the only thing a user does is hunt for a
name. Alphabetical is the order that makes hunting predictable, in both locales.

**Should /pt link its playlists?** Yes, eventually, and it is a real gap: `/pt/blindtest`
is in the sitemap and links none of the 97 playlists, the same shape as the bug W7c fixed
on `/blindtest`. Not done here, as instructed. Worth noting it is not currently an orphan
risk, because the English index already links every playlist.

## Gates on the real build

tsc **0** · build **0** · check:routes **0** · check:indexability **0** ·
check:orphans **0** (705 of 705, complete crawl) · check:metadata-dupes **unchanged**
(8 collision groups, 0 non-verse skips, 997 checked).
