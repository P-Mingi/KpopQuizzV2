# W7c - closing the orphan classes and deleting the scope

All numbers from the SERVED HTML of a production build on :3021.

## The headline

`check:orphans` passes **unscoped**, on a **complete crawl of all 679 non-verse sitemap
URLs**. The scope flag is deleted, not narrowed.

    Orphan gate: 679 non-verse sitemap URLs, crawled 679 of 679 pages
    Orphan gate passed: every one of the 679 non-verse sitemap URLs has at least one
    inbound internal link from the 679 crawled pages. (Complete crawl of every
    non-verse sitemap URL.)

And it still fails when it should (`gate-RED-injected.txt`):

    ORPHANCHECK_INJECT='/nobody-links-here'
    Orphan gate FAILED: 1 sitemap URL(s) ... x /nobody-links-here

## The gate was lying to me first

Before fixing anything, two sampling defects had to go, because they were inventing
orphans that did not exist.

**1. Index pages were not always crawled.** The sampler treated only 2-segment paths as
hubs. `/games/name-all` has three, so it usually missed the sample, and the five games it
links looked orphaned. They were never orphaned: the served `/games/name-all` links all
five, 1 each. The rule is now "always crawl any sitemap path that is a path-prefix of
other sitemap paths", because such a page is by definition an index and is exactly where
inbound links live.

**2. Sampling itself.** With a partial crawl the orphan set churned run to run
(71 -> 64 -> 59 across three runs, with pages entering and leaving). A page whose only
inbound link sits on an unsampled page reads as an orphan. The crawl now covers
**everything** by default, so the result is a proof rather than a floor.

Between them these removed 8 phantom orphans: the 5 name-all games, `/easy-kpop-quizzes`
(linked from the "best kpop quizzes for beginners" article), `/guess-the-kpop-idol`
(linked from its own guide article, exactly as the mission predicted), and
`/kpop-quiz-2026`. **None of them needed a link. Adding one would have been the dishonest
fix for a problem that did not exist.**

The definitive full-crawl set was **56**: 53 blindtest playlists + /trending, /new,
/most-liked.

## PART 1 - /blindtest now links what it indexes

Before: 45 links served, **zero** to any `/blindtest/` playlist. The picker is a
client-side selector, and a selector is not a link.

After (`coverage.txt`):

    playlists linked on the index: 71   (link instances: 71, so each appears once)
    blindtest playlists in sitemap: 71
    sitemap playlists NOT linked by the index: 0

**The root cause was three disagreeing sources of truth**, which is how the orphans got
made in the first place:

| source | basis | count |
| --- | --- | --- |
| sitemap | rows in `blind_test_songs` | 56 groups |
| /blindtest picker | `songs` >= 15 | 74 groups |
| the game itself | `songs`, needs 10 to fill a round | - |

So the sitemap advertised 5 playlists the picker never offered, and 23 playable ones were
never advertised. `src/lib/blind-test-playlists.ts` is now the single definition, used by
**both** the sitemap and the index, so they cannot drift apart again.

**Three playlists were removed from the sitemap rather than linked**, the (b) case: they
cannot fill a 10-song round, so advertising them is advertising a game that does not
happen. Measured in `songs`, the pool `/api/blind-test/generate` actually draws from:

    the-boyz  9 songs      miss-a  0 songs      psy  0 songs

Verified gone: all three return "removed" from the sitemap. akmu (11) and taeyang (13)
clear the bar and are linked, not dropped.

## PART 2 - the name-all five: a data condition, no. A template gap, no.

They differed because **the crawl missed their index**, nothing else. All 24 name-all
games are `status = published`, including these five, and `/games/name-all` links all five
in served HTML (1 each). Reported as an artefact and fixed in the crawler, not by adding
links.

## PART 3 - triage of the landing pages

| page | verdict | why |
| --- | --- | --- |
| /easy-kpop-quizzes | artefact, no fix | linked from `/articles/best-kpop-quizzes-for-beginners` in served HTML |
| /guess-the-kpop-idol | artefact, no fix | linked from `/articles/guess-the-kpop-idol-guide`; the mission called this one |
| /kpop-quiz-2026 | artefact, no fix | had inbound links once the crawl was complete |
| /data/pulse/2026-07 | artefact, no fix | linked from the `/data/pulse` index, which is now always crawled |
| /trending | (a) linked | genuinely unlinked; now on `/quizzes` beside the popular windows |
| /new | (a) linked | same |
| /most-liked | (a) linked | same |

**Why those three were genuinely unlinked, and it is not obvious:** they appear in
`top-nav-links.tsx`, which looks like a link but is not. They sit in the `match` array of
the Home entry (`{ label: 'Home', href: '/', match: ['/trending', '/new', '/most-liked'] }`),
which is a rule for highlighting the Home tab, never a rendered anchor. Confirmed against
the served home page: `href="/trending"` appears **0** times.

They are browse views of the quiz catalogue, so they belong on `/quizzes` next to the
existing "Popular today / this week / this month" row, not in a footer. Verified: 1 link
each on the served `/quizzes`.

## Gates

tsc **0** · build **0** · check:routes **0** · check:indexability **0** (running server) ·
check:orphans **0 unscoped, full crawl** · check:metadata-dupes **unchanged** (still
exactly 8 collision groups, 0 non-verse skips, no `/blindtest` URL in any collision).

Sitemap went 682 -> 679 non-verse URLs: the three unplayable playlists, removed on purpose.
