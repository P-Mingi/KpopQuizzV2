# W7 - internal link mesh: the audit, before any change

The mission said report first, do not silently rewrite the link graph. So nothing in
7a-7d was changed. This is what the crawler found in the served HTML of a production
build (`docs/proofs/w7-clusters/audit-before.txt`).

## The headline: three of the four items are already built

| item | question | answer |
| --- | --- | --- |
| 7a | hub links to its spokes | already rich |
| 7b | spoke links back to its hub | 120 / 120 |
| 7c | spoke links to siblings | already present |
| 7d | orphans | 11 group hubs |

**7b is not a gap.** Every one of the 120 sampled quiz pages already links to its group
hub, and it does so with varied wording rather than one repeated exact-match anchor:
`/q/blackpink-world-records-and-achievements` carries "BLACKPINK Quiz", "BLACKPINK" and
"All BLACKPINK quizzes" to `/blackpink-quiz`.

**7a and 7c are not gaps either.** `/bts-quiz` emits 93 links with **81 distinct anchor
texts**: 45 quizzes, 1 trivia, 4 blindtest, 15 games, 3 group. A sampled quiz page emits
41 links with 36 distinct anchors. The mesh is dense and the wording already varies, so
the usual reason to build a "related links" module (thin, repetitive, exact-match
anchors) does not apply here.

Adding a links module on top of this would have made the graph noisier, not stronger.
That is the main reason this turn shipped an audit and not a rewrite.

## 7d - the 11 orphans, which is the real finding

Zero inbound links from anywhere in the crawled set:

    /akmu-quiz      /loona-quiz     /kickflip-quiz   /xikers-quiz
    /loossemble-quiz /artms-quiz    /treasure-quiz   /tws-quiz
    /monsta-x-quiz  /dreamcatcher-quiz  /astro-quiz

These are real group hubs with published quizzes. They are in the sitemap, so they are
discoverable, but nothing on the site points at them, so they get no internal depth
signal and no crawl priority from their neighbours.

The mission says report, not fix, and I agree with that order here: the honest fix is a
decision about which surface should carry them (the `/quizzes` index, a group directory,
the related-groups map in `src/lib/related-groups.ts`), and inventing links from
unrelated pages to hit a number is exactly the kind of mesh that gets discounted.

Recommendation when you want it built: extend `RELATED_GROUPS` so each orphan is a
neighbour of a group that genuinely resembles it (LOONA / ARTMS / LOOSSEMBLE are one
real family, and the audit found all three orphaned together), rather than a generic
"more groups" strip. That is a data edit, not a template change.

## The limitation, stated rather than buried

Orphan status is computed against the **crawled set of 186 pages**, not all 681 non-verse
sitemap URLs. A page listed here could still have an inbound link from a page outside the
sample. The 11 are orphaned relative to every hub, every trivia page and the 120 sampled
quizzes, which is the part of the graph that carries depth signal, but this is a floor on
inbound links, not a proof of zero.

## One bug in the audit itself, found and fixed mid-run

The first pass classified group hubs with `/-quiz$/`, which also matched
`/articles/bts-vs-blackpink-quiz`. That inflated the hub count to 160 and put articles in
the 7c sample. Corrected to `/^\/[a-z0-9-]+-quiz$/`, which yields the real 37. Every
number above is from the corrected run.
