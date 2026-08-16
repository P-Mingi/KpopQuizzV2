# REPORT - W7 audited (not rewritten), W9 shipped: llms.txt + real freshness dates.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched. No meta description was edited, so the July
control set stays inside its window to 2026-08-24.

Gates: `npx tsc --noEmit` -> **0** - `npm run build` -> **0** - `check:routes` -> **0** -
`check:indexability` -> **0** - `check:metadata-dupes` **unchanged** (still 8 groups).

Proofs: `docs/proofs/w7-clusters/FINDINGS.md` + `audit-before.txt` -
`docs/proofs/w9-freshness/FRESHNESS.md`, `served.txt`, `llms-txt.txt`.

---

## W7 - the audit says do not build the thing

You asked for the audit, not a silent rewrite, and the audit argues against the rewrite.
Crawled the served HTML of a production build: 37 group hubs, 24 trivia pages, 120
sampled quiz pages, 186 total.

- **7b: 120 / 120** sampled quiz pages already link back to their group hub, with varied
  anchors ("BLACKPINK Quiz", "BLACKPINK", "All BLACKPINK quizzes").
- **7a / 7c: already dense.** `/bts-quiz` emits 93 links with **81 distinct anchor
  texts** (45 quizzes, 1 trivia, 4 blindtest, 15 games). A sampled quiz page: 41 links,
  36 distinct anchors.

The usual reason to add a related-links module is a thin graph with repeated exact-match
anchors. This graph is neither. Adding one would have made it noisier, not stronger, so
I changed nothing in the link graph and am handing you the numbers instead.

**7d is the real finding: 11 orphaned group hubs**, zero inbound links from anywhere in
the crawled set: akmu, loona, kickflip, xikers, loossemble, artms, treasure, tws,
monsta-x, dreamcatcher, astro. Real hubs with published quizzes, in the sitemap, but
nothing points at them.

Reported not fixed, per the mission. When you want it built, my recommendation is to
extend `RELATED_GROUPS` so each orphan neighbours a group it genuinely resembles. The
audit found LOONA, ARTMS and LOOSSEMBLE orphaned together and they are one real family,
which is a data edit rather than a template change. Inventing links from unrelated pages
to clear a count is the version I would not ship.

**Limitation, stated:** orphan status is computed against the 186 crawled pages, not all
681 non-verse sitemap URLs. It is a floor on inbound links, not a proof of zero.

## W9a - /llms.txt

Served at `/llms.txt`, HTTP 200, `text/plain`, `force-static`, allowlisted in
`route-allowlist.ts`, and absent from the sitemap (0 occurrences). It names the real
entry points, asks citations to link the specific page, and states what we do not
publish: no simulated scores, no invented play counts, no fabricated opponents.

## W9b - freshness, and the column that would have lied

A visible "Updated <month year>" plus a matching `dateModified`, both from:

    select created_at from quizzes
    where group_id = $1 and status = 'published'
    order by created_at desc limit 1

**The column choice is the whole item.** The obvious pick is `quizzes.updated_at`, and it
is wrong: `record_play()` bumps it on every play, so it tracks play recency. Measured
live, bts `updated_at` = 2026-08-16 against `created_at` = 2026-07-28. Shipping it would
have printed "Updated August 2026" on every group anyone happened to be playing,
including ones whose newest quiz is four months old. That is today's date wearing a
database column as a costume, which is precisely what the mission forbids.

Served, production build:

| page | visible | dateModified |
| --- | --- | --- |
| /bts-quiz | Updated July 2026 | 2026-07-28 |
| /twice-quiz | Updated August 2026 | 2026-08-10 |
| /astro-quiz | Updated April 2026 | 2026-04-11 |
| /dreamcatcher-quiz | Updated July 2026 | 2026-07-10 |

**The honest-stale proof you asked for: `/astro-quiz` says "Updated April 2026"**, four
months behind, because that is when its newest quiz was published. No group has a date
it did not earn, and a group with no published quiz renders no line and emits no
`dateModified` at all rather than falling back to today.

## The thing only rendering it could have found

`group-trivia-page.tsx` was already shipping `dateModified: new Date().toISOString()`.
Every deploy told crawlers all 24 trivia pages had changed even when no fact on them had
moved: a freshness signal spent on nothing, and the exact anti-pattern this item is
about, already live. Now on the same real query. I swept every `dateModified` in `src/`;
the rest are real columns and this was the only fabricated one.

## Deviations and flags (loud)

1. **I reported `check:indexability` RED and it was my sequencing, not a regression.** I
   ran the gate before starting the production server, so it graded a server that was not
   up. Against the running server it exits 0, twice. Worth carrying: a gate that talks to
   a server proves nothing about the code until the server answers.
2. **My first freshness grep returned nothing and I nearly called the line missing.** The
   pattern was wrong, not the render. Then the raw HTML showed camel-cased
   `dateTime="..."`, which I did not want to wave through on the spec alone, so I checked
   it in a real DOM: `attrNames: ["datetime"]`, `dateTimeProp: "2026-04-11"`. Valid.
3. **A `--include=*.tsx` grep died on a zsh glob and printed my "NO remaining" fallback**,
   so that clean was unearned. Redone properly; the result held, but it was luck that it
   did.
4. **W7 shipped zero code.** Three of its four items were already built, and I would
   rather hand you an audit that says so than a module that pads a graph which does not
   need padding. 7d stays open on your call.

## Covenant

Every date is a real `created_at` from the DB at render time. Nothing is estimated, no
month is rounded, no page shows a date it did not earn, and the line is withheld rather
than guessed.

## Next

7d, the 11 orphans, awaits your decision. Still open elsewhere: the duplicate SEVENTEEN
quiz and the partner log, both in BLOCKED.md.

---

STOP. **Nothing was pushed.** report pret.
