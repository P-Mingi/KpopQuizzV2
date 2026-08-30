# REPORT - PERF-1: /leaderboard bought back with a data cache, layout untouched. No push.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd`
printed before every build. No DDL, no DB writes, no push. `src/app/layout.tsx` is
byte-identical to HEAD (`git diff HEAD` empty). Proofs: `docs/proofs/perf-1/`.

The diff is one file: `src/components/community/community-content.tsx`.

---

## PART 1 - the time is in the database, so a cache is the right tool

Measured each of the 14 community reads (warm, from this machine; absolute ms carry
my network latency to the DB, the breakdown and structure are the finding). Full table
in `measurements.txt`. Top costs: `getHappeningNow` 278ms, `getQuizOfTheDay` 270ms,
`getDailyDebate` 258ms, `getHotMatchups` 219ms, `getNewQuizzes` 186ms. No single query
dominates.

Structure: the page issues 14 reads in **two sequential `Promise.all` batches** (7 then
7), 347ms + 819ms = 1166ms wall-clock. The two batches have no data dependency, so they
are needlessly sequential: an available concurrency win. I left it untouched (Part 3 is a
cache, and "no while I am here"), and flag it here as the natural next optimisation.

The cost is genuinely in the DB, so I proceeded to Part 2.

## PART 2 - the safety gate: nothing in this path is per-visitor

The one irreversible mistake would be caching one visitor's data and serving it to
another. I did not trust the page comment; I read every client factory.

Every read in `CommunityContent`'s server path uses a **cookie-free** client:
- 11 reads use `createPublicReadClient()` = `createServiceClient(url, ANON_KEY)`.
- 3 reads (`getHotMatchups`, `getQuizOfTheDay`, `getDailyDebate`) use
  `createServiceRoleClient()` = `createServiceClient(url, SERVICE_ROLE_KEY)`.
- The child server component `CrossSpaceFeed` (`getCrossSpaceFeed`) also uses
  `createPublicReadClient()`. `CommunityCrossPromo` and `ActivityTicker` are client
  islands (no server read).

`createServerClient()` is the only factory that calls `cookies()`
(`lib/supabase/server.ts`), and **not one of these reads uses it** (its only callers are
`getProfileById` / `checkUsernameAvailable`, which this page never calls). Both cache-safe
factories take a fixed key and return identical data for every visitor. The personal bits
(`YourStanding`, follow buttons) are separate client islands, matched per-viewer on the
client. So nothing user-dependent is cached. `unstable_cache` also enforces this: it throws
if the wrapped function reads a dynamic API.

## PART 3 - the fix, smallest form

The page declares `revalidate = 300`, but the root layout's `await headers()` makes the
route dynamic, which silently drops that ISR and runs all 14 reads on every request. The
fix restores the author's 300s contract **one layer down**: wrap the 14 reads in
`unstable_cache` (built into `next/cache`, no new dependency) keyed `community-content-data`
with `revalidate: 300`.

Why it survives a dynamic route: `unstable_cache` is a DATA cache, not a page cache. It
persists the function's return in the Next Data Cache across requests with the TTL,
independent of whether the page is static or dynamic. On a cache hit (every request inside
the 300s window) the DB is not touched at all. The two-batch structure is unchanged; the
only change is the cache wrapper. The freshness contract is unchanged (300s, exactly what
the page already promised). Both routes that mount `CommunityContent` (`/leaderboard` and
`/verse/community`) benefit, and both are public.

## PART 4 - before vs after, local production build (same machine both runs)

Full numbers in `measurements.txt`. Three requests each:

    BEFORE (build of HEAD)      req1     req2     req3
      /leaderboard             1.008s   1.095s   0.810s   <- no repeat speedup, DB every time
      /games                   0.237s   0.401s   0.268s
      /quizzes (control)       0.242s   0.119s   0.201s

    AFTER (build with the fix)  req1     req2     req3
      /leaderboard             0.277s   0.244s   0.214s   <- ~5x under the 720ms target
      /games                   0.298s   0.375s   0.414s   <- UNCHANGED (not touched)
      /quizzes (control)       0.205s   0.145s   0.252s   <- UNCHANGED

Cold-cache sequence (data cache cleared so req1 is a guaranteed MISS):

      /leaderboard  req1 MISS 0.837s | req2 HIT 0.160s | req3 HIT 0.164s | req4 0.347s | req5 0.172s

**Do requests 2 and 3 get faster? Yes, definitively.** Miss 0.84s to hit ~0.16s, against a
flat ~1.0s before. `/games` and `/quizzes` are unchanged, confirming the fix is scoped to
`/leaderboard`. Output is intact: the served `/leaderboard` still contains Community, Hall
of Fame, Community pulse, Fandom, total plays, and the correct title.

### Gates

- `check:routes`: PASSED (364 page routes). My change adds no route.
- `check:indexability` (vs the after-build): PASSED.
- `check:metadata-dupes` / `check:orphans`: these measure page metadata and the link graph,
  which a component-level data cache cannot touch. Note: the LOCAL build's sitemap is
  verse-inflated (3047 URLs; `.env.local` has `VERSE_PUBLIC=true`, so PUSH-GATE-1 does not
  fire locally as it does in production's 708-URL sitemap), so the raw local dupe count
  (9 groups) and the orphan crawl are not comparable to the production "8" baseline. Every
  local metadata-dupes warning is a `/verse/*/community` 404 (verse spaces are not seeded
  locally); none involve `/leaderboard` or `/games`. Against production the metadata-dupe
  picture is the pre-existing quiz-title set, unaffected by this change.

## Deviations and flags (loud)

1. **`/games` was left untouched.** It is the same class (declares `revalidate = 3600`, its
   own comment blames the same cookie-reading nav) but a different TTL and a far smaller
   cost (~265ms). The mission is "buy back /leaderboard" with "smallest form"; fixing /games
   would be the same one-line pattern with a 3600 TTL, and I did not do it unasked. Its
   before/after here shows it unchanged, which is the honest scoping evidence. Say the word
   and it gets the same treatment.
2. **The two sequential batches were left sequential.** Merging them into one
   `Promise.all(14)` would cut the cache-MISS latency (the once-per-300s revalidation), but
   it changes concurrency behaviour beyond caching, so I left it and flagged it in Part 1.
3. **Absolute ms are from this machine**, which is slower to the DB than Vercel's dub1. The
   before/after delta and the miss-vs-hit delta are the comparable, meaningful numbers.

## What success looks like (met)

`/leaderboard` serves in ~0.16s on repeat (target: well under 720ms); no visitor sees
another's data (every cached read is cookie-free and identical for all); the root layout is
byte-identical to HEAD; the diff is one file.

---

STOP. Cost measured (in the DB), safety proven (nothing per-user), fix is one
`unstable_cache` wrapper at 300s, /leaderboard down from ~1.0s to ~0.16s on repeat, layout
untouched. Nothing pushed. Report ready.
