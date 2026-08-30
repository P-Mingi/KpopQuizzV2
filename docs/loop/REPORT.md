# REPORT - PERF-2: /games cached, community batches merged. Tiny. No push.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd`
printed before every build. No DDL, no DB writes, no push, no title/meta edits, no
layout changes (`src/app/layout.tsx` byte-identical to HEAD). Proofs:
`docs/proofs/perf-2/`. Two files changed, both pre-authorised in PERF-1's flags.

---

## PART 1 - /games gets the PERF-1 treatment (TTL 3600)

**Safety gate first, not optional.** Read every factory in the /games server path:
- `getRankingsIndex` -> `createServiceRoleClient` (cookie-free)
- `getPersonalityGroups` -> `createPublicReadClient` (cookie-free)
- the `songs` count and `games` count -> the page's own `createServiceRoleClient`

None use `createServerClient`, none read cookies/session. All four reads are
identical for every visitor, so nothing per-visitor is cached. Wrapped the four in
`unstable_cache` keyed `games-hub-data` with `revalidate: 3600` (the value the page
already declares). The daily-rotation `pickDaily` and the `counts` derivation stay
in the render, computed from the cached data (deterministic by UTC day, unchanged).

The L-216 trade-off is noted in the wrapper comment: `safeFetch` stays inside the
cache, so a transient read error caches its zero/empty fallback for the TTL rather
than retrying next request; accepted, because the fallbacks render a smaller-but-
valid hub and the 3600s the page already promised bounds the staleness.

Result (`measurements.txt`): repeat requests drop from ~0.36s (uncached, every
request) to **~0.01s on a cache hit**. MISS 0.57s once per hour, then near-instant.
This is the headline win of PERF-2.

## PART 2 - merge the two community batches

Inside PERF-1's cached function the 14 reads ran as two sequential `Promise.all`
(7 + 7) with no data dependency. Merged into one `Promise.all(14)` so they run
concurrently. This path only runs on a cache MISS, so any win is revalidation
latency.

Measured, `/leaderboard` MISS (first request after a fresh server start, both runs):

    BEFORE (two sequential batches): 0.773s
    AFTER  (one Promise.all(14))   : 0.745s

**Within noise - no measurable page-level MISS win, and I will not claim one.** The
honest reading: the isolated probe in PERF-1 that measured 347ms + 819ms ran cold
Supabase clients from this laptop; in the built server the connection pool is warm,
so the sequential-batch penalty is a small fraction of the page MISS, which is
dominated by render, serialization and the separate `CrossSpaceFeed` read. The
merge is still correct (the 14 reads now run concurrently) and costs nothing, so it
stays - it simply does not move the page total in this environment. `/leaderboard`
HIT is unchanged (~0.16s; hits skip the DB regardless of batch shape).

## PART 3 - proof

Full numbers in `measurements.txt`. Production build, same machine both runs:
- `/games`: repeat 0.36s -> 0.01s (Part 1 win).
- `/leaderboard` MISS: 0.773s -> 0.745s (Part 2, within noise).
- `/quizzes` (untouched control): unchanged.
- `check:routes`: PASSED (364 routes). `check:indexability`: PASSED (floor).
- `/games` output intact on the after-build (correct title + CollectionPage JSON-LD).
- `layout.tsx`: byte-identical to HEAD.

The local build's sitemap is verse-inflated (3059 URLs; `.env.local` has
`VERSE_PUBLIC=true`, so PUSH-GATE-1 does not fire locally as it does in
production's 708), which is why the indexability floor counts against 3059. That is
an environment fact, unrelated to a data-cache change that touches no route,
metadata or link.

## Deviations and flags

1. **Part 2 produced no measurable win, reported as such** rather than dressed up.
   The merge is a free correctness change; the MISS-latency benefit that the PERF-1
   probe implied does not survive the warm-pool reality of the built server.
2. **/games MISS (0.57s) is higher than its old uncached time (~0.24s).** Expected:
   the miss now also primes the cache, and `getRankingsIndex` is the heavier read;
   every request after it in the 3600s window pays ~0.01s instead of ~0.36s, which
   is the trade the mission asked for.

## What success looks like (met)

`/games` repeat requests are ~0.01s (were ~0.36s); the batches are merged; every
cached read is cookie-free and identical for all visitors; the root layout is
byte-identical to HEAD; the diff is two files.

---

STOP. /games cached at 3600s (repeat 0.36s -> 0.01s), community batches merged
(correct, but no measurable page MISS win, said plainly), layout untouched. Nothing
pushed. Report ready.
